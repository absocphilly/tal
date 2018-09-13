"use strict";
module.exports = d => {
	let exports = {},
	    Promise = d.Promise;

	/**
	 * Initializes preliminary dependencies
	 */
	exports.initPrelim = (req, res, next) => {
		// Init
		let d             = req.d,
			keystone      = d.keystone,
			config        = d.config,
			util          = d.util,
			site          = config.site,
			callsToAction = config.callsToAction,
			stats         = util.stats,
			onComplete, resolveComplete, rejectComplete;

		// Create Loggers
		req.log = res.log = d.loggers.forWeb(req, res);
		req.log.status('start', 'Request initialized.');

		// Attach Event Handlers
		res.createErrorHandler      = createErrorHandler;
		res.errorResourceNotFound   = errorResourceNotFound;
		res.errorInternal           = errorInternal;
		res.onComplete = onComplete = new Promise((res, rej) => { resolveComplete = res; rejectComplete = rej; });
		res.resolveComplete         = resolveComplete;
		res.rejectComplete          = rejectComplete;

		// Handle Session
		req.session.foo = req.session.foo === undefined ? 0 : req.session.foo + 1;
		req.stats       = stats;
		req.reqStats    = stats.createStats();

		// Init Lib
		req.flashTitle         = flashTitle;
		req.flashMessage       = flashMessage;
		req.flashTitledMessage = flashTitledMessage;

		// Init Locals
		res.locals.mainMenu       = config.nav.mainMenu;
		res.locals.user           = req.user;
		res.locals.site           = site;
		res.locals.pageTitle      = site.name;
		res.locals.pageTitleParts = undefined;
		res.locals.barStats       = null; // TODO: add user id
		res.locals.callsToAction  = util.nav.getCallsToAction('default');

		// Add Async Cleanup Jobs
		res.asyncJobs = [];
		res.asyncJobs.push(onComplete.then(logStats));

		// Add Async Prerequisites
		Promise.props({
			barStats : stats.getBarStats(null)
		}).then(vals => {
			res.locals.barStats = vals.barStats;
			next();
		});
	};

	/**
	 * Logs attribution statistics once a request has completed.
	 */
	async function logStats(res) {
		// Init
		let req         = res.req;
		let stats       = req.stats;
		let reqStats    = req.reqStats;
		let session     = req.session;
		let Attribution = req.d.tokens.Attribution;
		let attr, attrUuid, parentUuid;

		// Get/Create Attribution
		parentUuid = req.query.attr ? Attribution.prefix + '-' + req.query.attr : undefined;
		attrUuid   = session.attrUuid; // TODO: manually control session

		// Create Attribution
		if (!attrUuid && parentUuid) { // fresh product of parent attribution
			attr = await stats.createAttribution(parentUuid);
			attrUuid = attr.Uuid;
		}

		// Attribute
		return stats.logStats(attrUuid, reqStats);
	}

	let createErrorHandler = function(next) {
		let res = this;
		let req = res.req;
		let d   = res.d;
		return e => {
			if (e instanceof d.errors.UserError) {
				req.flashMessage('error', e.message);
				if (e.redirect) {
					res.redirect(e.redirect);
				}
				else {
					next();
				}
			}
			else {
				this.errorInternal(e);
			}
		};
	}
		
	let errorInternal = function errorInternal(e, title, message) {
		console.log('500 ERROR', e, e.stack);
		title   || (title   = "Oops! Internal Server Error");
		message || (message = 'An internal server error has occurred! We apologize for the inconvenience.');
		let code = 500;
		this.status(code).render('error', {
			pageTitle    : title,
			errorMessage : message,
			errorCode    : code,
			layout       : 'error'
		});
	};

	let errorResourceNotFound = function errorResourceNotFound(title, message) {
		title   || (title   = "Oops! Page Not Found");
		message || (message = "The requested URL was not found on this server. Make sure that the Web site address displayed in the address bar of your browser is spelled and formatted correctly.");
		let code = 404;
		this.status(code).render('error', {		
			pageTitle    : title,
			errorMessage : message,
			errorCode    : code,
			layout       : 'error'
		});
	};

	exports.handleInternal = function handleInternal(req, res, next) {
		res.errorInternal();
	}

	exports.handleResourceNotFound = function handleResourceNotFound(req, res, next) {
		res.errorResourceNotFound();
	}


	/**
	 * Fetches and clears the flashMessages before a view is rendered.
	 * Keystone expected types:
	 * - info
	 * - success
	 * - warning
	 * - error
	 */
	exports.flashMessages = function (req, res, next) {
		// Init
		let d        = req.d,
			_        = d._,
			names    = d.config.flashTypeNames,
			messages = {};

		// Gather Flash Messages
		for (let i = 0; i < names.length; i++) {
			let name = names[i];
			messages[name] = req.flash(name);
		}

		// Finalize
		res.locals.messages = _.some(messages, function (msgs) { return msgs.length; }) ? messages : false;
		next();
	};

	function flashMessage(level, message, buttonText, href) {
		this.flash(level, {
			detail     : message,
			buttonText : buttonText,
			href       : href
		});
	}

	function flashTitledMessage(level, title, message, buttonText, href) {
		this.flash(level, {
			title      : title,
			detail     : message,
			buttonText : buttonText,
			href       : href
		});
	}

	function flashTitle(level, title, buttonText, href) {
		this.flash(level, {
			title      : title,
			buttonText : buttonText,
			href       : href
		});
	}

	exports.rtime = d.rtime((req, res, resTime) => {
		// Init
		let d          = res.d;
		let Promise    = d.Promise;
		let asyncStart = d.moment();
		let log        = res.log;
		let logError   = e => log.info(e);
		let runAsync   = res.asyncJobs.length > 0;
		resTime        = Math.round(resTime);

		// Log Response Time
		log.status('stop', (runAsync ? 'Request completed, async jobs begun.' : 'Request completed.'), { resTime : resTime });
		res.resolveComplete(res);

		// Protect && Time Async
		if (runAsync) {
			let protectedJobs = res.asyncJobs.map(job => Promise.resolve(job).catch(logError));
			Promise.all(protectedJobs).then(() => {
				let asyncTime = Math.round(d.moment().diff(asyncStart));
				log.status('async', 'Async jobs completed.', { resTime : resTime, asyncTime : asyncTime });
			});
		}
	});


	/**
		Prevents people from accessing protected pages when they're not signed in
	 */
	exports.requireUser = function (req, res, next) {
		if (!req.user) {
			req.flash('error', 'Please sign in to access this page.');
			res.redirect('/keystone/signin');
		} else {
			next();
		}
	};

	return exports;
}