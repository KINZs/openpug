var Rcon = require('rcon'),
	events = require('events'),
	util = require('util');

// Readybot connects to the PUG server over rcon and informs the backend when users have connected.
// This should be a SourceMod plugin for several reasons.

function _poll(bot) {
	bot.conn.send("status");
};

function ReadyBot(conn) { 
	if (!(this instanceof Pugbot)) return new Pugbot(conn);
	
	this.conn = conn;
	this.conn.connect();
	this.connectedusers = [];
	this.conn.on('response', function(res) { 
		var sregx = /STEAM_[0-5]:[01]:\d+/;

		var rsplit = res.split(" ");
		rsplit.forEach(function(chunk) {
			if (sregx.test(chunk)) {
				var matches = chunk.match(sregx);
				if (connectedusers.indexOf(matches[0]) == -1) {
					connectedusers.push(matches[0]);
					this.emit('userconnected', matches[0]);
				}
			}
		});
	});
	this.statusPoll = setInterval(_poll, 5000, this);
	events.EventEmitter.call(this);
};
util.inherits(ReadyBot, events.EventEmitter);
module.exports = ReadyBot;

