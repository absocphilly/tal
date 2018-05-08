module.exports = function* Enquiry(d) {

	var keystone = d.keystone;
	var Types = keystone.Field.Types;

	/**
	 * Enquiry Model
	 * =============
	 */

	let Enquiry = yield {
		key      : 'Enquiry',
		singular : 'Enquiry',
		plural   : 'Enquiries',
		prefix   : 'ENQ',
		nocreate: true,
		noedit: true,
		fields   : {
			textid : { default: function() { return this.name.first + ' ' + this.name.last; } },
			name   : { type: Types.Name, required: true, initial : true },
			email  : { type: Types.Email, required: true, initial : true },
			phone  : { type: String },
			enquiryType : { type: Types.Select, options: [
				{ value : 'message',  label : 'Just leaving a message' },
				{ value : 'question', label : 'I\'ve got a question' },
				{ value : 'other',    label : 'Something else...' },
			] },
			message : { type: Types.Markdown, required: true, initial : true }
		}
	};

	Enquiry.schema.pre('save', function (next) {
		this.wasNew = this.isNew;
		next();
	});

	Enquiry.schema.post('save', function () {
		if (this.wasNew) {
			this.sendNotificationEmail();
		}
	});

	Enquiry.schema.methods.sendNotificationEmail = function (callback) {
		if (typeof callback !== 'function') {
			callback = function (err) {
				if (err) {
					console.error('There was an error sending the notification email:', err);
				}
			};
		}

		if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
			console.log('Unable to send email - no mailgun credentials provided');
			return callback(new Error('could not find mailgun credentials'));
		}

		var enquiry = this;
		var brand = keystone.get('brand');

		keystone.list('User').model.find().where('isAdmin', true).exec(function (err, admins) {
			if (err) return callback(err);
			new keystone.Email({
				templateName: 'enquiry-notification',
				transport: 'mailgun',
			}).send({
				to: admins,
				from: {
					name: 'The Activist Life',
					email: 'contact@the-activist-life.com',
				},
				subject: 'New Enquiry for The Activist Life',
				enquiry: enquiry,
				brand: brand,
				layout: false,
			}, callback);
		});
	};

	Enquiry.defaultSort = '-createdAt';
	Enquiry.defaultColumns = 'name, email, enquiryType, createdAt';
}
