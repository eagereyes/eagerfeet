var crypto = require('crypto');

function md5sumRun(runID, userID, startTime, distance, duration, calories, howFelt, weather, terrain, note, minLat, minLon, dateAdded) {
	var md5sum = crypto.createHash('md5');
	
	md5sum.update(''+runID);
	md5sum.update(''+userID);
	md5sum.update(''+startTime);
	md5sum.update(''+distance);
	md5sum.update(''+duration);
	md5sum.update(''+calories);
	md5sum.update(''+howFelt);
	md5sum.update(''+weather);
	md5sum.update(''+terrain);
	md5sum.update(''+note);
	md5sum.update(''+minLat);
	md5sum.update(''+minLon);
	md5sum.update(''+dateAdded);
	
	return md5sum.digest('hex');
}

exports.md5sumRun = md5sumRun;

function md5ifyRuns() {
	var mysql = require('mysql');
	
	var dbconf = require('./db-conf.js').dbconf;
	
	var dbClient = mysql.createClient(dbconf);
	
	dbClient.query('select * from Runs where md5sum is null', function(err, results, fields) {
		results.forEach(function(run) {
			var md5sum = md5sumRun(run.runID, run.userID, run.startTime, run.distance, run.duration, run.calories, run.howFelt, run.weather, run.terrain, run.note, run.minlat, run.minlon, run.dateAdded);
			dbClient.query('update Runs set md5sum = ? where runID = ?', [md5sum, run.runID]);
			console.log(run.runID + ': ' + md5sum);
		});
		
		dbClient.end();
	});
	
}

// md5ifyRuns();



