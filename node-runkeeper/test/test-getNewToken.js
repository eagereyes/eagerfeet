
/*
 * test-getNewToken.js:  Test 2nd step of Runkeeper Health Graph API handshake
 *
 * usage:  node test-getNewToken.js --code <authorization_code>
 * 
 * <authorization_code> is returned by the api as described in step 1 here:
 * http://developer.runkeeper.com/healthgraph/registration-authorization
 *
 */

var argv = require('optimist').argv,
    options = require('./config').options;

console.log("Getting token for code: " + argv.code);

// Set up client

var runkeeper = require('../lib/runkeeper');
var rkclient = new runkeeper.HealthGraph(options);

// Test getToken

rkclient.getNewToken(argv.code, function(access_token) {
	rkclient.access_token = access_token;
	console.log("client access_token: " + rkclient.access_token);
    });

