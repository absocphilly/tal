let d = module.exports = {};
d.Promise  = require('bluebird');
d.short    = require('short-uuid');
d.mongoose = require('mongoose');
d.keystone = require('keystone');
d._        = require('lodash');
d.moment   = require('moment');
d.bunyan   = require('bunyan');
d.CronJob  = require('cron').CronJob;
d.rtime    = require('response-time');
d.express  = d.keystone.express;
d.app      = d.express.application;

d.config                = {};
d.config.callsToAction  = require('./config/callsToAction.json');
d.config.constants      = require('./config/constants.json');
d.config.cron           = require('./config/cron.json');
d.config.flashTypes     = require('./config/flashTypes.json');
d.config.flashTypeNames = Object.keys(d.config.flashTypes);
d.config.nav            = require('./config/nav.json');
d.config.pages          = require('./config/pages.json');
d.config.site           = require('./config/site.json');

d.config.campaigns = {};
d.config.campaigns.sharestreamChristian = require('./config/campaigns/sharestreamChristian');

// Create View Engine
d.handlebars = (d.hbs = require('express-handlebars')).create({
	layoutsDir: 'templates/views/layouts',
	partialsDir: 'templates/views/partials',
	defaultLayout: 'main',
	helpers: require('./templates/views/helpers')(d),
	extname: '.hbs',
});
d.Handlebars = d.handlebars.handlebars;

// Create Initial Errors
let errors = {
	Error           : Error,
	TypeError       : TypeError,
	OptionsError    : Error, // TODO: Make these real classes
	ValidationError : Error
}

// Load Asynchronous Dependencies
d._ready = (async function loadAsyncDependencies() {
	// Load Errors
	d.errors                  = errors;
	d.errors.ReachError       = await require('./lib/errors/ReachError')(d);
	d.errors.SystemError      = await require('./lib/errors/SystemError')(d);
	d.errors.UserError        = await require('./lib/errors/UserError')(d);
	d.errors.InvalidUuidError = await require('./lib/errors/InvalidUuidError')(d);

	// Load Loggers
	d.loggers = await require('./lib/loggers')(d);

	// Load Utils
	d.util               = await require('./lib/util/util')(d);
	d.util.ids           = await require('./lib/util/ids')(d);
	d.util.createHandler = await require('./lib/util/createHandler')(d);
	d.util.stats         = await require('./lib/util/stats')(d);
	d.util.nav           = await require('./lib/util/nav')(d);
	d.util.createCronJob = await require('./lib/util/createCronJob')(d);
	let createHandler = d.util.createHandler;
	let createCronJob = d.util.createCronJob;

	// Load Data Libs
	d.data = {};
	d.data.generateModel    = await require('./lib/data/generateModel')(d);
	d.data.BulkDataAccessor = await require('./lib/data/BulkDataAccessor')(d);
	d.data.DataPool         = await require('./lib/data/DataPool')(d);
	d.data.ObjectId         = await require('./lib/data/ObjectId')(d);
	// d.data.OldObjectId      = d.mongoose.Schema.ObjectId;

	// Compile Config
	d.util.nav.compileMenu(d.config.nav.mainMenu);

	// Initialize App
	d.routes                  = {};
	d.routes.middleware       = require('./routes/middleware')(d);
	d.routes.middleware.end   = require('express-end');
	d.routes.keystone         = require('./routes/keystone');
	d.routes.routes           = require('./routes/routes'); // ??? no (d) -- not used here (in keystone)
	d.routes.handlers         = await d.Promise.props({
		userFormEmailHandler : createHandler({ handler : require('./routes/handlers/userFormEmailHandler')(d) })
	});
	await d.routes.keystone(d);

	// Load Models
	d.lists          = {};
	d.models         = {};
	d.create         = {};
	d.tokens         = {};
	d.tokensByPrefix = {};
	let tokens = await d.Promise.props({
		Attribution   : d.data.generateModel(require('./models/Attribution')),
		Contact       : d.data.generateModel(require('./models/Contact')),
		Campaign      : d.data.generateModel(require('./models/Campaign')),
		Communication : d.data.generateModel(require('./models/Communication')),
		Enquiry       : d.data.generateModel(require('./models/Enquiry')),
		User          : d.data.generateModel(require('./models/User'))
	});
	for (let key in tokens) {
		if (!(tokens.hasOwnProperty(key))) continue;
		let token = tokens[key];
		Object.defineProperty(d.lists,          key,          { value : token.List,   writable : false, enumerable : true });
		Object.defineProperty(d.models,         key,          { value : token.Model,  writable : false, enumerable : true });
		Object.defineProperty(d.create,         key,          { value : token.create, writable : false, enumerable : true });
		Object.defineProperty(d.tokens,         key,          { value : token,        writable : false, enumerable : true });
		Object.defineProperty(d.tokensByPrefix, token.prefix, { value : token,        writable : false, enumerable : true });
	}
	Object.freeze(d.lists);
	Object.freeze(d.models);
	Object.freeze(d.tokens);
	Object.freeze(d.tokensByPrefix);

	// Load Cron Jobs
	d.cron = {};
	d.cron.launchers = await d.Promise.props({
		manageCampaigns : require('./cron/launchers/manageCampaigns')(d)
	});
	d.cron.handlers = await d.Promise.props({
		manageCampaignsHandler : createHandler({ timeout : 2 * 1000, handler : require('./cron/handlers/manageCampaignsHandler')(d) })
	});
	d.cron.jobs = await d.Promise.all(d.config.cron.jobs.map(createCronJob));
})();