"use strict";
/*** Usage ***
createModule({
	face : class MyModule {
		constructor() {

		}
	},

	common : {
		my : 'singleton'
	},

	init : async function init(MyModule, common) {
		
	}
});
*/
module.exports = d => {
	let Promise   = d.Promise;
	let symParent = d.symbol.parent;

	async function createModule(obj) {
		// Set Default Parameters
		let {
			models  = [],
			face    = function() {},
			common  = {},
			init    = _ => {}
		} = obj || {};

		let control,
		    createModuleInterface,
		    initResult,
		    cxTokens = {};

		// Create Module
		createModuleInterface = (context, args) => {
			let finalize = undefined;
			let instance = new face(context, args, f => finalize = f);
			instance.context          = context || {};
			instance.token            = Object.create(cxTokens);
			instance.token[symParent] = instance;
			finalize && finalize(instance);
			return instance;
		}
		control = new ModuleControl(createModuleInterface);
		face.prototype.d        = d;
		face.prototype.common   = common;
		createModuleInterface.Interface = face;

		// Define Available Tokens
		for (let key of models) {
			Object.defineProperty(cxTokens, key, { get : createTokenGetter(key) });
		}
		
		// Finalize
		init && await init({ d, face, common, control, create : createModuleInterface });
		createModuleInterface.control = control;
		Object.freeze(face.prototype);
		Object.freeze(face);
		Object.freeze(cxTokens);
		Object.freeze(control);
		Object.freeze(createModuleInterface);
		return createModuleInterface;
	}

	function createTokenGetter(key) {
		let tokens = d.token;
		return function getContextualizedToken() {
			return tokens[key] ? tokens[key](this[symParent].context) : undefined;
		}
	}

	/**
	 * Defines an interface that modules can override to handle
	 * and respond to commands from the main system.
	 */
	class ModuleControl {
		constructor(module) {
			this.module = module;
		}
		async start(options) {}
		async stop(options) {}
	}

	// Finalize
	return createModule;
};