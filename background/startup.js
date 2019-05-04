const KEEPCOUNT = 50;
// const KEEPCOUNT = 1;

/* storage format updates */

browser.storage.local.get(["notifcache"]).then(r => {
  if (r.hasOwnProperty("notifcache") && typeof r.notifcache === "string") {
    try {
      let notifcache = JSON.parse(r.notifcache);
      browser.storage.local.set({ notifcache }).then(storageUpgradesDone);
    } catch (exp) {
      browser.storage.local.set({ notifcache: [] }).then(storageUpgradesDone);
    }
  } else {
    storageUpgradesDone();
  }
});

/* helper function for filtering caches to n newest elements and RETURN KEYS OF OLDEST ELEMENTS */
function ageFilter(keys, r, n) {
  let keysCopy = [].slice.call(keys);
  keysCopy.sort((a, b) => r[a]._dateFetched - r[b]._dateFetched); // date ascending
  keysCopy.length = Math.max(0, keys.length - n);
  return keysCopy;
}

/* free up storage space */
function storageUpgradesDone() {
  browser.storage.local.getBytesInUse().then(bytesInUse => {
    let bytesFree = browser.storage.local.QUOTA_BYTES - bytesInUse;
    if (bytesFree <= 1000000) { // 1 MB
    // if (true) {
      browser.storage.local.get(null).then(r => {
        /* notifcache */
        if (r.hasOwnProperty("notifcache")) {
          let notifcache = r.notifcache;
          notifcache.sort((a, b) => b.createdAt - a.createdAt);
          notifcache.length = KEEPCOUNT;
          browser.storage.local.set({ notifcache });
        }

        const keys = Object.keys(r);

        /* seriescache */
        const seriesCacheKeyPattern = /seriescache_(ANIME|MANGA):\d+/;
        let seriesCacheKeys = keys.filter(key => seriesCacheKeyPattern.test(key));
        let oldSeriesCacheKeys = ageFilter(seriesCacheKeys, r, KEEPCOUNT);
        browser.storage.local.remove(oldSeriesCacheKeys);

        /* userscache */
        const usersCacheKeyPattern = /userscache:\S+/;
        let usersCacheKeys = keys.filter(key => usersCacheKeyPattern.test(key));
        let oldUsersCacheKeys = ageFilter(usersCacheKeys, r, KEEPCOUNT);
        browser.storage.local.remove(oldUsersCacheKeys);

        /* activitycache -- seems to be unused */
        const activityCachePattern = /activitycache:\d+/;
        let activityCacheKeys = keys.filter(key => activityCachePattern.test(key));
        // let oldActivityCacheKeys = ageFilter(activityCacheKeys, r, KEEPCOUNT);
        // browser.storage.local.remove(oldActivityCacheKeys);
        browser.storage.local.remove(activityCacheKeys);
      });
    }
  });
}
