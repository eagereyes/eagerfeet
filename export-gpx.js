
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

exports.exportGPX = function(dbClient, runID, response) {
	var gpxDoc = builder.create();
	
	var gpxNode = gpxDoc.begin('gpx');
	gpxNode.att('version', '1.1');
	gpxNode.att('creator', 'http://eagerfeet.org/');
	gpxNode.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
	gpxNode.att('xmlns', 'http://www.topografix.com/GPX/1/1');
	gpxNode.att('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/gpx/1/1/gpx.xsd');
	
	dbClient.query('select * from Runs where runID = ?', [runID], function(err, results, fields) {
	
		var run = results[0];
		
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
		
		dbClient.query('select lat, lon, ele, time from Waypoints where runID = ?', [runID], function(err, results, fields) {
			
			results.forEach(function(wp) {
				var trkPt = trkSeg.ele('trkpt');
				trkPt.att('lat', wp.lat);
				trkPt.att('lon', wp.lon);
				
				trkPt.ele('ele').txt(wp.ele);
				
				trkPt.ele('time').txt(ISODateString(wp.time));
			});
			
//			console.log(gpxDoc.toString());
			response.setHeader('Content-Disposition', 'attachment; filename=Run-'+fileNameDateString(run.startTime)+'.gpx');
			response.setHeader('Content-Type', 'application/gpx+xml');
			response.send(gpxDoc.toString());
			
		});
	});
}

