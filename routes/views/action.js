exports = module.exports = function handleAction(req, res) {
	// Init
	let d            = req.d;
	let util         = d.util;
	let UserError    = d.errors.UserError;
	let locals       = res.locals;
	let mainMenu     = locals.mainMenu;
	let config       = d.config;
	let params       = req.params;
	let action       = params.action || 'sharestream';
	let viewPage     = config.pages.action[action];
	let mainCta      = config.callsToAction[viewPage ? viewPage.callToAction : undefined];
	let view         = new d.keystone.View(req, res);
	let c            = config.constants;

	// Validate Action
	if (!viewPage) {
		return res.errorResourceNotFound();
	}

	// Set Breadcrumbs
	locals.breadcrumbs = [
		mainMenu.children$.home,
		mainMenu.children$.action
	];

	// Handle Get
	view.on('get', function getAction(next) {
		viewPage = d._.extend({}, viewPage, config.pages.action[action + ':get']);
		next();
	});

	// Handle Post
	view.on('post', function postAction(next) {
		(async function() {
			// Init
			viewPage = d._.extend({}, viewPage, config.pages.action[action + ':post']);
			let handler;

			// Handle Post
			if (mainCta && mainCta.handler && (handler = d.routes.handlers[mainCta.handler])) {
				// Create Contact
				let contact = await d.Promise.resolve(handler({
					req : req,
					res : res
				}));
			}
			next();
		})()
		.catch(e => {
			e instanceof UserError && (e.redirect = '/' + c.ROUTE.ACTION + '/' + action);
			throw e;
		})
		.catch(res.createErrorHandler(next));
	});

	view.render(() => {
		if (viewPage.view) {
			res.render(viewPage.view, d._.extend({
				layout        : 'action',
				callsToAction : util.nav.getCallsToAction(viewPage.callToAction ? viewPage.callToAction : config.callsToAction.default)
			}, viewPage.locals));
		}
		else {
			res.errorResourceNotFound();
		}
	});
};