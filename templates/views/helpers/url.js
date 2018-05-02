module.exports = function(d) {
	// Init
	let hbs     = d.hbs,
	    helpers = {};

	// My URL
	helpers.myurl = function myurl(path, options) {
		path || (path = options.hash[path]);
		if (path) {
			path += '?' + helpers.pageMarker(options);
		}
		else {
			return '';
		}
	}

	helpers.pageMarker = function(options) {
		return 'm=12345';
	}

	// Finalize
	return helpers;
}