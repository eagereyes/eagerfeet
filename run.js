
var resource = {
	index: function(req, res){
		res.send(runs);
	},

	show: function(req, res){
		var user = users[req.params.user];
		res.send(user);
	},

	edit: function(req, res){
		res.send('editing ' + req.params.user);
	},

	destroy: function(req, res){
		delete users[req.params.user];
		res.send('removed ' + req.params.user);
	},  
};

exports.mapResources = function(app) {
	var userResource = app.resource('runs', resource);
}