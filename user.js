
var users = {};

var maxUserID = 1000;

var https = require('https');

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

function pad(num) {
	return (num < 10) ? ('0' + num) : ('' + num);
}

exports.getActivities = function(userID, res) {
	var user = getUser(userID);
	serverRequest('/partner/sport/run/activities', {access_token: user.nikeAccessToken, start: 0, end: 100}, function(data) {
		var activities = JSON.parse(data).activities;
		activities.reverse();
		activities.forEach(function(run) {
			var seconds = run.activity.metrics.totalDuration/1000;
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
		res.render('export', {activities: activities});
	});
}
