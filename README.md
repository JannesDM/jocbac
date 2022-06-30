# jocbac
Jannes' Object Capability Based Access Control (JOCBAC) 
is the implemented prototype for the bachelor's thesis by Jannes De Mets.

It is designed to work on top of theHyperledger Fabric's 'Test-Network' with Fabric version 2.4

The JOCBAC model is deployed by running the ‘custom-network.sh’ script. This will first 
initiate housekeeping and afterwards run the Fabric Test-Network's start-up script called ‘network.sh’
with the correct set of arguments for initializing JOCBAC on the network.
