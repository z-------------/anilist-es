let templateElem = document.createElement("label");
templateElem.innerHTML = `
<span></span>
<input class="input" />
`;

let settingsElem = document.getElementsByClassName("settings")[0];
let saveButton = document.getElementById("save-btn");

getSettings().then(r => {
  let settings = r[0];
  let defaults = r[1];

  let keys = Object.keys(settings).sort((a, b) => {
    return a.order - b.order;
  });

  for (let key of keys) {
    let elem = templateElem.cloneNode(true);
    elem.dataset.key = key;

    elem.getElementsByTagName("span")[0].textContent = defaults[key].label;

    let inputElem = elem.getElementsByTagName("input")[0];
    if (defaults[key].hasOwnProperty("options")) {
      elem.removeChild(inputElem);
      inputElem = document.createElement("select");
      inputElem.classList.add("input");
      let options = defaults[key].options.concat(defaults[key].default);
      options.forEach(option => {
        let optionElem = document.createElement("option");
        optionElem.value = option;
        optionElem.textContent = option;
        inputElem.appendChild(optionElem);
      });
      elem.appendChild(inputElem);
    } else if (typeof settings[key] === "number") {
      inputElem.setAttribute("type", "number");
      inputElem.setAttribute("min", "0");
      inputElem.setAttribute("step", "1");
    } else if (typeof settings[key] === "boolean") {
      inputElem.setAttribute("type", "checkbox");
      inputElem.checked = settings[key];
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

    let inputElem = labelElem.getElementsByClassName("input")[0];
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
