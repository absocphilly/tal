"use strict";
module.exports = d => {
	let ParentObjectId = d.mongoose.Types.ObjectId;

	/**
	 * Creates an object id object for a given model token.
	 */
	function ObjectId(id, token) {
		// Init
		let dashIndex, prefix, parentId, ntoken;

		// Validate
		if (id instanceof ObjectId) {
			if      (token  && !id.token) id = id.id;
			else if (!token && id.token) return id;
			else if (token  && id.token && token === id.token) return id;
			else throw new d.errors.InvalidUuidError(id.uuid, 'The provided id "' + id.uuid + '" does not have a prefix which matches the provided model token: "' + token.prefix + '"');
		}
		if (!this) return new ObjectId(id, token);

		// Derive Values
		if (id && id.plural) {
			token = id;
			id    = undefined;
		}
		else if (typeof id == 'string' && (dashIndex = id.indexOf('-')) !== -1) {
			prefix = id.substring(0, dashIndex).toUpperCase();
			id     = id.substring(dashIndex + 1, id.length);
			ntoken = d.tokensByPrefix[prefix];

			if (ntoken && token && token.plural) throw new d.errors.InvalidUuidError(id, 'The provided id "' + id + '" does not have a prefix which matches the provided model token: "' + token.prefix + '"');
			token = token && token.plural ? token : ntoken;
		}

		// Standardize String Component
		if (id && id.toLowerCase) {
			id = id.toLowerCase();
		}

		// Validate Token
		if (!token || !token.plural) throw new d.errors.InvalidUuidError(id, 'The provided string "' + id + '" cannot be matched to a database model.');

		// Call Parent
		try {
			parentId = ParentObjectId.call(this, id) || this; // doesn't always like using this instance
		}
		catch(e) {
			throw new d.errors.InvalidUuidError(id, 'The provided id "' + id + '" is invalid. ' + e);
		}

		// Finalize
		
		this.id    = parentId.id;
		this.token = token;
		this.uuid  = this.toPublicString();
		this.dbid  = parentId;
		return this;
	}
	ObjectId.prototype = Object.create(ParentObjectId.prototype);
	ObjectId.prototype._bsontype = 'ObjectID';
	ObjectId.Parent    = ParentObjectId;

	/**
	 * Converts the object id to a public-facing string
	 */
	ObjectId.prototype.toPublicString = function toPublicString() {
		return this.token.prefix + '-' + this.toHexString();
	}

	/**
	 * Returns true if the provided ObjectId has the same uuid as
	 * this ObjectId; false otherwise.
	 */
	ObjectId.prototype.equals = function equals(other) {
		return other instanceof ObjectId && this.uuid == other.uuid;
	}

	// Finalize
	return ObjectId;
}