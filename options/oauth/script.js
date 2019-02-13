let textarea = document.getElementById("token-input");
let saveButton = document.getElementById("submit");

browser.storage.sync.get(["token"]).then(r => {
  if (r.token) {
    textarea.value = r.token;
  }
});

saveButton.addEventListener("click", () => {
  browser.storage.sync.set({ token: textarea.value }).then(() => {
    browser.storage.local.set({
      authLastChangedTime: new Date().getTime()
    });
    clearSeriesInfoCache();
    browser.runtime.sendMessage({ command: "notifCheck" });
  });
});
