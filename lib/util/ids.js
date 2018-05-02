module.exports = d => {
	let short           = d.short,
	    uuidRaw         = short.uuid,
	    transModel      = short("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"), // removed O and I for confusion with 0 and 1
	    SEPARATOR_MODEL = '-';

	/**
	 * Creates a model uuid using the provided prefix and optional
	 * raw uuid. If the raw uuid is not provided, a new one will
	 * be generated.
	 */
	function uuidModel(prefix, uuid) {
		uuid || (uuid = uuidRaw())
		return prefix + SEPARATOR_MODEL + transModel.fromUUID(uuid);
	}

	/**
	 * Gets the model token for the provided model uuid. 
	 */
	function getToken(uuidModel) {
		try {
			uuidModel += '';
			let parts = uuidModel.split(SEPARATOR_MODEL);
			if (parts.length != 2) return null;
			let prefix = parts[0];
			return d.tokensByPrefix[prefix] ? d.tokensByPrefix[prefix] : null;
		} catch(e) {
			return null;
		}
	}

	// Finalize
	return d.Promise.resolve({
		uuid      : uuidRaw,
		uuidModel : uuidModel,
		getToken  : getToken
	});
}