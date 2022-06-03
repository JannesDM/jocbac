/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 *
 *   The Capability class
 */

'use strict';

// Simple unique id generator
let startID = 1;
// Constant indexes
const IDX_CONTRACT_CAP = 0, IDX_CONTRACT_ASSET = 1;
const READ = 0, WRITE = 1, EXECUTE = 2, CREATE = 0, DEL_REV = 1;

// The Capability class
class Capability {
    // Private field containing network information for executing chaincode
    #networkObject = { contracts: [], gateway: {} };

    // Constructor
    constructor(owner, rr, capRights, options) {
        // Uniqe identifier
        this.id = 'c' + startID++;

        // Owner of this capability
        this.owner = owner;

        // Resources - Rights (< AssetID, [R, W, E]>)
        this.rr = rr;

        // Write & delegate rights of capability
        this.capRights = capRights;

        // Custom options, e.g., time, location...
        // Future work
        this.options = options;

        // IDs of delegated capabilities or children
        this.delegatedChildren = [];
    }

    // Setter function for the gateway and contracts
    setNetworkObject = (networkObject) => {
        this.#networkObject = networkObject;
    }

    // User read specific asset
    readAsset = async (assetID) => {
        // verify networkObject
        this.#networkExists();

        // verify capability
        const entry = this.rr.get(assetID);
        if(entry !== undefined && entry[READ]) {
            // (asset-chaincode call)
            return await this.#readAsset(assetID);
        }
        // disconnect and return
        this.disconnect;
        return null;
    }

    // Retrieve all assets this capability can access
    getAssets = async () => {
        // verify networkObject
        this.#networkExists();

        // loop over entries
        let retAssets = [];
        for(let entry of this.rr.entries()) {
            // verify if cap has the priviliges to read this asset
            if(entry[1][READ]) {
                // (asset-chaincode call)
                const asset = await this.#readAsset(entry[0]);
                // if asset is not already added
                if(asset !== null && !(retAssets.find(tempAsset => tempAsset.id === asset.id))) {
                    // get and push asset into return array
                    retAssets.push(asset);
                }
            }
        }
        // disconnect and return
        this.disconnect;
        return retAssets;
    }

    // Create new asset and return capability
    createAsset = async (assetID, content) => {
        // verify networkObject
        this.#networkExists();

        // verify capability right
        if(this.capRights[CREATE]) {
            // create asset (asset-chaincode call)
            const newAsset = await this.#createAsset(assetID, content);
            
            // if new asset created
            if(newAsset !== null) {
                // update capability
                const creatorRights = [true, true, true];

                // add new entry (cap-chaincode call)
                await this.#networkObject.contracts[IDX_CONTRACT_CAP]
                    .submitTransaction('AddCapRR', this.id, newAsset.id, JSON.stringify(creatorRights));
                this.rr.set(assetID, creatorRights);
                
                // disconnect and return
                this.disconnect;
                return newAsset;
            }
        }
        // disconnect and return
        this.disconnect;
        return null;
    }

    // Handles user request to update an asset
    updateAssetContent = async (assetID, newContent) => {
        return await this.updateAsset(assetID, assetID, newContent);
    }
    updateAssetID = async (assetID, newID) => {
        return await this.updateAsset(assetID, newID, "");
    }
    // main update function
    updateAsset = async (assetID, newID, newContent) => {
        // verify networkObject
        this.#networkExists();

        // verify capability
        const entry = this.rr.get(assetID);
        if(entry !== undefined && entry[WRITE]) {
            // basic checks
            if((newID) && (newID !== "")) {
                // update asset (asset-chaincode call)
                const updatedAsset = await this.#updateAsset(assetID, newID, newContent);
                
                // if update succesfull
                if(updatedAsset !== null) {
                    // if new id
                    if(newID !== assetID) {
                        // update cap entry (cap-chaincode call)
                        await this.#updateCapRR(assetID, newID);
                    }
                    // disconnect and return asset's name and content
                    this.disconnect;
                    return updatedAsset;
                }
            }
        }
        // disconnect and return
        this.disconnect;
        return null;
    }

    // User request deleting of an asset
    deleteAsset = async (assetID) => {
        // verify networkObject
        this.#networkExists();

        // verify capability
        const entry = this.rr.get(assetID);
        if(entry !== undefined && entry[WRITE]) {
            // delete asset (asset-chaincode call)
            const retBool = await this.#deleteAsset(assetID);
            if(retBool) {
                // remove cap entry (cap-chaincode call)
                await this.#updateCapRR(assetID, '');
                // gc: remove other (delegated) caps only pointing to this asset
            }
            // disconnect and return
            this.disconnect;
            return retBool;
        }
        //else
        // disconnect and return
        this.disconnect;
        return false;
    }

    // User request sharing of capability
    shareCapability = async (recievingOwner, recievingCapRights, options) => {
        // verify networkObject
        this.#networkExists();

        // verify capability
        if(this.capRights[DEL_REV]) {
            // cannot put true on create rights if own right is false -> delegate the same or less
            if(recievingCapRights[CREATE] && !this.capRights[CREATE]) {
                recievingCapRights[CREATE] = false;
            }

            // update this capability and create delegated cap (cap-chaincode call)
            const dcJSON = await this.#networkObject.contracts[IDX_CONTRACT_CAP]
                .submitTransaction('DelegateCap', this.id, recievingOwner, recievingCapRights, JSON.stringify(options));
            this.delegatedChildren = JSON.parse(dcJSON);
            
            // disconnect and return
            this.disconnect;
            return true;
        }
        //else
        // disconnect and return
        this.disconnect;
        return false;
    }

    // User request sharing of capability for a specific asset
    shareAsset = async (recievingOwner, recievingCapRights, assetID, options) => {
        // verify networkObject
        this.#networkExists();

        // verify capability
        const delEntry = this.rr.get(assetID);
        if(this.capRights[DEL_REV] && delEntry !== undefined) {
            // cannot put true on create rights if own right is false -> delegate the same or less
            if(recievingCapRights[CREATE] && !this.capRights[CREATE]) {
                recievingCapRights[CREATE] = false;
            }

            // update this capability and create delegated cap (cap-chaincode call)
            let newRR = new Map();
            newRR.set(assetID, delEntry);
            const dcJSON = await this.#networkObject.contracts[IDX_CONTRACT_CAP]
                .submitTransaction('DelegateCapEntry', this.id, recievingOwner, JSON.stringify(newRR, replacer), 
                    recievingCapRights, JSON.stringify(options));
            this.delegatedChildren = JSON.parse(dcJSON);
            
            // disconnect and return
            this.disconnect;
            return true;
        }
        //else
        // disconnect and return
        this.disconnect;
        return false;
    }

    // User requests revoking of access to delegated capability
    revokeDelegation = async (delCapID) => {
        // verify networkObject
        this.#networkExists();

        // verify capability
        if(this.capRights[DEL_REV]) {
            // delete capability and his potentially delegated children
            const dcJSON = await this.#networkObject.contracts[IDX_CONTRACT_CAP]
                .submitTransaction('RemoveDelegations', delCapID, this.id);
            this.delegatedChildren = JSON.parse(dcJSON);

            // disconnect and return
            this.disconnect;
            return true;
        }
        //else
        // disconnect and return
        this.disconnect;
        return false;
    }

    // Future work
    // Returns objects as possible delegation recievers' 
    //   -> A seperate entry for accessing users names
    //   -> Controlled Delegation property
    getUsers = async () => {
        //
        return ["theAppUser1", "theAppUser3"];
    }

    // disconnect
    disconnect = () => {
        // verify networkObject
        this.#networkExists();

        // disconnect from gateway
        try {
            this.#networkObject.gateway.disconnect();
            return true;
        } catch(err) {
            console.log(`\nCould not disconnect from network: ${err}\n`);
            return false;
        }
    }

    // Ceanup after deleting of capability
    delete = () =>  {
        // 2do: remove delegated children
        // if(!delegatedChildren.empty) {
        //   for(id of delegatedChildren) {
        //     await this.revokeDelegation(id); }}

        // disconnect
        this.disconnect; 
    }

    // Returns description of the capability
    toString = () => {
        let tempRR = "";
        for(let entry of this.rr.entries()) {
             tempRR += ` ${entry} `;
        }

        // return description of capability
        return `\n\tCapability id: ${this.id}, owned by: ${this.owner}, rights: ${this.capRights}, RR: ${this.tempRR}, DC: ${this.delegatedChildren} and options: ${this.options}\n`;
    }


    // --- Private functions -- Effective operations, capability's rights are not verified here -------

    // Return true if networkObject contains a valid value
    #networkExists = () => {
        if (this.#networkObject.contracts.length !== 0 && this.#networkObject.gateway) {
            return true;
        }
        throw new Error('NetworkObject is undefined...');
        // return false;
    }

    // Updates an entry of the RR field
    #updateCapRR = async (assetID, newID) => {
        // update cap rr (cap-chaincode call)
        const updatedCapString = await this.#networkObject.contracts[IDX_CONTRACT_CAP]
            .submitTransaction('UpdateCapRR', this.id, assetID, newID);
        const updatedCap = JSON.parse(updatedCapString, reviver);
        this.rr = updatedCap.rr;
    }

    // Read Asset with given id
    #readAsset = async (assetID) => {
        // asset-chaincode call
        const assetJSON = await this.#networkObject.contracts[IDX_CONTRACT_ASSET]
            .submitTransaction('ReadAssetExternal', assetID);
        const asset = JSON.parse(assetJSON);
        // if exists
        if(asset) {
            return asset;
        }//else
        return null;
    }

    // Creates new Asset with given id and content
    #createAsset = async (assetID, content) => {
        try {
            // asset-chaincode call
            const assetJSON = await this.#networkObject.contracts[IDX_CONTRACT_ASSET].submitTransaction('CreateAsset', assetID, content);
            if(!assetJSON || assetJSON.length < 1) {
                return null;
            }
            const asset = JSON.parse(assetJSON);
            return asset;
        } catch(err) {
            console.log(`Error creating asset ${assetID} : ${err}.`);
            return null;
        }
    }

    // Update asset id and/or content
    #updateAsset = async (assetID, newID, newContent) => {
        try {
            // update asset (asset-chaincode call)
            const assetJSON = await this.#networkObject.contracts[IDX_CONTRACT_ASSET].submitTransaction('UpdateAsset', assetID, newID, newContent);
            if(!assetJSON || assetJSON.length < 1) {
                return null;
            }
            const asset = JSON.parse(assetJSON);
            return asset;
        } catch(err) {
            console.log(`Error updating asset ${assetID} : ${err}.`);
            return null;
        }
    }

    // Delete an asset with given ID
    #deleteAsset = async (assetID) => {
        try {
            const succesJSON = await this.#networkObject.contracts[IDX_CONTRACT_ASSET].submitTransaction('DeleteAsset', assetID);
            return JSON.parse(succesJSON);
        } catch(err) {
            console.log(`Failed to delete asset: `, err);
            return false;
        }
    }
}

// Parser helpers for JavaScript Map type
//https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}
function replacer(key, value) {
    if(value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()),
        };
    } else {
        return value;
    }
}

// Exports
module.exports = Capability;
