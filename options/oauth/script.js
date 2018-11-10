let textarea = document.getElementById("token-input");
let saveButton = document.getElementById("submit");

saveButton.addEventListener("click", e => {
  if (textarea.value.length) {
    browser.storage.sync.set({ token: textarea.value }).then(() => {
      alert("Success.");
    });
  } else {
    alert("Please get an authetication token and paste it in the text box.");
  }
});

browser.storage.sync.get(["token"]).then(r => {
  if (r.token) {
    textarea.value = r.token;
  }
});
