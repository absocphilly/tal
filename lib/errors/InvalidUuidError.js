module.exports = d => {
	return class InvalidUuidError extends d.errors.ReachError {
		constructor(uuid, message) {
			let displayId = uuid instanceof d.data.ObjectId ? uuid.uuid : uuid + '';
			message || (message = 'The provided record Uuid "' + displayId + '" is invalid or cannot be found.');
			super(message);
			this.uuid = uuid;
			Error.captureStackTrace(this, InvalidUuidError);
		}
	}
}