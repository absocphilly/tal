module.exports = d => {
	return class SystemError extends d.errors.Error {
		constructor(message) {
			super(message);
			Error.captureStackTrace(this, SystemError);
		}
	}
}