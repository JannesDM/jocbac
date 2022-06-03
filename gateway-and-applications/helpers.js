/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 * 
 */

// Returns a capability with the given rights, if there is one
function getUseableCap(caps, assetID, RIGHT) {
    // iterate over user's caps untill one has access to write asset
    for(let cap of caps) {
        // check capability
        const entry = cap.rr.get(assetID);
        if(entry !== undefined) {
            // cap has write permissions
            if(entry.rights[RIGHT]) {
                return cap;
            }
        }   
    }
    return null;
}

// Print all caps in the system *for debugging purposes*
async function printCaps(networkObject) {
    const owners = ['appUser1', 'appUser2', 'appUser3']; // magic constant
    console.log(`\n\nPrinting all capabilites:\n`);
    for(let owner of owners) {
        const caps = await getCaps(networkObject, owner);
        console.log(`\nCapabilites for owner ${owner}:`);
        for(let cap of caps) {
            console.log(cap);
        }
    }
}

module.exports = { getUseableCap, printCaps }