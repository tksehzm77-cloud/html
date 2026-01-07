/*
  ✅ 필수 설정
  1) 공공데이터 serviceKey 발급 후 아래 SERVICE_KEY에 넣기
  2) Kakao Maps appkey를 index.html script url의 appkey= 에 넣기

  ⚠️ CORS 주의
  - data.go.kr API가 브라우저에서 CORS 차단될 수 있습니다.
  - 그 경우: (1) 간단한 프록시 서버를 두거나 (2) Vite/webpack devServer proxy를 사용하세요.
*/

const API_BASE = "https://apis.data.go.kr/6260000/FoodService";
const SERVICE_KEY = "45ba9fe435f41f46e91024695eb4fbdaaef824f3561da33fb4105a7ecb3eea21"; // 인코딩된 키(일반적으로 이미 URL 인코딩된 형태)

// UI refs
const $ = (s) => document.querySelector(s);
const listEl = $("#list");
const loaderEl = $("#loader");
const emptyEl = $("#empty");
const hintEl = $("#hint");
const countEl = $("#count");

const screenList = $("#screenList");
const screenDetail = $("#screenDetail");

const qEl = $("#q");
const btnClear = $("#btnClear");
const btnRefresh = $("#btnRefresh");
const btnTop = $("#btnTop");

const chips = $("#chips");

// detail refs
const dName = $("#dName");
const dAddr = $("#dAddr");
const dIntro = $("#dIntro");
const dMenu = $("#dMenu");
const dTel = $("#dTel");
const dTime = $("#dTime");
const heroImg = $("#heroImg");

const btnBack = $("#btnBack");
const btnFav = $("#btnFav");
const btnCall = $("#btnCall");
const btnCopy = $("#btnCopy");
const homeBanner = $("#homeBanner");
const dHome = $("#dHome");

const btnRoad = $("#btnRoad");
const btnZoomIn = $("#btnZoomIn");
const btnZoomOut = $("#btnZoomOut");

// state
let allItems = [];
let filtered = [];
let activeGu = "";
let current = null;

// Kakao map objects
let map = null;
let marker = null;
let geocoder = null;

const FAV_KEY = "busan_food_favs_v1";
const IMG_KEY = "busan_food_img_overrides_v1";

function getFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
function setFavs(arr) { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }
function isFav(id) { return getFavs().includes(id); }
function toggleFav(id) {
  const favs = getFavs();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(id);
  setFavs(favs);
}

function getImgOverrides() {
  try { return JSON.parse(localStorage.getItem(IMG_KEY) || "{}"); } catch { return {}; }
}
function setImgOverrides(obj) { localStorage.setItem(IMG_KEY, JSON.stringify(obj)); }

// ---------- Data Mapping (API 필드가 다를 수 있어 fallback 다수 준비) ----------
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function normalizeItem(raw) {
  const name = pick(raw, ["MAIN_TITLE", "title", "TITLE", "BIZPLC_NM", "업소명", "상호명", "name"]);
  const addr = pick(raw, ["ADDR1", "ADDR", "ADDRESS", "ROAD_ADDR", "도로명주소", "지번주소", "addr", "address"]);
  const gu = guessGuFromAddr(addr);
  const menu = pick(raw, ["MAIN_MENU", "MENU", "대표메뉴", "메뉴", "mainMenu"]);
  const intro = pick(raw, ["ITEMCNTNTS", "INTRO", "소개", "content", "description"]);
  const tel = pick(raw, ["CNTCT_TEL", "TEL", "PHONE", "전화번호", "tel"]);
  const time = pick(raw, ["USAGE_DAY_WEEK_AND_TIME", "TIME", "운영시간", "hours"]);
  const home = pick(raw, ["HOMEPAGE_URL", "HOMEPAGE", "URL", "homepage"]);

  const lat = parseFloat(pick(raw, ["LAT", "Y", "LATITUDE", "위도", "lat"])) || null;
  const lng = parseFloat(pick(raw, ["LNG", "X", "LONGITUDE", "경도", "lng"])) || null;

  const id = pick(raw, ["UC_SEQ", "ID", "id"]) || `${name}__${addr}`;
  return { id, name, addr, gu, menu, intro, tel, time, home, lat, lng, _raw: raw };
}

function guessGuFromAddr(addr) {
  if (!addr) return "";
  const gus = ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"];
  for (const g of gus) if (addr.includes(g)) return g;
  return "";
}

// ---------- Fetch ----------
async function fetchFood() {
  loaderEl.hidden = false;
  emptyEl.hidden = true;
  hintEl.textContent = "데이터를 불러오는 중…";

  const url = new URL(API_BASE);
  url.searchParams.set("serviceKey", SERVICE_KEY);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "120");
  url.searchParams.set("resultType", "json");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = extractItems(data);
    allItems = items.map(normalizeItem).filter(x => x.name);

    allItems.sort((a, b) => {
      const af = isFav(a.id) ? 0 : 1;
      const bf = isFav(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.name.localeCompare(b.name, "ko");
    });

    hintEl.textContent = `${allItems.length}개 맛집을 불러왔어요`;
    applyFilter();
  } catch (err) {
    console.error(err);
    hintEl.textContent = "데이터 로딩 실패 (CORS/키/요청 파라미터 확인)";
    allItems = [];
    applyFilter();
  } finally {
    loaderEl.hidden = true;
  }
}

function extractItems(data) {
  const candidates = [
    data?.getFoodKr?.item,
    data?.getFoodKr,
    data?.response?.body?.items?.item,
    data?.response?.body?.items,
    data?.response?.body,
    data?.items,
    data?.item,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  for (const c of candidates) {
    if (c && typeof c === "object" && Array.isArray(c.item)) return c.item;
  }
  return [];
}

// ---------- Render List ----------
function applyFilter() {
  const q = (qEl.value || "").trim().toLowerCase();
  filtered = allItems.filter(it => {
    if (activeGu && it.gu !== activeGu) return false;
    if (!q) return true;
    const hay = `${it.name} ${it.addr} ${it.menu} ${it.intro} ${it.gu}`.toLowerCase();
    return hay.includes(q);
  });

  countEl.textContent = String(filtered.length);
  renderList(filtered);
  emptyEl.hidden = filtered.length !== 0;
}

function renderList(items) {
  listEl.innerHTML = "";

  for (const it of items) {
    const li = document.createElement("li");
    li.className = "item";

    const left = document.createElement("div");
    left.className = "item__left";

    const h3 = document.createElement("h3");
    h3.className = "item__name";
    h3.textContent = it.name;

    const r1 = document.createElement("p");
    r1.className = "item__row";
    r1.innerHTML = `<b>주소:</b> ${escapeHTML(it.addr || "-")}`;

    const r2 = document.createElement("p");
    r2.className = "item__row";
    r2.innerHTML = `<b>메뉴:</b> ${escapeHTML(it.menu || "-")}`;

    left.appendChild(h3);
    left.appendChild(r1);
    left.appendChild(r2);

    const actions = document.createElement("div");
    actions.className = "item__actions";

    const btnMore = document.createElement("button");
    btnMore.className = "smallbtn more";
    btnMore.type = "button";
    btnMore.textContent = "⌕";
    btnMore.title = "상세 보기";
    btnMore.addEventListener("click", () => openDetail(it));

    const btnHeart = document.createElement("button");
    btnHeart.className = "smallbtn heart" + (isFav(it.id) ? " is-on" : "");
    btnHeart.type = "button";
    btnHeart.textContent = isFav(it.id) ? "♥" : "♡";
    btnHeart.title = "즐겨찾기";
    btnHeart.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(it.id);
      applyFilter();
    });

    actions.appendChild(btnMore);
    actions.appendChild(btnHeart);

    li.appendChild(left);
    li.appendChild(actions);

    li.addEventListener("click", () => openDetail(it));
    listEl.appendChild(li);
  }
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---------- Detail ----------
function openDetail(item) {
  current = item;

  const overrides = getImgOverrides();
  const img = overrides[item.id] || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stop-color='#e5e7eb'/>
          <stop offset='1' stop-color='#cbd5e1'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='700' fill='url(#g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        font-family='Noto Sans KR, sans-serif' font-size='44' fill='#111827'>
        대표 이미지 추가
      </text>
      <text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle'
        font-family='Noto Sans KR, sans-serif' font-size='22' fill='#374151'>
        heroImg.src 를 원하는 이미지 URL/경로로 교체하세요
      </text>
    </svg>
  `);
  heroImg.src = img;

  dName.textContent = item.name || "-";
  dAddr.textContent = item.addr || "-";
  dIntro.textContent = item.intro || "-";
  dMenu.textContent = item.menu || "-";
  dTel.textContent = item.tel || "-";
  dTime.textContent = item.time || "-";

  if (item.home) {
    homeBanner.hidden = false;
    dHome.href = item.home.startsWith("http") ? item.home : `https://${item.home}`;
    dHome.textContent = dHome.href;
  } else {
    homeBanner.hidden = true;
    dHome.href = "#";
  }

  const favOn = isFav(item.id);
  btnFav.textContent = favOn ? "♥" : "♡";
  btnFav.classList.toggle("is-on", favOn);

  btnCall.disabled = !item.tel;

  screenList.hidden = true;
  screenDetail.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });

  initMapIfNeeded();
  locateOnMap(item);
}

function closeDetail() {
  screenDetail.hidden = true;
  screenList.hidden = false;
}

// ---------- Map ----------
function initMapIfNeeded() {
  if (map) return;
  const mapEl = document.getElementById("map");
  const center = new kakao.maps.LatLng(35.1796, 129.0756);
  map = new kakao.maps.Map(mapEl, { center, level: 6 });

  marker = new kakao.maps.Marker({ position: center });
  marker.setMap(map);

  geocoder = new kakao.maps.services.Geocoder();
}

function locateOnMap(item) {
  if (!map) return;

  const setPos = (lat, lng) => {
    const pos = new kakao.maps.LatLng(lat, lng);
    map.setCenter(pos);
    marker.setPosition(pos);
  };

  if (item.lat && item.lng) {
    setPos(item.lat, item.lng);
    return;
  }

  const addr = item.addr;
  if (!addr || !geocoder) return;

  geocoder.addressSearch(addr, (result, status) => {
    if (status === kakao.maps.services.Status.OK && result?.[0]) {
      const lat = parseFloat(result[0].y);
      const lng = parseFloat(result[0].x);
      setPos(lat, lng);
      item.lat = lat; item.lng = lng;
    }
  });
}

// ---------- Events ----------
qEl.addEventListener("input", () => {
  btnClear.style.opacity = qEl.value ? "1" : ".4";
  applyFilter();
});
btnClear.addEventListener("click", () => {
  qEl.value = "";
  qEl.focus();
  applyFilter();
});
btnRefresh.addEventListener("click", fetchFood);

btnTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

chips.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  [...chips.querySelectorAll(".chip")].forEach(x => x.classList.remove("is-active"));
  btn.classList.add("is-active");
  activeGu = btn.dataset.gu || "";
  applyFilter();
});

btnBack.addEventListener("click", closeDetail);

btnFav.addEventListener("click", () => {
  if (!current) return;
  toggleFav(current.id);
  const favOn = isFav(current.id);
  btnFav.textContent = favOn ? "♥" : "♡";
  btnFav.classList.toggle("is-on", favOn);

  allItems.sort((a, b) => {
    const af = isFav(a.id) ? 0 : 1;
    const bf = isFav(b.id) ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name, "ko");
  });
});

btnCall.addEventListener("click", () => {
  if (!current?.tel) return;
  location.href = `tel:${current.tel.replace(/[^0-9+]/g, "")}`;
});

btnCopy.addEventListener("click", async () => {
  if (!current?.addr) return;
  try {
    await navigator.clipboard.writeText(current.addr);
    btnCopy.textContent = "복사됨";
    setTimeout(() => (btnCopy.textContent = "주소 복사"), 900);
  } catch {
    alert("복사에 실패했어요. 브라우저 권한을 확인해주세요.");
  }
});

btnRoad.addEventListener("click", () => {
  if (!current) return;
  if (current.lat && current.lng) {
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(current.name)},${current.lat},${current.lng}`;
    window.open(url, "_blank");
  } else if (current.addr) {
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(current.addr)}`;
    window.open(url, "_blank");
  }
});

btnZoomIn.addEventListener("click", () => { if (map) map.setLevel(map.getLevel() - 1); });
btnZoomOut.addEventListener("click", () => { if (map) map.setLevel(map.getLevel() + 1); });

// 대표 이미지 저장용(옵션)
window.setRestaurantHeroImage = function (id, imageUrl) {
  const overrides = getImgOverrides();
  overrides[id] = imageUrl;
  setImgOverrides(overrides);
};

window.addEventListener("load", () => {
  btnClear.style.opacity = qEl.value ? "1" : ".4";
  fetchFood();
});