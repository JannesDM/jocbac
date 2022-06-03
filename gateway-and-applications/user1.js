/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 * 
 * User1's interaction with the network showcases basic capability functionalities
 */

const { connectToNetwork } = require('./capability-gateway.js');

// Simulation constants
const userID = 'theAppUser1';
const MSP = 'Org1MSP';
const channelName = 'mychannel';

// User1's interaction with the network
async function main() {
    // debug
    console.log(`User '${userID}'.`);

    // get user's caps
    let caps = await connectToNetwork(channelName, userID, MSP, args);
    console.log("\nCapabilities:");
    console.log(caps);
    let cap = caps[0];

    // read assets
    console.log('\n--> Submit Transaction: getAssets');
    let assets = await cap.getAssets();
    console.log(assets);
    console.log(`\n--> Submit Transaction: readAsset ${assets[0].id}`);
    let asset1 = await cap.readAsset(assets[0].id);
    console.log(asset1);

    // create asset
    console.log('\n--> Submit Transaction: CreateAsset');
    const createAssetName = 'assetJORAN';
    const createAssetContent = 'joranjoranoehoehoeh';
    let createdAsset = await cap.createAsset(createAssetName, createAssetContent);
    if(!createdAsset) {
        console.log(' -> Asset not created.');
        createdAsset = assets[assets.length - 1]; // last asset
    } else {
        console.log(' -> Asset created.');
        console.log(createdAsset);
    }

    // update id and content
    console.log(`\nUpdating ${createdAsset.id}'s id and content...`);
    let newName = 'assetJahnes';
    let newContent = 'JahnesJahnesJahnes';
    createdAsset = await cap.updateAsset(createdAsset.id, newName, newContent);
    if(createdAsset !== null) {
        console.log(' -> Asset updated.');
        printAsset(createdAsset);
    } else {
        console.log(' -> Asset not updated.');
        createdAsset = assets[assets.length - 1]; // last asset
    }

    // update asset id
    console.log(`\nUpdating ${createdAsset.id}'s id...`);
    newName = 'newIDOnly';
    createdAsset = await cap.updateAssetID(createdAsset.id, newName);
    if(createdAsset !== null) {
        console.log(' -> Asset updated.');
        printAsset(createdAsset);
    } else {
        console.log(' -> Asset not updated.');
        createdAsset = assets[assets.length - 1]; // last asset
    }

    // update asset content
    console.log(`\nUpdating ${createdAsset.id}'s content...`);
    newContent = 'new content only';
    createdAsset = await cap.updateAssetContent(createdAsset.id, newContent);
    if(createdAsset !== null) {
        console.log(' -> Asset updated.');
        printAsset(createdAsset);
    } else {
        console.log(' -> Asset not updated.');
        createdAsset = assets[assets.length - 1]; // last asset
    }

    // read assets
    assets = await cap.getAssets();
    console.log(assets);

    // delete asset
    console.log(`\nDeleting asset: ${createdAsset.id}...`);
    let resultBool = await cap.deleteAsset(createdAsset.id);
    if(resultBool) {
        console.log(' -> Asset deleted.');
    } else {
        console.log(' -> Asset not deleted.');
    }
    assets = await cap.getAssets();
    console.log(assets);
    console.log(cap);

    //
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
		console.error('******** FAILED to run the user1-application:', err);
		process.exitCode = 1;
		process.exit();
	}
}

// inputs
const args = process.argv.slice(2)[0];
// call main function
theMain(args);