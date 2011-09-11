require.paths.unshift('./node-runkeeper/runkeeper/lib');

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