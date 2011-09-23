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

var crypto = require('crypto');
var express = require('express');
var sqlite3 = require('sqlite3');

var runkeeper = require('./runkeeper.js');

var nike = require('./nike.js');

var RUNSDBFILENAME = 'runs.db';

var runsDB;

function md5Sum(string) {
	var md5 = crypto.createHash('md5');
	md5.update(string);
	return md5.digest('hex');
}



process.on('exit', function () {

});

process.on('uncaughtException', function (err) {
	console.log((new Date())+' :: Caught exception: ' + err + '\n' + err.stack + '\n');
});

//runsDB = new sqlite3.Database(RUNSDBFILENAME);

var app = express.createServer();

app.get('/api2/runs/:userID', function(req, res) {
	nike.makeUserRunList(req.params.userID, res, new Date());
});

app.get('/api2/poll/:userID', function(req, res) {
	nike.poll(req.params.userID, res);
});

app.get('/api2/ping', function(req, res) {
	res.setHeader('Cache-Control', 'no-store');
	res.send('OK\n');
});

app.get('/api2/rk/authData', function(req, res) {
	res.send(runkeeper.authData());
});

//app.get('/api2/rk/login/:userID', function(req, res) {
//	console.log(req.params.userID+', '+req.query.code);
app.get('/api2/rk/login', function(req, res) {
	console.log('code: '+req.query.code);
	runkeeper.getToken(req.query.code, res);
//	res.send('Success!\n');
});

app.listen(5556);