/*  
*
 * @description :: Server-side logic for managing pugs
 * @help        :: TODO
 * TODO: Thin out controllers, move this logic to models
 */

module.exports = {
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
	'new': function(req, res) {
		if (req.method == 'POST') {
			if (req.body.game == 'csgo') {
				var Rcon = require('rcon');
				console.log(req.body.server + ":"+req.body.port + ", " + req.body.rconpassword);
				var conn = new Rcon(req.body.server, req.body.port, req.body.rconpassword);
				conn.connect();
				conn.on('auth', function() {
					conn.disconnect();
					Pug.create({connectpassword: Math.random().toString(36).substring(10), server: req.body.server, port: req.body.port, game: req.body.game,
						map: req.body.map, rconpassword: req.body.rconpassword, maxplayers: 2, 
						state: 'filling', nready: 0, nplayers: 0, joinpassword: req.body.joinpassword}).exec(
						function(err, pug) {
							if (err) { 
								res.send(500);							
								} else {
								Pug.publishCreate(pug);							
								res.redirect('/pug/view/' + pug.id);
					}});
				});
					
				conn.on('error', function(err) {
					conn.disconnect();
					res.view('pug/rconerror', {error: err, user: req.user});
				});
			}
		} else {
			res.view('pug/new', {user: req.user});
		}
	},

	'join': function(req, res) {
		if (req.method == 'POST') {
			if (req.body.pugid != undefined && req.body.team != undefined) {
				Pug.findOne({id: req.body.pugid}, function(err, pug) {
					if (err) console.log(err);

					Pug.addPlayer(pug, req.session.passport.user, req.body.team);
				});
			}
		}
	},
	'leave': function(req, res) {
		if (req.body.pugid != undefined && req.session.passport.user != undefined) {
			Pug.findOne({id: req.body.pugid}).exec(function(err, pug) {
				if (err) console.log(err);

				Pug.removePlayer(pug, req.session.passport.user);
			});
			res.send(200);
		} else {
			res.send(404);
		}	
	},
	'ready': function(req, res) {
		if (req.method == 'POST') {
			if (req.body.pugid != undefined && req.session.passport.user != undefined) {
				User.findOne({pugid: req.body.pugid, id: req.session.passport.user}).exec(function(err, user) {
					if (err) console.log(err);

					if (user) {
						Pug.findOne({id: req.body.pugid}, function(err, pug) {
							if (err) console.log(err);
							if (!user.ready) {
								Pug.update({id: req.body.pugid}, {nready: +pug.nready+1}).exec(function(err, newpug) {
									if (err) console.log(err);
									Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
									User.update({id: user.id}, {ready: true}).exec(function(err, newuser) {
										if (err) console.log(err);
										User.publishUpdate(newuser[0].id, newuser[0].toJSON());
									});
								});
							}
						});
					}
				});
				res.send(200);
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