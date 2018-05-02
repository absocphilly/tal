module.exports = d => {
	return function collectEmailHandler(options) {
		console.log('collectEmailHandler'); //-------------------
		console.log(options.req.body); //-------------------
		throw new d.UserError('Flashing an error!!');
	};
};