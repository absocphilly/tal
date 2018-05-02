// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').config();

// Require keystone
let d = require('./dependencies');
d._ready.then(function() {
	d.keystone.start();
})
.catch(e => {
	console.log('Top-Level Error', e);
});
