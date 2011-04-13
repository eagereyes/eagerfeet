/*
	Copyright (c) 2011, Robert Kosara <rkosara@me.com>
	
	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted, provided that the above
	copyright notice and this permission notice appear in all copies.
	
	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
	WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
	ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
	WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
	ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
	OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

var http = require('http');
var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var builder = require('xmlbuilder');
var xml = require("node-xml");

var RUNLISTSERVER = 'nikerunning.nike.com';

var RUNLISTPATH = '/nikeplus/v2/services/app/run_list.jsp?userID=';

var RUNDATAPATH = '/nikeplus/v2/services/app/get_gps_detail.jsp?_plus=true&format=json&id=';

var DELETETIMEOUT =  20 * 60 * 1000; // files are deleted after 20 minutes
var DELETEFREQUENCY = 3 * 60 * 1000; // cleanup runs every three minutes

var LOGFILENAME = 'eagerfeet-log.txt'

var LOGFILEOPTIONS = {
	flags: 'a',
	encoding: 'utf8',
	mode: 0666
}

var logFile;

// from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date
function pad(n) {
    return n < 10 ? '0' + n : n;
}

// from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date
function ISODateString(d) {
    return d.getUTCFullYear() + '-'
    + pad(d.getUTCMonth() + 1) + '-'
    + pad(d.getUTCDate()) + 'T'
    + pad(d.getUTCHours()) + ':'
    + pad(d.getUTCMinutes()) + ':'
    + pad(d.getUTCSeconds())
    + 'Z';
}

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

function fileNameDateString(d) {
    return d.getUTCFullYear() + '' + pad(d.getUTCMonth() + 1) + '' + pad(d.getUTCDate()) + '-'
    + pad(d.getUTCHours()) + '' + pad(d.getUTCMinutes()) + '' + pad(d.getUTCSeconds());
}

      
function serverRequest(path, resultFunc) {

	var options = {
		host: RUNLISTSERVER,
		port: 80,
		path: path
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

var WRITEOPTIONS = {
	flags: 'w',
	encoding: 'utf8',
	mode: 0666
}

function md5Sum(string) {
	var md5 = crypto.createHash('md5');
	md5.update(string);
	return md5.digest('hex');
}

function json2GPX(waypoints, run) {
	var gpxNode = builder.begin('gpx');
	gpxNode.att('version', '1.1');
	gpxNode.att('creator', 'http://eagerfeet.org/');
	gpxNode.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
	gpxNode.att('xmlns', 'http://www.topografix.com/GPX/1/1');
	gpxNode.att('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/gpx/1/1/gpx.xsd');
	
	var metadata = gpxNode.ele('metadata');
	metadata.ele('name').txt('Run '+run.id+', '+run.startTime);
	
	var bounds = {
		minlat:  100000,
		maxlat: -100000,
		minlon:  100000,
		maxlon: -100000
	};
		
	waypoints.forEach(function(waypoint) {
		if (waypoint.lon < bounds.minlon)
			bounds.minlon = waypoint.lon;
		if (waypoint.lon > bounds.maxlon)
			bounds.maxlon = waypoint.lon;
		
		if (waypoint.lat < bounds.minlat)
			bounds.minlat = waypoint.lat;
		if (waypoint.lat > bounds.maxlat)
			bounds.maxlat = waypoint.lat;
	});
	
	var b = metadata.ele('bounds');
	b.att('minlat', bounds.minlat);
	b.att('maxlat', bounds.maxlat);
	b.att('minlon', bounds.minlon);
	b.att('maxlon', bounds.maxlon);

	run.lat = (bounds.minlat+bounds.maxlat)/2;
	run.lon = (bounds.minlon+bounds.maxlon)/2;
	
	var trk = gpxNode.ele('trk');
	
	trk.ele('name').txt('Run '+run.id+', '+run.startTime);
	trk.ele('time').txt(run.startTime);
	trk.ele('type').txt('Run');
	
	var trkSeg = trk.ele('trkseg');
	
	waypoints.forEach(function(waypoint) {
		
		var trkPt = trkSeg.ele('trkpt');
		trkPt.att('lat', waypoint.lat);
		trkPt.att('lon', waypoint.lon);
		
		trkPt.ele('ele').txt(waypoint.alt);
		
		var time = new Date(waypoint.time);
		trkPt.ele('time').txt(ISODateString(time));
	});

	return builder.toString();
}

function checkComplete(runs, response, userID, startTime) {
	var allDone = true;
	runs.forEach(function(r) {
		allDone &= r.fileName != null;
	});
	if (allDone) {
		response.setHeader('Cache-Control', 'no-store');
		response.send({
			code: 0,
			runs: runs
		});
		console.log('All done for '+userID+' after '+((new Date())-startTime)+'ms');
	}
}

function convertRunData(dirName, userID, runs, index, response, startTime) {
	var run = runs[index];
	if (run.gpxId.length > 0) {
		serverRequest(RUNDATAPATH + run.id, function(body) {
			runData = JSON.parse(body);
			
			if (runData.plusService.status == 'success') {
				
				var gpx = json2GPX(runData.plusService.route.waypointList, run);
				
				var runDate = new Date();
				runDate.setISO8601(run.startTime);
				var filename = dirName + '/Run-' + fileNameDateString(runDate) + '.gpx';
				var stream = fs.createWriteStream('site/'+filename, WRITEOPTIONS);
				stream.on('open', function(fd) {
					stream.write('<?xml version="1.0" encoding="UTF-8"?>', 'utf8');
					stream.end(gpx, 'utf8');
//					console.log(filename);
				});
				stream.on('close', function() {
					logFile.write(md5Sum(userID + runs[0].startTime)+','+md5Sum(userID+':'+run.id) + ',' +
						ISODateString(new Date()) + ',' +
						run.lat.toFixed(2) + ',' + run.lon.toFixed(2) + '\n');
	
					delete run.id;
	
					run.fileName = filename;
	
					checkComplete(runs, response, userID, startTime);
	
				});
			} else if (runData.plusService.status == 'failure') {
				delete run.id;
				delete run.gpxId;
				run.fileName = '';
				checkComplete(runs, response, userID, startTime);
			} else {
				response.send({
					code: -1,
					message: "Error retrieving data, please try again."
				});
				console.log('Error getting data for '+userID);
			}
		});
	} else {
		delete run.id;
		delete run.gpxId;
		run.fileName = '';
		checkComplete(runs, response, userID, startTime);
	}
}

function parseXML(xmlString, callback) {

	var status = '';
	var runs = [];

	var enclosingElement = '';

	var currentRun = null;

	var parser = new xml.SaxParser(function(cb) {
		cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
			enclosingElement = elem;
			if (elem == 'run') {
				currentRun = {
					id:				attrs[0][1],
					startTime:		'',
					distance:		'',
					calories:		'',
					description:	'',
					howFelt:		'',
					weather:		'',
					terrain:		'',
					gpxId:			'',
					fileName:		null
				};
				runs.push(currentRun);
			}
		});
		cb.onCharacters(function(chars) {
			if (enclosingElement == 'startTime')
				currentRun.startTime += chars;
			else if (enclosingElement == 'distance')
				currentRun.distance += chars;
			else if (enclosingElement == 'calories')
				currentRun.calories += chars;
			else if (enclosingElement == 'description')
				currentRun.description += chars;
			else if (enclosingElement == 'howFelt')
				currentRun.howFelt += chars;
			else if (enclosingElement == 'weather')
				currentRun.weather += chars;
			else if (enclosingElement == 'terrain')
				currentRun.terrain += chars;
			else if (enclosingElement == 'gpxId')
				currentRun.gpxId += chars;
			else if (enclosingElement == 'status')
				status += chars;
		});
		cb.onEndDocument(function() {
			callback(status, runs);
		});
		cb.onWarning(function(msg) {
//			console.log('PARSER WARNING: '+msg);
		});
		cb.onError(function(msg) {
//			cosole.log('PARSER ERROR: '+JSON.stringify(msg));
			callback('failure', runs);
		});
	});
	
	parser.parseString(xmlString);
}

function makeUserRunList(userID, response, startTime) {
	serverRequest(RUNLISTPATH + userID, function (body) {
	
		parseXML(body, function(status, runs) {
			
			if (status != "success") {
				response.send({
					code: -1,
					message: 'Error: User '+userID+' not found.'
				});
				console.log('User '+userID+' not found after '+((new Date())-startTime)+'ms');
			} else {
	    	
				var dirName = 'data/' + md5Sum(userID + (new Date()).toUTCString());
			
				fs.mkdir('site/'+dirName, 0755, function() {
					for (var i = 0; i < runs.length; i++) {
						(function(index) {
							convertRunData(dirName, userID, runs, index, response, startTime);
						})(i);
					}
				});
			}
		});
	});
}

function cleanup() {
	var now = new Date();
	fs.readdirSync('site/data').forEach(function(dir) {
		var dirName = 'site/data/'+dir;
		if (now-fs.statSync(dirName).ctime > DELETETIMEOUT) {
			fs.readdirSync(dirName).forEach(function(fileName) {
				fs.unlink(dirName+'/'+fileName, function() {
					// ignore
				});
			});
			fs.rmdir(dirName, function() {
				console.log(dirName+' deleted.');
			});
		}
	});
	setTimeout(cleanup, DELETEFREQUENCY);	
}


process.on('exit', function () {
	logFile.end();
});

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});

logFile = fs.createWriteStream(LOGFILENAME, LOGFILEOPTIONS);

cleanup();

var app = express.createServer();

app.get('/api/runs/:userID', function(req, res) {
	console.log('NEW REQUEST for '+req.params.userID);
	makeUserRunList(req.params.userID, res, new Date());
});

app.get('/api/ping', function(req, res) {
	res.send({code: 0});
});

app.listen(5555);