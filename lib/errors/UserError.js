module.exports = d => {
	return class UserError extends d.errors.ReachError {
		constructor(message) {
			super(message);
			Error.captureStackTrace(this, UserError);
		}
	}
}