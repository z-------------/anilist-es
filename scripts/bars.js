let makeProgressBarElem = (function() {
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

  return function(progressItem, seriesInfos) {
    let elem = barTemplate.cloneNode(true);

    let seriesID = progressItem.seriesID;
    let seriesInfo = seriesInfos[seriesID];

    let displayedProgress;
    let displayedUnits = progressItem.progress;
    let unitsCount = seriesInfo.episodes || seriesInfo.chapters;
    if (progressItem.type === "complete") {
      displayedProgress = 1;
      displayedUnits = unitsCount || "?";
    } else if (unitsCount) {
      displayedProgress = progressItem.progress / unitsCount;
    } else {
      displayedProgress = 0.5;
      elem.classList.add("episodecount-unknown");
    }

    let time = progressItem.time;

    elem.getElementsByClassName("amb_image")[0].style.backgroundImage = `url(${seriesInfo.coverImage.large})`;
    elem.getElementsByClassName("amb_title")[0].innerHTML = `<a class="title" href="${seriesInfo.siteUrl}">${getTitle(seriesInfo.title, settings.titleLanguage)}</a>`;
    elem.getElementsByClassName("amb_bar")[0].style.width = `${Math.floor(displayedProgress * 100)}%`;
    elem.getElementsByClassName("amb_status_left")[0].innerHTML = `
  <strong>${displayedUnits}</strong>/${unitsCount || "?"} ${BULLET}
  ${strings.format[seriesInfo.format]}
  ${seriesInfo.status === "RELEASING" ? `${BULLET} ${strings.status[seriesInfo.status]}` : ""}
  `;
    elem.getElementsByClassName("amb_status_right")[0].innerHTML = `<time datetime="${time.timestamp}" title="${time.absolute}">${time.relative}</time>`;

    return elem;
  }
}());

function displayProgressBars(progresses, seriesInfos) {
  let containers = [...document.getElementsByClassName("amb-container")];

  let progressesSep = [];

  if (settings.barsSeparateByType) {
    progressesSep[0] = progresses.filter(progressItem => progressItem.seriesType === "ANIME");
    progressesSep[1] = progresses.filter(progressItem => progressItem.seriesType === "MANGA");
  } else {
    progressesSep[0] = progresses;
  }

  let end = settings.barsSeparateByType ? 2 : 1;

  for (let i = 0; i < end; i++) {
    if (progressesSep[i].length) {
      if (!containers[i]) {
        containers[i] = document.createElement("div");
        containers[i].classList.add("amb-container");
        let sectionElem = document.getElementsByClassName("section")[0];
        sectionElem.insertBefore(containers[i], sectionElem.children[settings.insertIndex + i]);
      }

      containers[i].innerHTML = `
    <h2 class="section-header">Recent ${settings.barsSeparateByType ? ["Anime", "Manga"][i] + " " : ""}Progress</h2>
    <div class="content-wrap"></div>`;
      let contentElem = containers[i].getElementsByClassName("content-wrap")[0];

      let end = Math.min(settings.barsCount, progressesSep[i].length);
      for (let j = 0; j < end; j++) {
        contentElem.appendChild(makeProgressBarElem(progressesSep[i][j], seriesInfos));
      }
    }
  }
}

function getSeriesInfos(progresses) { // not to be confused with getSeriesInfo()
  let seriesInfos = {};
  let seriesInfosGotCount = 0;
  progresses.forEach(progressItem => {
    getSeriesInfo(progressItem.seriesID, progressItem.seriesType).then(seriesInfo => {
      seriesInfos[progressItem.seriesID] = seriesInfo;
      seriesInfosGotCount++;
      if (seriesInfosGotCount === progresses.length) {
        displayProgressBars(progresses, seriesInfos);
      }
    });
  });
}

function getProgresses(activity) {
  let seriesInProgresses = [];
  let progresses = [];
  for (let i = 0; i < activity.length; i++) {
    let seriesID = activity[i].seriesID;
    if (seriesInProgresses.indexOf(seriesID) === -1 &&
        activity[i].type !== "plan" &&
        activity[i].type !== "pause"
      ) {
      seriesInProgresses.push(seriesID);
      progresses.push(activity[i]);
    }
    if (!settings.barsSeparateByType && progresses.length === settings.barsCount) break;
  }
  getSeriesInfos(progresses);
}

function getActivity() {
  let activity = [];

  [...document.getElementsByClassName("activity-entry")].forEach(elem => {
    if (!elem.classList.contains("activity-text") && !elem.classList.contains("activity-message")) {
      let statusElem = elem.getElementsByClassName("status")[0];
      let text = statusElem.childNodes[0].textContent.trim();

      let coverElem = elem.getElementsByClassName("cover")[0];
      let seriesID = Number(coverElem.getAttribute("href").split("/")[2]);
      let seriesType = elem.classList.contains("activity-anime_list") ? "ANIME" : "MANGA";

      let dMatches = text.match(/\d+/g);
      var progress;
      if (dMatches) {
        let progresses = dMatches.map(n => Number(n));
        progress = progresses[progresses.length - 1];
      } else {
        progress = null;
      }

      let words = text.toLowerCase().split(" ");
      let firstWord = words[0];
      var type;
      if (firstWord === "watched" || firstWord === "read") {
        type = "watch";
      } else if (firstWord === "plans") {
        type = "plan";
      } else if (firstWord === "completed") {
        type = "complete";
      } else if (firstWord === "paused") {
        type = "pause";
      }

      let timeElem = elem.getElementsByTagName("time")[0];
      let timestamp = timeElem.getAttribute("datetime");
      let time = new Date(timestamp);
      let timeRelative = timeElem.textContent;
      let timeAbsolute = timeElem.getAttribute("title");

      activity.push({
        progress: progress,
        seriesType: seriesType,
        seriesID: seriesID,
        type: type,
        time: {
          timestamp: timestamp,
          time: time,
          relative: timeRelative,
          absolute: timeAbsolute
        }
      });
    }
  });

  getProgresses(activity);
}

onGotSettings(function() {
  if (settings.barsEnable) {
    onElementChange(document.getElementsByClassName("page-content")[0], changes => {
      if (window.location.pathname.slice(1).split("/")[0] === "user") {
        for (let i = 0; i < changes.length; i++) {
          let change = changes[i];
          if (
            (
              change.addedNodes[0] &&
              change.addedNodes[0] instanceof HTMLElement &&
              change.addedNodes[0].classList.contains("activity-entry")
            ) ||
            (
              change.target.classList &&
              change.target.classList.contains("status") &&
              change.addedNodes[0] &&
              change.addedNodes[0] instanceof Text || change.addedNodes[1] instanceof Text
            )
          ) {
            getActivity();
            break;
          }
        }
      }
    });
  }
});
