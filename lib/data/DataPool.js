"use strict";
module.exports = d => {
	const Promise    = d.Promise;
	const returnNull = _ => null;

	/**
	 * A class which pools records for efficient access.
	 */
	class DataPool {
		/**
		 * Creates a DataPool for the provided model token.
		 */
		constructor(token, options) {
			options || (options = {});
			this._token          = token;
			this._promisesByUuid = new Map(); // must always contain bluebird promises
			this._poolSize       = options.poolSize ? options.poolSize + 0 : DataPool.DEFAULT_POOL_SIZE;
			this._poolSize       = this._poolSize < 1 ? 1 : this._poolSize;
			this._poolMap        = new Map();
			this._poolCache      = new Array(this._poolSize);
			this._pooli          = 0;
		}

		/**
		 * Finds the document with the provided ObjectId. If no such document
		 * exists in the pool, it will be queried from the database. If no
		 * such record exists in the database, the returned promise will
		 * reject with an InvalidUuidError.
		 */
		async findOneById(id) {
			if (!(id instanceof d.data.ObjectId)) throw new d.errors.InvalidUuidError(id);
			let i        = this._poolMap.get(id.uuid),
			    document = i === undefined ? undefined : this._poolCache[i];

			if (document !== undefined) {
				this._addToPool(document); // Bumps higher in cache to retain longer
				return document;
			}
			return this._token.data.findOneById(id)
				.then(newDoc => {
					// final check in case a parallel request for same
					// uuid fulfilled missing document.
					i        = this._poolMap.get(id.uuid),
					document = i === undefined ? undefined : this._poolCache[i];
					document = document === undefined ? newDoc : document;
					this._addToPool(document);
					return document;
				});
		}

		/**
		 * Finds the document with the provided ObjectId. If no such document
		 * exists in the pool or database, the returned promise will resolve
		 * to null.
		 */
		async tryOneById(id) {
			if (!id) return null;
			if (!(id instanceof d.data.ObjectId)) throw new d.errors.InvalidUuidError(id);
			return this.findOneById(id).catch(returnNull);
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as an insert operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async insert(document) {
			this._addToPool(document);
			return this._token.data.insert(document);
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as an update operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async update(document) {
			this._addToPool(document);
			return this._token.data.update(document);
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as an upsert operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async upsert(document) {
			this._addToPool(document);
			return this._token.data.upsert(document);
		}

		/**
		 * Adds the provided document to the current queue of database
		 * instructions as a delete operation, and returns a promise
		 * which resolves when it is complete.
		 */
		async delete(document) {
			this._removeFromPool(document);
			return this._token.data.delete(document);
		}

		_addToPool(document) {
			let i     = this._pooli,
			    size  = this._poolSize,
			    cache = this._poolCache,
			    cmap  = this._poolMap,
			    uuid  = document.uuid,
			    current;

			// Remove Current
			current = cache[i];
			if (current) {
				this._removeFromPool(current);
			}

			// Remove Document
			// this bumps the document to stay in the pool longer
			if (cmap.has(uuid)) {
				this._removeFromPool(document);
			}

			// Add Document
			cache[i] = document;
			cmap.set(uuid, i);
			i++;
			if (i >= size) i = 0; // loop
			this._pooli = i;
			return document;
		}

		_removeFromPool(document) {
			let cache = this._poolCache,
			    cmap  = this._poolMap,
			    uuid  = document.uuid,
			    i     = cmap.get(uuid);

			if (i !== undefined) {
				cache[i] = undefined;
				cmap.delete(uuid);
			}
			return document;
		}
	}

	DataPool.DEFAULT_POOL_SIZE = 200;
	return DataPool;
}