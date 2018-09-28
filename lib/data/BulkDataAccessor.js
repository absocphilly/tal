"use strict";
module.exports = d => {
	let Promise    = d.Promise;
	let returnNull = _ => null;
	let ready      = d.symbol.ready;

	/**
	 * A class which provides bulkification for database access.
	 */
	return class BulkDataAccessor {
		/**
		 * Creates a BulkDataAccessor for the provided model token.
		 */
		constructor(token) {
			this._token          = token;
			this._promisesByUuid = new Map(); // must always contain bluebird promises
			this._insertFields   = new Set();
			this._updateFields   = new Set();

			this._writeInBulk = d.util.createHandler(async collection => {
				// Perform Write
				let listOfOptions = collection.getElementOptions();
				let result        = await this._token.Model.bulkWrite(listOfOptions);
				let inserti       = 0;
				let insertIds     = result.getInsertedIds();

				// Finalize
				await collection.resolveAll();

				// Clear UUID Lock
				// technically it's not locked once promises in the uuid locking map
				// are resolved, but leaving them in leads to a memory leak. We want
				// to quickly clean this out as soon as a promise is resolved.
				await Promise.delay(10);                      // allow resolved promises to propagate
				for (let [uuid, p] of this._promisesByUuid) { // clear resolved promises for garbage collection
					if (!p.isPending()) this._promisesByUuid.remove(uuid);
				}
			});

			this._findOneById = d.util.createHandler(async collection => {
				// Perform Read
				let listOfIds     = [];
				let listOfRecords = null;
				let mapOfRecords  = new Map();
				let ObjectId      = d.data.ObjectId;

				// Validate
				await collection.handleAll(id => {
					if(!(id instanceof ObjectId)) throw new d.errors.InvalidUuidError(id, 'The provided id "' + id  + '" is not an instance of d.data.ObjectId');
					listOfIds.push(id);
				});

				// Query
				listOfRecords = await this._token.Model.find({ _id : { $in : listOfIds }}).exec();

				// Build Map
				for (let record of listOfRecords) {
					mapOfRecords.set(record.uuid, record);
				}

				// Resolve UUIDs
				await collection.resolveAll(id => {
					let record = mapOfRecords.get(id.uuid);
					if (!record) throw new d.errors.InvalidUuidError(id);
					return record;
				});

				// Clear UUID Lock
				await Promise.delay(10);
				for (let [uuid, p] of this._promisesByUuid) {
					if (!p.isPending()) this._promisesByUuid.remove(uuid);
				}
			});

			// Load Insert/Update Fields
			token[ready].then(() => {
				let fields = token.fields;
				for (let key in fields) { // classify fields
					if (fields.hasOwnProperty(key)) {
						this._insertFields.add(key);
						if (fields[key].allowUpdate !== false) this._updateFields.add(key);
					}
				}
				this._updateFields.add('_id');
				this._insertFields.add('_id');
			});
		}

		/**
		 * Finds the document with the provided ObjectId. If no such document
		 * exists in the database, the returned promise will reject with
		 * an InvalidUuidError.
		 */
		async findOneById(context, id) {
			// Init
			let p;
			if (!(id instanceof d.data.ObjectId)) throw new d.errors.InvalidUuidError(id);

			// Add Read Document To Queue
			// ensure only one operation per id at a time.
			p = Promise.resolve(this._promisesByUuid.get(id.uuid))
				.reflect()
				.then(() => this._findOneById(id));
			this._promisesByUuid.set(id.uuid, p);
			return p;
		}

		/**
		 * Finds the document with the provided ObjectId. If no such document
		 * exists in the database, the returned promise will resolve to null.
		 */
		async tryOneById(context, id) {
			if (!id) return null;
			if (!(id instanceof d.data.ObjectId)) throw new d.errors.InvalidUuidError(id);
			return this.findOneById(id).catch(returnNull);
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as an insert operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async insert(context, document) {
			// Init
			let writeDoc,
			    uuid,
			    p;

			// Get UUID && Write Document
			uuid = document.uuid;
			if (!uuid) throw new d.errors.InvalidUuidError(uuid);
			writeDoc = this._getValuesForWrite(document, this._insertFields);
			if (writeDoc === undefined) return Promise.resolve(document);

			// Add Write Document To Queue
			// ensure only one per uuid at a time.
			p = Promise.resolve(this._promisesByUuid.get(uuid))
				.reflect()
				.then(() => this._writeInBulk({
					insertOne : {
						document : writeDoc
					}
				})
				.then(() => document));
			this._promisesByUuid.set(uuid, p);
			return p;
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as an update operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async update(context, document) {
			// Init
			let writeDoc,
			    uuid,
			    p;

			// Get UUID && Write Document
			uuid = document.uuid;
			if (!uuid) throw new d.errors.InvalidUuidError(uuid);
			writeDoc = this._getValuesForWrite(document, this._updateFields);
			if (writeDoc === undefined) return Promise.resolve(document);

			// Add Write Document To Queue
			// ensure only one per uuid at a time.
			p = Promise.resolve(this._promisesByUuid.get(uuid))
				.reflect()
				.then(() => this._writeInBulk({
					updateOne : {
						filter : { _id : document.id.id },
						update : writeDoc,
						upsert : false
					}
				})
				.then(() => document));
			this._promisesByUuid.set(uuid, p);
			return p;
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as an upsert operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async upsert(context, document) {
			// Init
			let writeDoc,
			    uuid,
			    p;

			// Get UUID && Write Document
			uuid = document.uuid;
			if (!uuid) throw new d.errors.InvalidUuidError(uuid);
			writeDoc = this._getValuesForWrite(document, this._updateFields);
			if (writeDoc === undefined) return Promise.resolve(document);

			// Add Write Document To Queue
			// ensure only one per uuid at a time.
			p = Promise.resolve(this._promisesByUuid.get(uuid))
				.reflect()
				.then(() => this._writeInBulk({
					updateOne : {
						filter : { _id : document.id.id },
						update : writeDoc,
						upsert : true
					}
				})
				.then(() => document));
			this._promisesByUuid.set(uuid, p);
			return p;
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as a delete operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async delete(context, document) {
			// Init
			let writeDoc,
			    uuid,
			    p;

			// Get && Validate UUID
			if (!document) throw new d.errors.SystemError('The provided ' + this._token.key + ' document or uuid is blank.');
			uuid = typeof document == 'string' ? document : document.uuid;
			if (!uuid) throw new d.errors.InvalidUuidError(uuid);

			// Add Write Document To Queue
			// ensure only one per uuid at a time.
			p = Promise.resolve(this._promisesByUuid.get(uuid))
				.reflect()
				.then(() => this._writeInBulk({
					deleteOne : {
						filter : { uuid : uuid }
					}
				})
				.then(() => document));
			this._promisesByUuid.set(uuid, p);
			return p;
		}

		// Returns a document which bulk-write can use. Throws if the document
		// is undefined, or of the wrong type. Returns undefined if the document
		// does not contain any of the allowedFields (prevents unnecessary write)
		_getValuesForWrite(document, allowedFields) {
			// Init
			let writeDoc   = {},
			    fieldCount = 0,
			    ObjectId   = d.data.ObjectId,
			    doc;

			// Validate
			if (!document) throw new d.errors.SystemError('The document provided for writing is undefined.');
			if (!(document instanceof this._token.Model)) throw new d.errors.SystemError('the provided document is not of type "' + this._token.key + '"');

			// Compile Write Document
			doc = document._doc;
			for (let key in doc) {
				if (doc.hasOwnProperty(key) && allowedFields.has(key)) {
					let val = doc[key]
					writeDoc[key] = val;
					fieldCount++;
				}
			}

			// Finalize
			return fieldCount > 0 ? writeDoc : undefined;
		}
	}
}