
/**
 * Module dependencies.
 */

var express = require('express')
	, mysql = require('mysql')
	, user = require('./user.js')
	, run = require('./run.js')
	, conf = require('./conf.js')
	, routes = require('./routes.js');

var MemcachedStore = require('connect-memcached')(express);

var dbClient = mysql.createClient(conf.dbConf);

var app = module.exports = express.createServer();

var PORT = 5555;

// Express configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.set('view options', { layout: false });
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({secret: 'Run, Forrest, run!', cookie: {maxAge: 30 * 24 * 60 * 60 * 1000}, store: new MemcachedStore}));
	app.use(app.router);
	app.use(express.static(__dirname + '/static'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	app.use(express.errorHandler());
});


// Routes

app.get('/', function(req, res) {
	routes.index(req, res, conf.nikeClientID);
});

app.get('/nike-login', function(req, res) {
	req.session.userID = user.login(dbClient, req.query.nuid, req.query.oauth_token, req.query.access_token);
	routes.redirectLogin(req, res);
});

app.get('/export', function(req, res) {
	if (req.session.userID == undefined) {
		res.render('redirect', {title: 'Redirecting ...', redirectURL: 'http://eagerfeet.org/'})
	} else {
		user.getActivities(dbClient, req.session.userID, res);
	}
});

app.get('/export-gpx/:runID', function(req, res) {
	run.exportGPX(req, res, req.params.runID, dbClient);
});

app.get('/updateRunList', function(req, res) {
	user.updateRunList(req.session.userID, res);
});

// Impersonate a user, for testing. This is obviously only possible on my development machine
app.get('/impersonate/:uid', function(req, res) {
	if (conf.stagingServer) {
		req.session.userID = req.params.uid;
	}
	res.render('redirect', {title: 'Redirecting ...', redirectURL: 'http://localhost:5555/'})
});

user.loadUsers(dbClient);

app.listen(PORT, function(){
	console.log("eagerfeet server listening on port %d", PORT);
});
