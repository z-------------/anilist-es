function makeQueryString(options) {
  options = options || {};
  const COMMON_KEYS = "id type createdAt";
  const USER_KEYS = "user { id name avatar { large }}";
  const MEDIA_KEYS = `media {
    id
    type
    title {
      userPreferred
    }
    coverImage {
      large
    }
  }`;
  return `
query ($page: Int, $types: [NotificationType]) {
  Page (page: $page) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    notifications (type_in: $types, resetNotificationCount: ${options.resetNotificationCount || false}) {
      ... on AiringNotification {
        ${COMMON_KEYS}
        ${MEDIA_KEYS}
        episode
        contexts
      }
      ... on RelatedMediaAdditionNotification {
        ${COMMON_KEYS}
        ${MEDIA_KEYS}
        context
      }
      ... on FollowingNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
      }
      ... on ActivityMessageNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        activityId
      }
      ... on ActivityMentionNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        activityId
      }
      ... on ActivityReplyNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        activityId
      }
      ... on ActivityLikeNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        activityId
      }
      ... on ActivityReplyLikeNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        activityId
      }
      ... on ActivityReplySubscribedNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        activityId
      }
      ... on ThreadCommentMentionNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        commentId
        thread {
          id
          title
        }
      }
      ... on ThreadCommentReplyNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        commentId
        thread {
          id
          title
        }
      }
      ... on ThreadCommentSubscribedNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        commentId
        thread {
          id
          title
        }
      }
      ... on ThreadCommentLikeNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        commentId
        thread {
          id
          title
        }
      }
      ... on ThreadLikeNotification {
        ${COMMON_KEYS}
        ${USER_KEYS}
        context
        thread {
          id
          title
        }
      }
    }
  }
}
    `; // mostly lifted from AniList's source because I have no idea about GraphQL. sorry.
}
let variables = {
  page: 0,
  types: [
    "ACTIVITY_MESSAGE", "ACTIVITY_REPLY", "ACTIVITY_LIKE", "ACTIVITY_MENTION", "ACTIVITY_REPLY_LIKE", "ACTIVITY_REPLY_SUBSCRIBED",
    "THREAD_COMMENT_MENTION", "THREAD_SUBSCRIBED", "THREAD_COMMENT_REPLY", "THREAD_COMMENT_LIKE", "THREAD_LIKE",
    "FOLLOWING",
    "AIRING", "RELATED_MEDIA_ADDITION"
  ]
};

browser.alarms.create("notifCheck", {
  periodInMinutes: 10
});

function updateNotifs() {
  return new Promise((resolve, reject) => {
    getSettings().then(r => {
      let settings = r[0];
      if (settings.notifsEnable) {
        browser.storage.sync.get(["token"]).then(r => {
          if (r.token) {
            let query = makeQueryString({ resetNotificationCount: settings.notifsUnreadResetOnQuery });
            api(query, variables, r.token)
              .then(data => {
                browser.storage.local.get(["notifcache", "authLastChangedTime"]).then(r => {
                  let authLastChangedTime = r.authLastChangedTime || 0;

                  let notifsCached = (r.notifcache && r.notifcache.length) ? r.notifcache : [];
                  let notifsCachedIds = notifsCached.map(notif => notif.id);
                  let notifsNew = data.Page.notifications
                    .filter(notif => {
                      return notifsCachedIds.indexOf(notif.id) === -1 && notif.createdAt * 1000 >= authLastChangedTime;
                    })
                    .sort((a, b) => a.createdAt - b.createdAt);
                  let notifsCurrent = [...notifsNew.reverse(), ...notifsCached];

                  let end = /\sFirefox\/\d+\.\d+$/.test(navigator.userAgent) ? 1 : notifsNew.length;

                  for (let i = 0; i < end; i++) {
                    let notif = notifsNew[i];
                    let processed = processNotif(notif);
                    fetch(processed.image).then(r => {
                      r.blob().then(blob => {
                        let blobUrl = URL.createObjectURL(blob);
                        // console.log("creating notif", text, blobUrl)
                        browser.notifications.create(`anilist_${notif.id}`, {
                          type: "basic",
                          iconUrl: blobUrl,
                          message: processed.text,
                          title: "AniList Enhancement Suite",
                          eventTime: new Date(notif.createdAt * 1000).getTime()
                        });
                      });
                    });
                  }

                  browser.storage.local.set({ "notifcache": notifsCurrent }).then(function() {
                    resolve(notifsCurrent);
                  });
                });
              })
              .catch(error => {
                reject(error);
              });
          }
        });
      }
    });
  });
}

browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "notifCheck") {
    updateNotifs();
  }
});

browser.runtime.onMessage.addListener(async request => {
  if (request.command === "notifCheck") {
    return await updateNotifs().then(notifs => {
      return { notifs };
    });
  }
  // return true; // allow async respond()
});

browser.notifications.onClicked.addListener(notifId => {
  let idSplit = notifId.split("_");
  if (idSplit[0] === "anilist" && idSplit[1]) {
    browser.storage.local.get(["notifcache"]).then(r => {
      if (r.notifcache) {
        let notifs = r.notifcache;
        let matches = notifs.filter(notif => notif.id === Number(idSplit[1]));
        if (matches[0]) {
          let notif = matches[0];
          if (notif.url) {
            browser.windows.getCurrent()
              .then(currentWindow => {
                if (typeof currentWindow === "undefined") {
                  browser.windows.create({ url: notif.url });
                } else {
                  browser.tabs.create({ url: notif.url }); // defaults to current window
                }
              })
              .catch(() => {
                browser.windows.create({ url: notif.url });
              });
          }
        }
      }
    });
  }
});
