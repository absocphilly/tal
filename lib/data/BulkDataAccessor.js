"use strict";
module.exports = d => {
	let Promise = d.Promise;

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

				// Load Insert Ids Back Into Documents
				// (commenting out): Evidently mongoose generates an id
				// on object creation. So this is not necessary.
				// await collection.handleEach(options => {
				// 	if (options.insertOne !== undefined) {
				// 		options.insertOne._id = insertIds[inserti];
				// 		inserti++;
				// 	}
				// });

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

			this._findOneByUuid = d.util.createHandler(async collection => {
				// Perform Read
				let listOfUuids   = collection.getElementOptions();
				let listOfRecords = await this._token.Model.find({ uuid : { $in : [listOfUuids] }}).exec();
				let mapOfRecords  = new Map();

				// Build Map
				for (let record of listOfRecords) {
					mapOfRecords.set(record.uuid, record);
				}

				// Resolve UUIDs
				await collection.resolveAll(uuid => {
					let record = mapOfRecords.get(uuid);
					if (!record) throw new d.errors.InvalidUuidError(uuid);
					return record;
				});

				// Clear UUID Lock
				await Promise.delay(10);
				for (let [uuid, p] of this._promisesByUuid) {
					if (!p.isPending()) this._promisesByUuid.remove(uuid);
				}
			});

			// Load Insert/Update Fields
			token.ready.then(() => {
				let fields = token.fields;
				for (let key in fields) { // classify fields
					if (fields.hasOwnProperty(key)) {
						this._insertFields.add(key);
						if (fields[key].allowUpdate !== false) this._updateFields.add(key);
					}
				}
			});
		}

		/**
		 * Finds the document with the provided uuid. If no such document
		 * exists in the database, the returned promise will reject with
		 * an InvalidUuidError.
		 */
		async findOneByUuid(uuid) {
			// Init
			let p;
			if (!uuid) throw new d.errors.InvalidUuidError(uuid);

			// Add Read Document To Queue
			// ensure only one per uuid at a time.
			p = Promise.resolve(this._promisesByUuid.get(uuid))
				.reflect()
				.then(() => this._findOneByUuid(uuid));
			this._promisesByUuid.set(uuid, p);
			return p;
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as an insert operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async insert(document) {
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
		async update(document) {
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
						filter : { uuid : document.uuid },
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
		async upsert(document) {
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
						filter : { uuid : document.uuid },
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
		async delete(document) {
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
			    doc;

			// Validate
			if (!document) throw new d.errors.SystemError('The document provided for writing is undefined.');
			if (!(document instanceof this._token.Model)) throw new d.errors.SystemError('the provided document is not of type "' + this._token.key + '"');

			// Compile Write Document
			doc = document._doc;
			for (let key in doc) {
				if (doc.hasOwnProperty(key) && allowedFields.has(key)) {
					writeDoc[key] = doc[key];
					fieldCount++;
				}
			}

			// Finalize
			return fieldCount > 0 ? writeDoc : undefined;
		}
	}
}