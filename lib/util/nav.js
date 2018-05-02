module.exports = d => {
	// Init
	let nav = {};

	/**
	 * Compiles the provided menu so that options are accessible by
	 * key or array order.
	 */
	nav.compileMenu = function compileMenu(menu) {
		// Init
		if (!menu) return;
		menu.children$ = {};
		menu.children || (menu.children = []);
		let children = menu.children;

		// Classify Children
		for (let i = 0; i < children.length; i++) {
			let child = children[i];
			if (!child || !child.key) continue;
			menu.children$[child.key] = child;
			nav.compileMenu(child.submenu);
		}

		// Finalize
		return menu;
	}

	nav.getCallsToAction = function getCallsToAction(key) {
		// Init
		let keys          = key instanceof Array ? key : [key];
		let calls         = [];
		let callsToAction = d.config.callsToAction;

		// Collect Calls
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			key = key == 'default' ? callsToAction[key] : key;
			let cta = callsToAction[key];
			if (cta && cta.type) {
				let call = {};
				call[cta.type] = cta;
				calls.push(call);
			}
		}

		// Finalize
		return calls;
	};

	// Finalize
	return d.Promise.resolve(nav);
}