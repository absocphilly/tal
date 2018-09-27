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
			    token         = undefined,
			    fields        = undefined,
			    fieldDefaults = { allowUpdate : true },
			    kfields       = {}, // keystone
			    mfields       = {}, // mongoose
			    dfields       = {}, // defaults
			    rfields       = {}; // relationships

			// Initialize Token

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
			token = await d.data.createDataToken({
				modelOptions : options,
				List         : List,
				Model        : List.model,
				fields       : fields,
				initModel    : initFunction
			});
			await genny.next(token); // allow generator to have access to token after registration
			Object.freeze(token);
			return token;
		});
	}

	return d.Promise.resolve(generateModel);
}