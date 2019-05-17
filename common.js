let settings, defaults, token;

const TIME_ONE_DAY = 86400000;

const INFOCARDS_MAX_GENRES = 4;

const CHAR_BULLET = "·";

const CAPITALIZE_FIRST = 1, CAPITALIZE_WORDS = 2;

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
    NOVEL: "Light Novel",
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

function makeMediaQueryKeys(options) {
  options = options || {};
  return `
title {
  ${token ? "userPreferred" : `romaji(stylised: true)\nenglish(stylised: true)\nnative(stylised: true)`}
}
siteUrl
coverImage {
  large
}
  ` + (!options.short ? `
id
type
episodes
chapters
volumes
status
format
season
startDate {
  year
}
airingSchedule (notYetAired: true, page: 0, perPage: 1) {
  nodes {
    episode
  }
}
description (asHtml: true)
genres
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
  ` : "");
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

  console.log("ALES: API call", { query, variables, token });

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

const makeUsersCacheKey = function(name) {
  return `userscache:${name.toLowerCase()}`;
};

function writeSeriesInfoCache(mediaInfo) {
  let newStorage = {};
  newStorage[makeCacheKey(mediaInfo.type, mediaInfo.id)] = Object.assign({ _dateFetched: new Date().getTime() }, mediaInfo);
  return browser.storage.local.set(newStorage);
}

function writeUsersCache(user) {
  let newStorage = {};
  newStorage[makeUsersCacheKey(user.name)] = Object.assign({ _dateFetched: new Date().getTime() }, user);
  return browser.storage.local.set(newStorage);
}

function getSeriesInfo(id, type) {
  return new Promise(function(resolve, reject) {
    let cacheKey = makeCacheKey(type, id);
    findInCache(cacheKey).then(result => {
      if (result) {
        resolve(result);
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

function getAuthedUserInfo() {
  return new Promise((resolve, reject) => {
    onGotSettings((settings, defaults, token) => {
      if (token) {
        findInCache("usercache").then(r => {
          if (r) {
            resolve(r);
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

const getUserInfo = function(name) {
  const query = `
query ($name: String) {
  User (name: $name) {
    id
    name
    avatar { large }
    bannerImage
    donatorTier
    moderatorStatus
    stats {
      watchedTime
      chaptersRead
      favouredGenres {
        genre
        amount
        meanScore
      }
      favouredTags {
        tag { name }
        amount
        meanScore
      }
    }
  }
}
  `;
  const variables = { name };
  return new Promise(function(resolve, reject) {
    const cacheKey = makeUsersCacheKey(name);
    findInCache(cacheKey).then(result => {
      if (result) {
        resolve(result);
      } else {
        api(query, variables)
          .then(r => {
            writeUsersCache(r.User);
            resolve(r.User);
          })
          .catch(e => reject(e));
      }
    });
  });
};

const getFollowingLists = function(userId) {
  return new Promise((resolve, reject) => {
    if (token) {
      const queries = {
        following: `
  query ($id: Int!, $page: Int) {
    Page(page: $page) {
      pageInfo {
        hasNextPage
      }
      following (userId: $id, sort: USERNAME) {
        id
      }
    }
  }
        `,
        followers: `
  query ($id: Int!, $page: Int) {
    Page(page: $page) {
      pageInfo {
        hasNextPage
      }
      followers (userId: $id, sort: USERNAME) {
        id
      }
    }
  }
      `
      };
      let variables = { id: userId };
      let done = false;
      let currentList = "following";
      let result = {
        following: [],
        followers: []
      };
      function getPages(page) {
        page = page || 1;
        // console.log("getPages(" + page + ")")
        variables.page = page;
        return api(queries[currentList], variables, token)
          .then(r => {
            result[currentList].push(...r.Page[currentList]);
            if (r.Page.pageInfo.hasNextPage) {
              return getPages(page + 1);
            } else if (currentList === "following") {
              currentList = "followers";
              return getPages(1);
            } else {
              return;
            }
          })
          .catch(e => reject(e));
      }
      getPages(1).then(() => resolve(result));
    } else {
      reject("Not authenticated");
    }
  });
};

const getAuthedUserFollowingLists = function() {
  const STORAGE_KEY = "userfollowinglistscache";
  return findInCache(STORAGE_KEY).then(r => {
    if (r) {
      return r;
    } else {
      return new Promise((resolve, reject) => {
        getAuthedUserInfo().then(authedUser => {
          getFollowingLists(authedUser.id)
          .then(lists => {
            let newStorage = {};
            newStorage[STORAGE_KEY] = Object.assign({}, lists);
            newStorage[STORAGE_KEY]._dateFetched = new Date().getTime();
            browser.storage.local.set(newStorage).then(() => resolve(lists));
          })
          .catch(e => reject());
        });
      });
    }
  })
};

function getActivityInfos(options) {
  let ids = options.ids;
  if (ids.length) {
    return new Promise((resolve, reject) => {
      let query = `
  query ($ids: [Int], $types: [ActivityType], $perPage: Int) {
    Page (page: 0, perPage: $perPage) {
      activities (id_in: $ids, type_in: $types, sort: ID_DESC) {
        ... on ListActivity {
          id
          type
          status
          progress
          media {
            id
            type
          }
          replies {
            text
            user {
              name
            }
            createdAt
          }
        }
        ... on TextActivity {
          id
          type
          text
          replies {
            text
            user {
              name
            }
            createdAt
          }
        }
        ... on MessageActivity {
          id
          type
          message
          user: recipient {
            id
          }
          replies {
            text
            user {
              name
            }
            createdAt
          }
        }
      }
    }
  }
        `;
      api(query, {
        ids,
        type: ["TEXT", "ANIME_LIST", "MANGA_LIST", "MESSAGE", "MEDIA_LIST"],
        perPage: ids.length
      }).then(r => {
        // let result = {};
        // let activities = r.Page.activities;
        // for (let i = 0; i < activities.length; i++) {
        //   result[activities[i].id] = activities[i];
        // }
        // resolve(result);
        resolve(r.Page.activities);
      });
    });
  } else {
    return Promise.reject("No activity IDs provided");
  }
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

function clearUsersInfoCache() {
  return new Promise((resolve, reject) => {
    browser.storage.local.get(null)
      .then(r => {
        let cacheKeys = Object.keys(r).filter(key => key.split(":")[0] === "userscache");
        browser.storage.local.remove(cacheKeys).then(resolve).catch(e => reject(e));
      })
      .catch(e => reject(e));
  });
}

function clearFollowingListsCache() {
  return browser.storage.local.remove("userfollowinglistscache");
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

function capitalize(str, mode) {
  if (!mode || mode === CAPITALIZE_FIRST) {
    return str[0].toUpperCase() + str.substring(1);
  } else if (mode === CAPITALIZE_WORDS) {
    return str.split(" ").map(s => capitalize(s)).join(" ");
  }
}

const stringContains = function(string, substring) {
  return string.indexOf(substring) !== -1;
};

const icon = function(ic) {
  return `<img class="amc_icon" src="${browser.runtime.getURL(`img/${ic}.svg`)}" />`;
};

const calculateCardPosition = function(target, options) {
  options = options || {};

  let cardHeight = options.cardHeight || 250;
  let cardWidth = options.cardWidth || 500;
  let margin = options.margin || 15;
  let rect = target.getClientRects()[0];

  if (rect) {
    let result = {};

    if (rect.top - 2 * margin - cardHeight < 0) {
      result.direction = "down";
      result.top = rect.bottom + margin;
    } else {
      result.direction = "up";
      result.top = rect.top - margin - cardHeight;
    }

    if (rect.left + rect.width / 2 - cardWidth / 2 < 0) {
      result.left = margin;
      result.isOffCenterX = true;
    } else if (rect.left + rect.width / 2 + cardWidth / 2 > window.innerWidth) {
      result.left = window.innerWidth - margin - cardWidth;
      result.isOffCenterX = true;
    } else {
      result.left = rect.left + rect.width / 2 - cardWidth / 2;
    }

    return result;
  } else {
    return null;
  }
};

const round = function(n, d) {
  d = d || 0;
  return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
};

const findInCache = function(cacheKey, options) {
  options = options || { expire: TIME_ONE_DAY };
  return browser.storage.local.get(cacheKey)
    .then(r => {
      if (r[cacheKey] && new Date().getTime() - r[cacheKey]._dateFetched < options.expire) {
        return r[cacheKey];
      } else {
        return null;
      }
    });
};

const processNotif = function(notif) {
  let result = {};

  /* url */
  let typeSplit = notif.type.split("_");
  if (typeSplit[0] === "ACTIVITY" || typeSplit[0] === "ACTIVITY_REPLY_SUBSCRIBED") {
    result.url = `https://anilist.co/activity/${notif.activityId}`;
  } else if (notif.type === "AIRING" || notif.type === "RELATED_MEDIA_ADDITION") {
    result.url = `https://anilist.co/${notif.media.type.toLowerCase()}/${notif.media.id}`;
  } else if (notif.type === "FOLLOWING") {
    result.url = `https://anilist.co/user/${notif.user.name}`;
  } else if (typeSplit[0] === "THREAD" && (typeSplit[1] === "COMMENT" || typeSplit[1] === "SUBSCRIBED")) {
    result.url = `https://anilist.co/forum/thread/${notif.thread.id}/comment/${notif.commentId}`;
  } else if (notif.type === "THREAD_LIKE") {
    result.url = `https://anilist.co/forum/thread/${notif.threadId}`;
  }

  /* text */
  if (notif.type === "AIRING") {
    result.text = `${notif.contexts[0]}${notif.episode}${notif.contexts[1]}${notif.media.title.userPreferred}${notif.contexts[2]}`;
  } else if (notif.type === "RELATED_MEDIA_ADDITION") { 
    result.text = `${notif.media.title.userPreferred}${notif.context}`;
  } else {
    result.text = `${notif.user.name}${notif.context}`;
  }

  /* html */
  if (notif.type === "AIRING") {
    result.html = `${notif.contexts[0]}${notif.episode}${notif.contexts[1]}<a target="_blank" href="https://anilist.co/${notif.media.type.toLowerCase()}/${notif.media.id}/">${notif.media.title.userPreferred}</a>${notif.contexts[2]}`;
  } else if (notif.type === "RELATED_MEDIA_ADDITION") { 
    result.html = `<a target="_blank" href="https://anilist.co/${notif.media.type.toLowerCase()}/${notif.media.id}/">${notif.media.title.userPreferred}</a>${notif.context}`;
  } else {
    result.html = `<a target="_blank" href="https://anilist.co/user/${notif.user.name}/">${notif.user.name}</a>${notif.context}`;
  }

  /* image */
  result.image = notif.media ? notif.media.coverImage.large : notif.user.avatar.large;

  return result;
};
