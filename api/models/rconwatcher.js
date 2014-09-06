var Rcon = require('rcon'),
	events = require('events'),
	util   = require('util');
	steam  = require('steamidconvert')();

function _poll(conn) {
	conn.send("status");
	console.log("polling...");
};

function RconWatcher(host, port, rconpw) { 
	// ? if (!(this instanceof ReadyBot)) return new ReadyBot(host, port, rconpw);
	this.connectedusers = [];
	this.conn = new Rcon(host, port, rconpw);

	this.conn.on('error', function(err) {
		console.log(err); 
		if (err.code == 'EPIPE') {
			this.disconnect();
			this.connect();
		}
	});

	var watcher = this;

	this.conn.on('auth', function() {
		var conn = this;
		watcher.statusPoll = setInterval(_poll, 10000, watcher.conn); // Interval for polling rcon status
		watcher.conn.on('response', function(res) {
			var t_users = [];
			var steam32_regx = /STEAM_[0-5]:[01]:\d+/; // Regex for 32-bit Steam IDs.
			var rsplit = res.split(" "); // Split server response
			rsplit.forEach(function(chunk) {
				if (steam32_regx.test(chunk)) {
					var matches = chunk.match(steam32_regx);
					t_users.push(matches[0]);
				}
			});
			t_users.forEach(function(user) {
				if (watcher.connectedusers.indexOf(user) == -1) {
					watcher.connectedusers.push(user);
										//!! HACK !! HACK !!HACK
					if (watcher.connectedusers.length == 10) {
						watcher.emit('full');
					}
					var emitted_user = {steam32: user, steam64: steam.convertTo64(user)}
					watcher.emit('userconnected', emitted_user);
				}
			});
			watcher.connectedusers.forEach(function(user) {
				if (t_users.indexOf(user) == -1) {
					watcher.connectedusers.splice(watcher.connectedusers.indexOf(user), 1);
					var emitted_user = {steam32: user, steam64: steam.convertTo64(user)}
					watcher.emit('userdisconnected', emitted_user);
				}
			});
		});
	});
	this.conn.connect();
	events.EventEmitter.call(this);
};
util.inherits(RconWatcher, events.EventEmitter);
RconWatcher.prototype.stopWatching = function() {
	clearInterval(this.statusPoll);
	this.conn.disconnect();
	console.log("stopped");
}
module.exports = RconWatcher;
