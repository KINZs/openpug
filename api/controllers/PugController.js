/**
 * PugController
 *
 * @description :: Server-side logic for managing pugs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	'deleteall': function(req, res) {
		Pug.find({}, function(err, puglist) {
			puglist.forEach(function(pug) { pug.destroy() });
		});
		res.send(200);
	},
	'list': function(req, res) {
		Pug.find({}, function (err, puglist) {
			if (err) {
				res.send(500);
			} else {
				Pug.subscribe(req.socket, puglist);
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
				var Rcon = require('rcon');
				var conn = new Rcon(req.body.server, req.body.port, req.body.rconpassword);
				conn.connect();
				conn.on('auth', function() {
					conn.disconnect();
					Pug.create({server: req.body.server, port: req.body.port, game: req.body.game,
								map: req.body.map, rconpassword: req.body.rconpassword, maxplayers: 10, currentplayers: 0,
								state: 'validating', players: {ct: [], t: []}, joinpassword: req.body.joinpassword}).exec(
								function(err, pug) {
									if (err) { 
										res.send(500);							
									} else {
										res.redirect('/pug/view?p=' + pug.id);
									}});
					});
				conn.on('error', function() {
					conn.disconnect();
					res.view('pug/rconerror');
				});
			}
		} else {
			res.view('pug/new');
		}
	},
	'join': function(req, res) {
		if (req.method == 'POST') {
			if (req.body.pugid != undefined && req.body.jointeam != undefined) {
				Pug.findOne({id: req.body.pugid}, 
				function(err, pug) {
					if (err) res.send(500);
					if (req.body.jointeam == 'ct') {
						pug.players.ct.append(req.user.id);
					} else if (req.body.jointeam == 't') {
						pug.players.t.append(req.user.id);
					} else if (req.body.jointeam == 'red') {
						pug.players.red.append(req.user.id);
					} else if (req.body.jointeam == 'blu') {
						pug.players.blu.append(req.user.id);
					}
				});
			}
		}
	},
	'view': function(req, res) {
		var pugid = req.param('p');
		console.log(pugid);
		if(pugid == undefined) {
			res.redirect('/pug/list');
		} else {
			Pug.findOne({id: pugid}).exec(
			function(err, foundpug) {
				if (err) {
					res.send(500);
				} else {
					if (foundpug == undefined) {
						// No such pug!
						res.redirect('/pug/list');
					} else {
						console.log(foundpug.players);
						res.view('pug/pugview', {pug: foundpug});
					}
				}
			});
		}
	},
};

