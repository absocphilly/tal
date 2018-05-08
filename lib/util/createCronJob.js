module.exports = d => {
	return async function createCronJob(options) {
		// Init
		let jobName,
		    job,
		    onTick,
		    context,
		    concurrent;

		// Validate Options
		options || (options = {});
		options = d._.extend({}, d.config.cron.defaults, options);

		onTick = d.cron.launchers[jobName = options.onTick];
		if (!onTick) throw new d.errors.SystemError("The provided cron options object does not have an onTick function name that matches a registered cron launcher. Provided name: '" + jobName + "', provided cronTime: '" + options.cronTime + "'");
		concurrent = options.concurrent;

		// Create Run Context
		context = {
			options : options,
			job     : null
		};

		// Wrap onTick
		options.onTick = async function() {
			if (!concurrent) job.stop();
			try {
				await onTick.call(context, options.runOptions || {});
			}
			catch(e) {
				if (e instanceof Error) {
					console.log('CRON', e.stack); // TODO: Add real logging
				}
				else {
					console.log('CRON', e); // TODO: Add real logging
				}
			}
			if (!concurrent) job.start();
		}

		// Create && Return Job
		job = context.job = new d.CronJob(options);
		return context;
	}
}