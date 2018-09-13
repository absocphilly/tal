module.exports = function* Campaign(d) {
	// Init Model
	let keystone = d.keystone;
	let Types    = keystone.Field.Types;
	let Campaign  = yield {
		key      : 'Campaign',
		singular : 'Campaign',
		plural   : 'Campaigns',
		prefix   : 'CMP',
		fields   : {
			textid                : { initial : true },
			contact               : { type : Types.Relationship, ref : 'Contact', required : true, initial : true, index : true },
			user                  : { type : Types.Relationship, ref : 'User', index : true },
			type                  : { type : Types.Select, options : ['email'], required : true, initial : true, emptyOption : false },
			subtype               : { type : Types.Text, required : true, initial : true },
			lastProcessedDatetime : { type : Types.Datetime, default : Date.now } // TODO: ensure timezone is working correctly
		}
	};

	// Finalize
	Campaign.defaultColumns = 'uuid, textid, contact, user, type';
}