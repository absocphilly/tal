module.exports = function* Contact(d) {
	// Prep Config
	function calculateTextId() {
		if (this.email) return this.email;
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
			textid           : { default: calculateTextId },
			name             : { type: Types.Name, required: true, index: true },
			email            : { type: Types.Email, unique: true, index: true },
			verifiedDatetime : { type: Types.Datetime }
		}
	};

	// Add Custom Schema Methods
	Contact.schema.query.byEmail = function byEmail(email) {
		return this.find({ email : email });
	};

	// Finalize
	Contact.defaultColumns = 'name, email, verifiedDatetime';
}