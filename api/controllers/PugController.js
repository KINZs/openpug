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
				res.view('pug/list', {user: req.user, pugs: puglist })
			}
		});
	},
	'homepage': function(req, res) {
		res.view('welcomepage', {user: req.user});
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
				console.log(req.body.server + ":"+req.body.port + ", " + req.body.rconpassword);
				var conn = new Rcon(req.body.server, req.body.port, req.body.rconpassword);
				conn.connect();
				conn.on('auth', function() {
					conn.disconnect();
					Pug.create({server: req.body.server, port: req.body.port, game: req.body.game,
								map: req.body.map, rconpassword: req.body.rconpassword, maxplayers: 10, currentplayers: 0,
								state: 'validating', players_ct: [], players_t: [], joinpassword: req.body.joinpassword}).exec(
								function(err, pug) {
									if (err) { 
										res.send(500);							
										} else {
											Pug.publishCreate(pug);							
										res.redirect('/pug/view?p=' + pug.id);
									}});
					});
					
				conn.on('error', function(err) {
					conn.disconnect();
					res.view('pug/rconerror', {error: err});
				});
			}
		} else {
			res.view('pug/new', {user: req.user});
		}
	},
	'join': function(req, res) {
		if (req.method == 'POST') {
			if (req.body.pugid != undefined && req.body.team != undefined) {
				Pug.findOne({id: req.body.pugid}, 
				function(err, pug) {
					if (err) res.send(500);
					if (req.body.team == 'ct') {
						if (pug.players_ct.indexOf(req.session.passport.user) > -1) {
							// Player has already joined!
							res.send(200);
							return;
						}
						if (pug.players_t.indexOf(req.session.passport.user) > -1) {
							// Switch from Terrorist to Counter-Terrorist
							pug.players_t.splice(pug.players_t.indexOf(req.session.passport.user), 1);
						}
						pug.players_ct.push(req.session.passport.user);
					} else if (req.body.team == 't') {
						if (pug.players_t.indexOf(req.session.passport.user) > -1) {
							// Player has already joined, nothing to be done
							res.send(200);
							return;
						}
						if (pug.players_ct.indexOf(req.session.passport.user) > -1) {
							//Switch from Counter-Terrorist to Terrorist
							pug.players_ct.splice(pug.players_ct.indexOf(req.session.passport.user), 1);
						}
						pug.players_t.push(req.session.passport.user);
					}
					Pug.update({id: req.body.pugid}, {players_t: pug.players_t, players_ct: pug.players_ct}).exec(
					function(err, updatedpug) {
						Pug.publishUpdate(updatedpug[0].id, {players_ct: pug.players_ct, players_t: pug.players_t});
					});
					res.send(200);
				});
			}
		}
	},
	'view': function(req, res) {
		if(req.params.id == undefined) {
			res.redirect('/pug/list');
		} else {
			Pug.findOne({id: req.params.id}).exec(
			function(err, foundpug) {
				if (err) {
					res.send(500);
				} else {
					if (foundpug == undefined) {
						// No such pug!
						res.redirect('/pug/list');
					} else {
						Pug.subscribe(req.socket, foundpug);
						res.view('pug/pugview', {user: req.user, pug: foundpug});
					}
				}
			});
		} 
	},
};

