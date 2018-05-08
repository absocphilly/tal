module.exports = function* User(d) {
	// Init
	let keystone = d.keystone;
	let Types    = keystone.Field.Types;
	let User     = yield {
		key      : 'User',
		singular : 'User',
		plural   : 'Users',
		prefix   : 'U',
		fields   : {
			textid   : { default: function() { return this.name.first + ' ' + this.name.last; } },
			name     : { type: Types.Name, required: true, initial : true, index: true },
			password : { type: Types.Password },
			isAdmin  : { type: Boolean, label: 'Can access Keystone', index: true },
			contact  : { type: Types.Relationship, ref : 'Contact' }
		}
	};

	// Add Related Lists
	User.relationship({ path : 'campaigns', ref: 'Campaign', refPath: 'user' });

	// Provide access to Keystone
	User.schema.virtual('canAccessKeystone').get(function () {
		return this.isAdmin;
	});

	User.defaultColumns = 'name, email, isAdmin';
}