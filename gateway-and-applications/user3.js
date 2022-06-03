/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 * 
 * User3's interaction with the network showcases the 
 *      delegation and revocation of capabilities along with User2
 * 
 */

const { connectToNetwork } = require('./capability-gateway.js');

// Simulation constants
const userID = 'theAppUser3';
const MSP = 'Org1MSP';
const channelName = 'mychannel';

// User3's interaction with the network
async function main(args) {
    // debug
    console.log(`User '${userID}'\n`);

    // get user's caps
    let caps = await connectToNetwork(channelName, userID, MSP, args);
    console.log(`\nCapabilities:`);
    console.log(caps, '\n');
    let initiCap = caps[1];
    let delCap = caps[0];

    // read assets
    console.log("Assets from user2 should be visible.");
    let assets = await initiCap.getAssets();
    console.log("Using init cap:\n", assets);
    assets = await delCap.getAssets();
    console.log("Using delegated cap:\n", assets, '\n');

    // create asset for delegation
    // console.log('\n--> Submit Transaction: CreateAsset');
    // const delAssetID3 = 'assetDEL3';
    // const delAsset3Content = 'Created by user 3 for delegating to user 2';
    // const delAsset3 = await initiCap.createAsset(delAssetID3, delAsset3Content);
    // if(!delAsset3) {
    //     console.log(' -> Asset not created.\n');
    // } else {
    //     console.log(' -> Asset created.\n');
    //     console.log(delAsset3);
    // }

    // delegate recieved cap
    const userNames = await cap.getUsers();
    // console.log("Usernames: ", userNames);
    const recievingOwner1 = userNames[0];
    // const recievingOwner1 = "theAppUser1";
    const recievingCapRights = [true, false];
    console.log(`\n## Delegating capability ${delCap} from ${userID} to ${recievingOwner1}`);
    console.log(`Should fail: ${!(delCap.capRights[1])}`);
    console.log(`Delegation success: ${await delCap.shareAsset(recievingOwner1, recievingCapRights, "assetDEL2", "none")}\n`);
    console.log(delCap, '\n');

    /*
    // delegate created asset
    console.log(`\n## Delegating access from ${userID} to ${recievingOwner1}, for ${delAssetID3}.`);
    let success = await initiCap.shareAsset(recievingOwner1, recievingCapRights, delAssetID3, "none");
    console.log(`Delegated asset ${delAssetID3}: ${success}.`);
    console.log(initiCap);

    // revoke first delegation
    let revokeID = initiCap.delegatedChildren[0];
    console.log(`\n## ${userID}: Revoking access to asset ${delAssetID3} for user ${recievingOwner1} with cap-id ${revokeID}.`);
    // success = await initiCap.revokeDelegation(revokeID);
    console.log(`Revoking delegated access to asset ${delAssetID3}: ${success}.`);
    */

    // delete asset
    // console.log(`\nDeleting asset: ${delAssetID3}...`);
    // let resultBool = await initiCap.deleteAsset(delAssetID3);
    // if(resultBool) {
    //     console.log(' -> Asset deleted.');
    // } else {
    //     console.log(' -> Asset not deleted.');
    // }

    // disconnect
    return initiCap.disconnect();
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
		console.error('******** FAILED to run the user3-application:', err);
		process.exitCode = 1;
		process.exit();
	}
}

// inputs
const args = process.argv.slice(2)[0];
// call main function
theMain(args);