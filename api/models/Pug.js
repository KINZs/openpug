/*
* Pug.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
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
	currentplayers: {
		type: 'int',
	},
	state: {
		type: 'string',
	},
	lobbyowner: {
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

