module.exports = function* Communication(d) {
	// Init Model
	let keystone = d.keystone;
	let Types    = keystone.Field.Types;
	let Communication = yield {
		key      : 'Communication',
		singular : 'Communication',
		plural   : 'Communication',
		prefix   : 'COM',
		fields   : {
			contact     : { type : Types.Relationship, ref : 'Contact', required : true, initial : true, index : true },
			user        : { type : Types.Relationship, ref : 'User', index : true },
			campaign    : { type : Types.Relationship, ref : 'Campaign', index : true },
			camapaignId : { type : Types.Text },
			type        : { type : Types.Select, options : ['Email'], required : true, initial : true, emptyOption : false },
			email       : { type : Types.Email },
		}
	};

	// Finalize
	Communication.defaultColumns = 'uuid, contact, user, type';
}