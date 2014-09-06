/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var passport = require("passport");
module.exports = {
	deleteall: function(req,res) {
		User.find({}, function(err, users) {
			users.forEach(function(user) { user.destroy(); });
		});
		res.send(200);
	},
	logout: function(req,res) {
		res.logout();
		res.redirect('/');
	},
	login: function(req,res) {
		passport.authenticate('steam', function(err, user) {
			if ((err) || (!user)) return res.redirect('/loginfail');
			req.logIn(user, function(err) {
				if (err) { 
					console.log(err);
					res.send(500);
					return;
				}
				res.redirect('/pug/list');
				return;
		});
		})(req, res);    
	},

	who: function(req,res) {
		res.json(req.user);
	}
};


