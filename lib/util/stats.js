"use strict";
module.exports = d => {
	// Init
	const SITE_ATTRIBUTION_TEXTID = 'site';
	let stats = {},
	    siteAttr,
	    siteStats,
	    startStats,
	    _ = d._,
	    Attribution,
	    handleAttribute;

	// Private Methods
	async function loadSiteStats() {
		// Init
		let attr;

		// Load Site Attribution
		attr = await Attribution.Model.findOne({ textid : SITE_ATTRIBUTION_TEXTID }).exec();
		attr || (attr = new Attribution.Model({ textid : SITE_ATTRIBUTION_TEXTID }));
		attr.mine = stats.createStats(attr.mine);
		await d.Promise.delay(2000);
		await Attribution.data.upsert(attr);

		// Store Site Stats
		siteStats = attr.mine;
	};

	// Public Methods
	/**
	 * Begins the stats routine.
	 */
	stats.start = async function start() {
		Attribution = d.tokens.Attribution;
		siteStats   = await loadSiteStats();
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
	stats.createAttribution = async function createAttribution(parentUuid) {
		let parent = parentUuid ? await Attribution.data.findOneByUuid(parentUuid) : null;
		let child  = new Attribution.Model({
			parent : parent,
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
		return Attribution.data.insert(child);
	};

	/**
	 * Registers the provided stats for the provided attribution uuid.
	 * This should be the uuid of the attribution whose "mine" field
	 * will be updated. After this is complete, the system will attribute
	 * up to seven parent generations with the stats.
	 */
	stats.logStats = async function logStats(attrUuid, newStats) {
		// Init
		let newb, curr, attribution;
		let pool = Attribution.pool;
		newb = stats.createStats(newStats);

		// this won't work: two id currencies; parent uses internal object id.
		// for (let i = 0; i < logStatsOrder.length && attrUuid && (curr = await pool.findOneByUuid(attrUuid)); i++) {
			
		// }

	}
	const logStatsOrder = ['mine', 'gen1', 'gen2', 'gen3', 'gen4', 'gen5', 'gen6', 'gen7'];

	/**
	 * Creates a new stats object with all 0 stats, or with the
	 * values in the provided optional prototype stats object.
	 */
	stats.createStats = function createStats(statsObj) {
		return {
			allHits       : statsObj && statsObj.allHits       !== undefined ? statsObj.allHits       : 0,
			articleHits   : statsObj && statsObj.articleHits   !== undefined ? statsObj.articleHits   : 0,
			allShares     : statsObj && statsObj.allShares     !== undefined ? statsObj.allShares     : 0,
			articleShares : statsObj && statsObj.articleShares !== undefined ? statsObj.articleShares : 0,
			usersCreated  : statsObj && statsObj.usersCreated  !== undefined ? statsObj.usersCreated  : 0,
		};
	}



	// Handlers



	// Finalize
	return stats;
}