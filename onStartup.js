module.exports = async function onStartup(d) {
	// Handle Development Environment
	if (!d.config.site.production) {
		await d.Promise.all(Object.keys(d.token).map(key => {
			return d.token[key]().Model.remove().exec();
		}));
	}

	let attr, attrs = [], Attribution = d.token.Attribution();
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-01' })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-02', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-03', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-04', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-05', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-06', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-07', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-08', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-09', parent : attr.id })));
	attrs.push(Attribution.data.insert(attr = Attribution.create({ textid : 'attr-10', parent : attr.id })));
	await d.Promise.all(attrs);
	console.log('last attr: ' + attr.id); //-------------------
};
