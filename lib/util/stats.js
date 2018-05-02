
module.exports = function createStats(d) {
	// Init
	let stats = { 'foo' : 'bar' },
	    siteStats;

	// Private Methods
	async function refreshSiteStats() {
		return {
			articleReads  : 5953,
			bookDownloads : 1954,
			abolitionists : 976,
			shares        : 2158
		};
	};

	// Public Methods
	stats.getSiteStats = function getSiteStats() {
		return siteStats;
	}

	return (async function() {
		siteStats = await refreshSiteStats();
		return stats;
	})();
}