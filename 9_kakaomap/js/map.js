const DEFAULT_CENTER = { lat: 33.4996, lng: 126.5312 }; // 제주 시청 근처
const DEFAULT_LEVEL = 6;

let map;
let places;
let markers = [];
let infoWindow;

const $keyword = document.getElementById("keyword");
const $btnSearch = document.getElementById("btnSearch");
const $results = document.getElementById("results");
const $meta = document.getElementById("meta");

function clearMarkers() {
  markers.forEach((m) => m.setMap(null));
  markers = [];
}

function setMeta(text) {
  $meta.textContent = text || "";
}

function renderList(items) {
  $results.innerHTML = "";
  items.forEach((p, idx) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="item__name">${idx + 1}. ${p.place_name}</div>
      <div class="item__addr">${p.road_address_name || p.address_name || ""}</div>
      ${p.phone ? `<div class="item__tel">☎ ${p.phone}</div>` : ""}
    `;

    li.addEventListener("click", () => focusPlace(p));
    $results.appendChild(li);
  });
}

function focusPlace(place) {
  const pos = new kakao.maps.LatLng(place.y, place.x);
  map.setLevel(3);
  map.panTo(pos);

  infoWindow.setContent(`
    <div style="padding:8px 10px; font-size:13px; line-height:1.3;">
      <b>${place.place_name}</b><br/>
      <span style="color:#6b7280;">
        ${(place.road_address_name || place.address_name || "")}
      </span>
    </div>
  `);

  // 해당 place의 마커 찾기
  const marker = markers.find((m) => {
    const p = m.getPosition();
    return p.getLat() === Number(place.y) && p.getLng() === Number(place.x);
  });

  if (marker) infoWindow.open(map, marker);
}

function displayPlaces(data) {
  clearMarkers();
  infoWindow.close();
  setMeta(`${data.length}개 결과`);

  // 지도 범위 조정
  const bounds = new kakao.maps.LatLngBounds();

  data.forEach((place) => {
    const position = new kakao.maps.LatLng(place.y, place.x);
    bounds.extend(position);

    const marker = new kakao.maps.Marker({ position });
    marker.setMap(map);
    markers.push(marker);

    kakao.maps.event.addListener(marker, "click", () => focusPlace(place));
  });

  map.setBounds(bounds);
  renderList(data);
}

function searchKeyword() {
  const keyword = ($keyword.value || "").trim();
  if (!keyword) {
    alert("검색어를 입력해주세요!");
    $keyword.focus();
    return;
  }

  setMeta("검색 중...");
  $results.innerHTML = "";

  places.keywordSearch(keyword, (data, status) => {
    if (status === kakao.maps.services.Status.OK) {
      displayPlaces(data);
      // 첫 번째 결과 자동 포커스(원치 않으면 제거)
      focusPlace(data[0]);
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
      clearMarkers();
      setMeta("0개 결과");
      $results.innerHTML = `<li class="item">검색 결과가 없습니다.</li>`;
    } else {
      clearMarkers();
      setMeta("오류");
      $results.innerHTML = `<li class="item">검색 중 오류가 발생했습니다.</li>`;
      console.error("검색 실패:", status);
    }
  });
}

// 초기화
kakao.maps.load(() => {
  const container = document.getElementById("map");

  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
    level: DEFAULT_LEVEL,
  });

  map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

  places = new kakao.maps.services.Places();
  infoWindow = new kakao.maps.InfoWindow({ zIndex: 10 });

  // 버튼 / 엔터 검색
  $btnSearch.addEventListener("click", searchKeyword);
  $keyword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchKeyword();
  });

  // 첫 화면 안내(원하면 삭제)
  setMeta("검색어를 입력해보세요");
});
