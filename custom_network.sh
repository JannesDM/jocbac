#!/bin/bash

# Jannes De Mets 2022 - Prototype JOCBAC
# Runs the Fabric Test-Network and installs JOCBAC chaincode on created channel

# args
CYAN='\033[0;36m'
LGREEN='\033[1;32m'

# SET THIS TO THE TEST-NETWORK PATH!
PATH_TEST_NETWORK=../fabric-samples/test-network

# from the test-network path...
PATH_CHAINCODE=../../JOCBAC/chaincode

# First application to be run
PATH_APP=./gateway-and-applications/user2.js

# Removes old app wallet
printf "\n\n${CYAN}==> Deleting old application wallet...\n\n"
rm -r ./gateway-and-applications/wallet
sleep 1

# if argument is not "start"
if [[ ${1} != "start" ]]
# Cleanup network
then
    # down
    printf "\n\n${CYAN}==> Cleaning up network...\n\n"
    ${PATH_TEST_NETWORK}/network.sh down
    sleep 1
fi

# if argument is not "end"
if [[ ${1} != "end" ]]
# Startup network
then
    # up, mychannel, ca
    printf "\n\n${LGREEN}==> Starting 'test-network' with ca and channel 'mychannel'...\n\n"
    ${PATH_TEST_NETWORK}/network.sh up createChannel -c mychannel -ca
    printf "\n\n${LGREEN}==> Network started, deploy CC?\n\n"
    read -n 1 -p "Continue?";

    # deploy custom cap chaincode
    printf "\n\n${LGREEN}==> Deploying chaincode on channel 'mychannel'...\n\n"
    ${PATH_TEST_NETWORK}/network.sh deployCC -ccn basic -ccp ${PATH_CHAINCODE} -ccl javascript -c mychannel -cccg ${PATH_CHAINCODE}/collections_config.json
    printf "\n\n${LGREEN}==> CC deployed, run app?\n\n"
    read -n 1 -p "Continue?";

    # run application
    printf "\n\n${LGREEN}==> Running Application with init argument...\n\n"
    ts-node ${PATH_APP} init
    
    # rerun app?
    printf "\n\n"
    while read -n1 -r -p "==> Rerun app? (y) Yes, (n) No, (i) Yes w/ init, (c) Yes w/ cap:   " && [[ $REPLY != n ]]; do
        case $REPLY in
            # rerun application
            y | "")
                printf "\n\n${LGREEN}==> Running Application...\n\n";
                ts-node ${PATH_APP};;
            i)  printf "\n\n${LGREEN}==> Running Application w/ init arg...\n\n";
                ts-node ${PATH_APP} init;;
            c)  printf "\n\n${LGREEN}==> Running Application w/ cap arg...\n\n";
                ts-node ${PATH_APP} cap;;
        esac
    done 

    # done
    printf "\n\n${LGREEN}==> Done \n\n"
fi
