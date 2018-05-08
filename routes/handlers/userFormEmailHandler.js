module.exports = d => {
	return async function collectEmailHandler(collection) {
		// Init
		let UserError        = d.errors.UserError;
		let SystemError      = d.errors.SystemError;
		let Contact          = d.models.Contact;
		let Campaign         = d.models.Campaign;
		let emails           = [];
		let contacts         = [];
		let newContacts      = [];
		let newCampaigns     = [];
		let contactsByEmail  = new Map();
		let campaignsByEmail = new Map();
		let campaignTypes    = d.config.campaigns;

		// Collect Data
		collection = await collection.handleAll(options => {
			let email    = options.req.body.email;
			let campaign = options.req.body.campaign;
			if (email) {
				emails.push(email);
			}
			else {
				throw new UserError('The provided email address is blank.');
			}
			if (!campaign || !campaignTypes[campaign]) {
				throw new SystemError("The provided email campaign id is missing or invalid: '" + campaign + "'")
			}
		});

		// Query Contacts
		contacts = await Contact.find().byEmail(emails).exec();
		for (let i = 0; i < contacts.length; i++) {
			let contact = contacts[i];
			contactsByEmail.set(contact.email);
		}

		// Reject Existing Contacts, Create New Ones
		// TODO: consider allowing resubmission of campaign for existing contacts
		//       when it makes sense.
		collection = await collection.handleAll(options => {
			// Init
			let email = options.req.body.email;
			let contact;

			// Handle Existing
			if (contactsByEmail.has(email)) {
				throw new UserError("It looks like someone has already submitted this email address! (" + email + ") Please check your spelling or your spam folder for a previous email.");
			}

			// Handle New
			contact = new Contact({
				email : email
			});
			newContacts.push(contact);
			contactsByEmail.set(email, contact); // prevents double-clicks and needed later.
		});

		// Insert New Contacts
		// Not clear on how to handle errors one at a time; going all-or-none for now.
		await Contact.insertMany(newContacts);

		// Create Campaigns For New Contacts
		collection = await collection.handleAll(options => {
			// Init
			let email          = options.req.body.email;
			let campaignTextId = options.req.body.campaign;
			let contact        = contactsByEmail.get(email);
			let campaign = new Campaign({
				contact : contact.id,
				type    : 'email',
				subtype : campaignTextId
			});
			newCampaigns.push(campaign);
			campaignsByEmail.set(email, campaign);
		});

		// Insert New Campaigns
		await Campaign.insertMany(newCampaigns);

		// Finalize
		collection = await collection.resolveAll(async options => {
			// Init
			let email    = options.req.body.email;
			let contact  = contactsByEmail.get(email);
			let campaign = campaignsByEmail.get(email);

			// Process New Campaign
			options.res.asyncJobs.push( // handle later
				d.cron.handlers.manageCampaignsHandler({
					campaign : campaign
				})
			);

			// Finalize
			return contact;
		});
	};
};