/**
 * Updates the session and other tracking-related functionality.
 */
exports.initTracking = function initTracking(req, res, next) {
	req.session.foo = req.session.foo === undefined ? 0 : req.session.foo + 1;
	let keystone = req.d.keystone;
	next();
}

/**
 * Initializes variables local to rendered views. This is done
 * for all views; additional locals can be added in path-specific
 * routes.
 */
exports.initLocals = function initLocals(req, res, next) {
	// Init
	let d             = req.d,
		config        = d.config,
		site          = config.site,
		util          = d.util,
		callsToAction = config.callsToAction;

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
	res.locals.siteStats      = util.stats.getSiteStats();
	res.locals.callsToAction  = util.nav.getCallsToAction('default');

	// Init Other
	res.createErrorHandler    = createErrorHandler;
	res.errorResourceNotFound = errorResourceNotFound;
	res.errorInternal         = errorInternal;

	// Finalize
	next();
};

let createErrorHandler = function(next) {
	let res = this;
	let req = res.req;
	let d   = res.d;
	return e => {
		if (e instanceof d.UserError) {
			req.flashMessage('error', e.message);
			next();
		}
		else {
			this.errorInternal(e);
		}
	};
}
	
let errorInternal = function errorInternal(e, title, message) {
	console.log('500 ERROR', e);
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
