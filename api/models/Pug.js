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

			console.log(user);
			if (!user) {
				console.log("No user " + id);
				return;
			}


				User.find({pugid: pug.id, team: team}).exec(function(err, users) {
					if (err) console.log(err);

					console.log()

					if (users.length >= pug.maxplayers/2) {
						console.log('team full'); 
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
				console.log("No user" + userid);
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
				console.log("No user " + userid);
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
	watch: function(pug) {  // This might be a name collision with one of the Sails model methods
		var RconWatcher = require('./rconwatcher');
		Pug.rconn = new RconWatcher(pug.server, pug.port, pug.rconpassword);


		this.rconn.on('userconnected', function(user) {
			User.findOne({steamid: user.steam64}, function(err, user) {
				if (err) console.log(err);

				if (!user) {
					console.log("No such user in pug: " + user.steam64);
					// Kick user here?
					return;
				}

				user.connectState = 'connected';
				User.update({id: user.id}, {connectState: user.connectState}).exec(function(err, newuser) {
					if (err) console.log(err);

					User.publishUpdate(newuser[0].id, {connectState: user.connectState});
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