let textarea = document.getElementById("token-input");
let saveButton = document.getElementById("submit");

let originalToken;

browser.storage.sync.get("token").then(r => {
  if (r.token) {
    textarea.value = r.token;
    originalToken = r.token;
  }
});

saveButton.addEventListener("click", () => {
  let token = textarea.value.trim();
  browser.storage.sync.set({ token }).then(() => {
    if (token !== originalToken) {
      browser.storage.local.set({
        authLastChangedTime: new Date().getTime()
      });
      clearSeriesInfoCache();
      clearFollowingListsCache();
      browser.storage.local.remove("usercache");
      browser.runtime.sendMessage({ command: "notifCheck" });
    }
  });
});
