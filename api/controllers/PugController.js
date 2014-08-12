/**
 * PugController
 *
 * @description :: Server-side logic for managing pugs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	'new': function(req, res) {
		res.view('pug/new', {test: 'world'});
	}
};

