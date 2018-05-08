module.exports = function* Contact(d) {
	// Prep Config
	function calculateTextId(stuff) {
		if (this.email) return this.email;
		return this.uuid;
	}

	// Init Model
	let keystone = d.keystone;
	let Types    = keystone.Field.Types;
	let Contact  = yield {
		key      : 'Contact',
		singular : 'Contact',
		plural   : 'Contacts',
		prefix   : 'C',
		fields   : {
			textid                    : { default : calculateTextId },
			name                      : { type : Types.Name, index: true },
			email                     : { type : Types.Email, unique: true, index: true },
			emailValidatedDatetime    : { type : Types.Datetime },
			emailVerifiedDatetime     : { type : Types.Datetime },
			emailUnsubscribedDatetime : { type : Types.Datetime },
			user                      : { type : Types.Relationship, ref : 'User' }
		}
	};

	// Add Non-Supported Fields
	Contact.schema.add({ emailParts: d.mongoose.Schema.Types.Mixed });

	// Add Related Lists
	Contact.relationship({ path : 'campaigns', ref: 'Campaign', refPath: 'contact' });

	// Add Custom Schema Methods
	Contact.schema.query.byEmail = function byEmail(emails) {
		return this.find({ email : { $in : emails } });
	};

	// Finalize
	Contact.defaultColumns = 'name, email, verifiedDatetime';
}