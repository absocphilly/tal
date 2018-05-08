module.exports = d => {
	return async function manageCampaignsHandler(collection) {
		// Start Campaign Processing
		collection = await collection.handleAll(options => {
			
		});

		// Finalize
		collection.resolveAll();
	}
}