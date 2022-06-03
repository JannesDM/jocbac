/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 * 
 *    Chaincode for managing capabilities
 */

'use strict';

// Deterministic JSON.stringify()
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const Capability = require('./capability.js');
const ClientIdentity = require('fabric-shim').ClientIdentity;

// Constant variables
const PRIVATE_COLLECTION_NAME = "capabilityCollection";
    
// Chaincode for managing capabilities
class CapBasic extends Contract {
    // -- Public methods (capital letter) -------------------------------------------------------------------------
    // Init capabilities
    async InitCaps(ctx, owner) {
        // verify owner
        const ownerInvoker = getOwner(ctx.stub);
        console.log(`Cap owner: ${owner}, invoker: ${ownerInvoker}.`); // debug
        if(ownerInvoker !== owner) {
            console.log(`Cap owner ${owner} does not match invoker ${ownerInvoker}.`);
        }

        // set rights
        const READ = 0, WRITE = 1, EXECUTE = 2, CREATE = 0, DEL_REV = 1;
        let rightsInit = [false, false, false];
        rightsInit[READ] = true;
        rightsInit[WRITE] = true;
        rightsInit[EXECUTE] = false;
        let capRightsInit = [false, false];
        capRightsInit[CREATE] = true;
        capRightsInit[DEL_REV] = true;

        // set map of entries
        let rrInit = new Map();
        rrInit.set('asset1', rightsInit);
        rrInit.set('asset2', rightsInit);
        //rrInit.set('asset3', rightsInit);

        // create the capability
        const capInit = new Capability(owner, rrInit, capRightsInit, "none");

        // store and return capability
        await this.#storeCap(ctx, capInit);
        return JSON.stringify(capInit, replacer);
    }

    // Add entry to RR (Reference-Rights)
    async AddCapRR(ctx, capID, assetID, assetRights) {
        try {
            // parse arg
            assetRights = JSON.parse(assetRights);

            // get cap
            let cap = await this.#readCap(ctx, capID);

            // add new entry
            cap.rr.set(assetID, assetRights);

            // overwrite cap
            await this.#storeCap(ctx, cap);
        } catch(err) {
            console.log(`Error while adding cap RR: ${err}.`);
        }
    }

    // Update RR (Reference-Rights)
    async UpdateCapRR(ctx, capID, oldAssetID, newAssetID) {
        // get cap
        let cap = await this.#readCap(ctx, capID);
        const entry = cap.rr.get(oldAssetID);
        if(!entry) {
            throw new Error(` entry to update does not exist in cap!`);
        }

        // remove old entry
        cap.rr.delete(oldAssetID);

        // add new entry
        if(newAssetID && newAssetID !== '') {
            cap.rr.set(newAssetID, entry);
        }

        // overwrite and return cap
        await this.#storeCap(ctx, cap);
        return JSON.stringify(cap, replacer);
    }

    // Returns all capabilities found in the world state
    async GetOwnerCapabilities(ctx, owner) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = (await ctx.stub.getPrivateDataByRange(PRIVATE_COLLECTION_NAME, '', '')).iterator;

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let cap;
            try {
                // double parse
                cap = JSON.parse(JSON.parse(strValue), reviver);
            } catch (err) {
                throw new Error(` getting all caps from private data: ${err}`);
            }
            
            // check owners
            if(cap.owner === owner) {
                allResults.push(cap);
            }

            result = await iterator.next();
        }
        return JSON.stringify(allResults, replacer);
    }
    
    // Delegate a capability
    async DelegateCap(ctx, capID, recievingOwner, recievingCapRights, options) {
        // get invoking cap
        const cap = await this.#readCap(ctx, capID);
        // call private function
        return await this.#delegateCap(ctx, cap, recievingOwner, cap.rr, recievingCapRights, options);
    }

    // Delegate a specific entry of a capability
    async DelegateCapEntry(ctx, capID, recievingOwner, newRR, recievingCapRights, options) {
        // parse arg
        newRR = JSON.parse(newRR, reviver);
        // get invoking cap
        const cap = await this.#readCap(ctx, capID);
        // call private function
        return await this.#delegateCap(ctx, cap, recievingOwner, newRR, recievingCapRights, options);
    }

    // Deletes delegated caps and returns updated list of the caller cap's delegated children
    async RemoveDelegations(ctx, capID, callerID) {
        // get delegated cap
        const cap = await this.#readCap(ctx, capID);

        // loop over children
        for (let capID of cap.delegatedChildren) {
            // exists?
            const childCap = await this.#readCap(ctx, capID);
            if (childCap) {
                // also delegated?
                if (childCap.delegatedChildren !== undefined) {
                    if(childCap.delegatedChildren.length > 0) {
                        await this.RemoveDelegations(ctx, capID);
                    }
                }
                // delete child cap
                await this.#deleteCap(ctx, capID);
            }
        }
        // delete cap
        await this.#deleteCap(ctx, capID);

        // get caller's capability
        const callerCap = await this.#readCap(ctx, callerID);

        // update cap's delegated children, store and return list
        callerCap.delegatedChildren.splice(callerCap.delegatedChildren.indexOf(capID), 1);
        await this.#storeCap(ctx, callerCap);
        return JSON.stringify(callerCap.delegatedChildren);
    }

    // ------- Private methods (starting with #) -------------------------------------------------------------------
    // Delegate a specific entry of a capability
    #delegateCap = async (ctx, cap, recievingOwner, newRR, recievingCapRights, options) => {
        // parse args
        options = JSON.parse(options);

        // create delegated capability
        const delCap = new Capability(recievingOwner, newRR, recievingCapRights, options);

        // update invoking cap's delegated children
        if(cap.delegatedChildren.length > 0) {
            cap.delegatedChildren.push(delCap.id);
        } else {
            cap.delegatedChildren = new Array(delCap.id);
        }

        // overwrite caller's capability & store delegated capability
        await this.#storeCap(ctx, cap);
        await this.#storeCap(ctx, delCap);

        // return changed dc
        return JSON.stringify(cap.delegatedChildren);
    }
    
    // Store a capability
    #storeCap = async (ctx, cap) => {
        // debug
        console.log(`\n## Debug storeCap with cap-d: ${cap.id}`);

        // store cap and return cap id
        let capID = cap.id;
        try {
            // store the capability in private data and return its id
            await ctx.stub.putPrivateData(PRIVATE_COLLECTION_NAME, capID,
                Buffer.from(stringify(sortKeysRecursive(JSON.stringify(cap, replacer)))));
            return capID;
        } catch(err) {
            throw new Error(` writing cap with id ${capID}: ${err}.`);
        }
    }

    // Reads and returns capability
    #readCap = async (ctx, capID) => {
        // debug
        console.log(`\n## Debug readCap with capID: ${capID}`);
        // get cap
        let cap = await ctx.stub.getPrivateData(PRIVATE_COLLECTION_NAME, capID);
        // double parse
        cap = JSON.parse(JSON.parse(cap), reviver);
        // return parsed capability
        return cap;
    }
    
    // Deletes capability and returns result
    #deleteCap = async (ctx, capID) => {
        // debug
        console.log(`\n## Debug Deleting cap ${capID}...`);
        // delete cap from private data
        await ctx.stub.deletePrivateData(PRIVATE_COLLECTION_NAME, capID);
    }

} // end contract

// ----- Helpers ------------------------------------------------------------
// Splits x509 info
function splitCid(id) {
	// "x509::{subject DN}::{issuer DN}"
	let certData = id.split('::'), cert = {};
	cert.type = certData[0];
	cert.subject = splitInfo(certData[1]);
	cert.issuer = splitInfo(certData[2]);
	return cert;
}
// Splits info, based on Roland Bole's split function
// [yt-link]
function splitInfo(data) {
	let dataTemp = data.split('/');
	return dataTemp.reduce(function(result, item) {
		let i = item.split('=');
		result = {}
		if(i[0] !== '') {
			result[i[0]] = i[1];
		}
		return result;
	});
}

// Parser helpers for JavaScript Map type
//https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
function replacer(key, value) {
    if(value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
}
function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }
    }
    return value;
}
function getOwner(stub) {
    // owner
    const CID = splitCid(new ClientIdentity(stub).getID());
    //const OWNER = CID.subject.CN;
    //const ISSUER = CID.issuer.CN;
    return CID.subject.CN;
}

// ----------------------------------------------------------------------------------------------------------------

// Exports
module.exports = CapBasic;