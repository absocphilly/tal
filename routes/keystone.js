module.exports = async d => {
	let keystone = d.keystone;
	let siteInfo = d.config.site;
	
	// Initialise Keystone with your project's configuration.
	// See http://keystonejs.com/guide/config for available options
	// and documentation.

	keystone.init({
		'name': siteInfo.Name,
		'brand': siteInfo.Name,

		'sass': 'public',
		'static': 'public',
		'favicon': 'public/favicon.ico',
		'views': 'templates/views',
		'view engine': '.hbs',

		'custom engine': d.handlebars.engine,

		'emails': 'templates/emails',

		'auto update': true,
		'session': true,
		'session store' : 'mongo',
		'auth': true,
		'user model': 'User',
		'logger': false,

		'mongo' : 'mongodb://localhost/reach',
		'mongoose' : d.mongoose
	});

	// Load Models
	// keystone.import('models');

	// Setup common locals for your templates. The following are required for the
	// bundled templates and layouts. Any runtime locals (that should be set uniquely
	// for each request) should be added to ./routes/middleware.js
	keystone.set('locals', {
		_: require('lodash'),
		env: keystone.get('env'),
		utils: keystone.utils,
		editable: keystone.content.editable
	});

	// Load Routes
	keystone.pre('routes', d.routes.middleware.rtime);
	keystone.pre('routes', function (req, res, next) {
		req.d = d;
		res.d = d;
		next();
	});
	keystone.set('routes', await d.routes.routes(d));


	// Configure the navigation bar in Keystone's Admin UI
	// keystone.set('nav', {
	// 	posts: ['posts', 'post-categories'],
	// 	enquiries: 'enquiries',
	// 	users: 'users',
	// });

	// Start Keystone to connect to your database and initialise the web server


	if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
		console.log('----------------------------------------'
		+ '\nWARNING: MISSING MAILGUN CREDENTIALS'
		+ '\n----------------------------------------'
		+ '\nYou have opted into email sending but have not provided'
		+ '\nmailgun credentials. Attempts to send will fail.'
		+ '\n\nCreate a mailgun account and add the credentials to the .env file to'
		+ '\nset up your mailgun integration');
	}
}