/**
 * 따숨 | 완성본
 * - 데이터 호출 안정화(2단계 시도)
 * - 검색: 전체 데이터 로딩 후 필터링
 * - empty 섹션: "검색하지 않았을 때만" 표시
 * - 클릭 시 상세 -> 상세 하단 지도 표시
 * - 커스텀 마커(불꽃 SVG / marker.png / mascot.png)
 */

/** ✅ 서비스키들 */
const OD_SERVICE_KEY = "45ba9fe435f41f46e91024695eb4fbdaaef824f3561da33fb4105a7ecb3eea21";
const KAKAO_READY_CHECK = () => typeof kakao !== "undefined" && kakao.maps && kakao.maps.services;

/** ✅ 오픈API */
const OD_BASE = "https://api.odcloud.kr/api";
const OD_PATH = "/15128385/v1/uddi:3e5c388c-be0a-4d84-9556-b0f09d993203";
const RETURN_TYPE = "JSON";

/** ✅ 전체검색 로딩 제한 */
const MAX_ALL = 5000;
const BULK_SIZE = 1000;

/** ✅ 마커 자원(있으면 자동 사용) */
const MARKER_ASSET = "./assets/marker.png";
const MASCOT_ASSET = "./assets/mascot.png";

/** DOM */
const $q = document.querySelector("#q");
const $btnSearch = document.querySelector("#btnSearch");
const $btnClear = document.querySelector("#btnClear");
const $btnReload = document.querySelector("#btnReload");
const $perPage = document.querySelector("#perPage");

const $list = document.querySelector("#list");
const $count = document.querySelector("#count");
const $status = document.querySelector("#status");
const $empty = document.querySelector("#empty");

const $prev = document.querySelector("#prev");
const $next = document.querySelector("#next");
const $pages = document.querySelector("#pages");

const $panel = document.querySelector("#panel");
const $detailPage = document.querySelector("#detailPage");
const $detailBody = document.querySelector("#detailBody");
const $detailMapEl = document.querySelector("#detailMap");
const $btnBack = document.querySelector("#btnBack");

/** State */
let mode = "page"; // "page" | "search"
let query = "";

let page = 1;
let perPage = Number($perPage.value);

let totalCount = 0;
let activeIndex = -1;

let pageData = [];
let rawData = [];

let allData = null;         // 전체 데이터 캐시
let searchResultFull = null; // 검색 결과 전체(페이지네이션용)

let geocoder;
const geoCache = new Map();

/** 상세 지도 */
let detailMap = null;
let detailMarker = null;

/** 커스텀 마커 스타일 */
let markerStyle = { type: "svg", src: null };

/* ---------------- Utils ---------------- */
function setStatus(msg) { $status.textContent = msg || ""; }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hasQuery() {
  return String(query || "").trim().length > 0;
}

function showPanel() {
  $detailPage.hidden = true;
  $panel.hidden = false;
}

function showDetail() {
  $panel.hidden = true;
  $detailPage.hidden = false;
}

/* ---------------- Data Fetch (2-step) ---------------- */
function buildUrl({ page, perPage }) {
  const url = new URL(OD_BASE + OD_PATH);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("returnType", RETURN_TYPE);
  url.searchParams.set("serviceKey", OD_SERVICE_KEY);
  return url.toString();
}

async function fetchJsonOrThrow(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 400)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON 파싱 실패\n${text.slice(0, 400)}`);
  }
}

async function fetchStopsSafe({ page, perPage }) {
  // 1차: serviceKey 쿼리 방식
  try {
    return await fetchJsonOrThrow(buildUrl({ page, perPage }));
  } catch (e1) {
    // 2차: Authorization 헤더 방식(일부 환경에서 이게 더 안정적)
    try {
      const url = new URL(OD_BASE + OD_PATH);
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));
      url.searchParams.set("returnType", RETURN_TYPE);
      return await fetchJsonOrThrow(url.toString(), {
        headers: { Authorization: `Infuser ${OD_SERVICE_KEY}` }
      });
    } catch (e2) {
      throw new Error(
        `데이터 호출 실패\n\n[1차]\n${e1.message}\n\n[2차]\n${e2.message}\n\n` +
        `※ 콘솔에 CORS 관련 에러가 보이면 프론트 단독 호출이 막힌 케이스입니다.`
      );
    }
  }
}

/* ---------------- Kakao Geocoder ---------------- */
function initKakaoServices() {
  geocoder = new kakao.maps.services.Geocoder();
}

function geocodeAddress(address) {
  const key = String(address || "").trim();
  if (!key) return Promise.resolve(null);
  if (geoCache.has(key)) return Promise.resolve(geoCache.get(key));

  return new Promise((resolve) => {
    geocoder.addressSearch(key, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result?.[0]) {
        const v = { lat: Number(result[0].y), lng: Number(result[0].x) };
        geoCache.set(key, v);
        resolve(v);
      } else {
        geoCache.set(key, null);
        resolve(null);
      }
    });
  });
}

/* ---------------- Marker (custom) ---------------- */
function flameSvgDataUrl() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFB15A"/>
        <stop offset="0.55" stop-color="#FF8A2A"/>
        <stop offset="1" stop-color="#FF6A00"/>
      </linearGradient>
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#FF6A00" flood-opacity="0.35"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <path d="M32 4c3 10-2 14-2 20 0 4 3 7 7 7 6 0 9-6 8-12 7 6 11 14 11 22 0 14-11 23-24 23S8 55 8 41c0-10 6-18 14-24-1 7 2 10 6 10 5 0 8-4 8-9 0-5-2-9-4-14z"
        fill="url(#g)"/>
      <path d="M28 36c0 6 5 10 10 10 6 0 10-5 10-11 3 4 4 7 4 11 0 10-8 18-18 18S16 56 16 46c0-6 3-10 6-13 0 3 2 6 6 6s6-2 6-3z"
        fill="rgba(255,255,255,0.35)"/>
    </g>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

function loadableImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src + `?v=${Date.now()}`; // 캐시 회피
  });
}

async function resolveMarkerStyle() {
  // marker.png -> mascot.png -> svg
  if (await loadableImage(MARKER_ASSET)) {
    markerStyle = { type: "img", src: MARKER_ASSET };
    return;
  }
  if (await loadableImage(MASCOT_ASSET)) {
    markerStyle = { type: "img", src: MASCOT_ASSET };
    return;
  }
  markerStyle = { type: "svg", src: flameSvgDataUrl() };
}

function makeMarkerImage() {
  // 상세 지도에서 1개만 쓰므로 크기 고정
  const size = 52;
  const offsetY = 46;

  const src = markerStyle.type === "img"
    ? markerStyle.src
    : (markerStyle.src || flameSvgDataUrl());

  return new kakao.maps.MarkerImage(
    src,
    new kakao.maps.Size(size, size),
    { offset: new kakao.maps.Point(size / 2, offsetY) }
  );
}

/* ---------------- Detail Map ---------------- */
function ensureDetailMap(lat, lng) {
  const center = new kakao.maps.LatLng(lat, lng);

  // 지도 컨테이너가 hidden 상태였다가 보여지면 relayout이 필요할 수 있음
  if (!detailMap) {
    detailMap = new kakao.maps.Map($detailMapEl, { center, level: 4 });
  } else {
    detailMap.setCenter(center);
  }

  if (detailMarker) detailMarker.setMap(null);

  detailMarker = new kakao.maps.Marker({
    position: center,
    image: makeMarkerImage(),
    zIndex: 10
  });
  detailMarker.setMap(detailMap);

  // 표시 안정화
  requestAnimationFrame(() => detailMap.relayout());
}

function renderList(items) {
  $list.innerHTML = "";

  const qOn = hasQuery(); // query.trim().length > 0

  // ✅ 검색어가 있으면 empty(마스코트 섹션)는 무조건 숨김
  if (qOn) $empty.hidden = true;

  // 목록이 비어있는 경우
  if (!items || items.length === 0) {
    if (!qOn) {
      // ✅ 검색어가 없을 때만 empty 표시
      $empty.hidden = false;
    } else {
      // ✅ 검색어가 있을 때는 "검색 결과 없음"만 표시
      $list.innerHTML =
        `<div style="padding:14px;color:#6b7280;">
          검색 결과가 없습니다. 다른 키워드로 다시 검색해보세요.
        </div>`;
    }
    return;
  }

  // 목록이 있는 경우
  $empty.hidden = true;

  const frag = document.createDocumentFragment();

  items.forEach((it, idx) => {
    const stopName = it["정류소명"] ?? "-";
    const platformId = it["승강장(ID)"] ?? "-";
    const addr = it["설치장소 지번주소"] ?? "-";
    const chairs = it["의자개수"] ?? "-";
    const agency = it["관리기관"] ?? "-";

    const el = document.createElement("button");
    el.type = "button";
    el.className = "item" + (idx === activeIndex ? " active" : "");
    el.setAttribute("role", "listitem");

    el.innerHTML = `
      <div class="pin">${String(idx + 1).padStart(2,"0")}</div>
      <div class="item-body">
        <div class="name">${escapeHtml(stopName)}</div>
        <div class="addr">${escapeHtml(addr)}</div>
        <div class="badges">
          <span class="badge">승강장 ID: ${escapeHtml(platformId)}</span>
          <span class="badge">의자: ${escapeHtml(chairs)}개</span>
          <span class="badge">${escapeHtml(agency)}</span>
        </div>
      </div>
    `;
    el.addEventListener("click", () => onSelect(idx));
    frag.appendChild(el);
  });

  $list.appendChild(frag);
}


function renderPages(total) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  $pages.innerHTML = "";

  const windowSize = 7;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pagebtn" + (p === page ? " active" : "");
    b.textContent = String(p);
    b.addEventListener("click", () => {
      if (p === page) return;
      page = p;
      if (mode === "search") applySearchPage();
      else loadPage();
    });
    $pages.appendChild(b);
  }

  $prev.disabled = page <= 1;
  $next.disabled = page >= totalPages;
}

/* ---------------- Page Mode ---------------- */
async function loadPage() {
  try {
    mode = "page";
    searchResultFull = null;

    setStatus("데이터 불러오는 중…");
    activeIndex = -1;

    const json = await fetchStopsSafe({ page, perPage });
    totalCount = Number(json.totalCount ?? 0);
    pageData = Array.isArray(json.data) ? json.data : [];

    rawData = hasQuery() ? filterByQuery(pageData, query) : pageData;

    $count.textContent = `총 ${totalCount.toLocaleString()}건 · 페이지 ${page} · ${perPage}개`;
    renderPages(totalCount);
    renderList(rawData);
    setStatus("완료");

  } catch (e) {
    console.error(e);
    setStatus(e.message);
    $empty.hidden = true;
    $list.innerHTML = `<div style="padding:14px;color:#ef4444;white-space:pre-wrap;">${escapeHtml(e.message)}</div>`;
  }
}

/* ---------------- Search Mode (All data) ---------------- */
function filterByQuery(data, q) {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return data;

  return data.filter(it => {
    const name = String(it["정류소명"] ?? "").toLowerCase();
    const addr = String(it["설치장소 지번주소"] ?? "").toLowerCase();
    const id = String(it["승강장(ID)"] ?? "").toLowerCase();
    return name.includes(s) || addr.includes(s) || id.includes(s);
  });
}

async function loadAllDataForSearch() {
  if (allData && Array.isArray(allData) && allData.length) return allData;

  setStatus("전체 데이터 불러오는 중…(검색 준비)");
  let merged = [];
  let p = 1;

  while (merged.length < MAX_ALL) {
    const json = await fetchStopsSafe({ page: p, perPage: BULK_SIZE });
    const chunk = Array.isArray(json.data) ? json.data : [];
    const tc = Number(json.totalCount ?? 0);

    totalCount = tc;
    merged = merged.concat(chunk);

    if (chunk.length === 0) break;
    if (merged.length >= tc) break;

    p += 1;
  }

  if (merged.length > MAX_ALL) merged = merged.slice(0, MAX_ALL);
  allData = merged;

  return allData;
}

async function runSearch() {
  query = $q.value.trim();

  // 검색어 비었으면 페이지 모드로 복귀
  if (!hasQuery()) {
    showPanel();
    page = 1;
    return loadPage();
  }

  try {
    mode = "search";
    showPanel();

    const data = await loadAllDataForSearch();
    searchResultFull = filterByQuery(data, query);

    page = 1;
    applySearchPage();

  } catch (e) {
    console.error(e);
    setStatus(e.message);
  }
}

function applySearchPage() {
  const full = searchResultFull || [];
  const total = full.length;

  const start = (page - 1) * perPage;
  rawData = full.slice(start, start + perPage);

  activeIndex = -1;

  $count.textContent = `검색 결과 ${total.toLocaleString()}건 (키워드: "${query}")`;
  renderPages(total);
  renderList(rawData);
  setStatus("완료");
}

/* ---------------- Select -> Detail (detail + map below) ---------------- */
async function onSelect(idx) {
  activeIndex = idx;
  renderList(rawData);

  const it = rawData[idx];
  if (!it) return;

  const stopName = it["정류소명"] ?? "-";
  const platformId = it["승강장(ID)"] ?? "-";
  const addr = it["설치장소 지번주소"] ?? "";
  const chairs = it["의자개수"] ?? "-";
  const agency = it["관리기관"] ?? "-";
  const baseDate = it["데이터기준일자"] ?? "-";

  $detailBody.innerHTML = `
    <div class="kv">
      <div class="k">정류소명</div><div class="v">${escapeHtml(stopName)}</div>
      <div class="k">승강장(ID)</div><div class="v">${escapeHtml(platformId)}</div>
      <div class="k">주소</div><div class="v">${escapeHtml(addr || "-")}</div>
      <div class="k">의자개수</div><div class="v">${escapeHtml(chairs)}개</div>
      <div class="k">관리기관</div><div class="v">${escapeHtml(agency)}</div>
      <div class="k">기준일</div><div class="v">${escapeHtml(baseDate)}</div>
    </div>
  `;

  showDetail();
  setStatus("주소 좌표 변환 중…");

  const geo = await geocodeAddress(addr);
  if (!geo) {
    setStatus("좌표 변환 실패(주소 확인 필요).");
    $detailMapEl.innerHTML = `<div style="padding:12px;color:#ef4444;">좌표 변환 실패</div>`;
    return;
  }

  // 지도 생성/갱신 + 커스텀 마커
  ensureDetailMap(geo.lat, geo.lng);
  setStatus("상세 위치 지도를 표시했습니다.");
}

/* ---------------- Events ---------------- */
$btnSearch.addEventListener("click", runSearch);
$q.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });

$btnClear.addEventListener("click", () => {
  $q.value = "";
  query = "";
  page = 1;
  showPanel();
  loadPage();
});

$btnReload.addEventListener("click", () => {
  // 새로고침 시 전체검색 캐시는 유지해도 되지만, 데이터 최신성 원하면 초기화
  // allData = null;
  page = 1;
  showPanel();
  if (mode === "search" && hasQuery()) runSearch();
  else loadPage();
});

$perPage.addEventListener("change", () => {
  perPage = Number($perPage.value);
  page = 1;
  if (mode === "search" && hasQuery()) applySearchPage();
  else loadPage();
});

$prev.addEventListener("click", () => {
  if (page <= 1) return;
  page -= 1;
  if (mode === "search" && hasQuery()) applySearchPage();
  else loadPage();
});

$next.addEventListener("click", () => {
  const total = (mode === "search" && searchResultFull) ? searchResultFull.length : totalCount;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (page >= totalPages) return;
  page += 1;
  if (mode === "search" && hasQuery()) applySearchPage();
  else loadPage();
});

$btnBack.addEventListener("click", () => {
  showPanel();
});

/* ---------------- Start ---------------- */
window.addEventListener("load", async () => {
  if (!KAKAO_READY_CHECK()) {
    setStatus("카카오맵 로드 실패: 카카오 JS 키/도메인 설정을 확인하세요.");
    return;
  }

  initKakaoServices();
  await resolveMarkerStyle();
  loadPage();
});
