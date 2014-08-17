var passport = require('passport'),
	SteamStrategy = require('passport-steam').Strategy;

passport.serializeUser(function(user, done) {
	done(null, user.id);
});
passport.deserializeUser(function(id, done) {
	User.findOne(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new SteamStrategy({
	returnURL: 'http://localhost:1337/user/login',
	realm: 'http://localhost:1337/',
	apiKey: '788A16D6628A2E5F0E229D6EBB93DE3E'},
	function(identifier, profile, done) {
		User.findOne({openId: identifier}, function(err, users) {
			if (users) return done(err, users);

			User.create({openId: identifier, joinpw: Math.random().toString(36).substring(2, 10), displayName: profile.displayName, steamid: profile.id, avatar: profile._json.avatar},function(err, user) {
				return done(err, user);
			});
		});
	}
));

