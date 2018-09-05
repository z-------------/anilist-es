let templateElem = document.createElement("label");
templateElem.innerHTML = `
<span></span>
<input />
`;

let settingsElem = document.getElementsByClassName("settings")[0];
let saveButton = document.getElementById("save-btn");

getSettings().then(r => {
  let settings = r[0];
  let defaults = r[1];

  let keys = Object.keys(settings).sort((a, b) => a.localeCompare(b));

  for (let key of keys) {
    let elem = templateElem.cloneNode(true);
    elem.dataset.key = key;

    elem.getElementsByTagName("span")[0].textContent = defaults[key].label;

    let inputElem = elem.getElementsByTagName("input")[0];
    if (typeof settings[key] === "number") {
      inputElem.setAttribute("type", "number");
      inputElem.setAttribute("min", "0");
      inputElem.setAttribute("step", "1");
    } else if (typeof settings[key] === "boolean") {
      inputElem.setAttribute("type", "checkbox");
    } else {
      inputElem.setAttribute("type", "text");
    }
    inputElem.value = settings[key];

    settingsElem.appendChild(elem);
  }
});

saveButton.addEventListener("click", e => {
  let newSettings = {};

  [...document.getElementsByTagName("label")].forEach(labelElem => {
    let key = labelElem.dataset.key;

    let inputElem = labelElem.getElementsByTagName("input")[0];
    let inputType = inputElem.getAttribute("type");

    let newValue = inputElem.value;
    if (inputType === "number") {
      newValue = Number(newValue);
    } else if (inputType === "checkbox") {
      newValue = inputElem.checked;
    }

    newSettings[key] = newValue;
  });

  chrome.storage.sync.set(newSettings);
});
