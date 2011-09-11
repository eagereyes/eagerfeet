
/*
 * test-getProfile.js:  Test the /profile api call
 *
 */

var options = require('./config').options;

// Set up client

var runkeeper = require('../lib/runkeeper');
var rkclient = new runkeeper.HealthGraph(options);

// Test getUser

rkclient.profile(function(profile) {
	rkclient.profile = profile;
	console.log("profile: " + profile);
    });

