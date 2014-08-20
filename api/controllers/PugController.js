/*  
*
 * @description :: Server-side logic for managing pugs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

function waitForUserToJoin(user, pug)
{
	var Rcon = require('rcon');
	var conn = new Rcon(pug.server, pug.port, pug.rconpassworD);
	conn.on('auth', function() {
		conn.send('sv_password ' + user.joinpw);
		User.update(user, {_waiting: true}).exec(function(err, updated) {
			User.publishUpdate(updated[0].id, {_waiting: true});
		});
		Pug.update({id: pug.id}, {state: 'waiting for ' + user.displayName}).exec(function(err, updated) {
			Pug.publishUpdate(updated[0].id, {state: updated[0].state});
		});
		conn.disconnect();
	});
	conn.connect();
}

function readyUP(pug) {
	// This should be a module
	
	// Check RCON connectivity (should have been checked at lobby creation, but let's check it again.)
	var Rcon = require('rcon');
	var conn = new Rcon(pug.server, pug.port, pug.rconpassword);
	conn.on('error', function(err) { console.log(err); }); // todo
	conn.on('auth', function() {
		var ReadyBot = require('readybot');
		var bot = new ReadyBot(conn);
		// Ready the first user (ct[0])
		User.findOne({id: pug.players_ct[0].id}, function(err, usr) {
			waitForUserToJoin(usr, pug);
		});
		bot.on('userconnected', function(steamidtxt) {
			console.log(steamidtxt);
			var index_ct = -1;
			var index_t = -1;
			var steam = require('steamidconvert')();
			var steamid64 = steam.convertTo64(steamidtxt);
			for (i = 0; i < pug.players_ct.length; ++i) {
				if (players_ct.steamid == steamid64) index_ct = i;
				if (players_t.steamid == steamid64) index_t = i;
			}
			if (index_ct > -1) {
				User.findOne({steamid: pug.players_t[index_ct]}, function(err, user) {
					waitForUserToJoin(user, pug);
				});
			}
			if (index_t > -1) {
				if ((index_t + 1) == pug.players_ct.length) return;

				User.findOne({steamid: pug.players_ct[index_t+1]}, function(err, user) {
					waitForUserToJoin(user, pug);
				});
			}
		}); 
	});
	conn.connect();
}

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
								map: req.body.map, rconpassword: req.body.rconpassword, maxplayers: 2, 
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
						if (pug.players_ct.length == pug.maxplayers/2) {
							res.send(403);
							return;
						}
						User.findOne({id: req.session.passport.user}, function(err, user) {
							if(err) res.send(500);
							var indexof_user = -1;
							for (i = pug.players_ct.length-1; i >= 0; --i) {
								if (typeof pug.players_ct[i] == 'undefined') continue;
								if (pug.players_ct[i].id == user.id) indexof_user = i;
							}
							if (indexof_user > -1) {
								res.send(200);
								return;
							}
							for (i = pug.players_t.length-1; i >= 0; --i) {
								if (typeof pug.players_t[i] == 'undefined') continue;
								if (pug.players_t[i].id == user.id) indexof_user = i;
							}
							if (indexof_user > -1) {
								pug.players_t.splice(indexof_user, 1);
							}
							delete user.joinpw;	
							delete user.openId;
							delete user.createdAt;
							delete user.updatedAt;
							pug.players_ct.push(user);
							
							// ReadyUP logic
							if (pug.currentplayers() == pug.maxplayers) {
								readyUP(pug);
							}
					
							Pug.update({id: req.body.pugid}, {players_t: pug.players_t, players_ct: pug.players_ct}).exec(
							function(err, updatedpug) {
								Pug.publishUpdate(updatedpug[0].id, updatedpug[0].toJSON());
								res.send(200);
							});
						});
					} else if (req.body.team == 't') {
						if (pug.players_t.length == pug.maxplayers/2) {
							res.send(403);
							return;
						}
						User.findOne({id: req.session.passport.user}, function(err, user) {
							if (err) res.send(500);
							var indexof_user = -1;
							for (i = pug.players_t.length-1; i >=0; --i) {
								if (typeof pug.players_t[i] == 'undefined') continue;
								if (pug.players_t[i].id == user.id) indexof_user = i;
							}
							if (indexof_user > -1) {
								res.send(200);
								return;
							}
							for (i = pug.players_ct.length-1; i >= 0; --i) {
								if (typeof pug.players_ct[i] == 'undefined') continue;
								if (pug.players_ct[i].id == user.id) indexof_user = i;
							}
							if (indexof_user > -1) {
								pug.players_ct.splice(indexof_user, 1);
							}
							delete user.joinpw;
							delete user.openId;
							delete user.createdAt;
							delete user.updatedAt;
							pug.players_t.push(user);

							if (pug.currentplayers() == pug.maxplayers) {
								readyUP(pug);
							}
							Pug.update({id: req.body.pugid}, {players_t: pug.players_t, players_ct: pug.players_ct}).exec(
							function(err, updatedpug) {
								Pug.publishUpdate(updatedpug[0].id, updatedpug[0].toJSON());
								res.send(200);
							});
						});
					}
				});
			}
		}
	},
	'leave': function(req, res) {
		if (req.body.pugid != undefined) {
			Pug.findOne({id: req.body.pugid}, 
			function(err, pug) {
				var indexof_user = -1;
				var tlen = pug.players_t.length;
				var ctlen = pug.players_ct.length;
				if (tlen == 'undefined') tlen = 0;
				if (ctlen == 'undefined') ctlen = 0;

				if (tlen > 0) {
					// Search players_t for user id, remove it if found
					for (i = tlen-1; i > -1; --i) {
						if (pug.players_t[i].id == req.session.passport.user) indexof_user = i;
					}
					if (indexof_user > -1) {
						pug.players_t.splice(indexof_user, 1);
						Pug.update({id: req.body.pugid}, {players_t: pug.players_t}).exec(
						function(err, updatedpug) {
							if (err) res.send(500);
							Pug.publishUpdate(updatedpug[0].id, updatedpug[0].toJSON());
						});
						res.send(200);
					}
				}
		
				indexof_user = -1;	
				if (ctlen > 0) {
					// Search players_ct for user id, remove it if found	
					for (i = ctlen-1; i>-1; --i) {
						if (pug.players_ct[i].id == req.session.passport.user) indexof_user = i;
					}
					if (indexof_user > -1) {
						pug.players_ct.splice(indexof_user, 1);
						Pug.update({id: req.body.pugid}, {players_ct: pug.players_ct}).exec(
						function(err, updatedpug) {
							if (err) res.send(500);
							Pug.publishUpdate(updatedpug[0].id, updatedpug[0].toJSON());
						});
						res.send(200);
					}
				}			
				// If we're here, it means the currently logged in user was not entered into the pug
				res.send(500);
			});
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

