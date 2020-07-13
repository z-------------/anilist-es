onGotSettings(function() {
  const Z_80 = 1.2815515594600038;
  const Z_90 = 1.644853646608357;
  const Z_95 = 1.9599639715843482;
  const Z = Z_80;

  function computeScore(pHat, n) {
    if (n === 0) return 0;
    return (pHat + Z**2/(2*n) - Z * Math.sqrt((pHat * (1-pHat) + Z**2/(4*n)) / n)) / (1 + Z**2/n);
  }

  function topDecide(a, b, sortKey) {
    if (!a && !b) return null;
    else if (!b) return a;
    else if (!a) return b;
    else if (b[sortKey] > a[sortKey]) return b;
    else return a;
  }

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
          const stats = user.statistics;
          
          const favs = {};

          for (const type of ["anime", "manga"]) {
            favs[type] = {};
            for (const cat of ["genres", "tags"]) {
              favs[type][cat] = { score: -1 };
              for (const cur of stats[type][cat]) {
                const curScore = computeScore(cur.meanScore / 100, cur.count);
                if (curScore > favs[type][cat].score) {
                  favs[type][cat] = {
                    label: cur.genre || cur.tag.name,
                    score: curScore,
                  };
                }
              }
            }
          }

          const sortKey = "score";
          
          const favGenre = topDecide(favs["anime"]["genres"], favs["manga"]["genres"], sortKey);
          const favTag = topDecide(favs["anime"]["tags"], favs["manga"]["tags"], sortKey);

          const noNumbers = favGenre[sortKey] === -1 || favTag[sortKey] === -1;

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
          <div class="${CLASS_NS}_stats_hours ${CLASS_NS}_stat">${round(user.statistics.anime.minutesWatched / 60 / 24, 1)} days</div>
          <div class="${CLASS_NS}_stats_chapters ${CLASS_NS}_stat">${user.statistics.manga.chaptersRead} chapters</div>
        </div>
        ${noNumbers ? "" : `
        <div class="${CLASS_NS}_stats_right">
          <div class="${CLASS_NS}_stats_genres ${CLASS_NS}_stat">Fav. genre: ${favGenre.label}</div>
          <div class="${CLASS_NS}_stats_tags ${CLASS_NS}_stat">Fav. tag: ${favTag.label}</div>
        </div>`
        }
      </div>
    </div>
  </div>
          `;

          let cardElem = makeCard(calculateCardPosition(elem, { cardWidth: 450, cardHeight: 102 }), html);
          
          cardElem.dataset.name = user.name.toLowerCase();
          cardElem.classList.add("ales-usercard");

          cardElem.style.backgroundImage = user.bannerImage ? `url(${user.bannerImage})` : "";

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
