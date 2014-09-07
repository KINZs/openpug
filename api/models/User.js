/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
	beforeUpdate: function(values, cb) {
		// beforeUpdate lifecycle callback, cb() must be called!
		// checks for room in Pug if team and pugid are defined

		User.find({pugid: values.pugid, team: values.team}).exec(function(err, users) {
			if (err) console.log(err);
			if (users.length >= 5) { 
				delete values.team;
			}
			cb();
		});
	},

  attributes: {
	joinpw: {
		type: 'string'
	},
	steamid: {
		type: 'string'
	},
	openId: {
		type: 'string'
	},
	displayName: {
		type: 'string'
	},
	avatar: {
		type: 'string'
	},
	pugid: {
		type: 'int'
	},
	team: {
		type: 'string',
		enum: ['t', 'ct']
	},
	connectState: {
		type: 'string',
		//todo: enum
	},
	ready: {
		type: 'boolean'
	},
	_waiting: {
		type: 'boolean'
	},
	toJSON: function() {
		var obj = this.toObject();
		delete obj.joinpw;	
  		return obj;
		}
	}
};

