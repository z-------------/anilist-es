onGotSettings(function() {
  const CLASS_WAITING = "CLASS_WAITING";
  const CLASS_ACTIVE = "CLASS_ACTIVE";

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

  function showCard(info) {
    let elem = document.createElement("div");
    elem.classList.add("amc");
    elem.dataset.id = info.id;

    let isAnime = info.type === "ANIME";

    elem.innerHTML = `
<div class="amc_cover">
  <div class="amc_image" style="background-image: url(${info.coverImage.medium})"></div>
  <div class="amc_underimage">
    <div class="amc_rating">${info.averageScore}%</div>
    <div class="amc_ranking amc_ranking--rated">⭐${info.rankings[0].rank}</div>
    <div class="amc_ranking amc_ranking--popular">❤${info.rankings[1].rank}</div>
  </div>
</div>
<div class="amc_info">
  <div class="amc_title">${info.title.romaji}</div>
  <div class="amc_description">${stripHTML(info.description).substring(0, 350)}…</div>
  <div class="amc_stats">
    ${
      [
        `<div class="amc_stats_format">${format[info.format]}</div>`,
        isAnime
          ? `<div class="amc_stats_episodes">${countFormat(info.episodes)} eps.</div>`
          : `<div class="amc_stats_volumes">${countFormat(info.volumes)} vols.</div>`,
        `<div class="amc_stats_season">${isAnime ? `${season[info.season]} ` : ""}${info.startDate.year}</div>`,
        `<div class="amc_stats_genres">${info.genres.join(", ")}</div>`
      ].join(`&nbsp;${BULLET}&nbsp;`)
    }
  </div>
</div>
    `;

    document.body.appendChild(elem);
  }

  function hideCard(id) {
    let elem = document.querySelector(`.amc[data-id=${id}]`);
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

      setTimeout(function() {
        api(query, variables).then(r => {
          console.log(r);
          showCard(r);
          elem.classList.remove(CLASS_WAITING);
          elem.classList.add(CLASS_ACTIVE);
        });
      }, 500);
    }
  });

  document.addEventListener("mouseout", e => {
    let elem = e.target;
    if (elem.classList && elem.classList.contains("title") && elem.classList.contains(CLASS_ACTIVE)) {
      hideCard(elem.dataset.id);
    }
  });
});
