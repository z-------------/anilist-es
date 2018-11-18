let settings = {};
let token;

const TIME_ONE_DAY = 86400000;

const BULLET = "·";

const getSettings = function() {
  return new Promise(function(resolve, reject) {
    let settings = {};

    fetch(browser.runtime.getURL("options.json")).then(response => {
      return response.json();
    }).then(json => {
      let optionInfos = json.options;
      let defaults = {};
      for (let optionInfo of optionInfos) {
        settings[optionInfo.key] = optionInfo.default;
        defaults[optionInfo.key] = {};
        defaults[optionInfo.key].default = optionInfo.default;
        defaults[optionInfo.key].label = optionInfo.label;
        if (optionInfo.hasOwnProperty("options")) {
          defaults[optionInfo.key].options = optionInfo.options;
        }
      }
      let keys = optionInfos.map(optionInfo => optionInfo.key);
      browser.storage.sync.get(["token"]).then(results => {
        token = results.token;
        browser.storage.sync.get(keys).then(results => {
          for (let key in results) {
            settings[key] = results[key];
          }
          resolve([settings, defaults, token]);
        });
      });
    }).catch(err => reject(err));
  });
};

const onGotSettings = (function() {
  let handlers = [];

  getSettings().then(r => {
    settings = r[0];

    handlers.forEach(handler => {
      handler(...r);
    });
  });

  return function(handler) {
    handlers.push(handler);
  };
}());

let onNavigate = (function() {
  let handlers = [];
  let oldURL = window.location.href;
  let timer = setInterval(function() {
    if (window.location.href !== oldURL) {
      handlers.forEach(function(handler) { handler() });
      oldURL = window.location.href;
    }
  }, 500);

  return function(handler) {
    handlers.push(handler);
  }
}());

let onElementChange = function(target, callback, options) {
  if (!options) options = { attributes: false, childList: true, subtree: true };
  let observer = new MutationObserver(callback);
  observer.observe(target, options);
  return observer.disconnect;
};

function getTitle(titles, preferred) {
  if (titles.hasOwnProperty("userPreferred")) { // getSeriesInfo() only includes this key if we have a token
    return titles.userPreferred;
  } else if (titles.hasOwnProperty(preferred)) {
    return titles[preferred];
  } else {
    return titles[Object.keys(titles)[0]];
  }
}

function api(query, variables, token) {
  let options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      query: query,
      variables: variables
    })
  };

  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch("https://graphql.anilist.co", options)
    .then(response => {
      return response.json().then(json => {
        return response.ok ? json : Promise.reject(json);
      });
    })
    .then(json => {
      return json.data;
    })
    .catch(error => {
      return Promise.reject(error);
    });
}

function stripHTML(html) {
  return html.replace(/(<([^>]+)>)/ig, "");
}

function getSeriesInfo(id, type) {
  return new Promise(function(resolve, reject) {
    let cacheKey = `seriescache_${type}:${id}`;
    browser.storage.local.get([cacheKey]).then(result => {
      if (result[cacheKey] && new Date() - result[cacheKey]._dateFetched < TIME_ONE_DAY) {
        resolve(result[cacheKey]);
      } else {
        let query = `
  query ($id: Int, $type: MediaType) {
    Media (id: $id, type: $type) {
      id
      title {
        ${token ? "userPreferred" : `${settings.titleLanguage} (stylised: true)`}
      }
      type
      episodes
      chapters
      volumes
      status
      format
      startDate {
        year
      }
      description (asHtml: true)
      genres
      coverImage {
        large
      }
      bannerImage
      averageScore
      rankings {
        rank
        type
        allTime
        year
        season
      }
      studios (isMain: true) {
        nodes {
          name
        }
      }
      siteUrl
    }
  }
        `;
        let variables = { id: id, type: type };

        api(query, variables).then(r => {
          let newStorage = {};
          newStorage[cacheKey] = Object.assign({ _dateFetched: new Date().getTime() }, r.Media);
          browser.storage.local.set(newStorage);
          resolve(r.Media);
        });
      }
    });
  });
}

function getUserInfo() {
  return new Promise((resolve, reject) => {
    if (token) {
      browser.storage.local.get(["usercache"]).then(r => {
        if (r.usercache && new Date() - new Date(r.usercache._dateFetched) <= TIME_ONE_DAY) {
          resolve({
            id: r.usercache.id,
            name: r.usercache.name
          });
        } else {
          let query = `query { Viewer { id name } }`;
          api(query, {}, token)
            .then(response => {
              let id = response.Viewer.id;
              let name = response.Viewer.name;
              browser.storage.local.set({
                usercache: {
                  id, name,
                  _dateFetched: new Date().getTime()
                }
              });
              resolve({ id, name });
            })
            .catch(e => reject(e));
        }
      });
    } else {
      reject("No authentication token");
    }
  });
}

function clearSeriesInfoCache() {
  return new Promise((resolve, reject) => {
    browser.storage.local.get(null)
      .then(r => {
        let cacheKeys = Object.keys(r).filter(key => key.split("_")[0] === "seriescache");
        browser.storage.local.remove(cacheKeys).then(resolve).catch(e => reject(e));
      })
      .catch(e => reject(e));
  });
}

const strings = {
  format: {
    TV: "TV",
    TV_SHORT: "TV Short",
    MOVIE: "Movie",
    SPECIAL: "Special",
    OVA: "OVA",
    ONA: "ONA",
    MUSIC: "Music",
    MANGA: "Manga",
    NOVEL: "Novel",
    ONE_SHOT: "One Shot"
  },
  status: {
    FINISHED: "Finished",
    RELEASING: "Releasing",
    NOT_YET_RELEASED: "Not yet released",
    CANCELLED: "Cancelled"
  },
  season: {
    SPRING: "Spring",
    SUMMER: "Summer",
    FALL: "Fall",
    WINTER: "Winter"
  },
  seasonShort: {
    SPRING: "Sp",
    SUMMER: "Su",
    FALL: "F",
    WINTER: "W"
  }
};
