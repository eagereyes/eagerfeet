
var unit = 'mi';

// from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date
function pad(n) {
    return n < 10 ? '0' + n : n;
}

function formatDuration(duration) {
	var hours = Math.floor(duration/3600);
	var minutes = Math.floor(duration/60)-hours*60;
	var seconds = Math.round(duration % 60);
	if (hours > 0)
		return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
	else
		return pad(minutes) + ':' + pad(seconds);
}

var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(date) {
	return months[date.getMonth()]+" "+date.getDate()+", "+date.getFullYear();
}

function formatTime(date) {
	return date.getHours() + ":" + pad(date.getMinutes());
}

function formatDistance(meters) {
	if (unit == 'mi')
		return parseFloat(meters/1609.344).toFixed(2) + ' mi';
	else
		return parseFloat(meters/1000).toFixed(2) + ' km';
}

function setCookie(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) {
        	return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

function deleteCookie(name) {
    setCookie(name,"",-1);
}

function setUnit(newUnit) {
	unit = newUnit;
	setCookie('unit', unit, 10000);
/*
	var distanceSpans = $('.distance');
	for (var i = 0; i < runs.length; i++) {
		distanceSpans[i].innerHTML = formatDistance(runs[i].distance, 2);
	}
*/
}

function toggleUnits() {
	if (unit == 'km') {
		setUnit('mi');
	} else {
		setUnit('km');
	}
	document.location.reload(true);
}

function downloadGPX(runID) {
	window.location = '/export-gpx/'+runID;
	d3.select('a#download-'+runID).classed('btn-info', false);
	d3.select('a#download-'+runID).select('i').classed('icon-white', false);
}

function makeDownloadButton(run) {
	var html = '<div class="downloadbtn">';
	if (run.hasGPSData == 'yes') {
		html += '<a id="download-'+run.runID+'" class="btn btn-small';
		html += (run.exported=='no')?' btn-info':'';
		html += '" href="javascript:downloadGPX(\''+run.runID+'\');">Download GPX';
		if (run.hasHRData == 'yes') {
			html += '+<i class="icon-heart '+((run.exported=='no')?'icon-white':'')+'"></i>';
		}
		html += '</a></div>';
/*
	} else if (run.hasGPSData == 'no') {
		html += '<p><small>(no GPS data)</small></p></div>';
  	} else {
		html += '<p><small>(error checking for GPS data)</small></p></div>'
	}
*/
	} else {
		html += '</div>';
	}
	return html;
}

function makeRunList() {
	// not very elegant, but solves the problem that runs are otherwise inserted out-of-order
	$('div#run-list').html('');
	d3.select('#run-list').selectAll('.run')
		.data(runs, function(d) {return d.runID; })
		.enter().append('div')
		.attr('id', function(run) { return run.runID; })
		.classed('run', true)
		.html(function(run) { return makeDownloadButton(run)
								+ '<p><b>'+formatDate(run.startTime) + '</b> at ' + formatTime(run.startTime) + ', '
								+ formatDistance(run.distance) + ', '
								+ formatDuration(run.duration) + ' ';
		});
}

function updateRunList() {
	makeRunList();
	setTimeout(function() {
		d3.json('/updateRunList', function(data) {
			data.newRuns.forEach(function(run) {
				run.startTime = new Date(run.startTime);
			});
			runs = runs.concat(data.newRuns);
			runs.sort(function(a, b) { return b.startTime - a.startTime; });
			if (data.done) {
				makeRunList();
				$('div#checking').hide('fast');
			} else {
				updateRunList();
			}
		});
	}, 1000);
}

function initializeRuns() {

	var cookieUnit = getCookie('unit');
	if (cookieUnit) {
		unit = cookieUnit;
	}

	runs.forEach(function(run) {
		run.startTime = new Date(run.startTime);
	});

	updateRunList();

}