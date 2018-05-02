module.exports = function(d) {
	// Init
	let helpers = {};

	// Lightbox
	helpers.lightbox = function lightbox(title, url) {
		let Handlebars = d.Handlebars;
		title = Handlebars.escapeExpression(title);
		url   = Handlebars.escapeExpression(url);
		return new Handlebars.SafeString(
			'<div class="overlay-container">' +
				'<img src="' + url + '" alt="' + title + '">' +
				'<a href="' + url + '" class="overlay-link popup-img-single" title="' + title + '">' +
				'<i class="fa fa-plus"></i>' +
				'</a>' +
			'</div>'
		);
	}

	// Lightbox
	helpers.accordion = function accordion(options) {
		let Handlebars = d.Handlebars;
		return new Handlebars.SafeString('' +
			'<div id="accordion-2" class="collapse-style-2" role="tablist" aria-multiselectable="true">' +
				'<div class="card">' +
					'<div class="card-header" role="tab" id="headingTwo-2">' +
						'<h4 class="mb-0">' +
							'<a class="collapsed" data-toggle="collapse" data-parent="#accordion-2" href="#collapseTwo-2" aria-expanded="false" aria-controls="collapseTwo-2">' +
								'<i class="fa fa-' + Handlebars.escapeExpression(options.hash.icon || 'plus-square') + ' pr-10"></i>' + Handlebars.escapeExpression(options.hash.title || 'More Information') +
							'</a>' +
						'</h4>' +
					'</div>' +
					'<div id="collapseTwo-2" class="collapse" role="tabpanel" aria-labelledby="headingTwo-2">' +
						'<div class="card-block">' +
							options.fn(this) +
						'</div>' +
					'</div>' +
				'</div>' +
			'</div>'
		);
	}

	// Finalize
	return helpers;
}