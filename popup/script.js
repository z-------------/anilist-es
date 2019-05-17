const promptsContainer = document.getElementById("prompts");
const notifsContainer = document.getElementById("notifs");
const notifsUpdateButton = document.getElementById("notifs-update");

onGotSettings(function() {
  if (!settings.notifsEnable) {
    document.body.classList.add("notifs-disabled");
  }

  /* updates */

  if (settings.updateCheckEnable) {
    let currentVersion = browser.runtime.getManifest().version;
    findInCache("updatecache").then(r => {
      if (r) {
        gotUpdateInfo({
          currentVersion,
          availableVersion: r.availableVersion
        });
      } else {
        fetch("https://raw.githubusercontent.com/z-------------/anilist-es/master/manifest.json")
          .then(response => {
            return response.json();
          })
          .then(json => {
            let availableVersion = json.version;
            gotUpdateInfo({
              currentVersion,
              availableVersion
            });
            browser.storage.local.set({
              updatecache: {
                availableVersion,
                _dateFetched: new Date().getTime()
              }
            });
          });
      }
    });
  }
});

/* notifs */

let notificationElemTemplate = document.createElement("div");
notificationElemTemplate.classList.add("aes", "amn");
notificationElemTemplate.innerHTML = `
<div class="amn_image"></div>
<div class="amn_info">
  <a target="_blank" class="amn_text"></a>
  <time class="amn_date dateformat"></time>
</div>
`;

function makeNotificationElem(notif) {
  const processed = processNotif(notif);
  let elem = notificationElemTemplate.cloneNode(true);

  let imageElem = elem.getElementsByClassName("amn_image")[0];
  let textElem = elem.getElementsByClassName("amn_text")[0];
  let dateElem = elem.getElementsByClassName("amn_date")[0];

  /* image */
  imageElem.style.backgroundImage = `url(${processed.image})`;

  /* html */
  textElem.innerHTML = processed.html;
  if (notif.type !== "FOLLOWING" && processed.url) {
    textElem.setAttribute("href", processed.url);
  }

  /* date */
  let date = new Date(notif.createdAt * 1000);
  let dateFormatted = dateFormat(date);
  dateElem.setAttribute("datetime", dateFormatted.iso);
  dateElem.setAttribute("title", dateFormatted.absolute);

  return elem;
}

function displayNotifs(notifs) {
  notifsContainer.innerHTML = "";
  for (let notif of notifs) {
    notifsContainer.appendChild(makeNotificationElem(notif));
  }
  let viewAllElem = document.createElement("a");
  viewAllElem.setAttribute("href", "https://anilist.co/notifications");
  viewAllElem.setAttribute("target", "_blank");
  viewAllElem.textContent = "View all notifications";
  notifsContainer.appendChild(viewAllElem);
  renderDateFormat();
}

browser.storage.local.get(["notifcache"]).then(r => {
  let notifs = r.notifcache;
  if (notifs && notifs.length) {
    displayNotifs(notifs);
  }
});

notifsUpdateButton.addEventListener("click", () => {
  browser.runtime.sendMessage({ command: "notifCheck" }).then(response => {
    displayNotifs(response.notifs);
  });
});

/* prompts */

function showPrompt(info) {
  let innerHTML = `
<div class="image"${info.image ? ` style="background-image: url(${info.image});"` : ""}></div>
<div class="info">
  <h3 class="title">${info.title}</h3>
  <div>${info.text}</div>
</div>
  `;
  let elem = document.createElement("div");
  elem.classList.add("amp");
  elem.innerHTML = innerHTML;
  elem.addEventListener("click", () => {
    browser.tabs.create({
      url: info.url
    });
  });
  if (info.insertAtTop && promptsContainer.children.length > 0) {
    promptsContainer.insertBefore(elem, promptsContainer.children[0]);
  } else {
    promptsContainer.appendChild(elem);
  }
  document.body.classList.remove("no-prompts");
}

browser.tabs.query({
  active: true,
  currentWindow: true
}).then(tabs => {
  if (tabs && tabs[0] && tabs[0].url) {
    let tab = tabs[0];
    let url = new URL(tab.url);
    let hostname = url.hostname;
    let path = url.pathname.split("/").slice(1);

    if (hostname === "myanimelist.net") {
      if (path[0] === "anime" || path[0] === "manga") {
        let type = path[0].toUpperCase();
        let id = Number(path[1]);
        let query = `
query ($idMal: Int, $type: MediaType) {
  Media (idMal: $idMal, type: $type) {
    ${makeMediaQueryKeys({ short: true })}
  }
}
        `;
        api(query, { idMal: id, type: type })
          .then(r => {
            let media = r.Media;
            showPrompt({
              title: getTitle(media.title),
              url: media.siteUrl,
              image: media.coverImage.large,
              text: "Open in AniList"
            });
          })
          // .catch(err => { console.log(err) });
      }
    } else if (hostname === "anilist.co") {
      if (path[0] === "anime" || path[0] === "manga") {
        let type = path[0].toUpperCase();
        let id = Number(path[1]);
        let query = `
query ($id: Int, $type: MediaType) {
  Media (id: $id, type: $type) {
    ${makeMediaQueryKeys({ short: true })}
    idMal
  }
}
        `;
        api(query, { type, id }).then(r => {
          let media = r.Media;
          let idMal = media.idMal;
          if (idMal) {
            showPrompt({
              title: getTitle(media.title),
              url: `https://myanimelist.net/${type.toLowerCase()}/${idMal}`,
              image: media.coverImage.large,
              text: "Open in MyAnimeList"
            });
          }
        });
      }
    } else {
      document.body.classList.add("no-prompts");
    }
  } else {
    document.body.classList.add("no-prompts");
  }
});

/* updates */

function gotUpdateInfo(info) {
  if (semverIsGreater(info.availableVersion, info.currentVersion)) {
    showPrompt({
      title: "AniList Enhancement Suite update available",
      text: `${info.currentVersion} → ${info.availableVersion}`,
      image: "/img/update.svg",
      url: "https://github.com/z-------------/anilist-es",
      insertAtTop: true
    });
  }
}

function semverIsGreater(subjectVer, referenceVer) {
  let subjectVerSplit = subjectVer.split(".").map(v => Number(v));
  let referenceVerSplit = referenceVer.split(".").map(v => Number(v));
  for (let i = 0; i < 3; i++) {
    if (subjectVerSplit[i] > referenceVerSplit[i]) {
      return true;
    } else if (subjectVerSplit[i] < referenceVerSplit[i]) {
      return false;
    }
  }
}
