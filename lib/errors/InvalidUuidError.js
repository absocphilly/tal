module.exports = d => {
	return class InvalidUuidError extends d.errors.ReachError {
		constructor(uuid, message) {
			message || (message = 'The provided record Uuid "' + uuid + '" is invalid or cannot be found.');
			super(message);
			this.uuid = uuid;
			Error.captureStackTrace(this, InvalidUuidError);
		}
	}
}