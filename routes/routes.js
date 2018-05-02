/**
 * This file is where you define your application routes and controllers.
 *
 * Start by including the middleware you want to run for every request;
 * you can attach middleware to the pre('routes') and pre('render') events.
 *
 * For simplicity, the default setup for route controllers is for each to be
 * in its own file, and we import all the files in the /routes/views directory.
 *
 * Each of these files is a route controller, and is responsible for all the
 * processing that needs to happen for the route (e.g. loading data, handling
 * form submissions, rendering the view template, etc).
 *
 * Bind each route pattern your application should respond to in the function
 * that is exported from this module, following the examples below.
 *
 * See the Express application routing documentation for more information:
 * http://expressjs.com/api.html#app.VERB
 */
module.exports = d => {
	let keystone = d.keystone;
	let express  = d.express;
	let middleware = require('./middleware');
	let importRoutes = keystone.importer(__dirname);

	// Common Middleware
	keystone.pre('routes', middleware.initTracking);
	keystone.pre('routes', middleware.initLocals);
	keystone.pre('render', middleware.flashMessages);
	keystone.set('404',    middleware.handleResourceNotFound);
	keystone.set('500',    middleware.handleInternal);

	// Import Route Controllers
	let routes = {
		views: importRoutes('./views'),
	};

	// Setup Route Bindings
	return function (app) {
		// Views
		app.get('/blog/:category', routes.views.blog);
		app.get('/blog/post/:post', routes.views.post);
		app.all('/contact', routes.views.contact);
		app.all('/action/:action?', routes.views.action);
		app.get('/:page?', routes.views.index);

		// NOTE: To protect a route so that only admins can see it, use the requireUser middleware:
		// app.get('/protected', middleware.requireUser, routes.views.protected);

	};
	
}
