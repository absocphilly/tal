module.exports = function* Attribution(d) {
	// Init Model
	let keystone = d.keystone;
	let mongoose = d.mongoose;
	let Types    = keystone.Field.Types;
	let Attribution;

	Attribution = yield {
		key      : 'Attribution',
		singular : 'Attribution',
		plural   : 'Attributions',
		prefix   : 'ATTR',
		poolSize : d.data.DataPool.DEFAULT_POOL_SIZE + 1,
		fields   : {
			parent : { type : Types.Relationship, ref : 'Attribution', initial : true, index : true },
			mine   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gens   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gen1   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gen2   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gen3   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gen4   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gen5   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gen6   : { type : mongoose.Schema.Types.Mixed, keystone : false },
			gen7   : { type : mongoose.Schema.Types.Mixed, keystone : false }
		}
	};

	// Finalize
	Attribution.defaultColumns = 'uuid, textid, parent';
}