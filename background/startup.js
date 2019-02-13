const NOTIFCACHE_KEEPCOUNT = 50;
const SERIESCACHE_KEEPCOUNT = 50;

/* storage format updates */

browser.storage.local.get(["notifcache"]).then(r => {
  if (r.hasOwnProperty("notifcache") && typeof r.notifcache === "string") {
    try {
      let notifcache = JSON.parse(r.notifcache);
      browser.storage.local.set({ notifcache }).then(storageUpgradesDone);
    } catch (exp) {
      browser.storage.local.set({ notifcache: [] }).then(storageUpgradesDone);
    }
  }
});

function storageUpgradesDone() {
  /* free up storage space */

  browser.storage.local.getBytesInUse(bytesInUse => {
    let bytesFree = browser.storage.local.QUOTA_BYTES - bytesInUse;
    if (bytesFree <= 1000000) { // 1 MB
      browser.storage.local.get(null).then(r => {
        if (r.hasOwnProperty("notifcache")) {
          let notifcache = r.notifcache;
          notifcache.sort((a, b) => b.createdAt - a.createdAt);
          notifcache.length = NOTIFCACHE_KEEPCOUNT;
          browser.storage.local.set({ notifcache });
        }

        let seriescaches = {};
        let seriesCacheKeys = [];
        const pattern = /^seriescache_(MANGA|ANIME):\d+$/g;
        for (let key in r) {
          if (pattern.test(key)) {
            seriescaches[key] = r[key];
            seriesCacheKeys.push(key);
          }
        }
        seriesCacheKeys.sort((a, b) => seriescaches[b]._dateFetched - seriescaches[a]._dateFetched);
        for (let i = SERIESCACHE_KEEPCOUNT; i < seriesCacheKeys.length; i++) {
          browser.storage.local.remove(seriesCacheKeys[i]);
        }
      });
    }
  });
}
