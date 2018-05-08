module.exports = d => {
	return class SystemError extends d.errors.ReachError {
		constructor(message) {
			super(message);
			Error.captureStackTrace(this, SystemError);
		}
	}
}