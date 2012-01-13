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


var runkeeper = require('./node-runkeeper/lib/runkeeper');

options = require('./rk-config.js').options;

var client = new runkeeper.HealthGraph(options);

exports.authData = function() {
	return {
		client_id: options.client_id,
		auth_url: options.auth_url,
		redirect_uri: options.redirect_uri
	};
}

exports.getToken = function(code, res) {
	client.getNewToken(code, function(access_token) {
		console.log('token: '+access_token);
		client.access_token = access_token;
		client.profile(function(profile) {
			res.send('Hello, '+profile.name+'!\n');
			console.log('name: '+profile.name);
		});
	});
}