/**
 * 따숨 | 김포시 온열의자 정류소 지도 (모바일 전용 + 커스텀 마커)
 */

/** 1) 서비스키 */
const OD_SERVICE_KEY = "45ba9fe435f41f46e91024695eb4fbdaaef824f3561da33fb4105a7ecb3eea21";

/** 2) API */
const OD_BASE = "https://api.odcloud.kr/api";
const OD_PATH = "/15128385/v1/uddi:3e5c388c-be0a-4d84-9556-b0f09d993203";
const RETURN_TYPE = "JSON";

/** 3) DOM */
const $q = document.querySelector("#q");
const $btnSearch = document.querySelector("#btnSearch");
const $btnClear = document.querySelector("#btnClear");
const $btnReload = document.querySelector("#btnReload");
const $list = document.querySelector("#list");
const $count = document.querySelector("#count");
const $status = document.querySelector("#status");
const $perPage = document.querySelector("#perPage");

const $prev = document.querySelector("#prev");
const $next = document.querySelector("#next");
const $pages = document.querySelector("#pages");

const $detail = document.querySelector("#detail");
const $detailBody = document.querySelector("#detailBody");
const $btnCloseDetail = document.querySelector("#btnCloseDetail");
const $empty = document.querySelector("#empty");

/** 4) State */
let rawData = [];
let totalCount = 0;
let page = 1;
let perPage = Number($perPage.value);
let query = "";

let map, geocoder;
let markers = [];
let activeIndex = -1;
const geoCache = new Map();

/** 5) Map Init */
function initMap() {
  map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(37.6151, 126.7157),
    level: 7
  });
  geocoder = new kakao.maps.services.Geocoder();
}

/** 6) API */
async function fetchStops({ page, perPage }) {
  const url = new URL(OD_BASE + OD_PATH);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("returnType", RETURN_TYPE);
  url.searchParams.set("serviceKey", OD_SERVICE_KEY);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status} ${res.statusText}`);
  return res.json();
}

/** Utils */
function setStatus(msg) { $status.textContent = msg || ""; }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** ====== 커스텀 마커 세트 ====== */
const MARKER_ASSET = "./assets/marker.png";  // 있으면 사용
const MASCOT_ASSET = "./assets/mascot.png";  // 대체용

function flameSvgDataUrl() {
  // 불꽃/온열 느낌 SVG (오렌지 그라디언트)
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
      <circle cx="43" cy="18" r="2.2" fill="#fff" opacity=".6"/>
      <circle cx="39" cy="13" r="1.4" fill="#fff" opacity=".5"/>
    </g>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

async function imageExists(src) {
  try {
    const res = await fetch(src, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

let markerStyle = { type: "svg", src: flameSvgDataUrl(), size: 46, offsetY: 44 };
async function resolveMarkerStyle() {
  // marker.png 있으면 그걸, 아니면 mascot.png, 둘다 없으면 svg
  if (await imageExists(MARKER_ASSET)) {
    markerStyle = { type: "img", src: MARKER_ASSET, size: 52, offsetY: 50 };
    return;
  }
  if (await imageExists(MASCOT_ASSET)) {
    markerStyle = { type: "img", src: MASCOT_ASSET, size: 54, offsetY: 52, round: true };
    return;
  }
  markerStyle = { type: "svg", src: flameSvgDataUrl(), size: 46, offsetY: 44 };
}

function makeMarkerImage(isActive = false) {
  const scale = isActive ? 1.12 : 1.0;
  const size = Math.round(markerStyle.size * scale);

  // 이미지 마커
  if (markerStyle.type === "img") {
    const img = markerStyle.src;
    // 마스코트는 둥근 테두리 “스티커 느낌”을 위해 SVG 래핑
    if (markerStyle.round) {
      const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <filter id="ds" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#FF6A00" flood-opacity="0.35"/>
          </filter>
          <clipPath id="c">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" />
          </clipPath>
        </defs>
        <g filter="url(#ds)">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white"/>
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="rgba(255,106,0,0.18)"/>
          <image href="${img}" x="6" y="6" width="${size-12}" height="${size-12}" clip-path="url(#c)" preserveAspectRatio="xMidYMid meet"/>
        </g>
      </svg>`;
      const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
      const markerImage = new kakao.maps.MarkerImage(
        dataUrl,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size/2, markerStyle.offsetY) }
      );
      return markerImage;
    }

    const markerImage = new kakao.maps.MarkerImage(
      img,
      new kakao.maps.Size(size, size),
      { offset: new kakao.maps.Point(size/2, markerStyle.offsetY) }
    );
    return markerImage;
  }

  // SVG 불꽃 마커
  const markerImage = new kakao.maps.MarkerImage(
    markerStyle.src,
    new kakao.maps.Size(size, size),
    { offset: new kakao.maps.Point(size/2, markerStyle.offsetY) }
  );
  return markerImage;
}

/** ====== 지도/마커 ====== */
function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}

function addMarker(lat, lng, title, index) {
  const pos = new kakao.maps.LatLng(lat, lng);
  const marker = new kakao.maps.Marker({
    position: pos,
    title,
    image: makeMarkerImage(false),
    zIndex: 1
  });
  marker.setMap(map);

  kakao.maps.event.addListener(marker, "click", () => onSelect(index, { fromMarker: true }));

  markers.push(marker);
  return marker;
}

function setActiveMarker(idx) {
  markers.forEach((m, i) => {
    const active = i === idx;
    m.setImage(makeMarkerImage(active));
    m.setZIndex(active ? 10 : 1);
  });
}

function panTo(lat, lng) {
  map.panTo(new kakao.maps.LatLng(lat, lng));
}

/** 지오코딩 */
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

/** 리스트/페이지 */
function renderList(items) {
  $list.innerHTML = "";

  if (!items.length) {
    $empty.hidden = false;
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

function renderPages() {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
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
      load();
    });
    $pages.appendChild(b);
  }

  $prev.disabled = page <= 1;
  $next.disabled = page >= totalPages;
}

/** 상세 */
function openDetail(html) {
  $detailBody.innerHTML = html;
  $detail.style.display = "block";
}
function closeDetail() {
  $detail.style.display = "none";
}

/** 선택 */
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

  openDetail(`
    <div class="kv">
      <div class="k">정류소명</div><div class="v">${escapeHtml(stopName)}</div>
      <div class="k">승강장(ID)</div><div class="v">${escapeHtml(platformId)}</div>
      <div class="k">주소</div><div class="v">${escapeHtml(addr || "-")}</div>
      <div class="k">의자개수</div><div class="v">${escapeHtml(chairs)}개</div>
      <div class="k">관리기관</div><div class="v">${escapeHtml(agency)}</div>
      <div class="k">기준일</div><div class="v">${escapeHtml(baseDate)}</div>
    </div>
    <div style="margin-top:10px; font-size:12px; color:#6b7280; line-height:1.4;">
      ※ 지도 표시는 주소를 지오코딩하여 표시합니다.
    </div>
  `);

  setStatus("주소 좌표 변환 중…");
  const geo = await geocodeAddress(addr);

  if (!geo) {
    setStatus("좌표 변환 실패(주소 확인 필요).");
    setActiveMarker(-1);
    return;
  }

  panTo(geo.lat, geo.lng);
  map.setLevel(4);
  setActiveMarker(idx);
  setStatus("지도에서 위치를 표시했습니다.");
}

/** 검색 */
function applySearch(data, q) {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return data;

  return data.filter(it => {
    const stopName = String(it["정류소명"] ?? "").toLowerCase();
    const addr = String(it["설치장소 지번주소"] ?? "").toLowerCase();
    return stopName.includes(s) || addr.includes(s);
  });
}

/** 로드 */
async function load() {
  try {
    setStatus("데이터 불러오는 중…");
    activeIndex = -1;
    closeDetail();

    const json = await fetchStops({ page, perPage });
    totalCount = Number(json.totalCount ?? 0);

    const pageData = Array.isArray(json.data) ? json.data : [];
    rawData = applySearch(pageData, query);

    $count.textContent = `총 ${totalCount.toLocaleString()}건 · 페이지 ${page} · ${perPage}개`;

    renderPages();
    renderList(rawData);

    clearMarkers();

    if (!rawData.length) {
      setStatus("표시할 데이터가 없습니다.");
      return;
    }

    setStatus("지도 마커 표시 중…");

    let firstPos = null;
    for (let i = 0; i < rawData.length; i++) {
      const it = rawData[i];
      const addr = it["설치장소 지번주소"] ?? "";
      const stopName = it["정류소명"] ?? "";

      const geo = await geocodeAddress(addr);
      if (!geo) continue;

      addMarker(geo.lat, geo.lng, stopName, i);
      if (!firstPos) firstPos = geo;
    }

    if (firstPos) {
      map.setCenter(new kakao.maps.LatLng(firstPos.lat, firstPos.lng));
      map.setLevel(6);
      setStatus("완료");
    } else {
      setStatus("모든 항목의 좌표 변환에 실패했습니다. (주소 데이터 확인 필요)");
    }

  } catch (e) {
    console.error(e);
    setStatus(`오류: ${e.message}`);
    $list.innerHTML = `<div style="padding:14px;color:#ef4444;">데이터를 불러오지 못했습니다.<br/>${escapeHtml(e.message)}</div>`;
  }
}

/** 이벤트 */
$btnSearch.addEventListener("click", () => { query = $q.value; page = 1; load(); });
$q.addEventListener("keydown", (e) => { if (e.key === "Enter") { query = $q.value; page = 1; load(); }});
$btnClear.addEventListener("click", () => { $q.value = ""; query = ""; page = 1; load(); });
$btnReload.addEventListener("click", () => load());
$perPage.addEventListener("change", () => { perPage = Number($perPage.value); page = 1; load(); });

$prev.addEventListener("click", () => { if (page <= 1) return; page -= 1; load(); });
$next.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (page >= totalPages) return;
  page += 1;
  load();
});

$btnCloseDetail.addEventListener("click", closeDetail);

/** 시작 */
window.addEventListener("load", async () => {
  if (typeof kakao === "undefined") {
    setStatus("카카오맵 로드 실패: 카카오 JS 키/도메인 설정을 확인하세요.");
    return;
  }
  initMap();

  // ✅ 마커 스타일 결정 (marker.png > mascot.png > svg)
  await resolveMarkerStyle();

  load();
});
