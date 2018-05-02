exports = module.exports = function (req, res) {
	// Init
	let d        = req.d;
	let keystone = d.keystone;
	let Enquiry  = d.lists.Enquiry;
	let view     = new keystone.View(req, res);
	let locals   = res.locals;
	let mainMenu = locals.mainMenu;

	// Set locals
	locals.enquiryTypes = Enquiry.fields.enquiryType.ops;
	locals.formData = req.body || {};
	locals.validationErrors = {};
	locals.enquirySubmitted = false;
	locals.breadcrumbs = [
		mainMenu.children$.home,
		mainMenu.children$.contact
	]

	// On POST requests, add the Enquiry item to the database
	view.on('post', { action: 'contact' }, function (next) {

		var newEnquiry = new Enquiry.model();
		var updater = newEnquiry.getUpdateHandler(req);

		updater.process(req.body, {
			flashErrors: true,
			fields: 'name, email, phone, enquiryType, message',
			errorMessage: 'There was a problem submitting your enquiry:',
		}, function (err) {
			if (err) {
				locals.validationErrors = err.errors;
			} else {
				locals.enquirySubmitted = true;
			}
			next();
		});
	});

	view.render('contact');
};
