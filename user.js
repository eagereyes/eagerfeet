
var users = {};

var maxUserID = 1000;

var https = require('https')
	, http = require('http')
	, fs = require('fs')
	, zlib = require('zlib')
	, queue = require('queue-async');

var NUMACTIVITIES = 50;

var DATADIR = 'data/';

var QUEUE_CONCURRENCY = 3;

function serverRequest(path, params, resultFunc) {

	var queryString = '';
	var numParams = 0;

	for (var key in params) {
		if (params.hasOwnProperty(key)) {
			queryString += ((numParams == 0) ? '?' : '&');
			queryString += key+'='+params[key];
			numParams += 1;
		}
	}

	var options = {
		host: 'api.nike.com',
		path: path + queryString
	};

	https.get(options, function(response) {
		var body = '';
		response.on('data', function(chunk) {
			body += chunk;
		});	
		response.on('end', function() {
			resultFunc(body);
		});
	});
}

exports.loadUsers = function(dbClient) {
	dbClient.query('select * from Users', function(err, results, fields) {
		if (err) {
			console.log(err);
		} else {
			results.forEach(function(user) {
				users[user.userID] = user;
				if (user.userID > maxUserID)
					maxUserID = user.userID;
			});
		}
	});
}

exports.login = function(dbClient, nikeUID, nikeOAuthToken, nikeAccessToken) {
	var user = null;
	for (var userID in users) {
		if (users[userID].nikeUID == nikeUID) {
			user = users[userID];
			dbClient.query('update Users set nikeOAuthToken = ?, nikeAccessToken = ? where userID = ?;',
							[nikeAccessToken, nikeAccessToken, userID]);
		}
	}
	if (user == null) {
		userID = maxUserID+1;
		maxUserID += 1;
		var user = {userID: userID, nikeAccessToken: nikeAccessToken, nikeOAuthToken: nikeOAuthToken, nikeUID: nikeUID};
		dbClient.query('insert into Users (userID, nikeUID, nikeOAuthToken, nikeAccessToken) values (?,?,?,?);',
							[userID, nikeUID, nikeOAuthToken, nikeAccessToken]);
		users[userID] = user;
	}
	return user.userID;
}

function getUser(userID) {
	return users[userID];
}

exports.getUser = getUser;

function convertRunData(runID, runData) {

	var runInfo = {
		runID: runID,
		startTime: runData.startTimeUtc,
		duration: Math.round(runData.duration/1000),
		distance: Math.round(runData.distance*1000),
		minLat:  100000,
		maxLat: -100000,
		minLon:  100000,
		maxLon: -100000,
	};


	var deltaLats = [];
	var deltaLons = [];
	var deltaEles = [];
	
	var previousLat = 0;
	var previousLon = 0;
	var previousEle = 0;
	runData.geo.waypoints.forEach(function(wp) {

		deltaLats.push(Math.round(wp.lat*1000000-previousLat*1000000));
		deltaLons.push(Math.round(wp.lon*1000000-previousLon*1000000));
		deltaEles.push(Math.round(wp.ele*100-previousEle*100));

		previousLat = wp.lat;
		previousLon = wp.lon;
		previousEle = wp.ele;
	
		if (wp.lon < runInfo.minLon)
			runInfo.minLon = wp.lon;
		if (wp.lon > runInfo.maxLon)
			runInfo.maxLon = wp.lon;

		if (wp.lat < runInfo.minLat)
			runInfo.minLat = wp.lat;
		if (wp.lat > runInfo.maxLat)
			runInfo.maxLat = wp.lat;
	});

	runInfo.deltaLons = deltaLons;
	runInfo.deltaLats = deltaLats;
	runInfo.deltaEles = deltaEles;

	var hrData = null;
	if (runData.hasOwnProperty('history')) {
		runData.history.forEach(function(history) {
			if (history.type == 'HEARTRATE') {
				hrData = history.values;
			}
		});
	}
	
	if (hrData != null) {
		var previousHR = 0;
		runInfo.deltaHRs = [];
		hrData.forEach(function(hr) {
			runInfo.deltaHRs.push(hr-previousHR);
			previousHR = hr;
		});
	}

	return runInfo;
}

exports.convertRunData = convertRunData;

function retrieveRunGPSData(dbClient, dbQueue, user, runID, run, done) {
	http.get('http://nikeplus.nike.com/plus/running/ajax/'+run.activityId, function(response) {
		var body = '';
		response.on('data', function(chunk) {
			body += chunk;
		});	
		response.on('end', function() {
			var hasGPS = 'no';
			try  {
				var runData = JSON.parse(body).activity;
				hasGPS = (runData.hasOwnProperty('geo')?'yes':'no');
			} catch (error) {
//				console.log(body);
				console.log(runID+': '+error);
				hasGPS = 'err';
/*
				if (body.indexOf('ENCOUNTERED') > 0) {
					console.log('retrying '+runID);
					dbQueue.defer(retrieveRunGPSData, dbClient, dbQueue, runID, externalID, done);
				}
*/
			}
			dbClient.query('update Runs set hasGPSData = ? where runID = ?', [hasGPS, runID]);
			console.log(run.activityId+':'+hasGPS);
			if (hasGPS == 'yes') {

				var runInfo = convertRunData(runID, runData);

				if (!fs.existsSync(DATADIR+user.userID)) {
					fs.mkdirSync(DATADIR+user.userID)
				}
				
				zlib.gzip(JSON.stringify(runInfo), function(error, compressedRun) {
					fs.writeFile(DATADIR+user.userID+'/'+runID+'.json.gz', compressedRun);
				});
				
				console.log(runInfo.deltaLats.length+' waypoints for run '+runID);			
				dbClient.query('update Runs set minLat = ?, maxLat = ?, minLon = ?, maxLon = ? where runID = ?',
							[runInfo.minLat, runInfo.maxLat, runInfo.minLon, runInfo.maxLon, runID]);
			}
			
			user.runs.push({
				runID:		runID,
				startTime:	run.startTimeUtc,
				distance:	Math.round(run.metrics.totalDistance*1000),
				duration:	Math.round(run.metrics.totalDuration/1000),
				hasHRData:	((run.metrics.hasOwnProperty('averageHeartRate') && (run.metrics.averageHeartRate != 0)))?'yes':'no',
				hasGPSData:	hasGPS,
				calories:	run.metrics.totalCalories,
				externalID:	run.activityId,
				exported:	'no'
			});
			
			done();
		});
	});
}

// offset -1 means that the query was by date, so no further calls!
function saveRunsToDB(dbClient, user, dbQueue, data, offset) {
	var response = JSON.parse(data);
	var activities = JSON.parse(data).activities;
	if (activities == undefined) {
		console.log('FAILURE for user '+user.userID+', offset '+offset+': '+data);
		return;
	}
	activities.forEach(function(activity) {
		var run = activity.activity;
		var runID = 'nike-'+run.activityId;
		var hasHRData = (run.metrics.hasOwnProperty('averageHeartRate') && (run.metrics.averageHeartRate != 0));
		// using replace here to guard against duplicates
		dbClient.query('replace into Runs (runID, userID, startTime, distance, duration, hasHRData, calories, externalID) values (?,?,?,?,?,?,?,?)',
						[runID, user.userID, run.startTimeUtc, Math.round(run.metrics.totalDistance*1000), Math.round(run.metrics.totalDuration/1000),
						 (hasHRData)?'yes':'no', run.metrics.totalCalories, run.activityId]);
		dbQueue.defer(retrieveRunGPSData, dbClient, dbQueue, user, runID, run);
	});
	if (activities.length > 0 && offset >= 0) {
		serverRequest('/partner/sport/run/activities', {access_token: user.nikeAccessToken, start: offset+NUMACTIVITIES, end: offset+NUMACTIVITIES+NUMACTIVITIES}, function(data) {
			saveRunsToDB(dbClient, user, dbQueue, data, offset+NUMACTIVITIES);
		});
	} else {
		dbQueue.await(function() {
			user.done = true;
			console.log('Done with user '+user.userID);
		});
	}
}


function pad(num) {
	return (num < 10) ? ('0' + num) : ('' + num);
}

exports.getActivities = function(dbClient, userID, res) {
	var user = getUser(userID);
	dbClient.query('select * from Runs where userID = ?', [userID], function(err, results, fields) {
		var activities = results;
		activities.forEach(function(run) {
			run.startTime = new Date(run.startTime);
		});

		activities.sort(function(a, b) { return b.startTime - a.startTime; });

		res.render('export', {activities: activities, userID: userID});

		user.done = false;
		user.runs = [];

		var dbQueue = queue(QUEUE_CONCURRENCY);
		if (activities.length == 0) {
			serverRequest('/partner/sport/run/activities', {access_token: user.nikeAccessToken, start: 0, end: NUMACTIVITIES}, function(data) {
				saveRunsToDB(dbClient, user, dbQueue, data, 0);
			});
		} else {
			serverRequest('/partner/sport/run/activities', {access_token: user.nikeAccessToken, startTime: activities[0].startTime.toISOString(), endTime: (new Date()).toISOString()}, function(data) {
				saveRunsToDB(dbClient, user, dbQueue, data, -1);
			});
		}
	});
}

exports.updateRunList = function(userID, res) {
	var user = getUser(userID);
	var response = {
		done:		user.done,
		newRuns:	user.runs
	};
	res.send(response);
	user.runs = [];
}
