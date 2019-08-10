# AniList Enhancement Suite

A WebExtension. **Not affiliated with AniList.**

* MAL-inspired "Recent Progress" section in profiles
* Infocards upon hovering over anime/manga title
* Notifications in browser toolbar and OS notification area
* Open corresponding AniList page from MAL
* Preview activity content in website's Notifications area

Work in progress.

[Browser support](#browser-support) • [Screenshots](#screenshots) • [Install](#install)

## Browser support

Development is focused on Google Chrome. There are a few known issues on other WebExtension-supporting browsers.

## Screenshots

![Bars](https://i.imgur.com/Cu72tRE.png)
![Infocards](https://i.imgur.com/KmCcTXQ.png)
![Popup](https://i.imgur.com/tCqL6Rf.png)
![Notifications](https://i.imgur.com/b73lcYF.png)
![Notification content previews](https://i.imgur.com/t6O8UPp.png)

## Install

Instructions for Chrome:

1. [Download as .zip](https://github.com/z-------------/anilist-es/archive/master.zip)
2. Unzip
3. Go to chrome://extensions
4. Enable Developer mode
5. Click "Load unpacked"
6. Select the unzipped folder

You can also [get the "Lite" version](https://greasyfork.org/en/scripts/382294-anilist-enhancement-suite-lite) as a userscript. It lacks everything but the content scripts and does not cache media info etc. locally. It will also be updated much less frequently (if at all).

## Known issues

* Notification content previews are incredibly unreliable. I plan to rework them in the future.
