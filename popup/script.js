const promptsContainer = document.getElementById("prompts");
const notifsContainer = document.getElementById("notifs");
const notifsUpdateButton = document.getElementById("notifs-update");

onGotSettings(function() {
  if (!settings.notifsEnable) {
    document.body.classList.add("notifs-disabled");
  }

  /* updates */

  if (settings.updateCheckEnable) {
    browser.storage.local.get(["updatecache"]).then(r => {
      let currentVersion = browser.runtime.getManifest().version;

      if (r.updatecache && new Date() - new Date(r.updatecache.dateChecked) <= 86400000) { // 1 day
        gotUpdateInfo({
          currentVersion,
          availableVersion: r.updatecache.availableVersion
        });
      } else {
        fetch("https://raw.githubusercontent.com/z-------------/anilist-es/master/manifest.json")
          .then(response => {
            return response.json();
          })
          .then(json => {
            gotUpdateInfo({
              currentVersion,
              availableVersion: json.version
            });
            browser.storage.local.set({
              updatecache: {
                availableVersion,
                dateChecked: new Date().getTime()
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
<a target="_blank" class="amn_text"></a>
`;

function makeNotificationElem(info) {
  let elem = notificationElemTemplate.cloneNode(true);

  let imageElem = elem.getElementsByClassName("amn_image")[0];
  let textElem = elem.getElementsByClassName("amn_text")[0];

  let imageUrl = "";
  if (info.media) {
    imageUrl = info.media.coverImage.large;
  } else if (info.user) {
    imageUrl = info.user.avatar.large;
  }

  let html = "";
  if (info.type === "AIRING") {
    let url = `https://anilist.co/${info.media.type.toLowerCase()}/${info.media.id}/`;
    html = `${info.contexts[0]}${info.episode}${info.contexts[1]}<a target="_blank" href="${url}">${info.media.title.userPreferred}</a>${info.contexts[2]}`;
  } else {
    let url = `https://anilist.co/user/${info.user.name}/`;
    html = `<a target="_blank" href="${url}">${info.user.name}</a>${info.context}`;
  }

  imageElem.style.backgroundImage = `url(${imageUrl})`;
  textElem.innerHTML = html;

  if (info.type.split("_")[0] === "ACTIVITY") {
    textElem.setAttribute("href", `https://anilist.co/activity/${info.activityId}`);
  }

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
}

browser.storage.local.get(["notifcache"]).then(r => {
  if (r.notifcache) {
    let notifs = JSON.parse(r.notifcache);
    displayNotifs(notifs);
  }
});

notifsUpdateButton.addEventListener("click", e => {
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
  elem.addEventListener("click", e => {
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
    let pageTitle = tab.title;

    if (hostname === "myanimelist.net") {
      if (path[0] === "anime" || path[0] === "manga") {
        let type = path[0].toUpperCase();
        let id = Number(path[1]);
        let query = `
  query ($idMal: Int, $type: MediaType) {
    Media (idMal: $idMal, type: $type) {
      siteUrl
      coverImage { medium }
    }
  }
        `;
        api(query, { idMal: id, type: type })
          .then(r => {
            showPrompt({
              title: pageTitle.substring(0, pageTitle.lastIndexOf(" - MyAnimeList")),
              url: r.Media.siteUrl,
              image: r.Media.coverImage.medium,
              text: "Open in AniList"
            });
          })
          .catch(err => { console.log(err) });
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
