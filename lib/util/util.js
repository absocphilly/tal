module.exports = d => {
	let util = {};
	// do not cache any dependencies; this file is loaded before many others

	/**
	 * Throws an error if the provided object does not contain
	 * the provided option.
	 */
	util.requireOption = util.requireOptions = (obj, option) => {
		if (!obj || typeof option != 'object') throw new d.errors.TypeError('The provided options parameter is not an object.');
		if (option && option instanceof Array) {
			let options = option;
			for (let i = 0; i < options.length; i++) {
				let option = options[i];
				if (!obj.hasOwnProperty(option)) {
					throw new d.errors.OptionsError("The provided object is missing the option '" + option + "'.");
				}
			}
		}
		else if (!obj.hasOwnProperty(option)) {
			throw new d.errors.OptionsError("The provided object is missing the option '" + option + "'.");
		}
	}

	return d.Promise.resolve(util);
}