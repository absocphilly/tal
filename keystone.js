// Simulate config options from your production environment by
// customising the .env file in your project's root folder.

// site: http://localhost:3000/

require('dotenv').config();

// Require keystone
let d = require('./dependencies');
d._ready.then(async function() {
	// Start Front-End Server
	d.keystone.start();

	// Start Service
	await d.util.stats.start();
	d.loggers.other.general('Service running');
	await require('./onStartup')(d);

	// Start Cron Jobs
	await d.Promise.all(d.cron.jobs.map(obj => {
		obj.job.start();
	}));

})
.catch(e => {
	console.log('Top-Level Error', e);
});
