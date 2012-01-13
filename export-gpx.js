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

var builder = require('xmlbuilder');

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

function fileNameDateString(d) {
    return d.getUTCFullYear() + '' + pad(d.getUTCMonth() + 1) + '' + pad(d.getUTCDate()) + '-'
    + pad(d.getUTCHours()) + '' + pad(d.getUTCMinutes()) + '' + pad(d.getUTCSeconds());
}

function sendGPX(run, heartrates, paces, response, dbClient) {
	var gpxDoc = builder.create();
	
	var gpxNode = gpxDoc.begin('gpx');
	gpxNode.att('version', '1.1');
	gpxNode.att('creator', 'http://eagerfeet.org/');
	gpxNode.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
	gpxNode.att('xmlns:gpxtpx', 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1');
	gpxNode.att('xmlns', 'http://www.topografix.com/GPX/1/1');
	gpxNode.att('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/gpx/1/1/gpx.xsd\n'+
		'http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd');

	var runName = 'Run '+run.runID+', '+run.startTime;
	
	var metadata = gpxNode.ele('metadata');
	metadata.ele('name').txt(runName);
		
	var b = metadata.ele('bounds');
	b.att('minlat', run.minlat);
	b.att('maxlat', run.maxlat);
	b.att('minlon', run.minlon);
	b.att('maxlon', run.maxlon);

	var trk = gpxNode.ele('trk');
	
	trk.ele('name').txt(runName);
	trk.ele('time').txt(run.startTime);
	trk.ele('type').txt('Run');
	
	var trkSeg = trk.ele('trkseg');
	
	dbClient.query('select lat, lon, ele, time from Waypoints where runID = ?', [run.runID], function(err, results, fields) {
		
		var startTime = results[0].time;
		
		var hrOffset = 0;
		
		results.forEach(function(wp) {
			var trkPt = trkSeg.ele('trkpt');
			trkPt.att('lat', wp.lat);
			trkPt.att('lon', wp.lon);
			
			trkPt.ele('ele').txt(wp.ele);
			
			trkPt.ele('time').txt(ISODateString(wp.time));
						
			if (heartrates) {
				var offset = (wp.time-startTime)/1000;
				while ((hrOffset < heartrates.length-1) && (heartrates[hrOffset+1].offset <= offset)) {
					hrOffset += 1;
				}
				
				var ext = trkPt.ele('extensions');
				var trkPtExt = ext.ele('gpxtpx:TrackPointExtension');
				trkPtExt.ele('gpxtpx:hr').txt(''+heartrates[hrOffset].heartrate);
			}
		});
	//			console.log(gpxDoc.toString());
		response.setHeader('Content-Disposition', 'attachment; filename=Run-'+fileNameDateString(run.startTime)+'.gpx');
		response.setHeader('Content-Type', 'application/gpx+xml');
		response.send(gpxDoc.toString());
		
//		dbClient.end();
	});
}

exports.exportGPX = function(dbClient, runID, response) {
	
	dbClient.query('select * from Runs where runID = ?', [runID], function(err, results, fields) {
	
		if (results.length > 0) {
	
			var run = results[0];

			var heartrates = null;
	
			if (run.hasHRData) {
				dbClient.query('select offset, heartrate from Heartrates where runID = ? order by offset', [runID], function(err, results, fields) {
					sendGPX(run, results, null, response, dbClient);
				});
			} else {
				sendGPX(run, null, null, response, dbClient);
			}
		} else {
			console.log('run '+runID+' not found in GPX export');
			response.send('<html><head><title>Not Found!</title></head><body><p>Run could not be retrieved from the database</p></body></html>');
//			dbClient.end();
		}
	});
}

