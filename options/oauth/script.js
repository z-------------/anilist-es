let textarea = document.getElementById("token-input");
let saveButton = document.getElementById("submit");

saveButton.addEventListener("click", e => {
  browser.storage.sync.set({ token: textarea.value }).then(() => {
    alert("Saved.");
    clearSeriesInfoCache();
  });
});

browser.storage.sync.get(["token"]).then(r => {
  if (r.token) {
    textarea.value = r.token;
  }
});
