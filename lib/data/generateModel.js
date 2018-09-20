"use strict"

module.exports = d => {
	// Init
	let ids      = d.util.ids,
	    keystone = d.keystone,
	    Types    = keystone.Field.Types,
	    Promise  = d.Promise;

	/**
	 * Creates a standard model using the provided options, and returns
	 * a Promise resolving to the model's token. The provided generator
	 * is used to provide model-specific configuration functionality.
	 */
	function generateModel(generator) {
		return d.Promise.try(async function() {
			// Standardize Options
			let genny    = generator(d);
			let options  = await genny.next().value;
			let ObjectId = d.data.ObjectId;
			d.util.requireOptions(options, [
				'key',
				'singular',
				'plural',
				'prefix'
			]);
			options.label  || (options.label  = options.singular);
			options.fields || (options.fields = {});
			options.schema || (options.schema = {});
			options.schema = d._.extend({ collection : options.key }, options.schema);
			options.prefix = ("" + options.prefix).toUpperCase();

			// Init
			let initFunction, create, createId,
			    tokenResolve  = null,
			    tokenReject   = null,
			    token         = { ready : new Promise((res, rej) => { tokenResolve = res; tokenReject = rej; }) },
			    data          = new d.data.BulkDataAccessor(token),
			    pool          = new d.data.DataPool(token, { poolSize : options.poolSize }),
			    fields        = undefined,
			    fieldDefaults = { allowUpdate : true },
			    kfields       = {}, // keystone
			    mfields       = {}, // mongoose
			    dfields       = {}, // defaults
			    rfields       = {}; // relationships

			// Create List
			let List = new d.keystone.List(options.key, {
				label    : options.label,
				singular : options.singular,
				plural   : options.plural,
				schema   : options.schema,
				track    : true
			});

			let createIdGetter = function createIdGetter(fieldName) {
				return function get() {
					let id = this._doc[fieldName];
					return id instanceof ObjectId ? id : (this._doc[fieldName] = ObjectId(id, token));
				};
			}

			let createIdSetter = function createIdSetter(fieldName) {
				return function set(id) {
					return id instanceof ObjectId ? id : ObjectId(id, token);
				};
			}

			// Create Id Copy Defaults Hook
			let copyId = function copyId() {
				if (!this._id || !this._id.uuid) return undefined;
				return this._id.uuid;
			}

			// Create Fields
			options.fields = d._.extend({}, fields = { // standard fields
				uuid   : { type : Types.Text, required : true, index : true, default : copyId, allowUpdate : false },
				textid : { type : Types.Text, required : true, index : true, default : copyId }
			}, options.fields);
			for (let key in options.fields) { // merge with provided fields
				if (options.fields.hasOwnProperty(key)) {
					let field      = fields[key] = d._.extend({}, fieldDefaults, fields[key], options.fields[key]);
					let installer  = field.keystone === false ? mfields : kfields;
					installer[key] = field;
					if (field.default !== undefined)       dfields[key] = field;
					if (field.type === Types.Relationship) rfields[key] = field;
				}
			}
			List.add(kfields);        // keystone fields
			List.schema.add(mfields); // mongoose fields

			// Post-Process Schema Field Creation
			List.schema.eachPath((pathName, schemaType) => {
				// Override ObjectId Type For Relationships
				if (schemaType instanceof d.mongoose.Schema.Types.ObjectId) {
					schemaType.get(createIdGetter(pathName));
					schemaType.set(createIdSetter(pathName));
				}
			});

			// Add Schema Methods
			List.schema.statics.data = data;
			List.schema.statics.pool = pool;

			List.schema.virtual('id')
				.get(function() { return this._id instanceof ObjectId ? this._id : this._id = ObjectId(this._id); })
				.set(function(v) { this._id = v instanceof ObjectId ? v : ObjectId(v); })
				;

			/**
			 * Initializes the document. Updates instance of all ids.
			 */
			List.schema.pre('init', initFunction = function(doc) {
				// Init
				let ObjectId = d.data.ObjectId;

				// Update Main Id
				if (!(doc._id instanceof ObjectId)) {
					doc._id = new ObjectId(doc._id, token);
				}

				// Update Defaults
				for (let key in dfields) {
					let value = dfields[key].default;
					if (doc[key] === undefined) {
						doc[key] = typeof value == 'function' ? value.call(doc) : value;
					}
				}

				// Update Relationship Ids
				for (let key in rfields) {
					let value = doc[key];
					if (value && !(value instanceof ObjectId)) {
						let field = rfields[key];
						let ref   = field.ref;
						let token = d.tokens[ref];
						value = new ObjectId(value, token);
					}
				}
			});
			
			/**
			 * Returns the token associated with this model.
			 */
			List.schema.statics.getToken = List.schema.methods.getToken = function getToken() {
				return token;
			};

			/**
			 * Creates a new instance of the model. Should be preferred over
			 * 'new' construction, as this performs additional work, such as
			 * setting defaults early, and replacing object ids
			 */
			List.schema.statics.create = create = function create(options) {
				// Init
				let doc = new List.model(options);
				initFunction(doc);

				// Run Init Function
				return doc;
			}

			/**
			 * Creates an ObjectId instance for the provided string representation;
			 * returns null if the string is falsey.
			 */
			List.schema.statics.createId = createId = function createId(stringId) {
				return stringId ? new ObjectId(stringId, token) : null;
			}

			/**
			 * Deletes all records in the collection. Why would you have this
			 * in code you ask? 'Cause we be livin' on the edge. Please don't
			 * ever call this from production code...
			 */
			List.schema.statics.deleteEverything = function deleteEverything() {
				return List.model.remove().exec();
			}

			// Finalize Model
			await genny.next(List); // allow generator to have access to list prior to registration
			List.register();
			Promise.promisifyAll(List.model);

			// Build && Return Token
			Object.defineProperty(token, 'key',      { value : options.key,      writable : false, enumerable : true });
			Object.defineProperty(token, 'prefix',   { value : options.prefix,   writable : false, enumerable : true });
			Object.defineProperty(token, 'singular', { value : options.singular, writable : false, enumerable : true });
			Object.defineProperty(token, 'plural',   { value : options.plural,   writable : false, enumerable : true });
			Object.defineProperty(token, 'fields',   { value : fields,           writable : false, enumerable : true });
			Object.defineProperty(token, 'List',     { value : List,             writable : false, enumerable : true });
			Object.defineProperty(token, 'Model',    { value : List.model,       writable : false, enumerable : true });
			Object.defineProperty(token, 'create',   { value : create,           writable : false, enumerable : true });
			Object.defineProperty(token, 'createId', { value : createId,         writable : false, enumerable : true });
			Object.defineProperty(token, 'data',     { value : data,             writable : false, enumerable : true });
			Object.defineProperty(token, 'pool',     { value : pool,             writable : false, enumerable : true });
			Object.freeze(token);
			await genny.next(token); // allow generator to have access to token after registration
			tokenResolve(token);
			return token;
		});
	}

	return d.Promise.resolve(generateModel);
}