"use strict";
module.exports = d => {
	// Init
	const SITE_ATTRIBUTION_TEXTID = 'site';
	const ALL_STATS_KEYS          = Object.keys(createStats());
	let Promise = d.Promise,
	    _       = d._,
	    stats   = {},
	    siteAttr,
	    siteStats,
	    startStats,
	    Attribution,
	    handleAttribute;

	// Private Methods
	async function loadSiteStats() {
		// Init
		let attr;

		// Load Site Attribution
		attr = await Attribution.Model.findOne({ textid : SITE_ATTRIBUTION_TEXTID }).exec();
		attr || (attr = new Attribution.create({ textid : SITE_ATTRIBUTION_TEXTID }));
		attr.mine = stats.createStats(attr.mine);
		await Attribution.data.upsert(attr);

		// Store Site Stats
		siteAttr  = attr;
		siteStats = attr.mine;
		console.log(siteStats); //-------------------
	};

	// Public Methods
	/**
	 * Begins the stats routine.
	 */
	stats.start = async function start() {
		Attribution = d.tokens.Attribution;
		await loadSiteStats();
		return stats;
	};

	/**
	 * Returns site-level stats.
	 */
	stats.getSiteStats = async function getSiteStats() {
		return siteStats;
	};

	/**
	 * Returns stats for the provided attribution id.
	 */
	stats.getAttrStats = async function getAttrStats(attrId) {
		return {
			userShareHits    : 29,
			userShareGenHits : 197
		};
	};

	/**
	 * Merged stats for the stats bar.
	 */
	stats.getBarStats = async function getBarStats(attrId) {
		return _.extend({}, await stats.getSiteStats(), await stats.getAttrStats(attrId));
	};

	/**
	 * Returns a child Attribution instance for the provided parent.
	 * If none is provided, the attribution will be orphaned as a top-
	 * tier attribution, meaning that someone visited the site without
	 * clicking through any advertising/shares etc.
	 */
	stats.createAttribution = async function createAttribution(parentId) {
		let child  = Attribution.create({
			parent : parentId,
			mine : stats.createStats(),
			gens : stats.createStats(),
			gen1 : stats.createStats(),
			gen2 : stats.createStats(),
			gen3 : stats.createStats(),
			gen4 : stats.createStats(),
			gen5 : stats.createStats(),
			gen6 : stats.createStats(),
			gen7 : stats.createStats()
		});
		return Attribution.pool.insert(child);
	};

	/**
	 * Registers the provided stats for the provided attribution uuid.
	 * This should be the uuid of the attribution whose "mine" field
	 * will be updated. After this is complete, the system will attribute
	 * up to seven parent generations with the stats.
	 */
	stats.logStats = async function logStats($) {
		// Init
		let { attrId, newStats } = $.options;
		let newb, attr, key;
		let pool = Attribution.pool;
		let ps   = [];
		newb = stats.createStats(newStats);

		// TODO: The root web directory "/" does not recognize the get parameter "attr"
		//       I think URL rewriting or something is the cause; research and destroy.

		// Increment User Stats
		for (let i = 0; i < logStatsOrder.length && (attr = await pool.tryOneById(attrId)); i++) {
			// Init
			if (!attr) break;
			key = logStatsOrder[i];

			// Update Attribution
			updateLogStatsForKey(attr, key, newb);

			// Recalculate Generational Total
			attr.gens = stats.createStats();
			for (let j = 0; j < logStatsGens.length; j++) {
				let summKey = logStatsGens[j];
				let summNxt = attr[summKey] ? stats.createStats(attr[summKey]) : undefined;
				if (summNxt) updateLogStatsForKey(attr, 'gens', summNxt);
			}

			// Increment
			ps.push(pool.update(attr));
			attrId = attr.parent;
			if (siteAttr.id.equals(attrId)) attrId = null; // prevent double-count if data bad
		}

		// Finalize
		return Promise.all(ps);
	}
	function updateLogStatsForKey(attr, key, newStats) {
		let curr = attr[key] = stats.createStats(attr[key]);
		for (let statKey of ALL_STATS_KEYS) curr[statKey] += newStats[statKey];
		attr.markModified(key);
	}
	const logStatsOrder = ['mine', 'gen1', 'gen2', 'gen3', 'gen4', 'gen5', 'gen6', 'gen7'];
	const logStatsGens  = ['gen1', 'gen2', 'gen3', 'gen4', 'gen5', 'gen6', 'gen7'];

	/**
	 * Creates a new stats object with all 0 stats, or with the
	 * values in the provided optional prototype stats object.
	 */
	stats.createStats = createStats;
	function createStats(statsObj) { // yanked to top of scope
		return {
			allHits       : statsObj && statsObj.allHits       !== undefined ? statsObj.allHits       : 0,
			articleHits   : statsObj && statsObj.articleHits   !== undefined ? statsObj.articleHits   : 0,
			allShares     : statsObj && statsObj.allShares     !== undefined ? statsObj.allShares     : 0,
			articleShares : statsObj && statsObj.articleShares !== undefined ? statsObj.articleShares : 0,
			usersCreated  : statsObj && statsObj.usersCreated  !== undefined ? statsObj.usersCreated  : 0,
		};
	}



	// Finalize
	return stats;
}