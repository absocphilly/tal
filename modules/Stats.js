// Init
const SITE_ATTRIBUTION_TEXTID = 'site';
const LOG_STATS_ORDER         = ['mine', 'gen1', 'gen2', 'gen3', 'gen4', 'gen5', 'gen6', 'gen7'];
const LOG_STATS_GEN           = ['gen1', 'gen2', 'gen3', 'gen4', 'gen5', 'gen6', 'gen7'];
let   ALL_STATS_KEYS          = undefined;
let   _                       = undefined;

/**
 * Module for registering/retrieving user stats and attributions.
 */
module.exports = {
	models: ['Attribution'],

	face: class Stats {
		/**
		 * Constructs the interface.
		 */
		constructor(args) {}

		/**
		 * Reloads site-level statistics from the database.
		 */
		async reloadSiteStats() {
			// Init
			let attr,
			    Attribution = this.token.Attribution;

			// Load Site Attribution
			attr = await Attribution.Model.findOne({ textid : SITE_ATTRIBUTION_TEXTID }).exec();
			attr || (attr = Attribution.create({ textid : SITE_ATTRIBUTION_TEXTID }));
			attr.mine = createStats(attr.mine);
			await Attribution.data.upsert(attr);

			// Store Site Stats
			this.common.siteAttr  = attr;
			this.common.siteStats = attr.mine;
		}

		/**
		 * Returns site-level stats.
		 */
		async getSiteStats() {
			return this.common.siteStats;
		}

		/**
		 * Returns stats for the provided attribution id.
		 */
		async getAttrStats(attrId) {
			return {
				userShareHits    : 29,
				userShareGenHits : 197
			};
		}

		/**
		 * Merged stats for the stats bar.
		 */
		async getBarStats(attrId) {
			return _.extend({}, await this.getSiteStats(), await this.getAttrStats(attrId));
		}


		/**
		 * Returns a child Attribution instance for the provided parent.
		 * If none is provided, the attribution will be orphaned as a top-
		 * tier attribution, meaning that someone visited the site without
		 * clicking through any advertising/shares etc.
		 */
		async createAttribution(parentId) {
			let Attribution = this.token.Attribution;
			let child = Attribution.create({
				parent : parentId,
				mine : createStats(),
				gens : createStats(),
				gen1 : createStats(),
				gen2 : createStats(),
				gen3 : createStats(),
				gen4 : createStats(),
				gen5 : createStats(),
				gen6 : createStats(),
				gen7 : createStats()
			});
			return Attribution.pool.insert(child);
		};

		/**
		 * Registers the provided stats for the provided attribution uuid.
		 * This should be the uuid of the attribution whose "mine" field
		 * will be updated. After this is complete, the system will attribute
		 * up to seven parent generations with the stats.
		 */
		async logStats(options) {
			// Init
			let { attrId, newStats } = options,
			    Attribution = this.token.Attribution,
			    siteAttr    = this.common.siteAttr,
			    pool        = Attribution.pool,
			    ps          = [],
				newb        = createStats(newStats),
			    attr,
			    key;

			// TODO: The root web directory "/" does not recognize the get parameter "attr"
			//       I think URL rewriting or something is the cause; research and destroy.

			// Increment User Stats
			for (let i = 0; i < LOG_STATS_ORDER.length && (attr = await pool.tryOneById(attrId)); i++) {
				// Init
				if (!attr) break;
				key = LOG_STATS_ORDER[i];

				// Update Attribution
				updateLogStatsForKey(attr, key, newb);

				// Recalculate Generational Total
				attr.gens = createStats();
				for (let j = 0; j < LOG_STATS_GEN.length; j++) {
					let summKey = LOG_STATS_GEN[j];
					let summNxt = attr[summKey] ? createStats(attr[summKey]) : undefined;
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
	},

	/**
	 * Initializes the module.
	 */
	init: async (options) => {
		let { d, face, common, control, create } = options;
		face.prototype.createStats = createStats;
	    common.siteAttr  = undefined;
	    common.siteStats = undefined;
	    ALL_STATS_KEYS   = Object.keys(createStats());
	    _ = d._;


		/**
		 * Begins the stats routine.
		 */
	    control.start = async (context) => {
			await create(context).reloadSiteStats();
		};
	}
}

// Utility Functions //

/**
 * Returns a new stats object with the stats of the provided object.
 * This helps to ensure a standard format, even when stats are missing.
 */
function createStats(statsObj) {
	return {
		allHits       : statsObj && statsObj.allHits       !== undefined ? statsObj.allHits       : 0,
		articleHits   : statsObj && statsObj.articleHits   !== undefined ? statsObj.articleHits   : 0,
		allShares     : statsObj && statsObj.allShares     !== undefined ? statsObj.allShares     : 0,
		articleShares : statsObj && statsObj.articleShares !== undefined ? statsObj.articleShares : 0,
		usersCreated  : statsObj && statsObj.usersCreated  !== undefined ? statsObj.usersCreated  : 0,
	};
}

function updateLogStatsForKey(attr, key, newStats) {
	let curr = attr[key] = createStats(attr[key]);
	for (let statKey of ALL_STATS_KEYS) curr[statKey] += newStats[statKey];
	attr.markModified(key);
}