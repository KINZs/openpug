/*
* Pug.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
	unready: function(pug) {
		this.rconn.stopWatching();
	},
	readyup: function(pug) {
		// Set all user states to 'disconnected' and tell clients
		for (i = 0; i < pug.players_ct.length; ++i) {
			pug.players_ct[i].connectState = 'disconnected';
			pug.players_t[i].connectState = 'disconnected';
		}
		Pug.update({id: pug.id}, {players_ct: pug.players_ct, players_t: pug.players_t}).exec(function(err, newpug) {
			if (err) { 
				console.log(err);
			}
			Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
		});

		// User rconwatcher to update client states and tell clients

		var RconWatcher = require('./rconwatcher');
		this.rconn = new RconWatcher(pug.server, pug.port, pug.rconpassword);

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

			for (i = 0; i < pug.players_t.length; ++i) {
				if (pug.players_ct[i].steamid == user.steam64) index_ct = i;
				if (pug.players_t[i].steamid == user.steam64) index_t = i;
			}

			if (index_ct > -1) {
				pug.players_ct[index_ct].connectState = 'disconnected';
				Pug.update({id: pug.id}, {players_ct: pug.players_ct}).exec(function(err, newpug) {
					if (err) {
						console.log(err);
					}
					Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
				});
			}
			if (index_t > -1) {
				pug.players_t[index_t].connectState = 'disconnected';
				Pug.update({id: pug.id}, {players_t: pug.players_t}).exec(function(err, newpug) {
					if (err) {
						console.log(err);
					}
					Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
				});
			}
		});
	},
	addPlayer: function(pug, user, team) {
		delete user.joinpw;
		delete user.openId;
		delete user.createdAt;
		delete user.updatedAt;

		user.connectState = 'idle';

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
			Pug.readyup(pug);
		}
	},
	removePlayer: function(userid, pug) {
		if (pug.state == 'ready') {
			Pug.unready(pug);
		}

		var indexof = -1;
		for (i = pug.players_ct.length-1; i >=0; --i) {
			if (pug.players_ct[i] != undefined && pug.players_ct[i].id == userid) indexof = i;
		}

		if (indexof > -1) {
			// Player found in players_ct!
			// Remove player from players_ct, update database and tell our clients
			pug.players_ct.splice(indexof, 1);

			Pug.update({id: pug.id}, {players_ct: pug.players_ct}).exec(function(err, newpug) {
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

			Pug.update({id: pug.id}, {players_t: pug.players_t}).exec(function(err, newpug) {
				if (err) { console.log(err); }

				Pug.publishUpdate(newpug[0].id, newpug[0].toJSON());
			});
		}
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
	players_ct: {
		type: 'array',
	},	
	players_t: {
		type: 'array',
	},
	currentplayers: function() {
		var len = this.players_ct.length + this.players_t.length;
		if (len == 'undefined') len = 0;
		return len;
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
		return obj;
	},
  }
};