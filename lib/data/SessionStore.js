module.exports = d => {
	let Promise = d.Promise;

	function promise2Callback(fulfilled, callback) {
		return data => {
			if (callback) {
				if (fulfilled) {
					callback(null, data);
				}
				else {
					callback(data);
				}
			}
			if (fulfilled) {
				return data;
			} else {
				throw data;
			}
		}
	}

	class SessionStore extends d.esession.Store {
		constructor(options) {
			super(options);
		}
		get(id, cb) {
			cb(null, { 'moo' : 'mar', 'cookie' : {} });
		}
		set(id, session, cb) {
			cb(null);
		}
		destroy(id, cb) {
			cb(null);
		}
	}

	// Finalize
	return SessionStore;
}