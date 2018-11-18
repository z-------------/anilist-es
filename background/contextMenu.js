onGotSettings((settings, defaults, token) => {
  browser.contextMenus.removeAll();

  browser.contextMenus.create({
    title: "Go to:",
    id: "ba_label_go",
    contexts: ["browser_action"],
    enabled: false
  });

  browser.contextMenus.create({
    title: "AniList home",
    id: "ba_go_anilist",
    contexts: ["browser_action"]
  });

  if (token) {
    browser.contextMenus.create({
      title: "Profile",
      id: "ba_go_profile",
      contexts: ["browser_action"]
    });

    browser.contextMenus.create({
      title: "Anime list",
      id: "ba_go_animelist",
      contexts: ["browser_action"]
    });

    browser.contextMenus.create({
      title: "Manga list",
      id: "ba_go_mangalist",
      contexts: ["browser_action"]
    });
  }
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  let id = info.menuItemId;
  if (id === "ba_go_anilist") {
    browser.tabs.create({ url: "https://anilist.co/" });
  } else if (id === "ba_go_profile" || id === "ba_go_animelist" || id === "ba_go_mangalist") {
    getUserInfo().then(userInfo => {
      let root = `https://anilist.co/user/${userInfo.name}/`;
      let subpath = (id === "ba_go_profile" ? "" : id.split("_")[2]);
      browser.tabs.create({ url: root + subpath });
    });
  }
});
