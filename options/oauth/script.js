let textarea = document.getElementById("token-input");
let saveButton = document.getElementById("submit");

saveButton.addEventListener("click", e => {
  if (textarea.value.length) {
    chrome.storage.sync.set({ token: textarea.value }, () => {
      alert("Success.");
    });
  } else {
    alert("Please get an authetication token and paste it in the text box.");
  }
});

chrome.storage.sync.get(["token"], r => {
  if (r.token) {
    textarea.value = r.token;
  }
});
