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
			name     : { type: Types.Name, required: true, index: true },
			// textid   : { default: function() { console.log(this); return this.name.first + ' ' + this.name.last; } },
			email    : { type: Types.Email, unique: true, index: true },
			password : { type: Types.Password },
			isAdmin  : { type: Boolean, label: 'Can access Keystone', index: true },
		}
	};

	// Provide access to Keystone
	User.schema.virtual('canAccessKeystone').get(function () {
		return this.isAdmin;
	});

	User.defaultColumns = 'name, email, isAdmin';
}