
var xml = require("node-xml");
var http = require('http');
var mysql = require('mysql');

var RUNLISTSERVER = 'nikerunning.nike.com';

var RUNLISTPATH = '/nikeplus/v2/services/app/run_list.jsp?userID=';

var RUNDATAPATH = '/nikeplus/v2/services/app/get_gps_detail.jsp?_plus=true&format=json&id=';

var MAXRETRIES = 5;

var METERS_PER_MILE = 1609.344;

var users = {};

var dbconf = require('./db-conf.js').dbconf;

var dbClient = mysql.createClient(dbconf);

// from http://dansnetwork.com/javascript-iso8601rfc3339-date-parser/
Date.prototype.setISO8601 = function(dString){

	var regexp = /(\d\d\d\d)(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/;

	if (dString.toString().match(new RegExp(regexp))) {
		var d = dString.match(new RegExp(regexp));
		var offset = 0;
		
		this.setUTCDate(1);
		this.setUTCFullYear(parseInt(d[1],10));
		this.setUTCMonth(parseInt(d[3],10) - 1);
		this.setUTCDate(parseInt(d[5],10));
		this.setUTCHours(parseInt(d[7],10));
		this.setUTCMinutes(parseInt(d[9],10));
		this.setUTCSeconds(parseInt(d[11],10));
		if (d[12])
			this.setUTCMilliseconds(parseFloat(d[12]) * 1000);
		else
			this.setUTCMilliseconds(0);
			if (d[13] != 'Z') {
				offset = (d[15] * 60) + parseInt(d[17],10);
				offset *= ((d[14] == '-') ? -1 : 1);
				this.setTime(this.getTime() - offset * 60 * 1000);
			}
		} else {
			this.setTime(Date.parse(dString));
	}
	return this;
};

function serverRequest(path, userID, resultFunc) {

	var options = {
		host: RUNLISTSERVER,
		port: 80,
		path: path,
		headers: { Cookie: 'plusid='+userID+'&nikerunning.nike.com'}
	};

	http.get(options, function(response) {
		var body = '';
		response.on('data', function(chunk) {
			body += chunk;
		});	
		response.on('end', function() {
			resultFunc(body);
		});
	});
}

function storeRunInDB(userID, runID, runData) {
	runData.plusService.route.waypointList.forEach(function(wp) {
		dbClient.query('insert into Waypoints set runID = ?, time = ?, lat = ?, lon = ?, ele = ?',
						[runID, new Date(wp.time), wp.lat, wp.lon, wp.alt]);
	});
}

function convertRunData(user, run) {
	serverRequest(RUNDATAPATH + run.nikeID, user.userID, function(body) {
		try {
			runData = JSON.parse(body);
		} catch (error) {
			console.log((new Date())+' :: Caught exception: ' + error + '\n');
			console.log('Offending document: '+body+'\n');
			runData = {plusService: {status: 'fail'}};
		}
		
		if (runData.plusService.status === 'success') {
			
//				console.log(run.id+': '+run.retryCount+' retries');
		
			storeRunInDB(user.userID, run.runID, runData);
			
			if (user.responses.length > 0) {
				sendRun(user.responses.pop(), run, user.userID);
			} else {
				user.runsDone.unshift(run);
			}
			
		} else if (runData.plusService.status == 'failure') {
			if (run.retryCount < MAXRETRIES) {
				run.retryCount += 1;
				process.nextTick(function() {
					convertRunData(user, run);
				});
			}
//		} else {
//			response.setHeader('Cache-Control', 'no-store');
//			response.send({
//				code: -1,
//				message: "Error retrieving data, please try again."
//			});
//				console.log('Error getting data for '+userID);
		}
	});
}

function parseXML(xmlString, callback) {

	var status = '';
	var runs = [];

	var enclosingElement = '';

	var parser = new xml.SaxParser(function(cb) {

		var currentRun = null;

		cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
			enclosingElement = elem;
			if (elem == 'run') {
				currentRun = {
					runID:			'nike-'+attrs[0][1],
					nikeID:			attrs[0][1],
					startTime:		'',
					distance:		'',
					duration:		'',
					calories:		'',
					description:	'',
					howFelt:		'',
					weather:		'',
					terrain:		'',
					gpsData:		false,
					inDB:			false,
					retryCount:		0
				};
				runs.push(currentRun);
			} else if (elem == 'runListSummary') {
				currentRun = null;
			}
		});
		cb.onCharacters(function(chars) {
			if (currentRun != null) {
				if (enclosingElement == 'startTime') {
					currentRun.startTime += chars;
				} else if (enclosingElement == 'distance') {
					currentRun.distance += chars;
				} else if (enclosingElement == 'duration') {
					currentRun.duration += chars;
				} else if (enclosingElement == 'calories') {
					currentRun.calories += chars;
				} else if (enclosingElement == 'howFelt') {
					currentRun.howFelt += chars;
				} else if (enclosingElement == 'weather') {
					currentRun.weather += chars;
				} else if (enclosingElement == 'terrain') {
					currentRun.terrain += chars;
				} else if (enclosingElement == 'gpxId') {
					currentRun.gpsData = true;
				}
			} else if (enclosingElement == 'status') {
				status += chars;
			}
		});
		cb.onEndDocument(function() {
			callback(status, runs);
		});
		cb.onCdata(function(cdata) {
			if (enclosingElement == 'description')
				currentRun.description += cdata;
		});
		cb.onWarning(function(msg) {
			console.log('PARSER WARNING: '+msg);
		});
		cb.onError(function(msg) {
			console.log('PARSER ERROR: '+JSON.stringify(msg));
			callback('failure', runs);
		});
	});
	
	parser.parseString(xmlString);
}

exports.makeUserRunList = function(userID, response, startTime) {
	serverRequest(RUNLISTPATH + userID, userID, function (body) {
	
		parseXML(body, function(status, runs) {
			
			if (status != "success") {
				response.setHeader('Cache-Control', 'no-store');
				response.send({
					code: -1,
					message: '<b>Error</b>: User '+userID+' not found. Is your profile public (see <i>Troubleshooting</i> in the sidebar)?'
				});
				
			} else {

				runs.reverse();
				
				var numGPS = 0;
				runs.forEach(function(run) {
					if (run.gpsData)
						numGPS += 1;
				});
								
				var user = {
					userID:		userID,
					runs:		runs,
					runsDone:	[],
					responses:	[]
				};
				
				users[userID] = user;
				
				for (var i = 0; i < runs.length; i++) {
					if (runs[i].gpsData)
						convertRunData(user, runs[i]);
				}
				
				response.setHeader('Cache-Control', 'no-store');
				response.send({
					code:	0,
					userID:	userID,
					runs:	runs,
					numGPS:	numGPS
				});

				console.log('Initial request for user '+userID+' done after '+((new Date())-startTime)/1000+'s');

			}
		});
	});
}

function sendRun(response, run, userID) {
	response.setHeader('Cache-Control', 'no-store');
	response.send({
		code:	0,
		runID:	run.runID,
		userID:	userID
	});
}

exports.poll = function(userID, response) {
	var user = users[userID];
	if (user) {
		if (user.runsDone.length > 0) {
			sendRun(response, user.runsDone.pop(), user.userID);
		} else {
			user.responses.unshift(response)
		}
	} else {
		console.log('User '+userID+' not found!');
		response.setHeader('Cache-Control', 'no-store');
		response.send({
			code: -1
		});
	}
}
