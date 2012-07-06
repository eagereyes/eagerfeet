
/**
 * Module dependencies.
 */

var express = require('express')
	, jog = require('jog')
	, mysql = require('mysql')
	, user = require('./user.js')
	, run = require('./run.js')
	, dbConf = require('./db-conf.js').conf
	, routes = require('./routes.js');

var MemcachedStore = require('connect-memcached')(express);

//var dbClient = mysql.createClient(dbConf);

var log = jog(new jog.FileStore('status.log'));

var app = module.exports = express.createServer();

var PORT = 5555;

// Express configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({secret: 'Run, Forrest, run!', store: new MemcachedStore}));
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



app.get('/', routes.index);

app.get('/index-login', routes.index_login);

//app.get('/nike-login', nikeLogin);

//user.loadUsers(dbClient);

app.listen(PORT, function(){
	console.log("Express server listening on port %d", PORT);
});
