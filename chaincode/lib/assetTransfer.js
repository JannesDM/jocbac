/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 * 
 * 
 *   Chaincode for bbasic asset management
 *   This code is based on the Fabric Samples: 
 *          fabric-samples/asset-transfer-basic/chaincode-javascript/lib/assetTransfer.js
 *          * Copyright IBM Corp. All Rights Reserved.
 *          * SPDX-License-Identifier: Apache-2.0
 * 
 */

'use strict';

// Deterministic JSON.stringify()
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
// Fabric Contract
const { Contract } = require('fabric-contract-api');

// The example asset transfer contract for basic CRUD on assets
class AssetTransfer extends Contract {
    
    // ----------- Public methods ------------------------------------------------------------------
    
    // Init ledger with assets
    async InitLedger(ctx) {
        // create assets
        await this.CreateAsset(ctx, 'asset1', 'pink');
        await this.CreateAsset(ctx, 'asset2', 'red');
        await this.CreateAsset(ctx, 'asset3', 'green');
        await this.CreateAsset(ctx, 'asset4', 'yellow');
    }

    // Creates a new asset to the world state with given details and !overwrites in case of duplicate!
    async CreateAsset(ctx, assetID, content) {
        // debug
        console.log(`\n## Creating asset ${assetID}...`);
        
        // create new asset
        const asset = {
            id: assetID,
            content: content
        };
        
        // save and return asset
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(assetID, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    // Returns the asset stored in the world state with given id
    async ReadAssetExternal(ctx, assetID) {
        return JSON.stringify(await this.#readAsset(ctx, assetID));
    }

    // Updates an asset in the world state
    async UpdateAsset(ctx, assetID, newID, newContent) {
        // get asset
        const asset = await this.#readAsset(ctx, assetID);

        // asset exists?
        if (!asset) {
            console.log(`UPDATING ASSET: The asset ${assetID} does not exist.`);
            return null;
        }
        //else

        // does the new id already exist?
        if(newID !== assetID && newID) {
            const exists = await this.#readAsset(ctx, newID);
            if (exists) {
                console.log(`The asset ${newID} already exist.`);
                return null;
            }
        }
        //else

        // create new asset with updated id and content
        if(newContent === "") {
            newContent = asset.content;
        }

        // delete old asset
        if(!(await this.DeleteAsset(ctx, assetID))) {
            console.log(`Failed to delete prev asset.`);
            return null;
        }
        //else 

        // create and return new asset
        return await this.CreateAsset(ctx, newID, newContent);
    }

    // Deletes an given asset from the world state.
    async DeleteAsset(ctx, assetID) {
        // debug
        console.log(`\n## Deleting asset ${assetID}...`);

        //
        // get asset
        const asset = await this.#readAsset(ctx, assetID);

        // asset exists?
        if (!asset) {
            console.log(`DELETING ASSET: The asset ${assetID} does not exist.`);
            return false;
        }

        // delete asset
        try {
            await ctx.stub.deleteState(assetID);
            return true;
        } catch(err) {
            // throw new Error(` deleting ${assetID} from blockchain.`);
            console.log(`Error deleting ${assetID} from blockchain: ${err}`);
            return false;
        }
    }

    // ----------- Private method(s) -----------------------------------------------------------------
    // Returns the asset stored in the world state with given id
    #readAsset = async (ctx, assetID) => {
        // debug
        console.log(`\n##Debug Reading asset ${assetID}...`);
        
        // get asset from chaincode state
        const asset = await ctx.stub.getState(assetID);
        if (!asset || asset.length === 0) {
            // readAsset is also as an 'Asset exists?' function
            return false;
        }

        // return object or parsed string
        return JSON.parse(asset);
    }

    // ------ Helpers --------------------
    // Returns all assets found in the world state for debugging
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

// Exports
module.exports = AssetTransfer;