let query = `
query ($page: Int, $types: [NotificationType]) {
  Page (page: $page) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    notifications (type_in: $types, resetNotificationCount: false) {
      ... on AiringNotification {
        id
        type
        episode
        contexts
        media {
          id
          type
          title {
            userPreferred
          }
          coverImage {
            large
          }
        }
        createdAt
      }
      ... on FollowingNotification {
        id
        type
        context
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityMessageNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityMentionNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityReplyNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityLikeNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityReplyLikeNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentMentionNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentReplyNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentSubscribedNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentLikeNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadLikeNotification {
        id
        type
        context
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
    }
  }
}
  `; // lifted from AniList's source because I have no idea about GraphQL. sorry.
let variables = {
  page: 0,
  types: [
    "ACTIVITY_MESSAGE", "ACTIVITY_REPLY", "ACTIVITY_LIKE", "ACTIVITY_MENTION", "ACTIVITY_REPLY_LIKE",
    "THREAD_COMMENT_MENTION", "THREAD_SUBSCRIBED", "THREAD_COMMENT_REPLY", "THREAD_COMMENT_LIKE",
    "THREAD_LIKE",
    "FOLLOWING", "AIRING"
  ]
};

chrome.alarms.create("notifCheck", {
  periodInMinutes: 10
});

function updateNotifs(cb) {
  chrome.storage.sync.get(["token", "notifsEnable"], r => {
    if (r.token && r.notifsEnable !== false) { // no access to getSettings() so default value hardcoded. sorry.
      let options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${r.token}`
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      };

      fetch("https://graphql.anilist.co", options)
        .then(res => {
          res.json().then(json => {
            let notifs = json.data.Page.notifications;
            chrome.storage.local.get(["notifcache"], r => {
              let oldIds = [];
              if (r.notifcache) {
                oldIds = JSON.parse(r.notifcache).map(notif => notif.id);
              }
              let ids = notifs.map(notif => notif.id);
              for (let id of ids) {
                if (oldIds.indexOf(id) === -1) {
                  let notif = notifs.filter(function(notif) {
                    return notif.id === id;
                  })[0];
                  let text = "";
                  if (notif.type === "AIRING") {
                    text = `${notif.contexts[0]}${notif.episode}${notif.contexts[1]}${notif.media.title.userPreferred}${notif.contexts[2]}`;
                  } else {
                    text = `${notif.user.name}${notif.context}`;
                  }
                  fetch(notif.media ? notif.media.coverImage.large : notif.user.avatar.large).then(r => {
                    r.blob().then(blob => {
                      let blobUrl = URL.createObjectURL(blob);
                      chrome.notifications.create(`anilist_${id}`, {
                        type: "basic",
                        iconUrl: blobUrl,
                        message: text,
                        title: "AniList Enhancement Suite",
                        eventTime: new Date(notif.createdAt * 1000).getTime()
                      });
                    });
                  });
                }
              }

              chrome.storage.local.set({ "notifcache": JSON.stringify(notifs) }, function() {
                if (cb) {
                  cb(notifs);
                }
              });
            });
          });
        })
        .catch(error => {
          console.error(error);
        });
    }
  });
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "notifCheck") {
    updateNotifs();
  }
});

chrome.runtime.onMessage.addListener((request, sender, respond) => {
  if (request.command === "notifCheck") {
    updateNotifs(notifs => {
      respond({ notifs: notifs });
    });
  }
  return true; // allow async respond()
});

chrome.notifications.onClicked.addListener(notifId => {
  let idSplit = notifId.split("_");
  if (idSplit[0] === "anilist" && idSplit[1]) {
    chrome.storage.local.get(["notifcache"], r => {
      if (r.notifcache) {
        let notifs = JSON.parse(r.notifcache);
        let matches = notifs.filter(notif => notif.id === Number(idSplit[1]));
        if (matches[0]) {
          let notif = matches[0];
          let url;
          let typeSplit = notif.type.split("_");
          if (typeSplit[0] === "ACTIVITY") {
            url = `https://anilist.co/activity/${notif.activityId}`;
          } else if (notif.type === "AIRING") {
            url = `https://anilist.co/${notif.media.type.toLowerCase()}/${notif.media.id}`;
          } else if (notif.type === "FOLLOWING") {
            url = `https://anilist.co/user/${notif.user.name}`;
          } else if (notifSplit[0] === "THREAD" && notifSplit[1] === "COMMENT" || notifSplit[1] === "SUBSCRIBED") {
            url = `https://anilist.co/forum/thread/${notif.thread.id}/comment/${notif.commentId}`;
          } else if (notif.type === "THREAD_LIKE") {
            url = `https://anilist.co/forum/thread/${notif.threadId}`;
          }
          if (url) {
            chrome.tabs.create({
              url: url
            });
          }
        }
      }
    });
  }
});
