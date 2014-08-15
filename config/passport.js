var passport = require('passport'),
	SteamStrategy = require('passport-steam').Strategy;

passport.serializeUser(function(user, done) {
	done(null, user.id);
});
passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new SteamStrategy({
	returnURL: 'http://localhost:1337/user/login',
	realm: 'http://localhost:1337/',
	apiKey: '788A16D6628A2E5F0E229D6EBB93DE3E'},
	function(identifier, profile, done) {
		User.find({openId: identifier}, function(err, users) {
			if (users.length > 0) return done(err, users[0]);

			User.create({openId: identifier, joinpw: Math.random().toString(36).substring(2, 10), steamid: profile.id}, function(err, user) {
				return done(err, user);
			});
		});
	}
));

