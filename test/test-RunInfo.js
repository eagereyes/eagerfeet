
var fs = require('fs');

var should = require('should');
var user = require('../user.js');

var runData;
var runInfo;

describe('encode run data', function() {
	it('setup', function() {
		(function() {
			runData = JSON.parse(fs.readFileSync('test/nike-2009794410.json')).activity;
		}).should.not.throw();
		should.exist(runData);

		(function() {
			runInfo = user.convertRunData('test/nike-2009794410', runData);
		}).should.not.throw();
		should.exist(runInfo);
	});
	
	it('same number of values', function() {
		runInfo.deltaLons.should.have.length(runData.geo.waypoints.length);
		runInfo.deltaLats.should.have.length(runData.geo.waypoints.length);
		runInfo.deltaEles.should.have.length(runData.geo.waypoints.length);

		runInfo.deltaHRs.should.have.length(runData.history[1].values.length);
	});
	
	it('compare HR values', function() {
		var runInfoHR = 0;
		var jsonHR = 0;
		for (var i = 0; i < runInfo.deltaHRs.length; i++) {
			runInfoHR += runInfo.deltaHRs[i];
			jsonHR = runData.history[1].values[i];
			runInfoHR.should.equal(jsonHR);
		}
	});

	it('compare lat/lon/ele values', function() {
		var jsonLat = 0;
		var jsonLon = 0;
		var jsonEle = 0;
		var runInfoLat = 0;
		var runInfoLon = 0;
		var runInfoEle = 0;
		for (var i = 0; i < runData.geo.waypoints.length; i++) {
			jsonLat = runData.geo.waypoints[i].lat;
			jsonLon = runData.geo.waypoints[i].lon;
			jsonEle = runData.geo.waypoints[i].ele;
			runInfoLat += runInfo.deltaLats[i]/1000000;
			runInfoLon += runInfo.deltaLons[i]/1000000;
			runInfoEle += runInfo.deltaEles[i]/100;

			runInfoLat.should.be.within(jsonLat-.0000001, jsonLat+.0000001);
			runInfoLon.should.be.within(jsonLon-.0000001, jsonLon+.0000001);
			runInfoEle.should.be.within(jsonEle-.1, jsonEle+.1);
		}
	});
	
});

