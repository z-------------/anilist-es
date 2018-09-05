function getSettings() {
  return new Promise(function(resolve, reject) {
    let settings = {};

    fetch(chrome.runtime.getURL("defaults.json")).then(response => {
      return response.json();
    }).then(defaults => {
      let keys = Object.keys(defaults);
      for (let key of keys) {
        settings[key] = defaults[key].default;
      }
      chrome.storage.sync.get(keys, results => {
        for (let key in results) {
          settings[key] = results[key];
        }
        resolve([settings, defaults]);
      });
    }).catch(err => reject(err));
  });
}
