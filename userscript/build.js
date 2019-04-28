const fs = require("fs");
const path = require("path");
const beautify = require("js-beautify").js;
const uglifycss = require("uglifycss");

const readFileOptions = { encoding: "utf8" };

const OUTPUT_FILENAME = "userscript.js";

/* preamble */

const preamble = `
// ==UserScript==
// @name         AniList Enhancement Suite Lite
// @namespace    https://github.com/z-------------/anilist-es
// @version      ${require(path.join(__dirname, "..", "manifest.json")).version}
// @description  A userscript version of ALES.
// @author       z-------------
// @match        https://anilist.co/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/timeago.js/3.0.2/timeago.min.js
// ==/UserScript==
`;

/* settings */

const defaults = require(path.join(__dirname, "..", "options.json"));
const settings = {};
defaults.options.forEach(option => {
  settings[option.key] = option.default;
});
const settingsScript = `const settings = ${JSON.stringify(settings)};`;

/* common */

const commonModifiedScript = fs.readFileSync(path.join(__dirname, "common_userscript.js"), readFileOptions);

/* css */

const stylesheet = fs.readFileSync(path.join(__dirname, "..", "style.css"), readFileOptions);
const stylesheetInjectScript = `
/* css */

const stylesheetElem = document.createElement("style");
stylesheetElem.textContent = ${JSON.stringify(uglifycss.processString(stylesheet))};
document.head.appendChild(stylesheetElem);
`;

/* content scripts */

let contentScripts = "";
const contentScriptsDirname = path.join(__dirname, "..", "scripts");
const contentScriptFilenames = fs.readdirSync(contentScriptsDirname).filter(filename => {
  return /^\S+.js$/.test(filename);
});
for (let i = 0, l = contentScriptFilenames.length; i < l; ++i) {
  const filename = contentScriptFilenames[i];
  const script = fs.readFileSync(path.join(contentScriptsDirname, filename), readFileOptions).trim();
  contentScripts += `/* ${filename.split(".")[0]} */\n\n${script}\n\n`;
}
contentScripts = contentScripts.trim();

/* wrap and format */

const wrapped = `${preamble}\n(function() { ${settingsScript}\n\n ${commonModifiedScript} ${stylesheetInjectScript}\n ${contentScripts} })();`;
const formatted = beautify(wrapped);

/* write to file */

fs.writeFile(path.join(__dirname, OUTPUT_FILENAME), formatted, err => {
  if (err) {
    console.error("Error.", err);
    process.exit(1);
  } else {
    console.log(`Success. Wrote to ${OUTPUT_FILENAME}.`);
  }
});
