module.exports = d => {
	return function collectEmailHandler(collection) {
		return (async function() {
			console.log('collectEmailHandler'); //-------------------
			console.log(Object.keys(collection)); //-------------------
			
			
			collection = await collection.handleAll((options, resolve, reject, index) => {
				console.log('element ' + index + ': ' + options.req.body.email); //-------------------
				// if (index > 1) reject(new d.errors.UserError('Rejected element ' + index));
				if (index > 1) throw new d.errors.UserError('Threw element ' + index);
			});
			console.log(collection.size); //-------------------

			// Finalize
			collection.resolveAll();
		})();
	};
};