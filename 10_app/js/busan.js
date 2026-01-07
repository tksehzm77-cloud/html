/**
 * 부산광역시_부산맛집정보 서비스
 * - 문서 기준 요청주소: http://apis.data.go.kr/6260000/FoodService/getFoodKr
 * - resultType=json, pageNo, numOfRows, (옵션) UC_SEQ
 * 출처: 공공데이터포털 ‘부산광역시_부산맛집정보 서비스’ 문서에 명시된 요청주소/파라미터. 
 */

const API_ENDPOINT = "https://apis.data.go.kr/6260000/FoodService/getFoodKr";
const SERVICE_KEY = "45ba9fe435f41f46e91024695eb4fbdaaef824f3561da33fb4105a7ecb3eea21"; // 본인 키로 교체 (일반적으로 이미 URL 인코딩된 키 사용)

// 비짓부산 이미지가 상대경로로 내려오는 경우가 많아 보정
const VISITBUSAN_BASE = "https://www.visitbusan.net";

// DOM
const $ = (s) => document.querySelector(s);

const pageList = $("#pageList");
const pageDetail = $("#pageDetail");

const qEl = $("#q");
const btnRefresh = $("#btnRefresh");
const statusEl = $("#status");

const listEl = $("#list");
const loadingEl = $("#loading");
const emptyEl = $("#empty");
const errorEl = $("#error");
const btnRetry = $("#btnRetry");

const btnBack = $("#btnBack");
const btnFav = $("#btnFav");

const heroImg = $("#heroImg");
const dName = $("#dName");
const dAddr = $("#dAddr");
const dIntro = $("#dIntro");
const dMenu = $("#dMenu");
const dTel = $("#dTel");
const dTime = $("#dTime");

const homeBar = $("#homeBar");
const btnCall = $("#btnCall");
const btnCopy = $("#btnCopy");
const btnRoad = $("#btnRoad");

// state
let allItems = [];
let filtered = [];
let current = null;

const FAV_KEY = "busan_food_favs_v2";

// kakao map
let map = null;
let marker = null;
let geocoder = null;

// --------- utils
function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getFavs(){
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
  catch { return []; }
}
function isFav(id){ return getFavs().includes(id); }
function toggleFav(id){
  const favs = getFavs();
  const i = favs.indexOf(id);
  if(i >= 0) favs.splice(i, 1);
  else favs.push(id);
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

// API 스키마(공식 문서 기준) 매핑
function normalize(raw){
  const id = raw?.UC_SEQ ? String(raw.UC_SEQ) : `${raw?.MAIN_TITLE || ""}__${raw?.ADDR1 || ""}`;

  const name = (raw?.MAIN_TITLE || "").trim();
  const addr = (raw?.ADDR1 || "").trim();
  const intro = (raw?.ITEMCNTNTS || "").trim();
  const menu = (raw?.RPRSNTV_MENU || raw?.MAIN_MENU || "").trim();
  const tel  = (raw?.CNTCT_TEL || "").trim();
  const time = (raw?.USAGE_DAY_WEEK_AND_TIME || "").trim();
  const home = (raw?.HOMEPAGE_URL || "").trim();

  const lat = raw?.LAT ? parseFloat(raw.LAT) : null;
  const lng = raw?.LNG ? parseFloat(raw.LNG) : null;

  const img = fixImageUrl(raw?.MAIN_IMG_NORMAL);
  const thumb = fixImageUrl(raw?.MAIN_IMG_THUMB);

  return { id, name, addr, intro, menu, tel, time, home, lat, lng, img, thumb, _raw: raw };
}

function fixImageUrl(url){
  if(!url) return "";
  const u = String(url).trim();
  if(!u) return "";
  if(u.startsWith("http://") || u.startsWith("https://")) return u;
  // "/uploadImgs/..." 형태면 비짓부산 도메인 prefix
  if(u.startsWith("/")) return VISITBUSAN_BASE + u;
  return u;
}

// 공공데이터 응답 파싱(환경별로 wrapper가 달라서 방어적으로)
function extractItems(data){
  // 흔한 형태:
  // data.getFoodKr.item
  // data.getFoodKr
  // data.response.body.items.item
  const cands = [
    data?.getFoodKr?.item,
    data?.getFoodKr,
    data?.response?.body?.items?.item,
    data?.response?.body?.items,
    data?.response?.body,
    data?.items,
    data?.item
  ];
  for(const c of cands){
    if(Array.isArray(c)) return c;
    if(c && typeof c === "object" && Array.isArray(c.item)) return c.item;
  }
  return [];
}

// --------- fetch
async function loadFoods(){
  loadingEl.hidden = false;
  emptyEl.hidden = true;
  errorEl.hidden = true;
  listEl.innerHTML = "";
  statusEl.textContent = "불러오는 중…";

  const url = new URL(API_ENDPOINT);
  // 문서에는 ServiceKey지만 예제들은 serviceKey도 동작. 둘 다 세팅(호환용)
  url.searchParams.set("serviceKey", SERVICE_KEY);
  url.searchParams.set("ServiceKey", SERVICE_KEY);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "200");
  url.searchParams.set("resultType", "json");

  try{
    const res = await fetch(url.toString());
    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const items = extractItems(data).map(normalize).filter(x => x.name);

    allItems = items;
    applyFilter();

    statusEl.textContent = `${filtered.length}개`;
    loadingEl.hidden = true;

  }catch(err){
    console.error(err);
    loadingEl.hidden = true;
    errorEl.hidden = false;

    // CORS면 대개 "TypeError: Failed to fetch" 형태로 떨어짐
    statusEl.textContent = "로딩 실패 (키/CORS/URL 확인)";
  }
}

// --------- list
function applyFilter(){
  const q = (qEl.value || "").trim().toLowerCase();
  filtered = allItems.filter(it => {
    if(!q) return true;
    const hay = `${it.name} ${it.addr} ${it.menu} ${it.intro}`.toLowerCase();
    return hay.includes(q);
  });

  renderList(filtered);
  emptyEl.hidden = filtered.length !== 0;
}

function renderList(items){
  listEl.innerHTML = "";

  items.forEach(it => {
    const li = document.createElement("li");
    li.className = "item";

    const left = document.createElement("div");
    left.className = "item__left";
    left.innerHTML = `
      <h3 class="item__name">${escapeHTML(it.name)}</h3>
      <p class="item__meta"><b>주소:</b> ${escapeHTML(it.addr || "-")}</p>
      <p class="item__meta"><b>메뉴:</b> ${escapeHTML(it.menu || "-")}</p>
    `;

    const right = document.createElement("div");
    right.className = "item__right";

    // 시안의 우측 "검색" 아이콘(상세보기)
    const btnDetail = document.createElement("button");
    btnDetail.className = "rowIcon";
    btnDetail.type = "button";
    btnDetail.title = "상세";
    btnDetail.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="M20 20l-3.5-3.5"></path>
      </svg>
    `;
    btnDetail.addEventListener("click", (e)=>{ e.stopPropagation(); openDetail(it); });

    // 시안의 우측 "하트" 아이콘
    const btnHeart = document.createElement("button");
    btnHeart.className = "rowIcon" + (isFav(it.id) ? " is-on" : "");
    btnHeart.type = "button";
    btnHeart.title = "즐겨찾기";
    btnHeart.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 21s-7-4.35-9.5-8.5C.6 9.2 2.2 6 5.7 6c1.9 0 3.4 1.1 4.3 2.4C10.9 7.1 12.4 6 14.3 6c3.5 0 5.1 3.2 3.2 6.5C19 16.65 12 21 12 21z"></path>
      </svg>
    `;
    btnHeart.addEventListener("click", (e)=>{
      e.stopPropagation();
      toggleFav(it.id);
      applyFilter();
    });

    right.appendChild(btnDetail);
    right.appendChild(btnHeart);

    li.appendChild(left);
    li.appendChild(right);

    li.addEventListener("click", ()=> openDetail(it));
    listEl.appendChild(li);
  });
}

// --------- detail
function openDetail(it){
  current = it;

  // 이미지: API 제공 이미지가 있으면 사용, 없으면 플레이스홀더
  heroImg.src = it.img || it.thumb || placeholderImage(it.name);

  dName.textContent = it.name || "-";
  dAddr.textContent = it.addr || "-";
  dIntro.textContent = it.intro || "-";
  dMenu.textContent = it.menu || "-";
  dTel.textContent = it.tel || "-";
  dTime.textContent = it.time || "-";

  // 홈페이지 바(시안처럼 검정바)
  if(it.home){
    homeBar.textContent = "공식 홈페이지 열기";
    homeBar.onclick = () => window.open(it.home, "_blank");
  }else{
    homeBar.textContent = "공식 홈페이지 없음";
    homeBar.onclick = null;
  }

  // 즐겨찾기 오버레이 하트
  syncFavButton();

  // 액션 버튼
  btnCall.disabled = !it.tel;
  btnCall.onclick = () => {
    if(!it.tel) return;
    location.href = `tel:${it.tel.replace(/[^0-9+]/g,"")}`;
  };

  btnCopy.onclick = async () => {
    try{
      await navigator.clipboard.writeText(it.addr || "");
      btnCopy.textContent = "복사됨";
      setTimeout(()=> btnCopy.textContent = "주소복사", 900);
    }catch{
      alert("복사 실패 (권한 확인)");
    }
  };

  btnRoad.onclick = () => {
    if(it.lat && it.lng){
      const url = `https://map.kakao.com/link/to/${encodeURIComponent(it.name)},${it.lat},${it.lng}`;
      window.open(url, "_blank");
    }else if(it.addr){
      const url = `https://map.kakao.com/link/search/${encodeURIComponent(it.addr)}`;
      window.open(url, "_blank");
    }
  };

  // 페이지 전환
  pageList.hidden = true;
  pageDetail.hidden = false;
  window.scrollTo({top:0, behavior:"instant"});

  // 지도
  initMapIfNeeded();
  locateOnMap(it);
}

function closeDetail(){
  pageDetail.hidden = true;
  pageList.hidden = false;
}

function syncFavButton(){
  const on = current && isFav(current.id);
  btnFav.textContent = on ? "♥" : "♡";
}

function placeholderImage(title){
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'>
      <rect width='1200' height='700' fill='#f2f2f2'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        font-family='Noto Sans KR, sans-serif' font-size='42' fill='#111'>대표 이미지 없음</text>
      <text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle'
        font-family='Noto Sans KR, sans-serif' font-size='22' fill='#555'>${escapeHTML(title || "")}</text>
    </svg>
  `);
}

// --------- kakao map
function initMapIfNeeded(){
  if(map) return;
  const center = new kakao.maps.LatLng(35.1796, 129.0756);
  map = new kakao.maps.Map(document.getElementById("map"), { center, level: 6 });
  marker = new kakao.maps.Marker({ position: center });
  marker.setMap(map);
  geocoder = new kakao.maps.services.Geocoder();
}

function locateOnMap(it){
  const setPos = (lat, lng) => {
    const pos = new kakao.maps.LatLng(lat, lng);
    map.setCenter(pos);
    marker.setPosition(pos);
  };

  if(it.lat && it.lng){
    setPos(it.lat, it.lng);
    return;
  }

  if(!it.addr) return;
  geocoder.addressSearch(it.addr, (result, status) => {
    if(status === kakao.maps.services.Status.OK && result?.[0]){
      const lat = parseFloat(result[0].y);
      const lng = parseFloat(result[0].x);
      it.lat = lat; it.lng = lng;
      setPos(lat, lng);
    }
  });
}

// --------- events
qEl.addEventListener("input", ()=>{
  applyFilter();
  statusEl.textContent = `${filtered.length}개`;
});
btnRefresh.addEventListener("click", loadFoods);
btnRetry.addEventListener("click", loadFoods);

btnBack.addEventListener("click", closeDetail);
btnFav.addEventListener("click", ()=>{
  if(!current) return;
  toggleFav(current.id);
  syncFavButton();
  applyFilter();
});

// init
window.addEventListener("load", loadFoods);

/**
 * ✅ CORS가 계속 막히면?
 * - 프론트만으로는 해결이 안 되는 환경이 있어요.
 * - 이 경우, 로컬에서 간단 프록시(서버)로 우회해야 합니다.
 * (원하면 내가 server.js(Express)까지 같이 만들어 줄게)
 */