onGotSettings(function() {
  if (settings.userCardsEnable) {
    const CLASS_NS = "ales-usercard";

    const CLASS_WAITING = `${CLASS_NS}--waiting`;
    const CLASS_ACTIVE = `${CLASS_NS}--active`;
    const CLASS_ATTACHED = `${CLASS_NS}--attached`;

    const CLASS_NONUMBERS = `${CLASS_NS}--nonumbers`;
    const CLASS_NOARROW = `ales-card--noarrow`;

    const userLinkRegex = /^\/user\/\S+\/*$/;

    function showCard(user, followingLists, position) {
      if (position) {
        let elem = document.createElement("div");
        elem.classList.add(CLASS_NS, "ales-card");
        elem.classList.add(`ales-card--direction-${position.direction}`);
        elem.dataset.name = user.name.toLowerCase();

        elem.style.left = `${position.left}px`;
        elem.style.top = `${position.top}px`;

        elem.style.backgroundImage = `url(${user.bannerImage})`;

        const sortKey = settings.userCardsFavoredDefinition;
        user.stats.favouredGenres.sort((a, b) => b[sortKey] - a[sortKey]);
        user.stats.favouredTags.sort((a, b) => b[sortKey] - a[sortKey]);
        const favGenre = user.stats.favouredGenres[0];
        const favTag = user.stats.favouredTags[0];
        const noNumbers = !favGenre || !favGenre[sortKey] || !favTag || !favTag[sortKey];

        let isFollowing = false;
        let isFollower = false;

        if (noNumbers) {
          elem.classList.add(CLASS_NONUMBERS);
        }
        if (position.isOffCenterX) {
          elem.classList.add(CLASS_NOARROW);
        }
        if (followingLists) {
          isFollowing = !!followingLists.following.filter(f => f.id === user.id).length;
          isFollower = !!followingLists.followers.filter(f => f.id === user.id).length;
        }

        elem.innerHTML = `
<div class="${CLASS_NS}_wrap">
  <div class="${CLASS_NS}_left">
    <div class="${CLASS_NS}_avatar" style="background-image: url(${user.avatar.large});"></div>
  </div>
  <div class="${CLASS_NS}_right">
    <div class="${CLASS_NS}_name-container">
      <h2 class="${CLASS_NS}_name">${user.name}</h2>
      ${user.moderatorStatus ? `<div class="${CLASS_NS}_tag ${CLASS_NS}_tag--mod">${capitalize(user.moderatorStatus, CAPITALIZE_WORDS)}</div>` : ""}
      ${isFollowing ? `<div class="${CLASS_NS}_tag">Followed</div>` : ""}
      ${isFollower ? `<div class="${CLASS_NS}_tag">Follows you</div>` : ""}
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

        document.body.appendChild(elem);
      }
    }

    function hideCards(name) {
      const elems = document.querySelectorAll(`.${CLASS_NS}[data-name="${name.toLowerCase()}"]`);
      for (let i = 0; i < elems.length; ++i) {
        elems[i].parentElement.removeChild(elems[i]);
      }
    }

    function hideAllCards() {
      const cardElems = document.getElementsByClassName(CLASS_NS);
      for (let i = 0, l = cardElems.length; i < l; i++) {
        cardElems[i].parentElement.removeChild(cardElems[i]);
      }
    }

    document.body.addEventListener("mouseover", e => {
      let elem = e.target;
      // console.log(elem);
      let href;
      if (elem.classList && !elem.classList.contains(CLASS_WAITING)) { // proceed to check if it is a valid link
        if ((elem.classList.contains("name") || elem.classList.contains("user") || elem.classList.contains("author") || elem.classList.contains("avatar") || elem.textContent.trim()[0] === "@") && elem.href && userLinkRegex.test(elem.getAttribute("href"))) {
          href = elem.href;
        } else if (elem.classList.contains("name") && elem.parentElement.href && userLinkRegex.test(elem.parentElement.getAttribute("href"))) {
          href = elem.parentElement.href;
        } else if (elem.parentElement.tagName === "A" && elem.parentElement.parentElement.classList.contains("name")) {
          href = elem.parentElement.href;
        }
      }
      if (href) {
        elem.classList.add(CLASS_WAITING);

        let url = new URL(href);
        let path = url.pathname.slice(1).split("/");
        let name = path[1]; // username

        function ready(r, f) { showCard(r, f, calculateCardPosition(elem, { cardWidth: 450, cardHeight: 102 })); }

        let timeout = setTimeout(function() {
          getUserInfo(name).then(r => {
            if (token) {
              getAuthedUserFollowingLists().then(f => ready(r, f));
            } else {
              ready(r, null);
            }
            elem.classList.remove(CLASS_WAITING);
            elem.classList.add(CLASS_ACTIVE);
            if (!elem.classList.contains(CLASS_ATTACHED)) {
              elem.classList.add(CLASS_ATTACHED);
              elem.addEventListener("mouseout", () => {
                hideCards(name);
              });
            }
          });
        }, settings.cardsHoverTimeout);
        elem.addEventListener("mouseout", () => {
          clearTimeout(timeout);
          elem.classList.remove(CLASS_WAITING);
        });
      }
    });

    onNavigate(hideAllCards);
    window.addEventListener("scroll", hideAllCards);
    window.addEventListener("click", hideAllCards);
  }
});
