module.exports = d => {
	function createContext(context, options) {
		function create(options) {
			return createContext(context, options);
		}
		create.context = context;
		create.options = options;
		return create;
	}

	// Expose API
	return createContext;
};