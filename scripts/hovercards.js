onGotSettings(function() {
  if (settings.cardsEnable) {
    const CLASS_WAITING = "amc--waiting";
    const CLASS_ACTIVE = "amc--active";
    const CLASS_ATTACHED = "amc--attached";

    const CLASS_NOBANNERIMAGE = "amc--nobannerimage";
    const CLASS_NONUMBERS = "amc--nonumbers";

    let format = {
      TV: "TV",
      TV_SHORT: "TV Short",
      MOVIE: "Movie",
      SPECIAL: "Special",
      OVA: "OVA",
      ONA: "ONA",
      MUSIC: "Music",
      MANGA: "Manga",
      NOVEL: "Novel",
      ONE_SHOT: "One Shot"
    };

    let status = {
      FINISHED: "Finished",
      RELEASING: "Releasing",
      NOT_YET_RELEASED: "Not yet released",
      CANCELLED: "Cancelled"
    };

    let season = {
      SPRING: "Spring",
      SUMMER: "Summer",
      FALL: "Fall",
      WINTER: "Winter"
    };

    function countFormat(count) {
      return count || "?";
    }

    let infos = {};

    function getInfo(id, type) {
      let cacheKey = `${type}:${id}`;
      if (infos.hasOwnProperty(cacheKey)) {
        return Promise.resolve(infos[cacheKey]);
      } else {
        let query = `
  query ($id: Int, $type: MediaType) {
    Media (id: $id, type: $type) {
      id
      title {
        romaji(stylised: true)
      }
      type
      episodes
      chapters
      volumes
      duration
      status
      format
      season
      startDate {
        year
      }
      description(asHtml: true)
      genres
      coverImage {
        medium
      }
      bannerImage
      averageScore
      rankings {
        rank
        type
        allTime
      }
      studios(isMain: true) {
        nodes {
          name
        }
      }
    }
  }
        `;
        let variables = {
          id: id, type: type
        };

        return api(query, variables).then(r => {
          infos[cacheKey] = r;
          return r;
        });
      }
    }

    function icon(icon) {
      return `<img class="amc_icon" src="${chrome.runtime.getURL(`img/${icon}.svg`)}" />`;
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

      elem.innerHTML = `
  <div class="amc_cover">
    <div class="amc_image" style="background-image: url(${info.coverImage.medium})"></div>
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
      <a href="/${info.type.toLowerCase()}/${info.id}">${info.title.romaji}</a>
      ${info.bannerImage ? `<div class="amc_banner" style="background-image: url(${info.bannerImage})"></div>` : ""}
    </h2>
    <div class="amc_description">${stripHTML(info.description || "")}</div>
    <div class="amc_stats">
      ${
        [
          info.format ? `<div class="amc_stats_format">${format[info.format]}</div>` : "?",
          isAnime
            ? `<div class="amc_stats_episodes">${countFormat(info.episodes)} eps.</div>`
            : `<div class="amc_stats_volumes">${countFormat(info.volumes)} vols.</div>`,
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

    function calculatePosition(target) {
      let cardHeight = 250;
      let cardWidth = 500;
      let marginY = 15;
      let rects = target.getClientRects()[0];

      let result = {};

      if (rects.top - 2 * marginY - cardHeight < 0) {
        result.direction = "down";
        result.top = rects.bottom + marginY;
      } else {
        result.direction = "up";
        result.top = rects.top - marginY - cardHeight;
      }

      result.left = rects.left + rects.width / 2 - cardWidth / 2;

      return result;
    }

    document.body.addEventListener("mouseover", e => {
      let elem = e.target;
      if (elem.classList && elem.classList.contains("title") && !elem.classList.contains(CLASS_WAITING)) {
        elem.classList.add(CLASS_WAITING);

        let url = new URL(e.target.href);
        let path = url.pathname.slice(1).split("/");
        let id = Number(path[1]);
        let type = path[0].toUpperCase();

        let timeout = setTimeout(function() {
          getInfo(id, type).then(r => {
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
        }, 500);
        elem.addEventListener("mouseout", e => {
          clearTimeout(timeout);
          elem.classList.remove(CLASS_WAITING);
        });
      }
    });

    onNavigate(function() {
      [...document.getElementsByClassName("amc")].forEach(elem => {
        elem.parentElement.removeChild(elem);
      });
    });
  }
});
