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

var APIPREFIX = 'http://eagerfeet.org/api/';

var unit = 'mi';

var runs = [];

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

// from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date
function pad(n) {
    return n < 10 ? '0' + n : n;
}

var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

var felt = ["", "Awesome", "So-So", "Sluggish", "Injured"];

var terrain = ["", "Road", "Trail", "Treadmill", "Track"];

var weather = ["", "Sunny", "Cloudy", "Rainy", "Snowy"];

function formatDate(date) {
	return months[date.getMonth()]+" "+date.getDate()+", "+date.getFullYear();
}

function formatTime(date) {
	return date.getHours() + ":" + pad(date.getMinutes());
}

function formatDuration(duration) {
	var hours = Math.floor(duration/3600000);
	var minutes = Math.floor(duration/60000)-hours*60;
	var seconds = Math.round((duration % 60000)/1000);
	if (hours > 0)
		return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
	else
		return pad(minutes) + ':' + pad(seconds);
}

function formatDistance(distance) {
	if (unit == 'mi')
		return parseFloat(distance/1.609344).toFixed(2) + ' mi';
	else
		return parseFloat(distance).toFixed(2) + ' km';
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
	var distanceSpans = $('.distance');
	for (var i = 0; i < runs.length; i++) {
		distanceSpans[i].innerHTML = formatDistance(runs[i].distance);
	}
}

function pollRuns(data) {
	if (data.code == 0) {
		$('#'+data.runID).removeClass('disabled').addClass('success').attr('href', APIPREFIX+'getGPX/'+data.runID);
		$.get(APIPREFIX+'poll/'+data.userID, pollRuns);
	}
}


function lookup() {
	// to avoid errors when the clicky tracking code is removed
	if (typeof(clicky) === 'undefined') {
		clicky = { // note that a 'var' here would get hoisted, which would always be undefined
			log: function() { }
		}
	}
	var cookieUnit = getCookie('unit');
	if (cookieUnit) {
		unit = cookieUnit;
	}
	$('#alert').hide();
	$('#progress').show();
	$('#submit').addClass('disabled');
	var match = $('#userID')[0].value.match(/(\d+)/);
	if (match != null) {
		var userID = match[0];
		$('#userID')[0].value = userID;
		$.get(APIPREFIX+'runs/'+userID, function(data) {
			$('#progress').hide();
			$('#submit').removeClass('disabled');
			var gpsLinks = 0;
			if (data.code == 0) {
				var html = '<p>Found '+data.runs.length+' runs, '+data.numGPS+' with GPS data.</p>';
				runs = data.runs;
				var date = new Date();
				// ugly, but IE doesn't support forEach
				for (var i = 0; i < data.runs.length; i++) {
					var run = data.runs[i];
					date.setISO8601(run.startTime);
					html += '<div class="run">';
					if (!run.gpsData)
						html += '<div class="download">no GPS data</i></div>';
					else {
						html += '<div class="download"><a class="btn ';
						if (run.inDB)
							html += 'success" href="'+APIPREFIX+'getGPX/'+run.runID+'"';
						else
							html += 'disabled" ';
						html += 'id="'+run.runID+'">Download GPX File</a></div>';
						gpsLinks += 1;
					}
					html += '<p><span class="title">Run '+formatDate(date)+'</span>, '+formatTime(date)+'</p>';
					html += '<p><span class="distance">'+formatDistance(run.distance)+'</span>';
					html += ', ' + formatDuration(run.duration);
					if (run.calories > 0)
						html += ', ' + Math.round(run.calories) + ' calories';
					if (run.terrain > 0)
						html += ', ' + terrain[run.terrain];
					if (run.weather > 0)
						html += ', ' + weather[run.weather];
					if (run.howFelt > 0)
						html += ', ' + felt[run.howFelt];
					if (run.description.length > 0)
						html += '</p><p>Comment: <i>'+run.description+'</i></p>';
					html += '</div>\n';
				}
				$('#runs').html(html);
				clicky.log('/#success/'+data.runs.length+'/'+gpsLinks,
					'Success: '+data.runs.length+' runs, '+gpsLinks+' with GPS data');
				setCookie('userID', userID, 90);
				$.get(APIPREFIX+'poll/'+data.userID, pollRuns);
			} else {
				$('#errormsg').html('<p>'+data.message+'</p>');
				$('#alert').show();
				clicky.log('#notfound', 'userID not found');
			}
		}).error(function() {
			$('#errormsg').html('<p><b>Error:</b> Server is down, please try again in a few minutes.</p>');
			$('#alert').show();
			$('#progress').hide();
			$('#submit').removeClass('disabled');
			clicky.log('/#serverdown', 'Server down');
		});
	} else {
		$('#errormsg').html('<p><b>Error:</b> Please enter your <b>numeric</b> user ID. See the sidebar on the right for instructions.</p>');
		$('#alert').show();
		$('#progress').hide();
		$('#submit').removeClass('disabled');
		clicky.log('/#nomatch', 'No numeric userID in text field');
	}
	return false;
}
