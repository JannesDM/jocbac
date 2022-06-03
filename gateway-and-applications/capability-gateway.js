/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 * 
 *    The Capability Aware Gateway
 * 
 *    This code is based on Fabric Samples: 
 *          fabric-samples/asset-transfer-basic/application-javascript/app.js
 *          * Copyright IBM Corp. All Rights Reserved.
 *          * SPDX-License-Identifier: Apache-2.0
 *
 */

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../fabric-samples/test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildCCPOrg2, buildWallet } = require('../../fabric-samples/test-application/javascript/AppUtil');
const Capability = require('../chaincode/lib/capability.js');

// Simulation constants
// Future work
const walletPath = path.join(__dirname, 'wallet');
const chaincodeName = 'basic';
const contractNameCap = 'CapBasic';
const contractNameAsset = 'AssetTransfer';
const idxContractCap = 0, idxContractAsset = 1;
const mspOrg1 = 'Org1MSP', mspOrg2 = 'Org2MSP';

// Initiates ledger with assets
async function initLedger(networkObject) {
	try {
		await networkObject.contracts[idxContractAsset].submitTransaction('InitLedger');
		return true;
	} catch(err) {
		console.log(`Error initiating ledger: ${err}`);
		return false;
	} finally {
		//networkObject.gateway.disconnect();
	}
}

// Initiates capabilities for assets 1 and 2
async function initCap(networkObject, owner) {
    try {
		const capString = await networkObject.contracts[idxContractCap].submitTransaction('InitCaps', owner);
		const cap = JSON.parse(capString, reviver);
		// retrieve methods of class
		var retCap = new Capability(owner, cap.rr, cap.capRights, cap.options);
		retCap.setNetworkObject(networkObject);
		retCap.id = cap.id;
		return retCap;
    } catch(err) {
        console.log(`Error getting cap: ${err}.`);
		return false;
    } finally {
        //networkObject.gateway.close();
		//networkObject.gateway.disconnect();
    }
}

// Retrieves all user's capabilities
async function getCaps(networkObject, owner) {
    try {
        // get All Capabilities for owner
        const capsString = await networkObject.contracts[idxContractCap].submitTransaction('GetOwnerCapabilities', owner);
        const caps = JSON.parse(capsString, reviver);
		let retCaps = [];
		for(let cap of caps) {
			// retrieve methods of class
			let retCap = new Capability(owner, cap.rr, cap.capRights, cap.options);
			// attach network information needed by the capability object
			retCap.setNetworkObject(networkObject);
			retCap.id = cap.id;
			retCaps.push(retCap);
		}
		if(retCaps.length !== 0) {
			return retCaps;
		} else {
			// 2do: return dummy or empty cap
			// return initCap;
			return retCaps;
		}
    } catch(err) {
        throw new Error(` getting caps: ${err}.`);
   }
}

// Connects to network, handles user registration, initialisation and returns current capabilites of the user
async function connectToNetwork(channelName, userID, MSP, args) {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		// build an instance of the fabric ca services client based on the information in the network configuration
		// Future Work
		let ccp, caName, affiliation;
		if(MSP === mspOrg1) {
			ccp = buildCCPOrg1();
			caName = 'ca.org1.example.com';
			affiliation = 'org1.department1';
		} else if (MSP === mspOrg2) {
			ccp = buildCCPOrg2();
			caName = 'ca.org2.example.com';
			affiliation = 'org2.department1';
		} else {
			console.log(`This MSP does not exist`);
			return false;
		}
		const caClient = buildCAClient(FabricCAServices, ccp, caName);

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, MSP);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, MSP, userID, affiliation);

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: userID,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the smart contracts from the network
			const contractCap = network.getContract(chaincodeName, contractNameCap);
			const contractAsset = network.getContract(chaincodeName, contractNameAsset);
			
			// Create the networkObject
			const networkObject = {
				contracts: [contractCap, contractAsset],
				//network: network,
				gateway: gateway
			};

			// initialisation options
			if(args === 'init') {
				await initLedger(networkObject);
				await initCap(networkObject, userID);
				console.log(`\nInitiated ledger and caps.`);
			}  
			if(args === 'cap') {
				await initCap(networkObject, userID);
				console.log(`\nInitiated caps.`);
			}

			// return the caller's capabilties
			return await getCaps(networkObject, userID);
		} finally {
			// disconnect from the gateway when the application is closing
			// this will close all connections to the network
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

// --- Helpers ---------------------------------------------------------------------------------------------
// parser helper for Maps
//https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }
    }
    return value;
}

// Exports
module.exports = {
    connectToNetwork
};