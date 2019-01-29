let makeProgressBarElem = (function() {
  let barTemplate = document.createElement("div");
  barTemplate.classList.add("amb");
  barTemplate.innerHTML = `
<div class='amb_image'></div>
<div class='amb_info'>
  <div class='amb_title'></div>
  <div class='amb_bar-container progress'>
    <div class='amb_bar amb_bar--released'></div>
    <div class='amb_bar amb_bar--watched bar'></div>
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
    let timeFormatted = dateFormat(time);

    elem.getElementsByClassName("amb_image")[0].style.backgroundImage = `url(${seriesInfo.coverImage.large})`;
    elem.getElementsByClassName("amb_title")[0].innerHTML = `<a class="title" href="${seriesInfo.siteUrl}">${getTitle(seriesInfo.title, settings.titleLanguage)}</a>`;
    if (
      unitsCount &&
      seriesInfo.airingSchedule && seriesInfo.airingSchedule.nodes &&
      seriesInfo.airingSchedule.nodes.length &&
      typeof seriesInfo.airingSchedule.nodes[0].episode === "number"
    ) {
      let releasedProgress = (seriesInfo.airingSchedule.nodes[0].episode - 1) / unitsCount;
      elem.getElementsByClassName("amb_bar--released")[0].style.width = `${Math.floor(releasedProgress * 100)}%`;
    } else if (seriesInfo.status === "RELEASING") {
      elem.getElementsByClassName("amb_bar--released")[0].style.width = 0;
    }
    elem.getElementsByClassName("amb_bar--watched")[0].style.width = `${Math.floor(displayedProgress * 100)}%`;
    elem.getElementsByClassName("amb_status_left")[0].innerHTML = `
  <strong>${displayedUnits}</strong>/${unitsCount || "?"} ${BULLET}
  ${strings.format[seriesInfo.format]}
  ${seriesInfo.status === "RELEASING" ? `${BULLET} ${strings.status[seriesInfo.status]}` : ""}
  `;
    elem.getElementsByClassName("amb_status_right")[0].innerHTML = `<time class="dateformat" datetime="${timeFormatted.iso}" title="${timeFormatted.absolute}"></time>`;

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
    progressesSep[1] = [];
  }

  for (let i = 0; i < progressesSep.length; i++) {
    if (progressesSep[i].length) {
      if (!containers[i]) {
        containers[i] = document.createElement("div");
        containers[i].classList.add("amb-container");
        let sectionElem = document.getElementsByClassName("section")[0];
        if (sectionElem.children[settings.insertIndex + i]) {
          sectionElem.insertBefore(containers[i], sectionElem.children[settings.insertIndex + i]);
        } else {
          sectionElem.appendChild(containers[i]);
        }
      }

      containers[i].innerHTML = `
    <h2 class="section-header">Recent ${settings.barsSeparateByType ? ["Anime", "Manga"][i] + " " : ""}Progress</h2>
    <div class="content-wrap"></div>`;
      let contentElem = containers[i].getElementsByClassName("content-wrap")[0];

      let end = Math.min(settings.barsCount, progressesSep[i].length);
      for (let j = 0; j < end; j++) {
        contentElem.appendChild(makeProgressBarElem(progressesSep[i][j], seriesInfos));
      }
    } else if (containers[i]) {
      containers[i].parentElement.removeChild(containers[i]);
      containers[i] = undefined;
    }
  }

  renderDateFormat();
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

function getActivity(username) {
  let activity = [];

  let queryUser = `
query ($name: String) {
  User (name: $name) {
    id
  }
}
  `;

  api(queryUser, { name: username }).then(r => {
    if (r.User) {
      let queryActivities = `
query ($page: Int, $types: [ActivityType], $sort: [ActivitySort], $userId: Int) {
  Page (page: $page) {
    pageInfo {
      total perPage currentPage lastPage hasNextPage
    }
    activities (userId: $userId, type_in: $types, sort: $sort) {
      ... on ListActivity {
        id status progress createdAt
        media { ${makeMediaQueryKeys()} }
      }
    }
  }
}
      `;

      api(queryActivities, {
        page: 0,
        types: ["ANIME_LIST", "MANGA_LIST"],
        sort: "ID_DESC",
        userId: r.User.id
      }).then(r => {
        let listActivities = r.Page.activities
          .sort((a, b) => b.createdAt - a.createdAt)
          .filter(activity => {
            return activity.status === "completed" || activity.status === "watched episode" || activity.status === "read chapter";
          });
        let activitiesProcessed = [];
        listActivities.forEach(activity => {
          let progress;
          if (activity.progress) {
            let progressSplit = activity.progress.split(" - ");
            progress = Number(progressSplit[progressSplit.length - 1]);
          }

          let seriesType = activity.media.type;
          let seriesID = activity.media.id;

          let words = activity.status.toLowerCase().split(" ");
          let firstWord = words[0];
          let type;
          if (firstWord === "watched" || firstWord === "read") {
            type = "watch";
          } else if (firstWord === "completed") {
            type = "complete";
          }

          let time = new Date(activity.createdAt * 1000);

          activitiesProcessed.push({
            progress, seriesType, seriesID, type, time
          });

          writeSeriesInfoCache(activity.media);
        });
        getProgresses(activitiesProcessed);
      });
    }
  });
}

function barsCheckURL(url) {
  let path = new URL(url).pathname.substring(1).split("/");
  if (path[0] === "user" && !path[2]) {
    getActivity(path[1]);
  }
}

onGotSettings(function() {
  onNavigate(function() {
    if (settings.barsEnable) {
      barsCheckURL(window.location.href);
    }
  });

  if (settings.barsEnable) {
    barsCheckURL(window.location.href);
  }
});
