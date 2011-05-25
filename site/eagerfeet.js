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

var timeout;

var unit = 'mi';

var runs;

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
	return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

function formatDistance(distance) {
	if (unit == 'mi')
		return parseFloat(distance/1.609344).toFixed(2) + ' mi';
	else
		return parseFloat(distance).toFixed(2) + ' km';
}

function clearGPXLinks() {
	$('.gpxlink').html('<i>GPX link expired, please reload.</i>');
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
	$('#progress').show();
	$('#submit').hide();
	var match = $('#userID')[0].value.match(/(\d+)/);
	if (match != null) {
		var userID = match[0];
		$('#userID')[0].value = userID;
		$.get('http://eagerfeet.org/api/runs/'+userID, function(data) {
			$('#progress').hide();
			$('#submit').show();
			var gpsLinks = 0;
			if (data.code == 0) {
				var html = '<p>Found '+data.runs.length+' runs, '+data.numGPS+' with GPS data. '
				if (data.numGPS > 1)
					html += '<span class="gpxlink"><a href="'+data.zipfile+'">Download All (ZIP file)</a></span>';
				html += '</p>';
				html += '<p class="units">Distance Unit: <input type="radio" name="unit" value="Miles" ';
				if (unit == 'mi') {
					html += 'checked ';
				}
				html += 'onclick="setUnit(\'mi\')">Miles</input> <input type="radio" name="unit" value="Kilometers"'
				if (unit == 'km') {
					html += 'checked ';
				}
				html += 'onclick="setUnit(\'km\')">Kilometers</input></p>';
				runs = data.runs;
				var date = new Date();
				// ugly, but IE doesn't support forEach
				for (var i = 0; i < data.runs.length; i++) {
					var run = data.runs[i];
					date.setISO8601(run.startTime);
					html += '<div class="run">';
					html += '<p><span class="title">Run '+formatDate(date)+'</span>, '+formatTime(date)+' &mdash; ';
					if (run.fileName.length == 0)
						html += '<i>no GPS data</i></p>';
					else {
						html += '<span class="gpxlink"><a href="'+run.fileName+'">GPX File</a></span></p>';
						gpsLinks += 1;
					}
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
				$('#map').hide();
				if (timeout)
					clearTimeout(timeout);
				timeout = setTimeout(clearGPXLinks, 20 * 60 * 1000);
				clicky.log('/#success/'+data.runs.length+'/'+gpsLinks,
					'Success: '+data.runs.length+' runs, '+gpsLinks+' with GPS data');
				setCookie('userID', userID, 90);
			} else {
				$('#runs').html('<p class="error">'+data.message+'</p>');
				clicky.log('#notfound', 'userID not found');
			}
		}).error(function() {
			$('#runs').html('<p class="error">Error: Server is down, please try again in a few minutes.</p>');
			$('#progress').hide();
			$('#submit').show();
			clicky.log('/#serverdown', 'Server down');
		});
	} else {
		$('#runs')[0].innerHTML = '<p class="error">Error: Please enter your <b>numeric</b> user ID. See the sidebar on the right for instructions.</p>';
		$('#progress').hide();
		$('#submit').show();
		clicky.log('/#nomatch', 'No numeric userID in text field');
	}
	return false;
}
