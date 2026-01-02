/* ========= 설정 ========= */
const JEJU_CENTER = { lat: 33.361666, lng: 126.529167 }; // 제주 중심 근사값
const DEFAULT_LEVEL = 10;

// 대표 지역(칩)
const REGIONS = [
  { key: "jeju_city", label: "제주시", center: { lat: 33.4996, lng: 126.5312 }, level: 7 },
  { key: "seogwipo",  label: "서귀포", center: { lat: 33.2530, lng: 126.5618 }, level: 7 },
  { key: "aewol",     label: "애월",   center: { lat: 33.4635, lng: 126.3180 }, level: 8 },
  { key: "seongsan",  label: "성산",   center: { lat: 33.4589, lng: 126.9413 }, level: 8 },
  { key: "gimnyeong", label: "김녕",   center: { lat: 33.5560, lng: 126.7590 }, level: 9 },
  { key: "ujedo",     label: "우도",   center: { lat: 33.5067, lng: 126.9530 }, level: 9 },
  { key: "hallasan",  label: "한라산", center: { lat: 33.3617, lng: 126.5292 }, level: 9 },
];

let map;
let places;
let markers = [];
let selectedRegion = null;

// ✅ 추천 코스(환상) 지도/오브젝트
let fantasyMap;
let fantasyPolyline = null;
let fantasyMarkers = [];

// ✅ 맛집 코스 지도/오브젝트
let foodMap;
let foodPolyline = null;
let foodMarkers = [];

/* ========= DOM ========= */
const regionChipsEl = document.getElementById("regionChips");
const keywordInput = document.getElementById("keywordInput");
const searchBtn = document.getElementById("searchBtn");
const useSelectedRegionBtn = document.getElementById("useSelectedRegionBtn");
const resetBtn = document.getElementById("resetBtn");
const locateBtn = document.getElementById("locateBtn");
const statusText = document.getElementById("statusText");
const resultList = document.getElementById("resultList");
const resultCount = document.getElementById("resultCount");

// ✅ 환상 코스 DOM
const fantasyStatusText = document.getElementById("fantasyStatusText");
const drawFantasyBtn = document.getElementById("drawFantasyBtn");
const fantasyResetBtn = document.getElementById("fantasyResetBtn");

// ✅ 맛집 코스 DOM
const foodStatusText = document.getElementById("foodStatusText");
const drawFoodBtn = document.getElementById("drawFoodBtn");
const foodResetBtn = document.getElementById("foodResetBtn");
const foodList = document.getElementById("foodList");
const foodCount = document.getElementById("foodCount");

/* ========= 유틸 ========= */
function setStatus(text){
  statusText.textContent = text;
}

function clearMarkers(){
  markers.forEach(m => m.setMap(null));
  markers = [];
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ✅ 환상 코스 유틸 */
function setFantasyStatus(text){
  if (!fantasyStatusText) return;
  fantasyStatusText.textContent = text;
}

function clearFantasy(){
  if (fantasyPolyline) {
    fantasyPolyline.setMap(null);
    fantasyPolyline = null;
  }
  fantasyMarkers.forEach(m => m.setMap(null));
  fantasyMarkers = [];
}

/* ✅ 맛집 코스 유틸 */
function setFoodStatus(text){
  if (!foodStatusText) return;
  foodStatusText.textContent = text;
}

function clearFood(){
  if (foodPolyline) {
    foodPolyline.setMap(null);
    foodPolyline = null;
  }
  foodMarkers.forEach(m => m.setMap(null));
  foodMarkers = [];
  if (foodList) foodList.innerHTML = "";
  if (foodCount) foodCount.textContent = "0";
}

/* ========= 칩 렌더 ========= */
function renderChips(){
  regionChipsEl.innerHTML = "";
  REGIONS.forEach((r) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = r.label;
    btn.dataset.key = r.key;

    btn.addEventListener("click", () => {
      const isSame = selectedRegion && selectedRegion.key === r.key;
      selectedRegion = isSame ? null : r;

      [...regionChipsEl.querySelectorAll(".chip")].forEach(c => c.classList.remove("is-active"));
      if (selectedRegion) btn.classList.add("is-active");

      if (map && selectedRegion){
        const { lat, lng } = selectedRegion.center;
        map.setLevel(selectedRegion.level);
        map.panTo(new kakao.maps.LatLng(lat, lng));
        setStatus(`선택 지역: ${selectedRegion.label}`);
      } else {
        setStatus("지역 선택 해제");
      }
    });

    regionChipsEl.appendChild(btn);
  });
}

/* ========= 카카오맵 초기화 ========= */
function initKakao(){
  if (typeof kakao === "undefined" || !kakao.maps) {
    setStatus("카카오맵 SDK가 로드되지 않았어요. appkey를 확인해 주세요.");
    setFantasyStatus("카카오맵 SDK가 로드되지 않았어요. appkey를 확인해 주세요.");
    setFoodStatus("카카오맵 SDK가 로드되지 않았어요. appkey를 확인해 주세요.");
    return;
  }

  // 메인 검색 지도
  const container = document.getElementById("map");
  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng),
    level: DEFAULT_LEVEL
  });

  places = new kakao.maps.services.Places();
  setStatus("지도 준비 완료");

  // 환상 코스 지도
  const fantasyContainer = document.getElementById("fantasyMap");
  if (fantasyContainer) {
    fantasyMap = new kakao.maps.Map(fantasyContainer, {
      center: new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng),
      level: DEFAULT_LEVEL
    });
    setFantasyStatus("추천 코스 준비 완료");
  }

  // 맛집 코스 지도
  const foodContainer = document.getElementById("foodMap");
  if (foodContainer) {
    foodMap = new kakao.maps.Map(foodContainer, {
      center: new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng),
      level: DEFAULT_LEVEL
    });
    setFoodStatus("맛집 코스 준비 완료");
  }
}

/* ========= 검색 ========= */
function buildQuery(keyword){
  const base = keyword.trim();
  const regionPrefix = selectedRegion ? selectedRegion.label : "제주";
  return `${regionPrefix} ${base} 자전거 코스`;
}

function searchCourses(){
  if (!places) {
    setStatus("검색을 위해 카카오맵 services 라이브러리가 필요해요.");
    return;
  }

  const keyword = keywordInput.value.trim();
  if (!keyword) {
    alert("검색 키워드를 입력해주세요.");
    keywordInput.focus();
    return;
  }

  const query = buildQuery(keyword);
  setStatus(`검색 중: ${query}`);
  resultList.innerHTML = "";
  resultCount.textContent = "0";
  clearMarkers();

  places.keywordSearch(query, (data, status) => {
    if (status !== kakao.maps.services.Status.OK || !data || data.length === 0) {
      setStatus("검색 결과가 없어요. 다른 키워드로 시도해보세요.");
      resultList.innerHTML = `
        <div class="result-card" style="cursor:default;">
          <div class="result-title">검색 결과 없음</div>
          <div class="result-meta">키워드를 바꿔보거나 지역을 선택해 정확도를 높여보세요.</div>
          <div class="badge">Tip</div>
        </div>
      `;
      return;
    }

    setStatus(`검색 완료 (${data.length}개)`);
    resultCount.textContent = String(data.length);

    const bounds = new kakao.maps.LatLngBounds();

    data.forEach((place, idx) => {
      const lat = parseFloat(place.y);
      const lng = parseFloat(place.x);
      const pos = new kakao.maps.LatLng(lat, lng);

      const marker = new kakao.maps.Marker({ map, position: pos });
      markers.push(marker);
      bounds.extend(pos);

      const card = document.createElement("article");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-title">${escapeHtml(place.place_name || "이름 없음")}</div>
        <div class="result-meta">
          <div>주소: ${escapeHtml(place.road_address_name || place.address_name || "-")}</div>
          <div>카테고리: ${escapeHtml(place.category_name || "-")}</div>
          ${place.phone ? `<div>전화: ${escapeHtml(place.phone)}</div>` : ""}
        </div>
        <div class="badge">#${idx + 1}</div>
      `;

      card.addEventListener("click", () => {
        map.panTo(pos);
        map.setLevel(5);
        setStatus(`선택: ${place.place_name}`);
      });

      kakao.maps.event.addListener(marker, "click", () => {
        map.panTo(pos);
        setStatus(`선택: ${place.place_name}`);
      });

      resultList.appendChild(card);
    });

    map.setBounds(bounds);
  });
}

/* =========================
   ✅ 추천 코스: 제주 환상 자전거길
========================= */
const FANTASY_WAYPOINTS = [
  "용두암",
  "다락쉼터 인증부스",
  "해거름마을공원 인증센터",
  "송악산",
  "법환바당 인증부스",
  "쇠소깍",
  "표선해수욕장",
  "성산일출봉",
  "김녕성세기해변",
  "함덕서우봉해변",
  "용두암"
];

function keywordSearchOne(query){
  return new Promise((resolve, reject) => {
    places.keywordSearch(query, (data, status) => {
      if (status !== kakao.maps.services.Status.OK || !data || data.length === 0) {
        reject(new Error(`No result: ${query}`));
        return;
      }
      const p = data[0];
      resolve({
        name: p.place_name,
        lat: parseFloat(p.y),
        lng: parseFloat(p.x),
        address: p.road_address_name || p.address_name || ""
      });
    });
  });
}

async function drawFantasyRoute(){
  if (!fantasyMap || !places) {
    setFantasyStatus("추천 코스 지도를 사용할 수 없어요. (SDK/지도 로드 확인)");
    return;
  }

  clearFantasy();
  setFantasyStatus("지점 좌표를 찾는 중…");

  const queries = FANTASY_WAYPOINTS.map(k => `제주 ${k}`);
  const points = [];

  for (let i = 0; i < queries.length; i++){
    setFantasyStatus(`지점 찾는 중… (${i+1}/${queries.length})`);
    try{
      const res = await keywordSearchOne(queries[i]);
      points.push(res);
    }catch(e){
      console.warn(e);
    }
  }

  if (points.length < 3){
    setFantasyStatus("코스를 그리기엔 지점이 부족해요. (검색 실패)");
    return;
  }

  setFantasyStatus("코스 그리는 중…");

  const linePath = [];
  const bounds = new kakao.maps.LatLngBounds();

  points.forEach((p, idx) => {
    const pos = new kakao.maps.LatLng(p.lat, p.lng);
    linePath.push(pos);
    bounds.extend(pos);

    const marker = new kakao.maps.Marker({ map: fantasyMap, position: pos });
    fantasyMarkers.push(marker);

    kakao.maps.event.addListener(marker, "click", () => {
      fantasyMap.panTo(pos);
      fantasyMap.setLevel(7);
      setFantasyStatus(`지점 ${idx+1}: ${p.name}`);
    });
  });

  fantasyPolyline = new kakao.maps.Polyline({
    path: linePath,
    strokeWeight: 5,
    strokeColor: "#F4A000",
    strokeOpacity: 0.85,
    strokeStyle: "solid"
  });

  fantasyPolyline.setMap(fantasyMap);
  fantasyMap.setBounds(bounds);

  setFantasyStatus(`제주 환상 자전거길 표시 완료 (지점 ${points.length}개 연결)`);
}

/* =========================
   ✅ 맛집 코스: 지역별 음식점(카테고리) 자동 추천
   - Kakao categorySearch: FD6(음식점)
   - 각 지역 중심 반경 내 TOP 결과 1개씩 선택
   - Polyline으로 연결 + 리스트 렌더
========================= */
const FOOD_STOPS = [
  { label: "제주시",   center: { lat: 33.4996, lng: 126.5312 } },
  { label: "애월",     center: { lat: 33.4635, lng: 126.3180 } },
  { label: "함덕",     center: { lat: 33.5431, lng: 126.6694 } },
  { label: "성산",     center: { lat: 33.4589, lng: 126.9413 } },
  { label: "표선",     center: { lat: 33.3267, lng: 126.8320 } },
  { label: "서귀포",   center: { lat: 33.2530, lng: 126.5618 } },
];

function categorySearchOne(center, radius = 2500){
  return new Promise((resolve, reject) => {
    const loc = new kakao.maps.LatLng(center.lat, center.lng);

    // FD6: 음식점 (카카오 카테고리)
    places.categorySearch("FD6", (data, status) => {
      if (status !== kakao.maps.services.Status.OK || !data || data.length === 0) {
        reject(new Error("No food result"));
        return;
      }
      const p = data[0]; // 반경 내 상위 결과 1개
      resolve({
        name: p.place_name,
        lat: parseFloat(p.y),
        lng: parseFloat(p.x),
        address: p.road_address_name || p.address_name || "",
        phone: p.phone || "",
        category: p.category_name || ""
      });
    }, { location: loc, radius, sort: kakao.maps.services.SortBy.DISTANCE });
  });
}

function renderFoodList(items){
  if (!foodList) return;
  foodList.innerHTML = "";

  items.forEach((p, idx) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-title">${escapeHtml(p.name || "이름 없음")}</div>
      <div class="result-meta">
        <div>지역: ${escapeHtml(p.regionLabel || "-")}</div>
        <div>주소: ${escapeHtml(p.address || "-")}</div>
        ${p.phone ? `<div>전화: ${escapeHtml(p.phone)}</div>` : ""}
      </div>
      <div class="badge">#${idx+1}</div>
    `;

    card.addEventListener("click", () => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng);
      foodMap.panTo(pos);
      foodMap.setLevel(6);
      setFoodStatus(`선택: ${p.name}`);
    });

    foodList.appendChild(card);
  });

  if (foodCount) foodCount.textContent = String(items.length);
}

async function drawFoodRoute(){
  if (!foodMap || !places) {
    setFoodStatus("맛집 코스 지도를 사용할 수 없어요. (SDK/지도 로드 확인)");
    return;
  }

  clearFood();
  setFoodStatus("지역별 맛집을 찾는 중…");

  const picked = [];
  for (let i = 0; i < FOOD_STOPS.length; i++){
    const stop = FOOD_STOPS[i];
    setFoodStatus(`맛집 찾는 중… (${i+1}/${FOOD_STOPS.length}) ${stop.label}`);
    try{
      const p = await categorySearchOne(stop.center, 2500);
      p.regionLabel = stop.label;
      picked.push(p);
    }catch(e){
      console.warn(e);
    }
  }

  if (picked.length < 3){
    setFoodStatus("맛집 코스를 만들기엔 결과가 부족해요. 반경/지역을 조정해 주세요.");
    return;
  }

  setFoodStatus("맛집 코스를 그리는 중…");

  const bounds = new kakao.maps.LatLngBounds();
  const linePath = [];

  picked.forEach((p, idx) => {
    const pos = new kakao.maps.LatLng(p.lat, p.lng);
    linePath.push(pos);
    bounds.extend(pos);

    const marker = new kakao.maps.Marker({ map: foodMap, position: pos });
    foodMarkers.push(marker);

    kakao.maps.event.addListener(marker, "click", () => {
      foodMap.panTo(pos);
      foodMap.setLevel(6);
      setFoodStatus(`선택: ${p.name}`);
    });
  });

  foodPolyline = new kakao.maps.Polyline({
    path: linePath,
    strokeWeight: 5,
    strokeColor: "#F4A000",
    strokeOpacity: 0.85,
    strokeStyle: "solid"
  });

  foodPolyline.setMap(foodMap);
  foodMap.setBounds(bounds);

  renderFoodList(picked);
  setFoodStatus(`맛집 코스 생성 완료 (맛집 ${picked.length}곳 연결)`);
}

/* ========= 이벤트 ========= */
searchBtn.addEventListener("click", searchCourses);

keywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchCourses();
});

useSelectedRegionBtn.addEventListener("click", () => {
  if (!selectedRegion) {
    alert("먼저 지역을 선택해주세요.");
    return;
  }
  if (!keywordInput.value.trim()) keywordInput.value = "해안도로";
  searchCourses();
});

resetBtn.addEventListener("click", () => {
  keywordInput.value = "";
  selectedRegion = null;
  [...regionChipsEl.querySelectorAll(".chip")].forEach(c => c.classList.remove("is-active"));
  clearMarkers();

  if (map) {
    map.setLevel(DEFAULT_LEVEL);
    map.panTo(new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng));
  }
  resultList.innerHTML = "";
  resultCount.textContent = "0";
  setStatus("초기화 완료");
});

locateBtn.addEventListener("click", () => {
  if (!map) return;
  map.setLevel(DEFAULT_LEVEL);
  map.panTo(new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng));
  setStatus("제주 중심으로 이동");
});

/* ✅ 환상 코스 버튼 */
if (drawFantasyBtn) drawFantasyBtn.addEventListener("click", drawFantasyRoute);

if (fantasyResetBtn) {
  fantasyResetBtn.addEventListener("click", () => {
    clearFantasy();
    if (fantasyMap) {
      fantasyMap.setLevel(DEFAULT_LEVEL);
      fantasyMap.panTo(new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng));
    }
    setFantasyStatus("초기화 완료");
  });
}

/* ✅ 맛집 코스 버튼 */
if (drawFoodBtn) drawFoodBtn.addEventListener("click", drawFoodRoute);

if (foodResetBtn) {
  foodResetBtn.addEventListener("click", () => {
    clearFood();
    if (foodMap) {
      foodMap.setLevel(DEFAULT_LEVEL);
      foodMap.panTo(new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng));
    }
    setFoodStatus("초기화 완료");
  });
}

/* ========= 시작 ========= */
renderChips();
window.addEventListener("load", initKakao);
