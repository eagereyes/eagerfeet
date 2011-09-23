
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

exports.json2GPX = function(waypoints, run) {
	var gpxDoc = builder.create();
	
	var gpxNode = gpxDoc.begin('gpx');
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
		trkPt.att('lat', ''+waypoint.lat);
		trkPt.att('lon', ''+waypoint.lon);
		
		// make sure to coerce number into string, or it does bad things when it sees 0
		trkPt.ele('ele').txt(''+waypoint.alt);
		
		var time = new Date(waypoint.time);
		trkPt.ele('time').txt(ISODateString(time));
	});

	return gpxDoc.toString();
}

