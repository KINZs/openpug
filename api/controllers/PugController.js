/**
 * PugController
 *
 * @description :: Server-side logic for managing pugs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	'list': function(req, res) {
		Pug.find({}, function (err, puglist) {
			if (err) {
				res.send(500);
			} else {
				res.view('pug/list', {pugs: puglist});
			}
		});
	},
	'test': function(req, res) {
		if (req.method == 'POST') {
			console.log("Testing " + req.body.server + " with " + req.body.rconpassword);
			var Rcon = require('rcon');
			var conn = new Rcon(req.body.server, 27015, req.body.rconpassword);
			conn.connect();
			conn.on('auth', function() {
				conn.disconnect();
				res.send(200);
			});
			conn.on('error', function() {
				conn.disconnect();
				res.send(500);
			});
		} else {
			res.send(403);
		}
	},

	'new': function(req, res) {
		if (req.method == 'POST') {
			if (req.body.game == 'csgo') {
				Pug.create({server: req.body.server, port: req.body.port, game: req.body.game,
							map: req.body.map, rconpassword: req.body.rconpassword, maxplayers: 10, currentplayers: 0,
							state: 'validating', joinpassword: req.body.joinpassword}).exec(
							function(err, pug) {
								if (err) { 
									res.send(500);
								} else {
									res.redirect('/pug/list');
							}});
			}
		} else {
			/* insecure io.on('connection', function(socket) {
				socket.on('test_rcon',
				function(rcon) {
					console.log("Testing " + rcon.server + ":" + rcon.port + " with " + rcon.password);
					var Rcon = require('rcon');
					var conn = new Rcon(rcon.server, rcon.port, rcon.password);
					conn.connect();
					conn.on('auth', 
					function() {
						conn.disconnect();
						socket.emit('rcon_success');
					});
					conn.on('error',
					function() {
						conn.disconnect();
						socket.emit('rcon_fail');
					});});}); */
			res.view('pug/new');
		}
	},
};

