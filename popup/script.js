const promptsContainer = document.getElementById("prompts");
const notifsContainer = document.getElementById("notifs");

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

chrome.storage.local.get(["notifcache"], r => {
  if (r.notifcache) {
    let notifs = JSON.parse(r.notifcache);
    for (let notif of notifs) {
      notifsContainer.appendChild(makeNotificationElem(notif));
    }
  }
});
