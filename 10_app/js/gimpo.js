/**
 * 따숨 | 최종 완성본
 * - 마커: assets/mascot.png로 고정 (커스텀 MarkerImage)
 * - 검색 시 empty 섹션 가려짐 방지
 * - 정류장 클릭 -> 상세 -> 상세 하단 지도에 마커 표시
 */

/** ✅ 키 입력 */
const OD_SERVICE_KEY = "45ba9fe435f41f46e91024695eb4fbdaaef824f3561da33fb4105a7ecb3eea21";

/** ✅ 오픈API */
const OD_BASE = "https://api.odcloud.kr/api";
const OD_PATH = "/15128385/v1/uddi:3e5c388c-be0a-4d84-9556-b0f09d993203";
const RETURN_TYPE = "JSON";

/** ✅ 전체검색 로딩 제한 */
const MAX_ALL = 5000;
const BULK_SIZE = 1000;

/** ✅ 마커 이미지(첨부 마스코트) */
const MARKER_SRC = "./assets/mascot.png";

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

let allData = null;
let searchResultFull = null;

let geocoder;
const geoCache = new Map();

/** Detail map */
let detailMap = null;
let detailMarker = null;

/* ---------------- Utils ---------------- */
function setStatus(msg) { $status.textContent = msg || ""; }
function hasQuery() { return String(query || "").trim().length > 0; }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  try { return JSON.parse(text); }
  catch { throw new Error(`JSON 파싱 실패\n${text.slice(0, 400)}`); }
}

async function fetchStopsSafe({ page, perPage }) {
  try {
    return await fetchJsonOrThrow(buildUrl({ page, perPage }));
  } catch (e1) {
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
        `※ 콘솔에 CORS 에러가 보이면 프론트 단독 호출이 막힌 케이스입니다.`
      );
    }
  }
}

/* ---------------- Kakao Services ---------------- */
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

/* ---------------- Marker (mascot.png) ---------------- */
function makeMascotMarkerImage() {
  // ✅ 추천 값 (너 마스코트 비율 기준)
  const w = 56;
  const h = 56;

  // ✅ 아래 중앙을 좌표로 찍기(마스코트 앉은 이미지에 자연스러움)
  return new kakao.maps.MarkerImage(
    MARKER_SRC,
    new kakao.maps.Size(w, h),
    { offset: new kakao.maps.Point(w / 2, h) }
  );
}

/* ---------------- Detail Map ---------------- */
function ensureDetailMap(lat, lng) {
  const center = new kakao.maps.LatLng(lat, lng);

  if (!detailMap) {
    detailMap = new kakao.maps.Map($detailMapEl, { center, level: 4 });
  } else {
    detailMap.setCenter(center);
  }

  if (detailMarker) detailMarker.setMap(null);

  detailMarker = new kakao.maps.Marker({
    position: center,
    image: makeMascotMarkerImage(),
    zIndex: 10
  });
  detailMarker.setMap(detailMap);

  requestAnimationFrame(() => detailMap.relayout());
}

/* ---------------- Render ---------------- */
function renderList(items) {
  $list.innerHTML = "";

  // ✅ 검색어가 있으면 empty(마스코트 섹션)는 무조건 숨김
  if (hasQuery()) $empty.hidden = true;

  if (!items || items.length === 0) {
    if (!hasQuery()) {
      $empty.hidden = false; // 검색 안 했을 때만 empty
    } else {
      $empty.hidden = true;
      $list.innerHTML =
        `<div style="padding:14px;color:#6b7280;">
          검색 결과가 없습니다. 다른 키워드로 다시 검색해보세요.
        </div>`;
    }
    return;
  }

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

/* ---------------- Search Mode ---------------- */
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
  // ✅ 검색 시작 시 empty 무조건 숨김(가려짐 방지)
  $empty.hidden = true;

  query = $q.value.trim();

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

/* ---------------- Select -> Detail ---------------- */
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
window.addEventListener("load", () => {
  if (typeof kakao === "undefined") {
    setStatus("카카오맵 로드 실패: 카카오 JS 키/도메인 설정을 확인하세요.");
    return;
  }
  initKakaoServices();
  loadPage();
});
