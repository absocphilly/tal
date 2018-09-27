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
	let Promise = d.Promise;

	function createModule(obj) {
		// Set Default Parameters
		let {
			face   = function() {},
			common = {},
			init   = _ => {}
		} = obj || {};

		let initResult, createModule;

		// Create Module
		createModuleInterface = (context, args) => {
			let cherub = new face(d, context, args);
		}
		face.prototype.common   = common;
		face.prototype.context  = undefined;
		createModuleInterface.Interface = face;
		
		// Initialize Module
		try {
			initResult = init ? init(d, face, common) : undefined;
			initResult = Promise.resolve(initResult);
		} catch(e) {
			initResult = Promise.reject(e);
		}

		// Finalize
		return initResult.then(_ => createModuleInterface);
	}

	// Finalize
	return createModule;
};