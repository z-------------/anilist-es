let settings = {};

const BULLET = "·";

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
  if (!options) options = { attributes: true, childList: true, subtree: true };
  let observer = new MutationObserver(callback);
  observer.observe(target, options);
  return observer.disconnect;
};

function api(query, variables) {
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

  return fetch("https://graphql.anilist.co", options)
    .then(response => {
      return response.json().then(json => {
        return response.ok ? json : Promise.reject(json);
      });
    })
    .then(json => {
      return json.data.Media;
    })
    .catch(error => {
      console.error(error);
    });
}

function stripHTML(html) {
  return html.replace(/(<([^>]+)>)/ig, "");
}

function getSeriesInfo(info) {
  let query = `
query ($id: Int, $type: MediaType) {
  Media (id: $id, type: $type) {
    episodes
    chapters
    status
    format
  }
}
  `;
  let variables = {
    id: info.id, type: info.type.toUpperCase()
  };

  return api(query, variables);
}

let handlers = [];

function onGotSettings(handler) {
  handlers.push(handler);
}

getSettings().then(r => {
  settings = r[0];

  handlers.forEach(handler => {
    handler(settings);
  });
});

let strings = {
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
  }
};
