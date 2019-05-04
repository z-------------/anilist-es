onGotSettings(function() {
  if (settings.cardsEnable) {
    const CLASS_WAITING = "amc--waiting";
    const CLASS_ACTIVE = "amc--active";
    const CLASS_ATTACHED = "amc--attached";

    const CLASS_NOBANNERIMAGE = "amc--nobannerimage";
    const CLASS_NONUMBERS = "amc--nonumbers";
    const CLASS_NOARROW = "ales-card--noarrow";

    function makeRankingPeriodString(ranking) {
      if (!ranking.season && ranking.year === null) {
        return "";
      } else {
        return `(${ranking.season ? strings.seasonShort[ranking.season] + " " : ""}${ranking.year ? ranking.year : ""})`;
      }
    }

    function makeRankingHTML(ranking) {
      return `
<div class="amc_ranking">
  <span class="amc_ranking_period">${makeRankingPeriodString(ranking)}</span>
  <span class="amc_ranking_ranking">${icon(ranking.type === "POPULAR" ? "heart" : "star")}#${ranking.rank}</span>
</div>
      `;
    }

    function showCard(info, position) {
      if (position) {
        let elem = document.createElement("div");
        elem.classList.add("amc", "ales-card");
        elem.classList.add(`ales-card--direction-${position.direction}`);
        elem.dataset.id = info.id;

        elem.style.left = position.left + "px";
        elem.style.top = position.top + "px";

        let isAnime = info.type === "ANIME";
        let hasRankings = info.rankings.length >= 2;
        let displayedScore = info.averageScore || info.meanScore || null;

        if (!info.bannerImage) {
          elem.classList.add(CLASS_NOBANNERIMAGE);
        }
        if (!hasRankings && displayedScore === null) {
          elem.classList.add(CLASS_NONUMBERS);
        }
        if (position.isOffCenterX) {
          elem.classList.add(CLASS_NOARROW);
        }

        elem.innerHTML = `
<div class="amc_cover">
  <div class="amc_image" style="background-image: url(${info.coverImage.large})"></div>
  <div class="amc_underimage">
    ${displayedScore !== null ? `<div class="amc_rating">${displayedScore}%</div>` : ""}
    ${hasRankings ? `
      <div class="amc_rankings">
        ${makeRankingHTML(info.rankings[0])}
        ${makeRankingHTML(info.rankings[1])}
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
        info.format ? `<div class="amc_stats_format">${strings.format[info.format]}</div>` : "",
        isAnime
          ? (info.episodes ? `<div class="amc_stats_episodes">${info.episodes} eps.</div>` : "")
          : (info.volumes ? `<div class="amc_stats_volumes">${info.volumes} vols.</div>` : ""),
        info.startDate.year
          ? info.season && info.startDate.year >= new Date().getFullYear()
            ? `<div class="amc_stats_season">${strings.seasonShort[info.season]} ${info.startDate.year}</div>`
            : `<div class="amc_stats_season">${info.startDate.year}</div>`
          : "",
        info.genres && info.genres.length
          ? `<div class="amc_stats_genres">
            ${info.genres.slice(0, INFOCARDS_MAX_GENRES).join(", ")}
            ${info.genres.length - INFOCARDS_MAX_GENRES > 0 ? ` (+${info.genres.length - INFOCARDS_MAX_GENRES})` : ""}
            </div>`
          : ""
      ].filter(str => str.length).join(`&nbsp;${CHAR_BULLET}&nbsp;`)
    }
  </div>
</div>
        `;

        document.body.appendChild(elem);
      }
    }

    function hideCard(id) {
      let elem = document.querySelector(`.amc[data-id="${id}"]`);
      if (elem) {
        elem.parentElement.removeChild(elem);
      }
    }

    function hideAllCards() {
      let amcElems = document.getElementsByClassName("amc");
      for (let i = 0, l = amcElems.length; i < l; i++) {
        amcElems[i].parentElement.removeChild(amcElems[i]);
      }
    }

    document.body.addEventListener("mouseover", e => {
      let elem = e.target;
      // console.log(elem);
      let href;
      if (elem.classList && !elem.classList.contains(CLASS_WAITING)) { // proceed to check if it is a valid link
        if (elem.classList.contains("title") && elem.href) {
          href = elem.href;
        } else if (elem.classList.contains("name") && elem.parentElement.parentElement.classList.contains("media")) {
          href = elem.parentElement.href;
        } else if (elem.tagName === "A" && elem.parentElement.classList.contains("title")) {
          href = elem.href;
        } else if (
          (elem.classList.contains("title") || elem.classList.contains("info"))
          && elem.parentElement.parentElement.parentElement.parentElement.classList.contains("media-embed")
          && (
            elem.parentElement.parentElement.parentElement.parentElement.dataset.mediaType === "anime"
            || elem.parentElement.parentElement.parentElement.parentElement.dataset.mediaType === "manga"
          )
        ) {
          href = elem.parentElement.parentElement.parentElement.parentElement.href;
        }
      }
      if (href) {
        elem.classList.add(CLASS_WAITING);

        let url = new URL(href);
        let path = url.pathname.slice(1).split("/");
        let id = Number(path[1]);
        let type = path[0].toUpperCase();

        let timeout = setTimeout(function() {
          getSeriesInfo(id, type).then(r => {
            showCard(r, calculateCardPosition(elem));
            elem.classList.remove(CLASS_WAITING);
            elem.classList.add(CLASS_ACTIVE);
            if (!elem.classList.contains(CLASS_ATTACHED)) {
              elem.classList.add(CLASS_ATTACHED);
              elem.addEventListener("mouseout", () => {
                hideCard(id);
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
