// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').config();

// Require keystone
let d = require('./dependencies');
d._ready.then(async function() {
	// Start Front-End Server
	d.keystone.start();

	// Handle Development Environment
	if (!d.config.site.production) {
		await d.Promise.all(Object.keys(d.models).map(key => {
			//return Promise.resolve();
			return d.models[key].deleteEverything();
		}));
	}

	// Start Cron Jobs
	await d.Promise.all(d.cron.jobs.map(obj => {
		obj.job.start();
	}))
})
.catch(e => {
	console.log('Top-Level Error', e);
});
