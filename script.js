console.log("anilist-bars running");

const BULLET = "·";

let settings = {};

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

function getActivity() {
  [...document.getElementsByClassName("activity-anime_list"), ...document.getElementsByClassName("activity-manga_list")].forEach(elem => {
    let statusElem = elem.getElementsByClassName("status")[0];
    if (statusElem) {
      let text = statusElem.childNodes[0].textContent.trim();

      /* progress */
      let dMatches = text.match(/\d+/g);
      var progress;
      if (dMatches) {
        let progresses = dMatches.map(n => Number(n));
        progress = progresses[progresses.length - 1];
      } else {
        progress = null;
      }

      /* series info */
      let seriesName = statusElem.getElementsByClassName("title")[0].textContent.trim();
      let seriesType = elem.classList.contains("activity-anime_list") ? "anime" : "manga";

      let coverElem = elem.getElementsByClassName("cover")[0];
      let seriesID = Number(coverElem.getAttribute("href").split("/")[2]);

      let seriesImage = coverElem.style.backgroundImage.match(/"\S+"/)[0].slice(1, -1);

      if (!series.hasOwnProperty(seriesID)) {
        series[seriesID] = {
          name: seriesName,
          type: seriesType,
          id: seriesID,
          image: seriesImage
        };
        getSeriesInfo({ id: seriesID, type: seriesType }).then(info => {
          seriesInfoGotCount++;
          Object.assign(series[seriesID], info);
          if (Object.keys(series).length === seriesInfoGotCount) {
            displayProgressBars();
          }
        });
      }

      /* activity type */
      let words = text.toLowerCase().split(" ");
      let firstWord = words[0];
      var type;
      if (firstWord === "watched" || firstWord === "read") {
        type = "watch";
      } else if (firstWord === "plans") {
        type = "plan";
      } else if (firstWord === "completed") {
        type = "complete";
      }

      /* time */
      let timeElem = elem.getElementsByTagName("time")[0];
      let timestamp = timeElem.getAttribute("datetime");
      let timeRelative = timeElem.textContent;
      let timeAbsolute = timeElem.getAttribute("title");

      activity.push({
        progress: progress,
        type: type,
        series: series[seriesID],
        time: {
          timestamp: timestamp,
          relative: timeRelative,
          absolute: timeAbsolute
        }
      });
    }
  });
}

function displayProgressBars() {
  let displayedSeries = [];
  for (let i = 0; i < activity.length; i++) {
    let item = activity[i];
    if (displayedSeries.indexOf(item.series.id) === -1 && (item.type === "watch" || item.type === "complete")) {
      displayedSeries.push(item.series.id);
      if (displayedSeries.length === settings.barsCount) {
        break;
      }
    }
  }

  let barTemplate = document.createElement("div");
  barTemplate.classList.add("amb");
  barTemplate.innerHTML = `
<div class='amb_image'></div>
<div class='amb_info'>
  <div class='amb_title'></div>
  <div class='amb_bar-container progress'>
    <div class='amb_bar bar'></div>
  </div>
  <div class='amb_status'>
    <div class='amb_status_left'></div>
    <div class='amb_status_right'></div>
  </div>
</div>`;

  let containerElem = document.getElementsByClassName("amb-container")[0];
  if (!containerElem) {
    containerElem = document.createElement("div");
    containerElem.classList.add("amb-container");
    let sectionElem = document.getElementsByClassName("section")[0];
    sectionElem.insertBefore(containerElem, sectionElem.children[settings.insertIndex]);
  }
  containerElem.innerHTML = `
<h2 class="section-header">${settings.headingText}</h2>
<div class="content-wrap"></div>`;
  let contentElem = containerElem.getElementsByClassName("content-wrap")[0];

  displayedSeries.forEach(seriesID => {
    let elem = barTemplate.cloneNode(true);

    let latestActivity;
    for (let i = 0; i < activity.length; i++) {
      if (activity[i].series.id === seriesID) {
        latestActivity = activity[i];
        break;
      }
    }
    let seriesInfo = series[seriesID];

    let displayedProgress;
    let displayedUnits = latestActivity.progress;
    let unitsCount = seriesInfo.episodes || seriesInfo.chapters;
    if (latestActivity.type === "complete") {
      displayedProgress = 1;
      displayedUnits = unitsCount || "?";
    } else if (unitsCount) {
      displayedProgress = latestActivity.progress / unitsCount;
    } else {
      displayedProgress = 0.5;
      elem.classList.add("episodecount-unknown");
    }

    let format;
    if (seriesInfo.format === "TV_SHORT") {
      format = "TV short";
    } else if (seriesInfo.format === "MOVIE") {
      format = "Film";
    } else if (seriesInfo.format === "SPECIAL") {
      format = "Special";
    } else if (seriesInfo.format === "MUSIC") {
      format = "Music video";
    } else if (seriesInfo.format === "MANGA") {
      format = "Manga";
    } else if (seriesInfo.format === "NOVEL") {
      format = "Novel";
    } else if (seriesInfo.format === "ONE_SHOT") {
      format = "One-shot";
    } else {
      format = seriesInfo.format;
    }

    let time = latestActivity.time;

    elem.getElementsByClassName("amb_image")[0].style.backgroundImage = `url(${seriesInfo.image})`;
    elem.getElementsByClassName("amb_title")[0].innerHTML = `<a class="title" href="/${seriesInfo.type}/${seriesID}">${seriesInfo.name}</a>`;
    elem.getElementsByClassName("amb_bar")[0].style.width = `${Math.floor(displayedProgress * 100)}%`;
    elem.getElementsByClassName("amb_status_left")[0].innerHTML = `
<strong>${displayedUnits}</strong>/${unitsCount || "?"} ${BULLET}
${format}
${seriesInfo.status === "PUBLISHING" ? `${BULLET} Publishing` : ""}
`;
    elem.getElementsByClassName("amb_status_right")[0].innerHTML = `<time datetime="${time.timestamp}" title="${time.absolute}">${time.relative}</time>`;

    contentElem.appendChild(elem);
  });
}

function main() {
  activity = [];
  series = {};
  seriesInfoGotCount = 0;

  let timer = setInterval(function() {
    getActivity();
    let activityContainerElem = document.getElementsByClassName("activity-feed")[0];
    if (activityContainerElem && activityContainerElem.children.length !== 0) {
      clearInterval(timer);
    }
  }, 500);
}

getSettings().then(r => {
  settings = r[0];

  main();

  onNavigate(function() {
    if (window.location.pathname.slice(1).split("/")[0] === "user") {
      main();
    }
  });
});
