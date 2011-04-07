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
var libxml = require('libxmljs');
var fs = require('fs');
var crypto = require('crypto');
var express = require('express');

var RUNLISTSERVER = 'nikerunning.nike.com';

var RUNLISTPATH = '/nikeplus/v2/services/app/run_list.jsp?userID=';

var RUNDATAPATH = '/nikeplus/v2/services/app/get_gps_detail.jsp?_plus=true&format=json&id=';

var DELETETIMEOUT = 1500;

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

var gpxAttrs = {
	'version':   '1.1',
	'creator':   'http://eagerfeet.org/',
	'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
	'xmlns':     'http://www.topografix.com/GPX/1/1',
	'xsi:schemaLocation': 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/gpx/1/1/gpx.xsd'
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

function convertRunData(dirName, userID, runs, index, response) {
	var run = runs[index];
	serverRequest(RUNDATAPATH + run.id, function(body) {
		runData = JSON.parse(body);
		if (runData.plusService.status == 'success') {
			var doc = new libxml.Document();
			var gpxNode = doc.node('gpx', gpxAttrs);
			var metadata = gpxNode.node('metadata');
			metadata.node('name', {}, 'Run '+run.id+', '+run.startTime);
			
			var bounds = {
				minlat:  100000,
				maxlat: -100000,
				minlon:  100000,
				maxlon: -100000
			};
			
			var waypoints = runData.plusService.route.waypointList;
			
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
			
			metadata.node('bounds', bounds);
			
			var trk = gpxNode.node('trk');
			
			trk.node('name', {}, 'Run '+run.id+', '+run.startTime);
			trk.node('time', {}, run.startTime);
			trk.node('type', {}, 'Run');
			
			var trkSeg = trk.node('trkseg');
			
			waypoints.forEach(function(waypoint) {
				var coords = {
					'lat': waypoint.lat,
					'lon': waypoint.lon
				}
				
				var trkPt = trkSeg.node('trkpt', coords);
				
				trkPt.node('ele', {}, waypoint.alt);
				
				var time = new Date(waypoint.time);
				trkPt.node('time', {}, ISODateString(time));
			});
			
			var filename = dirName + '/Run_' + run.startTime + '.gpx';
			run.fileName = filename;
			var stream = fs.createWriteStream(filename, WRITEOPTIONS);
			stream.on('open', function(fd) {
				stream.end(doc.toString(), 'utf8');
				console.log(filename);
			});
			stream.on('close', function() {
				run.lat = (bounds.minlat+bounds.maxlat)/2;
				run.lon = (bounds.minlon+bounds.maxlon)/2;

				logFile.write(md5Sum(userID+':'+run.id) + ',' +
					ISODateString(new Date()) + ',' +
					run.lat.toFixed(2) + ',' + run.lon.toFixed(2) + '\n');

				delete run.id;

				var allDone = true;
				runs.forEach(function(r) {
					allDone = allDone & r.fileName != null;
				});
				if (allDone) {
					response.send({
						code: 0,
						runs: runs
					});
				}
				setTimeout(function() {
					fs.unlink(filename, function() {
						console.log(filename+' deleted.');
						fs.rmdir(dirName, function() {
							// ignore if there's an error
						});
					});
				}, DELETETIMEOUT);
//				console.log('closed');
			});
		} else {
			response.send({
				code: -1,
				message: "Error retrieving data, please try again."
			});
		}
	});
}

function makeUserRunList(userID, response) {
	serverRequest(RUNLISTPATH + userID, function (body) {
	//    console.log('BODY: ' + body);
	
		var runList = libxml.parseXmlString(body);
		
		var success = runList.get('/plusService/status').text();
		if (success != "success") {
			response.send({
				code: -1,
				message: "Error: User not found."
			});
		} else {
	    	
			runElements = runList.find('/plusService/runList/run');
	
			var runs = [];
		
			var dirName = 'site/data/' + md5Sum(userID + (new Date()).toUTCString());
		
			fs.mkdir(dirName, 0766, function() {
				for (var i = 0; i < runElements.length; i++) {
					var run = runElements[i];
					var r = {
						id:				run.attr('id').value(),
						startTime:		run.get('startTime').text(),
						distance:		run.get('distance').text(),
						calories:		run.get('calories').text(),
						description:	run.get('description').text(),
						howFelt:		run.get('howFelt').text(),
						weather:		run.get('weather').text(),
						terrain:		run.get('terrain').text(),
						fileName:		null
					}
					runs.push(r);
					(function(index) {
						process.nextTick(function() {
			//		    	console.log(run.id+' at '+run.startTime+': '+run.description);
							convertRunData(dirName, userID, runs, index, response);
						});
					})(i);
				}
			});
		}
	});
}

process.on('exit', function () {
	logFile.end();
});

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});

logFile = fs.createWriteStream(LOGFILENAME, LOGFILEOPTIONS);

var app = express.createServer();

app.get('/api/runs/:userID', function(req, res) {
	makeUserRunList(req.params.userID, res);
});

app.listen(5555);