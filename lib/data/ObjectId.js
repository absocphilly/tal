"use strict";
module.exports = d => {
	let ParentObjectId = d.mongoose.Types.ObjectId;

	/**
	 * Creates an object id object for a given model token.
	 */
	function ObjectId(id, token) {
		// Init
		let dashIndex, prefix, parentId;
		if (!this) return new ObjectId(id, token);

		// Derive Values
		if (id && id.plural) { token = id; id = undefined; }
		else if (typeof id == 'string' && (dashIndex = id.indexOf('-')) !== -1) {
			prefix = id.substring(0, dashIndex).toUpperCase();
			id     = id.substring(dashIndex + 1, id.length);
			token  = d.tokensByPrefix[prefix];
		}
		if (id && id.toLowerCase) id = id.toLowerCase();

		// Finalize
		parentId = ParentObjectId.call(this, id) || this; // doesn't always like using this instance
		this.id    = parentId.id;
		this.token = token;
		return this;
	}
	ObjectId.prototype = Object.create(ParentObjectId.prototype);
	ObjectId.Parent    = ParentObjectId;

	/**
	 * Converts the object id to a public-facing string
	 */
	ObjectId.prototype.toPublicString = function toPublicString() {
		let prefix = this.token ? this.token.prefix + '-' : '';
		return prefix + this.toHexString();
	}

	// Finalize
	return ObjectId;
}