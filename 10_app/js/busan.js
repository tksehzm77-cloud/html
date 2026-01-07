/**
 * 부산광역시_부산맛집정보 서비스
 * ✅ 엔드포인트:
 * https://apis.data.go.kr/6260000/FoodService/getFoodKr
 *
 * ⚠️ 주의:
 * - data.go.kr API는 환경에 따라 브라우저 CORS가 막힐 수 있음
 * - 지도는 hidden 상태에서 생성하면 흰 화면이 될 수 있어 resize 트리거 포함
 */

/* ================== ✅ 리스트 아이콘 이미지 경로(여기만 바꾸면 됨) ================== */
const ICON = {
  detail: "./images/search.png",        // 돋보기(상세)
  heartOff: "./images/like.png",   // 빈 하트
  heartOn: "./images/full_like.png"      // 채운 하트
};
/* ================================================================================== */

const API_ENDPOINT = "https://apis.data.go.kr/6260000/FoodService/getFoodKr";
const SERVICE_KEY = "45ba9fe435f41f46e91024695eb4fbdaaef824f3561da33fb4105a7ecb3eea21"; // 본인 키로 교체

// 비짓부산 이미지가 상대경로로 내려올 때 보정
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

const mapHint = $("#mapHint");

// state
let allItems = [];
let filtered = [];
let current = null;

const FAV_KEY = "busan_food_favs_v2";

// kakao map
let map = null;
let marker = null;
let geocoder = null;

// ---------- utils ----------
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

function fixImageUrl(url){
  if(!url) return "";
  const u = String(url).trim();
  if(!u) return "";
  if(u.startsWith("http://") || u.startsWith("https://")) return u;
  if(u.startsWith("/")) return VISITBUSAN_BASE + u;
  return u;
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

// ---------- api mapping ----------
function normalize(raw){
  const id = raw?.UC_SEQ ? String(raw.UC_SEQ) : `${raw?.MAIN_TITLE || ""}__${raw?.ADDR1 || ""}`;

  const name = (raw?.MAIN_TITLE || "").trim();
  const addr = (raw?.ADDR1 || "").trim();
  const intro = (raw?.ITEMCNTNTS || "").trim();
  const menu = (raw?.RPRSNTV_MENU || raw?.MAIN_MENU || raw?.MAIN_MENU || "").trim();
  const tel  = (raw?.CNTCT_TEL || "").trim();
  const time = (raw?.USAGE_DAY_WEEK_AND_TIME || "").trim();
  const home = (raw?.HOMEPAGE_URL || "").trim();

  const lat = raw?.LAT ? parseFloat(raw.LAT) : null;
  const lng = raw?.LNG ? parseFloat(raw.LNG) : null;

  const img = fixImageUrl(raw?.MAIN_IMG_NORMAL);
  const thumb = fixImageUrl(raw?.MAIN_IMG_THUMB);

  return { id, name, addr, intro, menu, tel, time, home, lat, lng, img, thumb, _raw: raw };
}

function extractItems(data){
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

// ---------- fetch ----------
async function loadFoods(){
  loadingEl.hidden = false;
  emptyEl.hidden = true;
  errorEl.hidden = true;
  listEl.innerHTML = "";
  statusEl.textContent = "불러오는 중…";

  const url = new URL(API_ENDPOINT);
  // 호환성 위해 둘 다 세팅
  url.searchParams.set("serviceKey", SERVICE_KEY);
  url.searchParams.set("ServiceKey", SERVICE_KEY);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "200");
  url.searchParams.set("resultType", "json");

  try{
    const res = await fetch(url.toString());
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allItems = extractItems(data).map(normalize).filter(x => x.name);

    applyFilter();
    statusEl.textContent = `${filtered.length}개`;
    loadingEl.hidden = true;

  }catch(err){
    console.error(err);
    loadingEl.hidden = true;
    errorEl.hidden = false;
    statusEl.textContent = "로딩 실패 (키/CORS/URL 확인)";
  }
}

// ---------- list ----------
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

/** ✅ 여기서 svg 대신 img로 아이콘 렌더링 */
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

    // 상세(돋보기)
    const btnDetail = document.createElement("button");
    btnDetail.className = "rowIcon";
    btnDetail.type = "button";
    btnDetail.title = "상세";
    btnDetail.innerHTML = `<img src="${ICON.detail}" alt="상세 보기" />`;
    btnDetail.addEventListener("click", (e)=>{
      e.stopPropagation();
      openDetail(it);
    });

    // 즐겨찾기(하트)
    const btnHeart = document.createElement("button");
    btnHeart.className = "rowIcon";
    btnHeart.type = "button";
    btnHeart.title = "즐겨찾기";

    const heartSrc = isFav(it.id) ? ICON.heartOn : ICON.heartOff;
    btnHeart.innerHTML = `<img src="${heartSrc}" alt="즐겨찾기" />`;

    btnHeart.addEventListener("click", (e)=>{
      e.stopPropagation();
      toggleFav(it.id);

      // 즉시 아이콘 반영
      const img = btnHeart.querySelector("img");
      if (img) img.src = isFav(it.id) ? ICON.heartOn : ICON.heartOff;

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

// ---------- detail ----------
function syncFavButton(){
  const on = current && isFav(current.id);
  btnFav.textContent = on ? "♥" : "♡";
}

function openDetail(it){
  current = it;

  heroImg.src = it.img || it.thumb || placeholderImage(it.name);

  dName.textContent = it.name || "-";
  dAddr.textContent = it.addr || "-";
  dIntro.textContent = it.intro || "-";
  dMenu.textContent = it.menu || "-";
  dTel.textContent = it.tel || "-";
  dTime.textContent = it.time || "-";

  if(it.home){
    homeBar.textContent = "공식 홈페이지 열기";
    homeBar.onclick = () => window.open(it.home, "_blank");
  }else{
    homeBar.textContent = "공식 홈페이지 없음";
    homeBar.onclick = null;
  }

  syncFavButton();

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
      window.open(`https://map.kakao.com/link/to/${encodeURIComponent(it.name)},${it.lat},${it.lng}`, "_blank");
    }else if(it.addr){
      window.open(`https://map.kakao.com/link/search/${encodeURIComponent(it.addr)}`, "_blank");
    }
  };

  // ✅ 페이지 전환
  pageList.hidden = true;
  pageDetail.hidden = false;
  window.scrollTo({top:0, behavior:"instant"});

  // ✅ 지도 + 마커 표시
  showRestaurantOnMap(it);
}

function closeDetail(){
  pageDetail.hidden = true;
  pageList.hidden = false;
}

// ---------- kakao map (안정화) ----------
function waitForKakaoMaps(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.kakao && kakao.maps && kakao.maps.services) {
        clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("Kakao Maps SDK 로드 실패"));
      }
    }, 50);
  });
}

async function initMapIfNeeded() {
  await waitForKakaoMaps();
  if (map) return;

  const mapEl = document.getElementById("map");
  const center = new kakao.maps.LatLng(35.1796, 129.0756);

  map = new kakao.maps.Map(mapEl, { center, level: 5 });

  marker = new kakao.maps.Marker({ position: center });
  marker.setMap(map);

  geocoder = new kakao.maps.services.Geocoder();
}

function refreshMapLayout() {
  if (!map) return;
  kakao.maps.event.trigger(map, "resize");
}

async function showRestaurantOnMap(it) {
  try {
    mapHint.textContent = "위치를 불러오는 중…";

    await initMapIfNeeded();

    // ✅ hidden -> visible 직후 렌더 안정화
    setTimeout(() => refreshMapLayout(), 0);

    const setPos = (lat, lng) => {
      const pos = new kakao.maps.LatLng(lat, lng);
      map.setCenter(pos);
      marker.setPosition(pos);
      map.setLevel(3);
      mapHint.textContent = "마커로 표시했어요.";
    };

    // 1) 좌표가 있으면 바로
    if (it.lat && it.lng) {
      setPos(it.lat, it.lng);
      return;
    }

    // 2) 없으면 주소로 지오코딩
    if (!it.addr) {
      mapHint.textContent = "주소 정보가 없어 위치를 표시할 수 없어요.";
      return;
    }

    geocoder.addressSearch(it.addr, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result?.[0]) {
        const lat = parseFloat(result[0].y);
        const lng = parseFloat(result[0].x);
        it.lat = lat; it.lng = lng; // 캐시
        setPos(lat, lng);
      } else {
        mapHint.textContent = "지오코딩 실패: 주소를 찾지 못했어요.";
      }
    });

  } catch (e) {
    console.error(e);
    mapHint.textContent = "지도 로드 실패 (카카오 키/도메인 설정 확인)";
  }
}

// ---------- events ----------
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
