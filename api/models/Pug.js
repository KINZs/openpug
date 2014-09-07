/*
* Pug.js
*
* @description :: This model handles the logic and data for CounterStrike: Global Offensive pick-up-games.
* @docs        :: TODO
* pug.states = 
*		- validating
*		- filling
*		- readyup
*		- connecting
*		- active
* rewrite pug logic using User model w/pugid!
*/



module.exports = {
	addPlayer: function(pug, userid, team) {
		//Let's find our user and add him to the team
		User.findOne({id: userid}, function(err, user) {
			if (err) console.log(err);

			// increment pug.nplayers, and tell our cleints
			if (user.pugid != pug.id) {
				++pug.nplayers;
				if (pug.nplayers == pug.maxplayers) {
					pug.state = 'readyup';
				}
				Pug.update({id: pug.id}, {nplayers: pug.nplayers, state: pug.state}).exec(function(err, newpug) {
					if(err) console.log(err);
					Pug.publishUpdate(newpug[0].id, {nplayers: pug.nplayers, state: pug.state});
				});
			} 
			User.update({id: user.id}, {pugid: pug.id, team: team, connectState: 'idle', ready: false}).exec(function(err, newuser) {
				if (err) console.log(err);
				User.publishUpdate(newuser[0].id, {pugid: pug.id, team: team, connectState: 'idle', ready: false});
			});
		});
	},
	removePlayer: function(pug, userid) {
		User.findOne({id: userid, pugid: pug.id}).exec(function(err, user) {
			if (err) console.log(err);

			if (user) {
				// set nready to 0, nplayers to nplayers - 1, and state to filling
				--pug.nplayers;
				pug.state = 'filling';
				Pug.update({id: pug.id}, {nready: 0, nplayers: pug.nplayers, state: pug.state}).exec(function(err, newpug) {
					if (err) console.log(err);
					Pug.publishUpdate(newpug[0].id, {nready: 0, nplayers: pug.nplayers, state: pug.state});
				});
				// Clear the user from the pug
				User.update({id: user.id}, {pugid: null, team: null, connectState: null, ready: false}).exec(function(err, newuser) {
					if (err) console.log(err);
					User.publishUpdate(newuser[0].id, {pugid: null, team: null, connectState: null, ready: false});
				});
			}
		});
		// Unready all users in the pug
		User.update({pugid: pug.id}, {ready: false}).exec(function(err, players) {
			if (err) console.log(err);

			players.forEach(function(user) {
				User.publishUpdate(user.id, {ready: false});
			});
		});
	},

	test: function() { console.log(User); },
	/*connectplayers: function(pug) {
		// Set all user states to 'disconnected' and tell clients
		for (i = 0; i < pug.players_ct.length; ++i) {
			pug.players_ct[i].connectState = 'disconnected';
			pug.players_t[i].connectState = 'disconnected';
		}
		pug.state = 'connecting';
		Pug.update({id: pug.id}, {state: pug.state, players_ct: pug.players_ct, players_t: pug.players_t}).exec(function(err, newpug) {
			if (err) { 
				console.log(err);
			}
			Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
		});

		// User rconwatcher to update client states and tell clients

		var RconWatcher = require('./rconwatcher');
		this.rconn = new RconWatcher(pug.server, pug.port, pug.rconpassword);
		console.log(this.rconn);

		this.rconn.on('userconnected', function(user) {
			var index_t = -1;
			var index_ct = -1;

			for (i = 0; i < pug.players_ct.length; ++i) {
				if (pug.players_ct[i].steamid == user.steam64) index_ct = i;
				if (pug.players_t[i].steamid == user.steam64) index_t = i;
			}
			if (index_ct > -1) {
				pug.players_ct[index_ct].connectState = 'connected';
				Pug.update({id: pug.id}, {players_ct: pug.players_ct}).exec(function(err, newpug) {
					if (err) {
						console.log(err);
					}
					Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
				});
			}
			if (index_t > -1 ) {
				pug.players_t[index_t].connectState = 'connected';
				Pug.update({id: pug.id}, {players_ct: pug.players_ct}).exec(function(err, newpug) {
					if (err) {
						console.log(err);
					}
					Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
				});
			}
		});
		this.rconn.on('userdisconnected', function(user) {
			var index_t = -1;
			var index_ct = -1;

			pug.state = 'connecting';

			for (i = 0; i < pug.players_t.length; ++i) {
				if (pug.players_ct[i].steamid == user.steam64) index_ct = i;
				if (pug.players_t[i].steamid == user.steam64) index_t = i;
			}

			if (index_ct > -1) {
				pug.players_ct[index_ct].connectState = 'disconnected';
				Pug.update({id: pug.id}, {players_ct: pug.players_ct, state: pug.state}).exec(function(err, newpug) {
					if (err) {
						console.log(err);
					}
					Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
				});
			}
			if (index_t > -1) {
				pug.players_t[index_t].connectState = 'disconnected';
				Pug.update({id: pug.id}, {players_t: pug.players_t, state: pug.state}).exec(function(err, newpug) {
					if (err) {
						console.log(err);
					}
					Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
				});
			}
		});
		this.rconn.on('full', function() {
			pug.state = 'active';
			Pug.update({id: pug.id}, {state: pug.state}).exec(function(err, newpug) {
				Pug.publishUpdate(newpug[0].id, newpug.toJSON());
			});
		});
	},
	addPlayer: function(pug, user, team) {

		if (team == 'ct') {
			if (pug.players_ct.length == pug.maxplayers/2) {
				// Team is full!
				return;
			}
			var indexof_user = -1;
			for (i = pug.players_ct.length-1; i >=0; --i) {
				if (pug.players_ct[i].id == user.id) indexof_user = i;
			}
			if (indexof_user > -1) {
				// User is already on CT!
				return;
			}

			for (i = pug.players_t.length-1; i >=0; --i) {
				if (pug.players_t[i].id == user.id) indexof_user = i;
			}
			if (indexof_user > -1) {
				// User was already on T!  Removing user from players_t.....
				pug.players_t.splice(indexof_user, 1);
			}
			// Team isn't full, user wasn't already on CT, and if user was on players_t, it was removed.
			// Push user onto players_ct
			pug.players_ct.push(user);

			// Update database and publish update to clients
			Pug.update({id: pug.id}, {players_t: pug.players_t, players_ct: pug.players_ct}).exec(
				function(err, updatedpug) {
					Pug.publishUpdate(updatedpug[0].id, updatedpug[0].toJSON());
					return;
			});
		}
		if (team == 't') {
			if (pug.players_t.length == pug.maxplayers/2) {
				// Team is full!
				return;
			}
			var indexof_user = -1;
			for (i = pug.players_t.length-1; i >=0; --i) {
				if (pug.players_t[i].id == user.id) indexof_user = i;
			}
			if (indexof_user > -1) {
				// User is already on T!
				return;
			}

			for (i = pug.players_ct.length-1; i>=0; --i) {
				if (pug.players_ct[i].id == user.id) indexof_user = i;
			}
			if (indexof_user > -1) {
				// User was already on CT!  Removing user from players_ct.....
				pug.players_ct.splice(indexof_user, 1);
			}

			// Team isn't full, user wasn't already on T, and if user was on players_ct, it was removed.
			// Push user onto players_t
			pug.players_t.push(user);

			// Update database and publish update to clients
			Pug.update({id: pug.id}, {players_t: pug.players_t, players_ct: pug.players_ct}).exec(
				function(err, updatedpug) {
					Pug.publishUpdate(updatedpug[0].id, updatedpug[0].toJSON());
					return;
			});
		}

		if (pug.currentplayers() == pug.maxplayers) {
			pug.state = 'readyup';
			Pug.update({id: pug.id}, {state: pug.state}).exec(function(err, newpug) {
				if (err) console.log(err);
				Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
			});
		//	Pug.readyup(pug);
		}
	},
	removePlayer: function(userid, pug) {

		var indexof = -1;
		for (i = pug.players_ct.length-1; i >=0; --i) {
			if (pug.players_ct[i] != undefined && pug.players_ct[i].id == userid) indexof = i;
		}

		if (indexof > -1) {
			// Player found in players_ct!
			// Remove player from players_ct, update database and tell our clients
			pug.players_ct.splice(indexof, 1);
			if (pug.state == 'readyup') {
				pug.state = 'filling';
				pug.nready = 0;
			}
			if (pug.state == 'connecting') {
				pug.state = 'filling';
				pug.nready = 0;
				this.rconn.stopWatching();
			}

			Pug.update({id: pug.id}, {players_ct: pug.players_ct, state: pug.state, nready: +pug.nready}).exec(function(err, newpug) {
				if (err) { console.log(err); }

				Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
			});
			return;
		}

		for (i = pug.players_t.length-1; i >=0; --i) {
			if (pug.players_t[i] != undefined && pug.players_t[i].id == userid) indexof = i;
		}

		if (indexof > -1) {
			// Player found in players_t!
			// Remove player from players_tt, update database and tell our clients
			pug.players_t.splice(indexof, 1);
			if (pug.state == 'readyup') {
				pug.state = 'filling';
				pug.nready = 0;
			}
			if (pug.state == 'connecting') {
				pug.state = 'filling';
				pug.nready = 0;
				this.rconn.stopWatching();
			}


			Pug.update({id: pug.id}, {players_t: pug.players_t, state: pug.state, nready: +pug.nready}).exec(function(err, newpug) {
				if (err) { console.log(err); }

				Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
			});
		}
	},
	readyPlayer: function(pug, userid) {
		for (i = 0; i < pug.maxplayers/2; ++i) {
			if (pug.players_ct[i] != undefined && pug.players_ct[i].id == userid && pug.players_ct[i].readyState != 'ready') {
				pug.players_ct[i].readyState = 'ready';
				pug.nready = +pug.nready + 1;
				Pug.update({id: pug.id}, {players_ct: pug.players_ct, nready: +pug.nready}).exec(function(err, newpug) {
					if (err) console.log(err);
					Pug.publishUpdate(newpug[0].id, {state: pug.state, id: newpug[0].id, nready: +pug.nready, maxplayers: pug.maxplayers});
				});
			}
			if (pug.players_t[i] != undefined && pug.players_t[i].id == userid && pug.players_t[i].readySTate != 'ready') {
				pug.players_t[i].readyState = 'ready';
				pug.nready = +pug.nready + 1;
				Pug.update({id: pug.id}, {players_t: pug.players_t, nready: +pug.nready}).exec(function(err, newpug) {
					if (err) console.log(err);
					Pug.publishUpdate(newpug[0].id, {state: pug.state, id: newpug[0].id, nready: +pug.nready, maxplayers: pug.maxplayers});
				});
			}
		}
		console.log(pug.nready + '/' + pug.maxplayers + ' ready...');
		if (pug.nready == pug.maxplayers) {
			pug.state = 'connecting';
			Pug.update({id: pug.id}, {state: pug.state}).exec(function(err, newpug) {
				if (err) {
					console.log(err);
					return;
				}
				Pug.publishUpdate(newpug[0].id, {state: pug.state, steam_connect: pug.connectlink()});
			});
			Pug.connectplayers(pug);
			console.log("All ready, launch into server");

		}
	}, */
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