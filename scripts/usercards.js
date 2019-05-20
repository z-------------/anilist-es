onGotSettings(function() {
  if (settings.userCardsEnable) {
    const CLASS_NS = "ales-usercard";
    const CLASS_NONUMBERS = `${CLASS_NS}--nonumbers`;

    const userLinkRegex = /^\/user\/\S+\/*$/;

    document.body.addEventListener("mouseover", e => {
      let elem = e.target;
      // console.log(elem);
      let href;
      if (elem instanceof Element) { // proceed to check if it is a valid link
        if ((elem.classList.contains("name") || elem.classList.contains("user") || elem.classList.contains("author") || elem.classList.contains("avatar") || elem.textContent.trim()[0] === "@") && elem.href && userLinkRegex.test(elem.getAttribute("href"))) {
          href = elem.href;
        } else if (elem.classList.contains("name") && elem.parentElement.href && userLinkRegex.test(elem.parentElement.getAttribute("href"))) {
          href = elem.parentElement.href;
        } else if (elem.parentElement.tagName === "A" && elem.parentElement.parentElement.classList.contains("name")) {
          href = elem.parentElement.href;
        }
      }
      if (href) {
        let url = new URL(href);
        let path = url.pathname.slice(1).split("/");
        let name = path[1]; // username

        handleCard(elem, settings.cardsHoverTimeout, function() {
          return getUserInfoWithFollowingStatus(name);
        }, function(info) {
          let user = info.user;

          const sortKey = settings.userCardsFavoredDefinition;
          user.stats.favouredGenres.sort((a, b) => b[sortKey] - a[sortKey]);
          user.stats.favouredTags.sort((a, b) => b[sortKey] - a[sortKey]);
          const favGenre = user.stats.favouredGenres[0];
          const favTag = user.stats.favouredTags[0];
          const noNumbers = !favGenre || !favGenre[sortKey] || !favTag || !favTag[sortKey];

          let html = `
  <div class="${CLASS_NS}_wrap">
    <div class="${CLASS_NS}_left">
      <div class="${CLASS_NS}_avatar" style="background-image: url(${user.avatar.large});"></div>
    </div>
    <div class="${CLASS_NS}_right">
      <div class="${CLASS_NS}_name-container">
        <h2 class="${CLASS_NS}_name">${user.name}</h2>
        ${user.moderatorStatus ? `<div class="${CLASS_NS}_tag ${CLASS_NS}_tag--mod">${capitalize(user.moderatorStatus, CAPITALIZE_WORDS)}</div>` : ""}
        ${info.following ? `<div class="${CLASS_NS}_tag">Following</div>` : ""}
        ${info.follower ? `<div class="${CLASS_NS}_tag">Follows you</div>` : ""}
      </div>
      <div class="${CLASS_NS}_stats">
        <div class="${CLASS_NS}_stats_left">
          <div class="${CLASS_NS}_stats_hours ${CLASS_NS}_stat">${round(user.stats.watchedTime / 60 / 24, 1)} days</div>
          <div class="${CLASS_NS}_stats_chapters ${CLASS_NS}_stat">${user.stats.chaptersRead} chapters</div>
        </div>
        ${noNumbers ? "" : `
        <div class="${CLASS_NS}_stats_right">
          <div class="${CLASS_NS}_stats_genres ${CLASS_NS}_stat">Top genre: ${favGenre.genre} (${favGenre[sortKey]}${sortKey === "meanScore" ? "%" : ""})</div>
          <div class="${CLASS_NS}_stats_tags ${CLASS_NS}_stat">Top tag: ${favTag.tag.name} (${favTag[sortKey]}${sortKey === "meanScore" ? "%" : ""})</div>
        </div>`
        }
      </div>
    </div>
  </div>
          `;

          let cardElem = makeCard(calculateCardPosition(elem, { cardWidth: 450, cardHeight: 102 }), html);
          
          cardElem.dataset.name = user.name.toLowerCase();
          cardElem.classList.add("ales-usercard");

          cardElem.style.backgroundImage = `url(${user.bannerImage})`;

          if (noNumbers) {
            cardElem.classList.add(CLASS_NONUMBERS);
          }

          document.body.appendChild(cardElem);
          return cardElem;
        });
      }
    });
  }
});
