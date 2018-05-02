let d = module.exports = {};
d.Promise  = require('bluebird');
d.short    = require('short-uuid');
d.keystone = require('keystone');
d._        = require('lodash');
d.express  = d.keystone.express;
d.app      = d.express.application;

d.config                = {};
d.config.callsToAction  = require('./config/callsToAction.json');
d.config.flashTypes     = require('./config/flashTypes.json');
d.config.flashTypeNames = Object.keys(d.config.flashTypes);
d.config.nav            = require('./config/nav.json');
d.config.pages          = require('./config/pages.json');
d.config.site           = require('./config/site.json');

// Create View Engine
d.handlebars = (d.hbs = require('express-handlebars')).create({
	layoutsDir: 'templates/views/layouts',
	partialsDir: 'templates/views/partials',
	defaultLayout: 'main',
	helpers: require('./templates/views/helpers')(d),
	extname: '.hbs',
});
d.Handlebars = d.handlebars.handlebars;

let errors = {
	TypeError       : TypeError,
	OptionsError    : Error,
	ValidationError : Error
}

// Load Asynchronous Dependencies
d._ready = (async function loadAsyncDependencies() {
	// Load Errors
	d.Error     = Error;
	d.UserError = await require('./lib/errors/UserError')(d);

	// Load Utils
	d.util               = await require('./lib/util/util')(d);
	d.errors             = errors;
	d.util.ids           = await require('./lib/util/ids')(d);
	d.util.stats         = await require('./lib/util/stats')(d);
	d.util.generateModel = await require('./lib/util/generateModel')(d);
	d.util.nav           = await require('./lib/util/nav')(d);

	// Compile Config
	d.util.nav.compileMenu(d.config.nav.mainMenu);

	// Initialize App
	d.routes = {};
	d.routes.keystone = require('./routes/keystone');
	d.routes.routes   = require('./routes/routes');
	await d.routes.keystone(d);

	// Load Handlers
	d.handlers = await d.Promise.props({
		userFormEmailHandler : require('./lib/handlers/userFormEmailHandler')(d)
	});

	// Load Models
	d.lists          = {};
	d.models         = {};
	d.tokens         = {};
	d.tokensByPrefix = {};
	let tokens = await d.Promise.props({
		User    : d.util.generateModel(require('./models/User')),
		Contact : d.util.generateModel(require('./models/Contact')),
		Enquiry : d.util.generateModel(require('./models/Enquiry'))
	});
	for (let key in tokens) {
		if (!(tokens.hasOwnProperty(key))) continue;
		let token = tokens[key];
		Object.defineProperty(d.lists,          key,          { value : token.List,  writable : false, enumerable : true });
		Object.defineProperty(d.models,         key,          { value : token.Model, writable : false, enumerable : true });
		Object.defineProperty(d.tokens,         key,          { value : token,       writable : false, enumerable : true });
		Object.defineProperty(d.tokensByPrefix, token.prefix, { value : token,       writable : false, enumerable : true });
	}
	Object.freeze(d.lists);
	Object.freeze(d.models);
	Object.freeze(d.tokens);
	Object.freeze(d.tokensByPrefix);
})();