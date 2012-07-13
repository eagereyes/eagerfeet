
var users = {};

var maxUserID = 1000;

var https = require('https')
	, http = require('http')
	, queue = require('queue-async');

var NUMACTIVITIES = 50;

var TIME_INCREMENT = 10000;

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

function retrieveRunGPSData(dbClient, dbQueue, runID, externalID, done) {
	http.get('http://nikeplus.nike.com/plus/running/ajax/'+externalID, function(response) {
		var body = '';
		response.on('data', function(chunk) {
			body += chunk;
		});	
		response.on('end', function() {
			var hasGPS = 'no';
			try  {
				var runData = JSON.parse(body).activity;
				hasGPS = (runData.hasOwnProperty('geo')?'yes':'no');
				dbClient.query('update Runs set hasGPSData = ? where runID = ?', [hasGPS, runID]);
				console.log(externalID+':'+hasGPS);
			} catch (error) {
//				console.log(body);
				console.log(runID+': '+error);
/*
				if (body.indexOf('ENCOUNTERED') > 0) {
					console.log('retrying '+runID);
					dbQueue.defer(retrieveRunGPSData, dbClient, dbQueue, runID, externalID, done);
				}
*/
			}
			if (hasGPS == 'yes') {
	
				var minlat =  100000;
				var maxlat = -100000;
				var minlon =  100000;
				var maxlon = -100000;
			
				var numWaypoints = 0;
				var time = new Date(runData.startTimeUtc);
				runData.geo.waypoints.forEach(function(wp) {
					var timeString = time.toISOString().substr(0, 19)+runData.timeZone;
					dbClient.query('replace Waypoints set runID = ?, time = ?, lat = ?, lon = ?, ele = ?',
										[runID, timeString, wp.lat, wp.lon, wp.ele]);
			
					if (wp.lon < minlon)
						minlon = wp.lon;
					if (wp.lon > maxlon)
						maxlon = wp.lon;
			
					if (wp.lat < minlat)
						minlat = wp.lat;
					if (wp.lat > maxlat)
						maxlat = wp.lat;

					time.setTime(time.getTime()+TIME_INCREMENT);
			
					numWaypoints += 1;
				});
				
				console.log(numWaypoints+' way points for run '+runID);			
				dbClient.query('update Runs set minLat = ?, maxLat = ?, minLon = ?, maxLon = ? where runID = ?',
							[minlat, maxlat, minlon, maxlon, runID]);
			}
			done();
		});
	});
}

function saveRunsToDB(dbClient, userID, accessToken, dbQueue, data, offset) {
	var activities = JSON.parse(data).activities;
//	console.log('user: '+userID+', offset: '+offset+' values: '+activities.length);
	activities.forEach(function(activity) {
		var run = activity.activity;
		var timeZone = run.timeZone;
		if (run.hasOwnProperty('timeZoneId')) {
			timeZone = run.timeZoneId;
		}
		var runID = 'nike-'+run.activityId;
		// using replace here to guard against duplicates
		dbClient.query('replace into Runs (runID, userID, startTimeUTC, timeZone, distance, duration, hasHRData, calories, externalID) values (?,?,?,?,?,?,?,?,?)',
						[runID, userID, run.startTimeUtc, timeZone, Math.round(run.metrics.totalDistance*1000), Math.round(run.metrics.totalDuration/1000),
						 (run.metrics.averageHeartRate != 0)?'yes':'no', run.metrics.totalCalories, run.activityId]);
		dbQueue.defer(retrieveRunGPSData, dbClient, dbQueue, runID, run.activityId);
	});
	if (activities.length > 0) {
		serverRequest('/partner/sport/run/activities', {access_token: accessToken, start: offset+NUMACTIVITIES, end: offset+NUMACTIVITIES+NUMACTIVITIES}, function(data) {
			saveRunsToDB(dbClient, userID, accessToken, dbQueue, data, offset+NUMACTIVITIES);
		});
	} else {
		dbQueue.await(function() { console.log('Done with user '+userID); });
	}
}


function pad(num) {
	return (num < 10) ? ('0' + num) : ('' + num);
}

exports.getActivities = function(dbClient, userID, res) {
	var user = getUser(userID);
	var dbQueue = queue(3);
	serverRequest('/partner/sport/run/activities', {access_token: user.nikeAccessToken, start: 0, end: NUMACTIVITIES}, function(data) {
		saveRunsToDB(dbClient, userID, user.nikeAccessToken, dbQueue, data, 0);
		var activities = JSON.parse(data).activities;
		activities.reverse();
		activities.forEach(function(run) {
			var seconds = Math.floor(run.activity.metrics.totalDuration/1000);
			if (seconds < 60 * 60) {
				var minutes = Math.floor(seconds/60);
				seconds -= minutes*60;
				run.time = pad(minutes)+':'+pad(seconds);
			} else {
				var hours = Math.floor(seconds/3600);
				seconds -= hours*3600;
				var minutes = Math.floor(seconds/60);
				seconds -= minutes*60;
				run.time = pad(hours)+':'+pad(minutes)+':'+pad(seconds);
			}
		});
		res.render('export', {activities: activities, userID: userID});
	});
}
