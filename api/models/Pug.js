/*
* Pug.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
	readyup: function(pug) {
		var Rcon = require('rcon');
		var conn = new Rcon(pug.server, pug.port, pug.rconpassword);

		conn.on('error', function(err) { console.log(err); }); // TODO
		conn.on('auth', function() { 
			var ReadyBot = require('readybot');
			var bot = new ReadyBot(conn);
			bot.on('userconnected', function(steamidtxt) {
				console.log(steamidtxt);
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

