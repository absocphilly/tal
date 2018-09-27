module.exports = d => {
	return class {
		constructor(source, context) {
			this.source  = source;
			this.context = context;
		}
		findOneById (document) { this.source.findOneById (this.context, document); }
		tryOneById  (document) { this.source.tryOneById  (this.context, document); }
		insert      (document) { this.source.insert      (this.context, document); }
		update      (document) { this.source.update      (this.context, document); }
		upsert      (document) { this.source.upsert      (this.context, document); }
		delete      (document) { this.source.delete      (this.context, document); }
	}
};