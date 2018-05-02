module.exports = d => {
	return class UserError extends d.Error {
		constructor(message) {
			super(message);
			Error.captureStackTrace(this, UserError);
		}
	}
}