module.exports = d => {
	return class ReachError extends d.errors.Error {
		constructor(message) {
			super(message);
			this.redirect = undefined;
			Error.captureStackTrace(this, ReachError);
		}
	}
}