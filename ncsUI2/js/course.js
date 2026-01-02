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
      // 토글 선택
      const isSame = selectedRegion && selectedRegion.key === r.key;
      selectedRegion = isSame ? null : r;

      // UI
      [...regionChipsEl.querySelectorAll(".chip")].forEach(c => c.classList.remove("is-active"));
      if (selectedRegion) btn.classList.add("is-active");

      // 지도 이동
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
  // 카카오 SDK가 없으면(앱키 미입력/로드 실패) 안내
  if (typeof kakao === "undefined" || !kakao.maps) {
    setStatus("카카오맵 SDK가 로드되지 않았어요. appkey를 확인해 주세요.");
    return;
  }

  const container = document.getElementById("map");
  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng),
    level: DEFAULT_LEVEL
  });

  places = new kakao.maps.services.Places();

  setStatus("지도 준비 완료");
}

/* ========= 검색 =========
 - 지역 선택 시: "지역명 + 키워드 + 자전거 코스" 형태로 검색 정확도 개선
 - 지역 미선택 시: "제주 + 키워드 + 자전거 코스"로 제주 범위 검색
*/
function buildQuery(keyword){
  const base = keyword.trim();
  const regionPrefix = selectedRegion ? selectedRegion.label : "제주";
  // 예: "애월 해안도로 자전거 코스"
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

      const marker = new kakao.maps.Marker({
        map,
        position: pos
      });
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

      // 카드 클릭 → 지도 이동 + 마커 중심
      card.addEventListener("click", () => {
        map.panTo(pos);
        map.setLevel(5);
        setStatus(`선택: ${place.place_name}`);
      });

      // 마커 클릭 → 상태 표시
      kakao.maps.event.addListener(marker, "click", () => {
        map.panTo(pos);
        setStatus(`선택: ${place.place_name}`);
      });

      resultList.appendChild(card);
    });

    // 전체 결과가 보이게 지도 범위 조정
    map.setBounds(bounds);
  });
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
  // 키워드가 비어있으면 기본 키워드 제공
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

/* ========= 시작 ========= */
renderChips();

// 카카오 SDK는 스크립트 로드 후 바로 사용 가능
// (appkey 입력 전이면 init 실패 안내문이 보임)
window.addEventListener("load", initKakao);
