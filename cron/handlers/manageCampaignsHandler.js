module.exports = d => {
	let config = d.config.campaigns;
	let moment = d.moment;

	/**
	 * Primary function which manages campaigns. Filters them
	 * into those which need to take action, and those which
	 * do not.
	 */
	async function manageCampaignsHandler(collection) {
		// Init
		let timestamp             = moment().toDate();
		let Campaign              = d.models.Campaign;

		// Test Campaigns For Move Conditions
		collection = await collection.handleAll(async options => {
			// Init
			let campaign = options.campaign;
		});

		// Finalize
		collection = await collection.resolveAll(async options => {
			// Init
			let campaign = options.campaign;

			// Finalize
			campaign.lastProcessedDatetime = timestamp;
			await Campaign.data.update(campaign);
		});
	}

	// Finalize
	return manageCampaignsHandler;
}