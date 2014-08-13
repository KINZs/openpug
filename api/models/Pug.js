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
	maxplayers: {
		type: 'int',
	},
	currentplayers: {
		type: 'int',
	},
	state: {
		type: 'string',
	}
  }
};

