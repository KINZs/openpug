/**
 * PugController
 *
 * @description :: Server-side logic for managing pugs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	'list': function(req, res) {
		Pug.find({}, function (err, puglist) {
			if (err) {
				res.send(500);
			} else {
				res.view('pug/list', {pugs: puglist});
			}
		});
	},
	'new': function(req, res) {
		
		res.view('pug/new', {test: 'world'});
	}
};

