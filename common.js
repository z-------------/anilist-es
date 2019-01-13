let settings, defaults, token;

const TIME_ONE_DAY = 86400000;

const BULLET = "·";

const getSettings = function() {
  return new Promise(function(resolve, reject) {
    let settings = {};
    let defaults = {};
    let token;

    fetch(browser.runtime.getURL("options.json")).then(response => {
      return response.json();
    }).then(json => {
      for (let optionInfo of json.options) {
        settings[optionInfo.key] = optionInfo.default;
        defaults[optionInfo.key] = {};
        defaults[optionInfo.key].default = optionInfo.default;
        defaults[optionInfo.key].label = optionInfo.label;
        if (optionInfo.hasOwnProperty("options")) {
          defaults[optionInfo.key].options = optionInfo.options;
        }
      }
      let keys = json.options.map(optionInfo => optionInfo.key);
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
    defaults = r[1];
    token = r[2];

    handlers.forEach(handler => {
      handler(...r);
    });
  });

  return function(handler) {
    if (settings) {
      handler(settings, defaults, token);
    } else {
      handlers.push(handler);
    }
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
  } else if (titles.hasOwnProperty(preferred) && titles[preferred] !== null) {
    return titles[preferred];
  } else {
    return titles.romaji || titles.native;
  }
}

function makeMediaQueryKeys() {
  return `
id
title {
  ${token ? "userPreferred" : `romaji(stylised: true)\nenglish(stylised: true)\nnative(stylised: true)`}
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
meanScore
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
  `;
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

function makeCacheKey(type, id) {
  return `seriescache_${type}:${id}`;
}

function writeSeriesInfoCache(mediaInfo) {
  let newStorage = {};
  newStorage[makeCacheKey(mediaInfo.type, mediaInfo.id)] = Object.assign({ _dateFetched: new Date().getTime() }, mediaInfo);
  return browser.storage.local.set(newStorage);
}

function getSeriesInfo(id, type) {
  return new Promise(function(resolve, reject) {
    let cacheKey = makeCacheKey(type, id);
    browser.storage.local.get([cacheKey]).then(result => {
      if (result[cacheKey] && new Date() - result[cacheKey]._dateFetched < TIME_ONE_DAY) {
        resolve(result[cacheKey]);
      } else {
        let query = `
  query ($id: Int, $type: MediaType) {
    Media (id: $id, type: $type) {
      ${makeMediaQueryKeys()}
    }
  }
        `;
        let variables = { id: id, type: type };

        api(query, variables).then(r => {
          writeSeriesInfoCache(r.Media);
          resolve(r.Media);
        });
      }
    });
  });
}

function getUserInfo() {
  return new Promise((resolve, reject) => {
    onGotSettings((settings, defaults, token) => {
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

function zpad(s, n) {
  if (typeof s !== "string" && typeof s !== "number") throw new TypeError();
  else if (typeof s === "number") s = s.toString();

  if (s.length >= n) return s;
  else {
    return new Array(n - s.length + 1).join("0") + s;
  }
}

function dateFormat(date) {
  let hours = date.getHours();
  let hoursF;
  let pm = hours >= 12;
  if (hours === 0) hoursF = 12;
  else if (hours >= 13) hoursF = hours - 12;
  else hoursF = hours;

  return {
    iso: date.toISOString(),
    absolute: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}, ${hoursF}:${zpad(date.getMinutes(), 2)}:${zpad(date.getSeconds(), 2)} ${pm ? "PM" : "AM"}`
  };
}

function renderDateFormat() {
  timeago().render(document.getElementsByClassName("dateformat"));
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
