exports = module.exports = function (req, res) {
	// Init
	let d        = req.d;
	let util     = d.util;
	let locals   = res.locals;
	let mainMenu = locals.mainMenu;
	let config   = d.config;
	let params   = req.params;
	let page     = params.page || '';
	let viewPage = config.pages.root[page];
	let viewName, view;

	// Validate Action
	if (!viewPage) {
		return res.errorResourceNotFound();
	}
	viewName = viewPage.view;

	// Set Breadcrumbs
	locals.breadcrumbs = [
		mainMenu.children$.home
	];

	// Set Call To Action
	locals.callsToAction = util.nav.getCallsToAction(viewPage.callToAction ? viewPage.callToAction : config.callsToAction.default);

	// Render the view
	view = new d.keystone.View(req, res);
	view.render(viewName, viewPage.locals);
};
