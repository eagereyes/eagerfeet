
/*
 * test-fitnessActivityFeed.js
 *
 */

var options = require('./config').options;

// Set up client

var runkeeper = require('../lib/runkeeper');
var rkclient = new runkeeper.HealthGraph(options);

// Test getUser

rkclient.fitnessActivityFeed(function(data) {
	rkclient.fitnessActivityFeed = data;
	console.log("fitnessActivityFeed: " + data);
    });

