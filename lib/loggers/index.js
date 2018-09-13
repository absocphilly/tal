module.exports = async function createLoggers(d) {
	const GENERAL  = 'general';
	const INIT_OBJ = { loggerInitialized : true };
	const INIT_MSG = 'Logger initialized';
	const uuid     = d.short.uuid;
	const _        = d._;

	// Bunyan Loggers
	let loggers = {};
	let root    = loggers.root = d.bunyan.createLogger({
		name        : d.config.site.logName,
		type        : GENERAL,
		level       : process.env.LEVEL || (d.config.site.production ? 'warn' : 'info'),
		src         : process.env.LINES === 'true',
		serializers : d.bunyan.stdSerializers
	});
	let rootCron  = loggers.rootCron = loggers.root.child({ type : 'cron'  });
	let rootWeb   = loggers.rootWeb  = loggers.root.child({ type : 'web'   });
	let rootOther = loggers.rootWeb  = loggers.root.child({ type : 'other' });
	rootCron.info(INIT_OBJ, INIT_MSG);
	rootWeb.info(INIT_OBJ, INIT_MSG);
	rootOther.info(INIT_OBJ, INIT_MSG);

	/**
	 * Creates a logger for non-standard / general purposes
	 */
	function createOtherLogger(subtype) {
		return (obj, message) => {
			rootOther.info(_.extend({
				subtype : subtype,
				logId : uuid()
			}, obj instanceof Object ? obj : { msg : message = obj }), message);
		};
	}

	loggers.other = {
		general : createOtherLogger(GENERAL)
	};

	loggers.getCron = function getCron(config) {
		return rootCron.child({ subtype : config.onTick || GENERAL, logId : uuid() }, true);
	}

	loggers.forWeb = function forWeb(req, res) {
		let logger    = rootWeb.child({ subtype : 'foo', logId : uuid() }, true);
		logger.req    = req;
		logger.res    = res;
		logger.status = forWebStatus;
		return logger;
	}
	function forWebStatus(status, message, options) {
		let {req, res} = this;
		return this.info(d._.extend({
			status      : status,
			remoteAddr  : req.ip,
			method      : req.method,
			path        : req.originalUrl/*,
			httpVersion : req.httpVersion,
			userAgent   : req.get('User-Agent')*/
		}, options));
	}

	// Finalize
	return loggers;
}