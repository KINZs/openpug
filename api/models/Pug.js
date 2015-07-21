/*
* Pug.js
*
* @description :: This model handles the logic and data for CounterStrike: Global Offensive pick-up-games.
* @docs        :: TODO
* pug.states = 
*		- validating
*   -
*		- filling
*		- readyup
*		- connecting
*		- active
* 	- dead?
*/



module.exports = {
	configureServer: function(pug) {
		var fs = require('fs');

		fs.readFile('cfg/cevo.cfg', {encoding: 'utf8'}, function(err, data) {
			if (err) throw err;

			var cfgcommands = data.split('\n');
			var Rcon = require('rcon');
			var conn = new Rcon(pug.server, pug.port, pug.rconpassword);
			conn.on('auth', function() {
				conn.send('map ' + pug.map);
				setTimeout(function() {
					var conn = new Rcon(pug.server, pug.port, pug.rconpassword);
					conn.connect();
					conn.on('auth', function() {
						cfgcommands.forEach(function(command) {
							conn.send(command);
						});
						conn.disconnect();
					});
				}, 15000);
				conn.disconnect();
			});
			conn.connect();
		});
	},
	addPlayer: function(pug, userid, team) {
		//Let's find our user and add him to the team
		User.findOne({id: userid}, function(err, user) {
			if (err) console.log(err);

			if (!user) {
				console.log("No user " + id + " [Pug.addPlayer]");
				return;
			}

			User.find({pugid: pug.id, team: team}).exec(function(err, users) {
				if (err) console.log(err);

				if (users.length >= pug.maxplayers/2) {
					// Team full!
					return;
				}
				if (user.pugid != pug.id) {
					++pug.nplayers;
					if (pug.nplayers == pug.maxplayers) {
						pug.state = 'readyup';
					}
				}
				Pug.update({id: pug.id}, {nplayers: pug.nplayers, state: pug.state, nready: 0}).exec(function(err, newpug) {
					if(err) console.log(err);
					Pug.publishUpdate(newpug[0].id, {nplayers: pug.nplayers, state: pug.state, nready: 0});
				}); 
				User.update({id: user.id}, {pugid: pug.id, team: team, connectState: 'idle', ready: false}).exec(function(err, newuser) {
					if (err) console.log(err);
					User.publishUpdate(newuser[0].id, {pugid: pug.id, team: team, connectState: 'idle', ready: false});
				});
			});
			
		});
	},
	removePlayer: function(pug, userid) {
		User.findOne({id: userid, pugid: pug.id}).exec(function(err, user) {
			if (err) console.log(err);

			if (!user) {
				console.log("No user " + userid);
				return;
			}
			// set nready to 0, nplayers to nplayers - 1, and state to filling
			--pug.nplayers;
			pug.state = 'filling';
			if (Pug.rconn != undefined) {
				Pug.rconn.stopWatching();
				delete Pug.rconn;
			}
			Pug.update({id: pug.id}, {nready: 0, nplayers: pug.nplayers, state: pug.state}).exec(function(err, newpug) {
				if (err) console.log(err);
				Pug.publishUpdate(newpug[0].id, {nready: 0, nplayers: pug.nplayers, state: pug.state});
			});
			// Clear the user from the pug
			User.update({id: user.id}, {pugid: null, team: null, connectState: null, ready: false}).exec(function(err, newuser) {
				if (err) console.log(err);
				User.publishUpdate(newuser[0].id, {pugid: null, team: null, connectState: null, ready: false});
			});
		});
		// Unready all users in the pug
		User.update({pugid: pug.id}, {ready: false}).exec(function(err, players) {
			if (err) console.log(err);

			players.forEach(function(user) {
				User.publishUpdate(user.id, {ready: false});
			});
		});
	},
	readyPlayer: function(pug, userid) {
		User.findOne({pugid: pug.id, id: userid}, function(err, user) {
			if (err) console.log(err);

			if (!user) {
				console.log("No user " + userid + " [Pug.readyPlayer]");
				return;
			}

			user.ready = true;
			User.update({id: user.id}, {ready: user.ready}).exec(function(err, newuser) {
				if (err) console.log(err);
				User.publishUpdate(newuser[0].id, {ready: user.ready});
			});
			++pug.nready;
			if (pug.nready == pug.maxplayers) {
				pug.state = 'connecting';
				Pug.watch(pug);
			}
			Pug.update({id: pug.id}, {nready: pug.nready, state: pug.state}).exec(function(err, newpug) {
				Pug.publishUpdate(newpug[0].id, {nready: pug.nready, state: pug.state});
			});
		});
	},
	watch: function(pug) {  // This might be a name collision with the Sails model methods
		var RconWatcher = require('./rconwatcher');
		Pug.rconn = new RconWatcher(pug.server, pug.port, pug.rconpassword);


		this.rconn.on('userconnected', function(user) {
			User.findOne({steamid: user.steam64}, function(err, user) {
				if (err) console.log(err);

				if (!user) {
					console.log("No such user in pug: " + user.steam64 + " [Pug.watch()]");
					// Kick user here?
					return;
				}

				user.connectState = 'connected';
				User.update({id: user.id}, {connectState: user.connectState}).exec(function(err, newuser) {
					if (err) console.log(err);

					User.publishUpdate(newuser[0].id, {connectState: user.connectState});
				});
				User.find({pugid: pug.id, connectState: 'connected'}).exec(function(err, users) {
					if (err) throw err;

					if (users.length == pug.maxplayers) {
						pug.state = 'active';
						Pug.update({id: pug.id}, {state: pug.state}).exec(function(err, newpug) {
							Pug.publishUpdate(newpug[0].id, {state: pug.state});
						});
						var Rcon = require('rcon');
						var conn = new Rcon(pug.server, pug.port, pug.rconpassword);
						conn.on('auth', function() {
							conn.send('mp_restartgame 1');
							conn.send('say "[OpenPUG] all players connected, going live!"');
							conn.send('mp_restartgame 1');
							conn.send('say "[OpenPUG] --LIVE--"');
							conn.disconnect();
						});
						conn.connect();
					}
				});
			});
		});
		this.rconn.on('userdisconnected', function(user) {
			User.findOne({steamid: user.steam64}, function(err, user) {
				if (err) console.log(err);
				if (!user) {
					return;
				}

				user.connecState = 'disconnected';
				User.update({id: user.id}, {connectState: user.connectState}).exec(function(err, newuser) {
					if (err) console.log(err);

					User.publishUpdate(newuser[0].id, {connectState: user.connectState});
				});
				pug.state = 'connecting';
				Pug.update({id: pug.id}, {state: pug.state}).exec(function(err, newpug) {
					if (err) throw err;

					Pug.publishUpdate(newpug[0].id, {state: pug.state});
				});
			});
		});
	},
  attributes: {
	server: {
		type: 'string'
	},
	port: {
		type: 'int',
	},
	game: {
		type: 'string',
		enum: ['csgo', 'tf2']
	},
	map: {
		type: 'string'
	},
	rconpassword: {
		type: 'string',
	},
	connectpassword: {
		type: 'string',
	},
	joinpassword: {
		type: 'string',
	},
	maxplayers: {
		type: 'int',
	},
	// Deprecated!
	players_ct: {
		type: 'int',
	},	
	players_t: {
		type: 'int',
	},
	nplayers: {
		type: 'int'
	},

	nready: {
		type: 'int',
	},
	currentplayers: function() {
		var ret = 0;
		User.find({pugid: this.id}).exec(function(err, users) {
			if (err) console.log(err);
			if (users.length != 'undefined') ret = users.length;
		});
		return ret;
	},
	state: {
		type: 'string',
	},
	lobbyowner: {
		type: 'string',
	},
	picklogic: {
		type: 'string',
	},
	connectlink: function () {
		return "steam://connect/" + this.server + ":" + this.port + "/" + this.connectpassword;
	},
	toJSON: function () {
		var obj = this.toObject();
		delete obj.rconpassword;
		delete obj.joinpassword;
		delete obj.connectpassword;
		return obj;
	},
  }
};