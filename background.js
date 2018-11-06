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
    notifications (type_in: $types, resetNotificationCount: true) {
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
    "ACTIVITY_MESSAGE", "ACTIVITY_REPLY", "FOLLOWING",
    "ACTIVITY_MENTION", "THREAD_COMMENT_MENTION", "THREAD_SUBSCRIBED",
    "THREAD_COMMENT_REPLY", "AIRING", "ACTIVITY_LIKE",
    "ACTIVITY_REPLY_LIKE", "THREAD_LIKE", "THREAD_COMMENT_LIKE"
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
              // let newIds = [];
              for (let id of ids) {
                if (oldIds.indexOf(id) === -1) {
                  // newIds.push(id);
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
                        title: text,
                        message: "AniList Enhancement Suite",
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
