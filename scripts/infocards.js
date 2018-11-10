onGotSettings(function() {
  if (settings.cardsEnable) {
    const CLASS_WAITING = "amc--waiting";
    const CLASS_ACTIVE = "amc--active";
    const CLASS_ATTACHED = "amc--attached";

    const CLASS_NOBANNERIMAGE = "amc--nobannerimage";
    const CLASS_NONUMBERS = "amc--nonumbers";
    const CLASS_NOARROW = "amc--noarrow";

    function icon(icon) {
      return `<img class="amc_icon" src="${browser.runtime.getURL(`img/${icon}.svg`)}" />`;
    }

    function showCard(info, position) {
      let elem = document.createElement("div");
      elem.classList.add("amc");
      elem.classList.add(`amc--direction-${position.direction}`);
      elem.dataset.id = info.id;

      elem.style.left = position.left + "px";
      elem.style.top = position.top + "px";

      let isAnime = info.type === "ANIME";
      let hasRankings = info.rankings[0] && info.rankings[1];

      if (!info.bannerImage) {
        elem.classList.add(CLASS_NOBANNERIMAGE);
      }
      if (!hasRankings && info.averageScore === null) {
        elem.classList.add(CLASS_NONUMBERS);
      }
      if (position.isOffCenterX) {
        elem.classList.add(CLASS_NOARROW);
      }

      elem.innerHTML = `
  <div class="amc_cover">
    <div class="amc_image" style="background-image: url(${info.coverImage.large})"></div>
    <div class="amc_underimage">
      ${info.averageScore !== null ? `<div class="amc_rating">${info.averageScore}%</div>` : ""}
      ${hasRankings ? `
        <div class="amc_rankings">
          <div class="amc_ranking amc_ranking--rated">${icon("star")} #${info.rankings[0].rank}</div>
          <div class="amc_ranking amc_ranking--popular">${icon("heart")} #${info.rankings[1].rank}</div>
        </div>
        ` : ""}
    </div>
  </div>
  <div class="amc_info">
    <h2 class="amc_title">
      <a href="/${info.type.toLowerCase()}/${info.id}">${getTitle(info.title, settings.titleLanguage)}</a>
      ${info.bannerImage ? `<div class="amc_banner" style="background-image: url(${info.bannerImage})"></div>` : ""}
    </h2>
    <div class="amc_description">${stripHTML(info.description || "")}</div>
    <div class="amc_stats">
      ${
        [
          info.format ? `<div class="amc_stats_format">${strings.format[info.format]}</div>` : "?",
          isAnime
            ? `<div class="amc_stats_episodes">${info.episodes || "?"} eps.</div>`
            : `<div class="amc_stats_volumes">${info.volumes || "?"} vols.</div>`,
          info.startDate.year ? `<div class="amc_stats_season">${info.startDate.year}</div>` : "?",
          info.genres && info.genres.length ? `<div class="amc_stats_genres">${info.genres.slice(0, 4).join(", ")}</div>` : "?"
        ].join(`&nbsp;${BULLET}&nbsp;`)
      }
    </div>
  </div>
      `;

      document.body.appendChild(elem);
    }

    function hideCard(id) {
      let elem = document.querySelector(`.amc[data-id="${id}"]`);
      if (elem) {
        elem.parentElement.removeChild(elem);
      }
    }

    function hideAllCards() {
      [...document.getElementsByClassName("amc")].forEach(elem => {
        elem.parentElement.removeChild(elem);
      });
    }

    function calculatePosition(target) {
      let cardHeight = 250;
      let cardWidth = 500;
      let margin = 15;
      let rect = target.getClientRects()[0];

      let result = {};

      if (rect.top - 2 * margin - cardHeight < 0) {
        result.direction = "down";
        result.top = rect.bottom + margin;
      } else {
        result.direction = "up";
        result.top = rect.top - margin - cardHeight;
      }

      if (rect.left + rect.width / 2 - cardWidth / 2 < 0) {
        result.left = margin;
        result.isOffCenterX = true;
      } else if (rect.right + rect.width / 2 + cardWidth / 2 > window.innerWidth) {
        result.left = window.innerWidth - margin - cardWidth;
        result.isOffCenterX = true;
      } else {
        result.left = rect.left + rect.width / 2 - cardWidth / 2;
      }

      return result;
    }

    document.body.addEventListener("mouseover", e => {
      let elem = e.target;
      if (
        elem.classList &&
        elem.classList.contains("title") &&
        !elem.classList.contains(CLASS_WAITING) &&
        elem.href
      ) {
        elem.classList.add(CLASS_WAITING);

        let url = new URL(elem.href);
        let path = url.pathname.slice(1).split("/");
        let id = Number(path[1]);
        let type = path[0].toUpperCase();

        let timeout = setTimeout(function() {
          getSeriesInfo(id, type).then(r => {
            showCard(r, calculatePosition(elem));
            elem.classList.remove(CLASS_WAITING);
            elem.classList.add(CLASS_ACTIVE);
            if (!elem.classList.contains(CLASS_ATTACHED)) {
              elem.classList.add(CLASS_ATTACHED);
              elem.addEventListener("mouseout", e => {
                hideCard(id);
              });
            }
          });
        }, settings.cardsHoverTimeout);
        elem.addEventListener("mouseout", e => {
          clearTimeout(timeout);
          elem.classList.remove(CLASS_WAITING);
        });
      }
    });

    onNavigate(hideAllCards);
  }
});
