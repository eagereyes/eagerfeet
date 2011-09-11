
/*
 * test-api.js:  Test all auto-generated functions against api
 *
 */

var options = require('./config').options;
var API = require('../lib/api').API;

// Set up client

var runkeeper = require('../lib/runkeeper');
var rkclient = new runkeeper.HealthGraph(options);

// Test all methods in API

for (func in API) {
    console.log("-----testing: rkclient." + func);
    rkclient[func](function(response) {
    	    console.log("response in callback for: rkclient." + func + "\n:" + response + "\n\n");
    	});
};
