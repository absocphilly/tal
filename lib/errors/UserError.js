module.exports = d => {
	return class UserError extends d.errors.Error {
		constructor(message) {
			super(message);
			Error.captureStackTrace(this, UserError);
		}
	}
}