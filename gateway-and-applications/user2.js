/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 * 
 * User2's interaction with the network showcases the 
 *      delegation and revocation of capabilities along with User3
 * 
 */

const { connectToNetwork } = require('./capability-gateway.js');

// Simulation constants
const userID = 'theAppUser2';
const MSP = 'Org2MSP';
const channelName = 'mychannel';

// User2's interaction with the network
async function main(args) {
    // debug
    console.log(`User '${userID}'.`);
    // parse args

    // get user's caps
    let caps = await connectToNetwork(channelName, userID, MSP, args);
    console.log("\nCapabilities:");
    console.log(caps);
    let cap = caps[0];

    // read assets
    console.log('\n--> Submit Transaction: getAssets');
    let assets = await cap.getAssets();
    console.log(assets);

    // Delegation and Revocation
    // create assets for delegation
    console.log('\n--> Submit Transaction: CreateAsset');
    const delAssetID1 = 'assetDEL1';
    const delAsset1Content = 'Created by user 2 for delegating to user 3, later revoked';
    const delAsset1 = await cap.createAsset(delAssetID1, delAsset1Content);
    if(!delAsset1) {
        console.log(' -> Asset not created.');
    } else {
        console.log(' -> Asset created.');
        console.log(delAsset1);
    }
    console.log('\n--> Submit Transaction: CreateAsset');
    const delAssetID2 = 'assetDEL2';
    const delAsset2Content = 'Created by user 2 for delegating to user 3';
    const delAsset2 = await cap.createAsset(delAssetID2, delAsset2Content);
    if(!delAsset2) {
        console.log(' -> Asset not created.');
    } else {
        console.log(' -> Asset created.');
        console.log(delAsset2);
    }

    // delegate created assets
    const userNames = await cap.getUsers();
    const recievingOwner1 = userNames[0];
    const recievingOwner3 = userNames[1];

    //
    const recievingCapRights = [true, true];
    const dummyOptions = "none";
    // del1 => user1 and user3
    console.log(`\n## Delegating access from ${userID} to ${recievingOwner1} and ${recievingOwner3}, for ${delAssetID1}`);
    console.log(`Delegated asset ${delAssetID1}: ${await cap.shareAsset(recievingOwner1, recievingCapRights, delAssetID1, dummyOptions)}\n`);
    console.log(`Delegated asset ${delAssetID1}: ${await cap.shareAsset(recievingOwner3, recievingCapRights, delAssetID1, dummyOptions)}\n`);
    // del2 => user3
    console.log(`\n## Delegating capability from ${userID} to ${recievingOwner3}.`);
    console.log(`Delegated capability ${cap.id}: ${await cap.shareCapability(recievingOwner3, recievingCapRights, dummyOptions)}\n`);
    console.log(cap, "\n\n");

    // revoke first 2 delegations
    let revokeID = cap.delegatedChildren[0];
    console.log(`\n## ${userID}: Revoking access for cap-id ${revokeID}.`);
    console.log(`Revoking delegated access to asset ${delAssetID1}: ${await cap.revokeDelegation(revokeID)}\n`);
    revokeID = cap.delegatedChildren[0];
    console.log(`\n## ${userID}: Revoking access for cap-id ${revokeID}.`);
    console.log(`Revoking delegated access to asset ${delAssetID1}: ${await cap.revokeDelegation(revokeID)}\n`);
    console.log(cap, "\n");
    assets = await cap.getAssets();
    console.log(assets, "\n\n");

    /*
    // delete assets
    console.log(`\nDeleting asset: ${delAssetID1}...`);
    let resultBool = await cap.deleteAsset(delAssetID1);
    if(resultBool) {
        console.log(' -> Asset deleted.');
    } else {
        console.log(' -> Asset not deleted.');
    }
    console.log(`\nDeleting asset: ${delAssetID2}...`);
    resultBool = await cap.deleteAsset(delAssetID2);
    if(resultBool) {
        console.log(' -> Asset deleted.');
    } else {
        console.log(' -> Asset not deleted.');
    }
    assets = await cap.getAssets();
    console.log(assets);
    */

    // disconnect
    return cap.disconnect();
}




// Helpers
function printAsset(asset) {
	console.log(`\tid: ${asset.id} with content: ${asset.content}.`);
	//console.log("Name: ", name, " with content: ", content);
}

// Entry Point
async function theMain(args) {
	try {
		const ret = await main(args);
		if(ret) {
			process.exitCode = 0;
			process.exit();
		}
	} catch(err) {
		console.error('******** FAILED to run the user2-application:', err);
		process.exitCode = 1;
		process.exit();
	}
}

// inputs
const args = process.argv.slice(2)[0];
// call main function
theMain(args);
