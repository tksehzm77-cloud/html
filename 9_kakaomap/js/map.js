let map;
let geocoder;
let marker;

const input = document.getElementById("keyword");
const btn = document.getElementById("searchBtn");

// 지도 초기화
const initMap = () => {
  const container = document.getElementById("map");

  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 기본
    level: 5,
  });

  geocoder = new kakao.maps.services.Geocoder();

  marker = new kakao.maps.Marker();
  marker.setMap(map);
};

// 주소 검색 → 마커 표시
const searchAddress = () => {
  const keyword = input.value.trim();
  if (!keyword) {
    alert("검색어를 입력해주세요");
    return;
  }

  geocoder.addressSearch(keyword, (result, status) => {
    if (status === kakao.maps.services.Status.OK) {
      const lat = result[0].y;
      const lng = result[0].x;

      const position = new kakao.maps.LatLng(lat, lng);

      // 지도 이동
      map.setCenter(position);
      map.setLevel(3);

      // 마커 표시
      marker.setPosition(position);
    } else {
      alert("검색 결과가 없습니다.");
    }
  });
};

// 이벤트
btn.addEventListener("click", searchAddress);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchAddress();
});

// 실행
initMap();
