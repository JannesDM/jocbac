/*
 * Jannes De Mets 2022 - Prototype JOCBAC
 *
 */

'use strict';

const capBasic = require('./lib/capBasic');
const assetTransfer = require('./lib/assetTransfer.js');

module.exports.CapBasic = capBasic;
module.exports.AssetTransfer = assetTransfer;
module.exports.contracts = [capBasic, assetTransfer];
