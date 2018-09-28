module.exports = d => {
	let ready = d.symbol.ready;

	/**
	 * Creates a data token from the provided options. Should only
	 * ever be called by generateModel.
	 */
	async function createDataToken(options) {
		// Init
		let { List, Model, modelOptions, fields } = options;
		let getTokenInterface,
		    token    = context => getTokenInterface(context),
		    resolve  = undefined,
		    reject   = undefined;
		token[ready] = new Promise((res, rej) => { resolve = res; reject = rej; });

		// Create Data Module
		getTokenInterface = await createDataModule(token, options);

		// Static Members
		Object.defineProperty(token, 'key',      { value : modelOptions.key,      writable : false, enumerable : true });
		Object.defineProperty(token, 'prefix',   { value : modelOptions.prefix,   writable : false, enumerable : true });
		Object.defineProperty(token, 'singular', { value : modelOptions.singular, writable : false, enumerable : true });
		Object.defineProperty(token, 'plural',   { value : modelOptions.plural,   writable : false, enumerable : true });
		Object.defineProperty(token, 'fields',   { value : fields,                writable : false, enumerable : true });
		Object.defineProperty(token, 'List',     { value : List,                  writable : false, enumerable : true });
		Object.defineProperty(token, 'Model',    { value : List.model,            writable : false, enumerable : true });

		// Instance Members
		// Object.defineProperty(token, 'create',   { value : create,           writable : false, enumerable : true });
		// Object.defineProperty(token, 'createId', { value : createId,         writable : false, enumerable : true });
		// Object.defineProperty(token, 'data',     { value : data,             writable : false, enumerable : true });
		// Object.defineProperty(token, 'pool',     { value : pool,             writable : false, enumerable : true });

		// Finalize
		resolve(token);
		return token;
	}

	/**
	 * Creates context-sensitive module for data access.
	 */
	async function createDataModule(token, options) {
		let { List, Model, modelOptions, fields , initModel } = options;

		return d.util.createModule({
			/**
			 * Defines a context-sensitive interface for the module.
			 */
			face: class TokenDataInterface {
				/**
				 * Constructs the interface.
				 */
				constructor(context) {
					this.data = new d.data.DataInterface(this.common.data, context);
					this.pool = new d.data.DataInterface(this.common.pool, context);
				}

				/**
				 * Creates a new instance of the model. Should be preferred over
				 * 'new' construction, as this performs additional work, such as
				 * setting defaults early, and replacing object ids
				 */
				create(options) {
					// Init
					let doc = new List.model(options);
					initModel(doc);

					// Run Init Function
					return doc;
				}

				/**
				 * Creates an ObjectId instance for the provided string representation;
				 * returns null if the string is falsey.
				 */
				createId(stringId) {
					return stringId ? new ObjectId(stringId, token) : null;
				}
			},

			/**
			 * Initializes the module.
			 */
			init: (options) => {
				let { d, face, common } = options;
		    	let data = new d.data.BulkDataAccessor(token);
		    	let pool = new d.data.DataPool(token, { poolSize : modelOptions.poolSize });

				Object.defineProperty(common, 'data', { value : data, writable : false, enumerable : true });
				Object.defineProperty(common, 'pool', { value : pool, writable : false, enumerable : true });

				Object.defineProperty(face.prototype, 'key',      { value : modelOptions.key,      writable : false, enumerable : true });
				Object.defineProperty(face.prototype, 'prefix',   { value : modelOptions.prefix,   writable : false, enumerable : true });
				Object.defineProperty(face.prototype, 'singular', { value : modelOptions.singular, writable : false, enumerable : true });
				Object.defineProperty(face.prototype, 'plural',   { value : modelOptions.plural,   writable : false, enumerable : true });
				Object.defineProperty(face.prototype, 'fields',   { value : fields,                writable : false, enumerable : true });
				Object.defineProperty(face.prototype, 'List',     { value : List,                  writable : false, enumerable : true });
				Object.defineProperty(face.prototype, 'Model',    { value : List.model,            writable : false, enumerable : true });
			}
		});
	}

	// Finalize
	return createDataToken;




			

}