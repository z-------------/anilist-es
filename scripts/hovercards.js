onGotSettings(function() {
  const CLASS_WAITING = "amc--waiting";
  const CLASS_ACTIVE = "amc--active";
  const CLASS_ATTACHED = "amc--attached";
  const CLASS_NOBANNERIMAGE = "amc--nobannerimage";

  let format = {
    TV: "TV",
    TV_SHORT: "TV short",
    MOVIE: "Movie",
    SPECIAL: "Special",
    OVA: "OVA",
    ONA: "ONA",
    MUSIC: "Music video",
    MANGA: "Manga",
    NOVEL: "Novel",
    ONE_SHOT: "One-shot"
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

  function showCard(info) {
    let elem = document.createElement("div");
    elem.classList.add("amc");
    elem.dataset.id = info.id;

    let isAnime = info.type === "ANIME";
    let hasBannerImage = !!info.bannerImage;

    if (!hasBannerImage) {
      elem.classList.add(CLASS_NOBANNERIMAGE);
    }

    elem.innerHTML = `
<div class="amc_cover">
  <div class="amc_image" style="background-image: url(${info.coverImage.medium})"></div>
  <div class="amc_underimage">
    <div class="amc_rating">${info.averageScore}%</div>
    <div class="amc_rankings">
      <div class="amc_ranking amc_ranking--rated">⭐${info.rankings[0].rank}</div>
      <div class="amc_ranking amc_ranking--popular">❤️${info.rankings[1].rank}</div>
    </div>
  </div>
</div>
<div class="amc_info">
  <h2 class="amc_title">
    <a href="/${info.type.toLowerCase()}/${info.id}">${info.title.romaji}</a>
    ${info.bannerImage ? `<div class="amc_banner" style="background-image: url(${info.bannerImage})"></div>` : ""}
  </h2>
  <div class="amc_description">${stripHTML(info.description)}</div>
  <div class="amc_stats">
    ${
      [
        `<div class="amc_stats_format">${format[info.format]}</div>`,
        isAnime
          ? `<div class="amc_stats_episodes">${countFormat(info.episodes)} eps.</div>`
          : `<div class="amc_stats_volumes">${countFormat(info.volumes)} vols.</div>`,
        `<div class="amc_stats_season">${info.startDate.year}</div>`,
        `<div class="amc_stats_genres">${info.genres.slice(0, 4).join(", ")}</div>`
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
          showCard(r);
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
});
