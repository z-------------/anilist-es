/*
 * manually modified version of common.js for the userscript version of ALES
 */

const TIME_ONE_DAY = 86400000;

const INFOCARDS_MAX_GENRES = 4;

const CHAR_BULLET = "·";

const CAPITALIZE_FIRST = 0, CAPITALIZE_WORDS = 1;

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

function getTitle(titles, preferred) {
  if (titles.hasOwnProperty("userPreferred")) { // getSeriesInfo() only includes this key if we have a token
    return titles.userPreferred;
  } else if (titles.hasOwnProperty(preferred) && titles[preferred] !== null) {
    return titles[preferred];
  } else {
    return titles.romaji || titles.native;
  }
}

function getSeriesInfo(id, type) {
  return new Promise(function(resolve, reject) {
    let query = `
query ($id: Int, $type: MediaType) {
Media (id: $id, type: $type) {
${makeMediaQueryKeys()}
}
}
`;
    let variables = { id: id, type: type };

    api(query, variables).then(r => {
      resolve(r.Media);
    });
  });
}

function makeMediaQueryKeys(options) {
  options = options || {};
  return `
title {
romaji(stylised: true)
english(stylised: true)
native(stylised: true)
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

function stripHTML(html) {
  return html.replace(/(<([^>]+)>)/ig, "");
}

function renderDateFormat() {
  timeago().render(document.getElementsByClassName("dateformat"));
}

function writeSeriesInfoCache() {
  // does nothing in Lite
}

function capitalize(str, mode) {
  if (mode === undefined || mode === CAPITALIZE_FIRST) {
    return str[0].toUpperCase() + str.substring(1);
  } else if (mode === CAPITALIZE_WORDS) {
    throw new Error("not yet implemented");
  }
}

const stringContains = function(string, substring) {
  return string.indexOf(substring) !== -1;
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

const onGotSettings = function(handler) {
  handler(settings);
};

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

const icon = function(ic) {
  let emoji;
  if (ic === "heart") emoji = "❤️";
  else if (ic === "star") emoji = "⭐";
  return `<span class="amc_icon">${emoji}</span>`;
};
