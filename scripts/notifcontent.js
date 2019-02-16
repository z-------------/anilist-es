onGotSettings(function() {
  if (settings.notifContentEnable) {
    function processNotifications(containerElem) {
      let uniqueIDs = [];
      for (let i = 0; i < containerElem.children.length; i++) {
        let elem = containerElem.children[i];
        let detailsElem = elem.getElementsByClassName("details")[0];
        if (
          detailsElem &&
          !stringContains(detailsElem.textContent, "aired") &&
          !stringContains(detailsElem.textContent, "commented in your subscribed forum thread")
        ) {
          let path = detailsElem.getElementsByClassName("link")[0].href.split("/");
          let id = Number(path[path.length - 1]);
          elem.dataset.amncId = id;
          if (uniqueIDs.indexOf(id) === -1) {
            uniqueIDs.push(id);
          }
        }
      }
      getActivityInfos({ ids: uniqueIDs })
        .then(activityInfos => {
          let replyCounts = {};
          for (let a = 0; a < activityInfos.length; a++) {
            let activity = activityInfos[a];
            let handledTypes = ["TEXT", "ANIME_LIST", "MANGA_LIST", "MESSAGE"];
            if (handledTypes.indexOf(activity.type) !== -1) {
              [...containerElem.querySelectorAll(`[data-amnc-id="${activity.id}"]`)].forEach(elem => {
                let detailsElem = elem.getElementsByClassName("details")[0];

                let contentElem = document.createElement("div");
                contentElem.classList.add("amnc");

                if (stringContains(detailsElem.textContent, "replied to your activity")) {
                  if (!replyCounts[activity.id]) replyCounts[activity.id] = 0;
                  let j = ++replyCounts[activity.id] - 1;
                  contentElem.textContent = activity.replies[activity.replies.length - j - 1].text;
                  detailsElem.insertBefore(contentElem, detailsElem.children[1]);
                } else if (activity.type === "TEXT") {
                  contentElem.textContent = activity.text;
                  detailsElem.insertBefore(contentElem, detailsElem.children[1]);
                } else if (activity.type === "ANIME_LIST" || activity.type === "MANGA_LIST") {
                  getSeriesInfo(activity.media.id, activity.media.type).then(media => {
                    let text;
                    let title = getTitle(media.title, settings.titleLanguage);
                    if (activity.status === "watched episode") {
                      text = `Watched episode ${activity.progress} of ${title}`;
                    } else if (activity.status === "read chapter") {
                      text = `Read chapter ${activity.progress} of ${title}`;
                    } else {
                      text = capitalize(activity.status, CAPITALIZE_FIRST) + " " + title;
                    }
                    contentElem.textContent = text;
                    detailsElem.insertBefore(contentElem, detailsElem.children[1]);
                  });
                } else if (activity.type === "MESSAGE") {
                  contentElem.textContent = activity.message;
                  detailsElem.insertBefore(contentElem, detailsElem.children[1]);
                }
              });
            }
          }
        })
        .catch(() => {});
    }

    function waitElementChange(elem) {
      onElementChange(elem, (changes, observer) => {
        if (
          changes[0].addedNodes[0] &&
          changes[0].addedNodes[0].classList &&
          changes[0].addedNodes[0].classList.contains("notification")
        ) { // notifications have loaded
          processNotifications(elem);
          observer.disconnect();
        } else if (
          changes[0].addedNodes[0] &&
          changes[0].addedNodes[0].classList &&
          changes[0].addedNodes[0].classList.contains("notifications")
        ) { // notif filter type changed
          let containerElem = changes[0].addedNodes[0];
          if (containerElem.getElementsByClassName("notification").length) {
            processNotifications(containerElem);
          } else {
            waitElementChange(containerElem);
          }
          observer.disconnect();
        }
      });
    }

    function checkContainerElem() {
      let containerElem = document.getElementsByClassName("notifications")[0];
      let pattern = /(http|https):\/\/(www.)*anilist.co\/notifications$/i;
      if (pattern.test(window.location.href) && containerElem) {
        let notificationElems = containerElem.getElementsByClassName("notification");
        if (notificationElems.length) {
          processNotifications(containerElem);
        } else {
          waitElementChange(containerElem);
        }

        document.getElementsByClassName("filter-group")[0].onclick = function(e) {
          if (e.target.classList.contains("link")) {
            waitElementChange(document.getElementsByClassName("notifications-feed")[0]);
          }
        };
      }
    }

    checkContainerElem();
    
    onNavigate(function() {
      checkContainerElem();
    });
  }
});
