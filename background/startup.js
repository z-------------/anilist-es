/* storage format updates */

browser.storage.local.get(["notifcache"]).then(r => {
  if (r.hasOwnProperty("notifcache") && typeof r.notifcache === "string") {
    try {
      let notifcache = JSON.parse(r.notifcache);
      browser.storage.local.set({ notifcache });
    } catch (exp) {
      browser.storage.local.set({ notifcache: [] });
    }
  }
});
