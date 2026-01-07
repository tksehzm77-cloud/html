/**
 * 따숨 | 데이터 호출 안정화 + 전체검색 + 커스텀 마커
 */

/** ✅ 서비스키 */
const OD_SERVICE_KEY = "45ba9fe435f41f46e91024695eb4fbdaaef824f3561da33fb4105a7ecb3eea21";

/** ✅ API */
const OD_BASE = "https://api.odcloud.kr/api";
const OD_PATH = "/15128385/v1/uddi:3e5c388c-be0a-4d84-9556-b0f09d993203";
const RETURN_TYPE = "JSON";

/** ✅ 전체검색 최대 로드(너무 커지는 걸 방지) */
const MAX_ALL = 5000;   // 필요하면 늘려도 됨
const BULK_SIZE = 1000; // 서버가 허용하는 선에서 크게(보통 1000까지는 무난)

/** DOM */
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

/** State */
let rawData = [];       // 현재 화면에 보여줄 데이터(페이지/검색 결과)
let pageData = [];      // 현재 API 페이지 원본
let allData = null;     // 전체검색용 캐시(한 번 받아오면 재사용)
let totalCount = 0;

let page = 1;
let perPage = Number($perPage.value);
let query = "";

let map, geocoder;
let markers = [];
let activeIndex = -1;

const geoCache = new Map();

/** ===== Kakao map init ===== */
function initMap() {
  map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(37.6151, 126.7157),
    level: 7
  });
  geocoder = new kakao.maps.services.Geocoder();
}

/** ===== Utils ===== */
function setStatus(msg) { $status.textContent = msg || ""; }
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** ===== 데이터 호출: 2가지 방식으로 안정화 ===== */
function buildUrl({ page, perPage }) {
  const url = new URL(OD_BASE + OD_PATH);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("returnType", RETURN_TYPE);
  // URLSearchParams가 자동 인코딩해주지만, 혹시 모를 문제 대비
  url.searchParams.set("serviceKey", OD_SERVICE_KEY);
  return url;
}

async function fetchJsonOrThrow(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text(); // 에러 메시지 확인을 위해 text로 먼저
  if (!res.ok) {
    const msg = `HTTP ${res.status} ${res.statusText}\n${text.slice(0, 500)}`;
    throw new Error(msg);
  }
  // JSON 파싱 시도
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON 파싱 실패\n${text.slice(0, 500)}`);
  }
}

/**
 * 1차: query serviceKey 방식
 * 2차: Authorization 헤더 방식으로 재시도
 */
async function fetchStopsSafe({ page, perPage }) {
  const url = buildUrl({ page, perPage }).toString();

  try {
    return await fetchJsonOrThrow(url);
  } catch (e1) {
    // 2차: Authorization 헤더 방식(일부 환경에서 이게 더 잘 됨)
    try {
      const url2 = new URL(OD_BASE + OD_PATH);
      url2.searchParams.set("page", String(page));
      url2.searchParams.set("perPage", String(perPage));
      url2.searchParams.set("returnType", RETURN_TYPE);
      // serviceKey를 빼고 헤더로
      return await fetchJsonOrThrow(url2.toString(), {
        headers: { Authorization: `Infuser ${OD_SERVICE_KEY}` }
      });
    } catch (e2) {
      // 가장 흔한 원인: CORS / 키 문제 / 도메인 문제
      throw new Error(
        `데이터 호출 실패\n\n[1차 오류]\n${e1.message}\n\n[2차 오류]\n${e2.message}\n\n` +
        `※ 브라우저에서 CORS로 막히는 경우, 프론트 단독 호출이 불가할 수 있어요.\n` +
        `   (이 경우 아래 '로컬 프록시' 옵션을 적용하면 100% 해결됩니다.)`
      );
    }
  }
}

/** ===== 전체 데이터 로드(검색용) ===== */
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

    // 더 받을 데이터가 없으면 종료
    if (chunk.length === 0) break;
    if (merged.length >= tc) break;

    p += 1;
  }

  // MAX_ALL 컷
  if (merged.length > MAX_ALL) merged = merged.slice(0, MAX_ALL);

  allData = merged;
  return allData;
}

/** ===== 검색(전체 데이터 기준) ===== */
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

/** ===== 리스트/페이지 ===== */
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
    b.addEventListener("click", () => { page = p; loadPage(); });
    $pages.appendChild(b);
  }

  $prev.disabled = page <= 1;
  $next.disabled = page >= totalPages;
}

/** ===== 지오코딩 ===== */
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

/** ===== 커스텀 마커(불꽃 SVG 기본) ===== */
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

function markerImage(active=false) {
  const size = active ? 54 : 46;
  const offsetY = active ? 48 : 42;
  return new kakao.maps.MarkerImage(
    flameSvgDataUrl(),
    new kakao.maps.Size(size, size),
    { offset: new kakao.maps.Point(size/2, offsetY) }
  );
}

function clearMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }
function setActiveMarker(idx) {
  markers.forEach((m,i)=> m.setImage(markerImage(i===idx)));
  markers.forEach((m,i)=> m.setZIndex(i===idx ? 10 : 1));
}
function addMarker(lat,lng,title,index){
  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat,lng),
    title,
    image: markerImage(false),
    zIndex: 1
  });
  marker.setMap(map);
  kakao.maps.event.addListener(marker, "click", ()=> onSelect(index));
  markers.push(marker);
}

function panTo(lat,lng){ map.panTo(new kakao.maps.LatLng(lat,lng)); }

/** ===== 상세 ===== */
function openDetail(html){ $detailBody.innerHTML = html; $detail.style.display="block"; }
function closeDetail(){ $detail.style.display="none"; }

/** ===== 선택 ===== */
async function onSelect(idx){
  activeIndex = idx;
  renderList(rawData);

  const it = rawData[idx];
  if(!it) return;

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
  `);

  setStatus("주소 좌표 변환 중…");
  const geo = await geocodeAddress(addr);
  if(!geo){ setStatus("좌표 변환 실패(주소 확인 필요)."); setActiveMarker(-1); return; }

  panTo(geo.lat, geo.lng);
  map.setLevel(4);
  setActiveMarker(idx);
  setStatus("지도에서 위치를 표시했습니다.");
}

/** ===== 기본 로드(페이지 단위 목록) ===== */
async function loadPage(){
  try{
    setStatus("데이터 불러오는 중…");
    activeIndex = -1;
    closeDetail();

    const json = await fetchStopsSafe({ page, perPage });
    totalCount = Number(json.totalCount ?? 0);
    pageData = Array.isArray(json.data) ? json.data : [];

    // 페이지 목록에서는 query가 있으면 "현재 페이지 필터"만 적용(기본)
    rawData = query ? filterByQuery(pageData, query) : pageData;

    $count.textContent = `총 ${totalCount.toLocaleString()}건 · 페이지 ${page} · ${perPage}개`;
    renderPages();
    renderList(rawData);

    // 지도 마커
    clearMarkers();
    if(!rawData.length){ setStatus("표시할 데이터가 없습니다."); return; }

    setStatus("지도 마커 표시 중…");
    let first = null;

    for(let i=0;i<rawData.length;i++){
      const it = rawData[i];
      const addr = it["설치장소 지번주소"] ?? "";
      const name = it["정류소명"] ?? "";
      const geo = await geocodeAddress(addr);
      if(!geo) continue;
      addMarker(geo.lat, geo.lng, name, i);
      if(!first) first = geo;
    }

    if(first){
      map.setCenter(new kakao.maps.LatLng(first.lat, first.lng));
      map.setLevel(6);
      setStatus("완료");
    }else{
      setStatus("좌표 변환 실패가 많습니다. 주소 데이터 확인 필요");
    }
  }catch(e){
    console.error(e);
    setStatus(e.message);
    $list.innerHTML = `<div style="padding:14px;color:#ef4444;white-space:pre-wrap;">${escapeHtml(e.message)}</div>`;
  }
}

/** ===== 검색 버튼: 전체 데이터 기준 검색으로 개편 ===== */
async function runSearch(){
  query = $q.value.trim();
  if(!query){
    // 검색어 없으면 일반 페이지 로드
    allData = null; // 원하면 캐시 유지로 바꿔도 됨
    page = 1;
    return loadPage();
  }

  try{
    const data = await loadAllDataForSearch();
    const result = filterByQuery(data, query);

    // 검색 결과는 “검색모드”로 표시(페이지네이션은 끄지 않고 간단히 첫 페이지 50개만 보여도 되지만,
    // 여기서는 perPage 기준으로 잘라서 페이지네이션까지 적용)
    totalCount = result.length;
    page = 1;

    // 검색 결과를 페이지네이션 하려면 슬라이스:
    rawData = result.slice(0, perPage);

    // 검색 결과용 페이지 버튼 재구성
    $count.textContent = `검색 결과 ${totalCount.toLocaleString()}건 (키워드: "${query}")`;
    renderSearchPages(result);
    renderList(rawData);

    // 지도 마커는 현재 페이지(슬라이스) 기준으로만 표시
    clearMarkers();
    setStatus("검색 결과 마커 표시 중…");
    let first = null;

    for(let i=0;i<rawData.length;i++){
      const it = rawData[i];
      const addr = it["설치장소 지번주소"] ?? "";
      const name = it["정류소명"] ?? "";
      const geo = await geocodeAddress(addr);
      if(!geo) continue;
      addMarker(geo.lat, geo.lng, name, i);
      if(!first) first = geo;
    }

    if(first){
      map.setCenter(new kakao.maps.LatLng(first.lat, first.lng));
      map.setLevel(6);
      setStatus("완료");
    }else{
      setStatus("검색 결과의 좌표 변환에 실패했습니다(주소 확인 필요).");
    }

    // 검색모드에서 다음/이전 버튼 동작 연결
    hookSearchPager(result);

  }catch(e){
    console.error(e);
    setStatus(e.message);
  }
}

/** 검색 결과 페이지네이션 */
let searchPager = null;

function renderSearchPages(full) {
  const totalPages = Math.max(1, Math.ceil(full.length / perPage));
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
      page = p;
      applySearchPage(full);
    });
    $pages.appendChild(b);
  }

  $prev.disabled = page <= 1;
  $next.disabled = page >= totalPages;
}

function applySearchPage(full){
  const start = (page - 1) * perPage;
  rawData = full.slice(start, start + perPage);
  activeIndex = -1;
  closeDetail();
  renderSearchPages(full);
  renderList(rawData);
  // 지도 마커 갱신
  (async ()=>{
    clearMarkers();
    setStatus("검색 결과 마커 표시 중…");
    let first = null;
    for(let i=0;i<rawData.length;i++){
      const it = rawData[i];
      const geo = await geocodeAddress(it["설치장소 지번주소"] ?? "");
      if(!geo) continue;
      addMarker(geo.lat, geo.lng, it["정류소명"] ?? "", i);
      if(!first) first = geo;
    }
    if(first){
      map.setCenter(new kakao.maps.LatLng(first.lat, first.lng));
      map.setLevel(6);
      setStatus("완료");
    }else{
      setStatus("좌표 변환 실패(주소 확인 필요).");
    }
  })();
}

function hookSearchPager(full){
  // 기존 이벤트가 페이지모드용이라서, 검색모드에서는 버튼 클릭을 applySearchPage로 동작
  searchPager = full;
}

/** 이벤트 */
$btnSearch.addEventListener("click", runSearch);
$q.addEventListener("keydown", (e)=>{ if(e.key==="Enter") runSearch(); });
$btnClear.addEventListener("click", ()=>{ $q.value=""; query=""; allData=null; page=1; loadPage(); });
$btnReload.addEventListener("click", ()=>{ allData=null; loadPage(); });

$perPage.addEventListener("change", ()=>{
  perPage = Number($perPage.value);
  page = 1;
  if (searchPager) applySearchPage(searchPager);
  else loadPage();
});

$prev.addEventListener("click", ()=>{
  if(page<=1) return;
  page -= 1;
  if (searchPager) applySearchPage(searchPager);
  else loadPage();
});

$next.addEventListener("click", ()=>{
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if(page>=totalPages) return;
  page += 1;
  if (searchPager) applySearchPage(searchPager);
  else loadPage();
});

$btnCloseDetail.addEventListener("click", closeDetail);

/** 시작 */
window.addEventListener("load", ()=>{
  if (typeof kakao === "undefined") {
    setStatus("카카오맵 로드 실패: 카카오 JS 키/도메인 설정을 확인하세요.");
    return;
  }
  initMap();
  loadPage();
});
