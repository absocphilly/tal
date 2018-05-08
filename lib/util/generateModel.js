module.exports = d => {
	// Init
	let ids      = d.util.ids,
	    keystone = d.keystone,
	    Types    = keystone.Field.Types,
	    Promise  = d.Promise;

	/**
	 * Creates a standard model using the provided options, and returns
	 * a Promise resolving to the model's token. The provided generator
	 * is used to provide model-specific 
	 */
	function generateModel(generator) {
		return d.Promise.try(async function() {
			// Standardize Options
			let genny   = generator(d);
			let options = await genny.next().value;
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

			// Init
			let token = {},
			    uuid  = ids.uuidModel.bind(ids, options.prefix);

			// Create List
			let List = new d.keystone.List(options.key, {
				label    : options.label,
				singular : options.singular,
				plural   : options.plural,
				schema   : options.schema,
				track    : true
			});

			// Add Fields
			List.add(d._.extend({}, options.fields, {
				uuid   : d._.extend({}, { type : Types.Text, required : true, index : true, default : uuid }, options.fields.uuid),
				textid : d._.extend({}, { type : Types.Text, required : true, index : true, default : copyUuid }, options.fields.textid)
			}));

			// Add Static Methods
			
			/**
			 * Returns the token associated with this model.
			 */
			List.schema.statics.getToken = function getToken() {
				return token;
			};

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
			Object.defineProperty(token, 'List',     { value : List,             writable : false, enumerable : true });
			Object.defineProperty(token, 'Model',    { value : List.model,       writable : false, enumerable : true });
			Object.freeze(token);
			await genny.next(token); // allow generator to have access to token after registration
			return token;
		});
	}

	function copyUuid() {
		return this.uuid;
	}

	return d.Promise.resolve(generateModel);
}