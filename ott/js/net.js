const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

// ===================== TMDB CONFIG =====================
const TMDB_API_KEY = "a5b8cf7f7e240042e5d395cb16871d2b";

// 1) 현재 상영작(영화)
const NOW_PLAYING_URL =
  "https://api.themoviedb.org/3/movie/now_playing?language=ko-KR&page=1";

// 2) 넷플릭스에서만 상영작(Netflix Originals: TV / networks=213)
const NETFLIX_TV_URL =
  "https://api.themoviedb.org/3/discover/tv?with_networks=213&language=ko-KR&page=1";

// 3) 코미디 영화(genre=35)
const COMEDY_MOVIE_URL =
  "https://api.themoviedb.org/3/discover/movie?with_genres=35&language=ko-KR&page=1";

// 4) 공포 영화(genre=27)
const HORROR_MOVIE_URL =
  "https://api.themoviedb.org/3/discover/movie?with_genres=27&language=ko-KR&page=1";

// 5) 로맨스 영화(genre=10749)
const ROMANCE_MOVIE_URL =
  "https://api.themoviedb.org/3/discover/movie?with_genres=10749&language=ko-KR&page=1";

// 6) 다큐멘터리 영화(genre=99)
const DOCUMENTARY_MOVIE_URL =
  "https://api.themoviedb.org/3/discover/movie?with_genres=99&language=ko-KR&page=1";

// 7) 최신 트렌드 (movie + tv 혼합)
const TRENDING_URL =
  "https://api.themoviedb.org/3/trending/all/week?language=ko-KR";

// 8) 인기 상영작(Top Rated 영화)
const TOP_RATED_URL =
  "https://api.themoviedb.org/3/movie/top_rated?language=ko-KR&page=1";

// 9) ✅ 액션 영화(genre=28)
const ACTION_MOVIE_URL =
  "https://api.themoviedb.org/3/discover/movie?with_genres=28&language=ko-KR&page=1";

const IMG_W500 = "https://image.tmdb.org/t/p/w500";
const IMG_ORIGINAL = "https://image.tmdb.org/t/p/original";

const FALLBACK_POSTER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='600' height='900'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#1b1b24'/>
      <stop offset='1' stop-color='#0b0b0f'/>
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)'/>
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        fill='rgba(255,255,255,.7)' font-family='Arial' font-size='34'>No Poster</text>
</svg>
`);

// ===================== Header scroll =====================
const header = $("#header");
const setHeader = () => {
  if (!header) return;
  if (window.scrollY > 10) header.classList.add("is-solid");
  else header.classList.remove("is-solid");
};
window.addEventListener("scroll", setHeader, { passive: true });
setHeader();

// Year
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===================== Elements =====================
const rowsEl = $("#rows");

// Featured elements
const featuredFallback = $("#featuredFallback");
const featuredVideo = $("#featuredVideo");
const featuredTitle = $("#featuredTitle");
const featuredDesc = $("#featuredDesc");
const featuredMeta = $("#featuredMeta");

const playBtn = $("#playBtn");
const infoBtn = $("#infoBtn");

// Modal elements
const modal = $("#modal");
const modalPoster = $("#modalPoster");
const modalTitle = $("#modalTitle");
const modalDesc = $("#modalDesc");
const modalTags = $("#modalTags");
const modalRelease = $("#modalRelease");
const modalVote = $("#modalVote");

let FEATURED_DATA = null;

boot();

async function boot() {
  if (rowsEl) rowsEl.innerHTML = skeletonRows();

  try {
    // ✅ 9개 API 병렬 호출
    const [
      nowPlayingRaw,
      netflixTvRaw,
      comedyRaw,
      horrorRaw,
      romanceRaw,
      documentaryRaw,
      trendingRaw,
      topRatedRaw,
      actionRaw,
    ] = await Promise.all([
      fetchList(NOW_PLAYING_URL),
      fetchList(NETFLIX_TV_URL),
      fetchList(COMEDY_MOVIE_URL),
      fetchList(HORROR_MOVIE_URL),
      fetchList(ROMANCE_MOVIE_URL),
      fetchList(DOCUMENTARY_MOVIE_URL),
      fetchList(TRENDING_URL),
      fetchList(TOP_RATED_URL),
      fetchList(ACTION_MOVIE_URL),
    ]);

    if (!nowPlayingRaw.length) throw new Error("now_playing 결과가 없습니다.");

    // ✅ 대표 영화: 현재 상영작 첫 번째
    const featuredRaw = pickRandom(nowPlayingRaw);
    FEATURED_DATA = mapMovie(featuredRaw);

    function pickRandom(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
  const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}



    renderFeatured(FEATURED_DATA);

    // ✅ 대표 영화 트레일러 백그라운드
    const ytKey = await fetchYoutubeTrailerKey(featuredRaw.id);
    if (ytKey) mountYoutubeBg(ytKey);

    // ✅ Rows 데이터
    const nowPlayingItems = nowPlayingRaw.slice(1).map(mapMovie);
    const netflixItems = netflixTvRaw.map(mapTv);
    const comedyItems = comedyRaw.map(mapMovie);
    const horrorItems = horrorRaw.map(mapMovie);
    const romanceItems = romanceRaw.map(mapMovie);
    const documentaryItems = documentaryRaw.map(mapMovie);

    // ✅ Trending: movie/tv 섞여있으므로 media_type 기반 분기
    const trendingItems = trendingRaw.map(mapTrendingAny).filter(Boolean);

    // ✅ Top Rated
    const topRatedItems = topRatedRaw.map(mapMovie);

    // ✅ Action
    const actionItems = actionRaw.map(mapMovie);

    const rows = [
      { title: "현재 상영작", hint: "TMDB · Now Playing", items: nowPlayingItems },
      { title: "넷플릭스에서만 상영작", hint: "TMDB · Netflix (with_networks=213)", items: netflixItems },
      { title: "코미디 영화", hint: "TMDB · Comedy (with_genres=35)", items: comedyItems },
      { title: "공포 영화", hint: "TMDB · Horror (with_genres=27)", items: horrorItems },
      { title: "로맨스 영화", hint: "TMDB · Romance (with_genres=10749)", items: romanceItems },
      { title: "다큐멘터리 영화", hint: "TMDB · Documentary (with_genres=99)", items: documentaryItems },
      { title: "최신 트렌드 상영작", hint: "TMDB · Trending (all/week)", items: trendingItems },
      { title: "인기 상영작", hint: "TMDB · Top Rated", items: topRatedItems },
      { title: "액션 영화", hint: "TMDB · Action (with_genres=28)", items: actionItems },
    ];

    if (rowsEl) rowsEl.innerHTML = rows.map(rowTemplate).join("");
    bindRowInteractions();
  } catch (e) {
    console.error(e);
    if (rowsEl)
      rowsEl.innerHTML = errorBlock(
        "콘텐츠를 불러오지 못했어요.",
        "API Key/네트워크/CORS 상태를 확인해주세요."
      );
  }

  bindGlobalInteractions();
}

// --------------------- Generic Fetch ---------------------
async function fetchList(baseUrl) {
  const url = appendApiKey(baseUrl, TMDB_API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB 요청 실패: ${res.status} (${baseUrl})`);
  const json = await res.json();
  return Array.isArray(json?.results) ? json.results : [];
}

// 트레일러 키 가져오기: /movie/{id}/videos
async function fetchYoutubeTrailerKey(movieId) {
  const base = `https://api.themoviedb.org/3/movie/${movieId}/videos?language=ko-KR`;
  const url = appendApiKey(base, TMDB_API_KEY);

  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  const list = Array.isArray(json?.results) ? json.results : [];
  if (!list.length) return null;

  const pick =
    list.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    list.find((v) => v.site === "YouTube" && v.type === "Teaser") ||
    list.find((v) => v.site === "YouTube");

  return pick?.key || null;
}

function appendApiKey(baseUrl, apiKey) {
  const u = new URL(baseUrl);
  u.searchParams.set("api_key", apiKey);
  return u.toString();
}

// --------------------- Mapping ---------------------
function mapMovie(m) {
  const poster = m.poster_path ? IMG_W500 + m.poster_path : FALLBACK_POSTER;
  const backdrop = m.backdrop_path ? IMG_ORIGINAL + m.backdrop_path : poster;

  return {
    id: m.id,
    type: "movie",
    name: m.title || "제목 없음",
    poster,
    backdrop,
    desc: m.overview?.trim() || "줄거리가 제공되지 않았습니다.",
    release: m.release_date || "-",
    vote: typeof m.vote_average === "number" ? m.vote_average : null,
    tags: [
      m.release_date ? `${m.release_date.slice(0, 4)}년` : null,
      typeof m.vote_average === "number" ? `평점 ${m.vote_average.toFixed(1)}` : null,
    ].filter(Boolean),
  };
}

function mapTv(t) {
  const poster = t.poster_path ? IMG_W500 + t.poster_path : FALLBACK_POSTER;
  const backdrop = t.backdrop_path ? IMG_ORIGINAL + t.backdrop_path : poster;

  return {
    id: t.id,
    type: "tv",
    name: t.name || "제목 없음",
    poster,
    backdrop,
    desc: t.overview?.trim() || "줄거리가 제공되지 않았습니다.",
    release: t.first_air_date || "-",
    vote: typeof t.vote_average === "number" ? t.vote_average : null,
    tags: [
      t.first_air_date ? `${t.first_air_date.slice(0, 4)}년` : null,
      typeof t.vote_average === "number" ? `평점 ${t.vote_average.toFixed(1)}` : null,
      "Netflix",
    ].filter(Boolean),
  };
}

// ✅ trending/all/week 전용: media_type에 따라 movie/tv 분기
function mapTrendingAny(x) {
  const mt = x?.media_type;
  if (mt === "movie") {
    const movie = mapMovie(x);
    movie.tags = [...(movie.tags || []), "Trending"];
    return movie;
  }
  if (mt === "tv") {
    const tv = mapTvFromTrending(x);
    tv.tags = [...(tv.tags || []), "Trending"];
    return tv;
  }
  return null; // person 등 제외
}

function mapTvFromTrending(t) {
  const poster = t.poster_path ? IMG_W500 + t.poster_path : FALLBACK_POSTER;
  const backdrop = t.backdrop_path ? IMG_ORIGINAL + t.backdrop_path : poster;

  return {
    id: t.id,
    type: "tv",
    name: t.name || t.original_name || "제목 없음",
    poster,
    backdrop,
    desc: t.overview?.trim() || "줄거리가 제공되지 않았습니다.",
    release: t.first_air_date || "-",
    vote: typeof t.vote_average === "number" ? t.vote_average : null,
    tags: [
      t.first_air_date ? `${t.first_air_date.slice(0, 4)}년` : null,
      typeof t.vote_average === "number" ? `평점 ${t.vote_average.toFixed(1)}` : null,
    ].filter(Boolean),
  };
}

// --------------------- Featured ---------------------
function renderFeatured(data) {
  if (featuredFallback) featuredFallback.style.backgroundImage = `url('${data.backdrop}')`;
  if (featuredTitle) featuredTitle.textContent = data.name;
  if (featuredDesc) featuredDesc.textContent = data.desc;

  if (featuredMeta) {
    featuredMeta.innerHTML = [
      data.release !== "-" ? `<span class="metaChip">개봉 ${escapeHtml(data.release)}</span>` : "",
      data.vote != null ? `<span class="metaChip">평점 ${data.vote.toFixed(1)}</span>` : "",
      `<span class="metaChip">Featured</span>`,
    ].filter(Boolean).join("");
  }
}

function mountYoutubeBg(youtubeKey) {
  if (!featuredVideo) return;

  const src =
    `https://www.youtube.com/embed/${youtubeKey}` +
    `?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${youtubeKey}`;

  featuredVideo.innerHTML = `<iframe
      src="${src}"
      title="Trailer"
      allow="autoplay; encrypted-media"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>`;
}

// --------------------- Rows Templates ---------------------
function rowTemplate(row) {
  return `
    <section class="row" aria-label="${escapeHtml(row.title)}">
      <div class="row__head">
        <h3 class="row__title">${escapeHtml(row.title)}</h3>
        <span class="row__hint">${escapeHtml(row.hint || "")}</span>
      </div>
      <div class="railWrap">
        <button class="row__arrow left" type="button" aria-label="왼쪽으로">‹</button>
        <div class="rail" role="list">
          ${(row.items || []).map(itemTemplate).join("")}
        </div>
        <button class="row__arrow right" type="button" aria-label="오른쪽으로">›</button>
      </div>
    </section>
  `.trim();
}

function itemTemplate(item) {
  const payload = JSON.stringify(item).replaceAll("'", "\\'");
  const sub =
    item.release && item.release !== "-"
      ? item.release
      : item.type === "tv"
      ? "TV"
      : "Movie";

  return `
    <article class="card" role="listitem" tabindex="0" data-payload='${payload}'>
      <div class="card__img" style="background-image:url('${item.poster}')"></div>
      <div class="card__grad" aria-hidden="true"></div>
      <div class="card__meta">
        <p class="card__name">${escapeHtml(item.name)}</p>
        <p class="card__sub">${escapeHtml(sub)}</p>
      </div>
    </article>
  `.trim();
}

function skeletonRows() {
  return `
    <section class="row" aria-label="loading">
      <div class="row__head">
        <h3 class="row__title">불러오는 중…</h3>
        <span class="row__hint">TMDB</span>
      </div>
      <div class="railWrap">
        <div class="rail" role="list">
          ${Array.from({ length: 10 }).map(() => `
            <article class="card" role="listitem" aria-hidden="true" style="opacity:.55">
              <div class="card__img" style="background-image:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,0));"></div>
              <div class="card__grad"></div>
              <div class="card__meta">
                <p class="card__name">&nbsp;</p>
                <p class="card__sub">&nbsp;</p>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `.trim();
}

function errorBlock(title, desc) {
  return `
    <div style="padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.05)">
      <div style="font-weight:800;margin-bottom:6px">${escapeHtml(title)}</div>
      <div style="color:rgba(255,255,255,.72);font-size:13px;line-height:1.6">${escapeHtml(desc)}</div>
    </div>
  `.trim();
}

// --------------------- Interactions ---------------------
function bindRowInteractions() {
  $$(".row").forEach((rowEl) => {
    const rail = rowEl.querySelector(".rail");
    const left = rowEl.querySelector(".row__arrow.left");
    const right = rowEl.querySelector(".row__arrow.right");
    if (!rail || !left || !right) return;

    const scrollByAmount = () => Math.round(rail.clientWidth * 0.85);
    left.addEventListener("click", () =>
      rail.scrollBy({ left: -scrollByAmount(), behavior: "smooth" })
    );
    right.addEventListener("click", () =>
      rail.scrollBy({ left: scrollByAmount(), behavior: "smooth" })
    );

    let isDown = false, startX = 0, startScrollLeft = 0;
    rail.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX;
      startScrollLeft = rail.scrollLeft;
    });
    window.addEventListener("mouseup", () => { isDown = false; });
    rail.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      rail.scrollLeft = startScrollLeft - dx;
    });
  });
}

function bindGlobalInteractions() {
  if (rowsEl) {
    rowsEl.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      openModal(JSON.parse(card.dataset.payload));
    });
    rowsEl.addEventListener("keydown", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(JSON.parse(card.dataset.payload));
      }
    });
  }

  if (infoBtn) infoBtn.addEventListener("click", () => FEATURED_DATA && openModal(FEATURED_DATA));
  if (playBtn) playBtn.addEventListener("click", () => FEATURED_DATA && openModal(FEATURED_DATA));

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-close='true']")) closeModal();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }
}

// --------------------- Modal ---------------------
function openModal(data) {
  if (!modal) return;

  const bg = data.backdrop || data.poster;
  if (modalPoster) modalPoster.style.backgroundImage = `url('${bg}')`;
  if (modalTitle) modalTitle.textContent = data.name || "";
  if (modalDesc) modalDesc.textContent = data.desc || "";

  if (modalTags) {
    modalTags.innerHTML = (data.tags || [])
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");
  }

  if (modalRelease) modalRelease.textContent = data.release || "-";
  if (modalVote) modalVote.textContent = data.vote != null ? data.vote.toFixed(1) : "-";

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// --------------------- Utils ---------------------
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
// ===== Header Nav interactions (추가) =====
const nav = document.querySelector(".nav");
const navToggle = document.getElementById("navToggle");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    nav.classList.toggle("is-open");
  });

  // 바깥 클릭 시 닫기(모바일)
  document.addEventListener("click", (e) => {
    if (window.innerWidth > 860) return;
    const isInside = e.target.closest(".nav") || e.target.closest("#navToggle");
    if (!isInside) nav.classList.remove("is-open");
  });
}

// 메뉴 active 스타일
document.querySelectorAll(".nav__link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav__link").forEach((a) => a.classList.remove("is-active"));
    link.classList.add("is-active");

    // 모바일에서 선택 후 닫기
    if (window.innerWidth <= 860 && nav) nav.classList.remove("is-open");
  });
});
