// 기본 중심좌표: 제주 시청 근처 (원하는 좌표로 변경 가능)
const DEFAULT_CENTER = { lat: 33.4996, lng: 126.5312 };
const DEFAULT_LEVEL = 4;

// 카카오 SDK가 로드된 뒤 초기화
kakao.maps.load(() => {
  const container = document.getElementById("map");
  if (!container) {
    console.error("#map 엘리먼트를 찾을 수 없습니다.");
    return;
  }

  const options = {
    center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
    level: DEFAULT_LEVEL,
  };

  const map = new kakao.maps.Map(container, options);

  // ✅ 마커 예시
  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
  });
  marker.setMap(map);

  // ✅ 컨트롤(줌)
  map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

  // 필요하면 map 객체를 전역으로 노출
  window.__kakaoMap = map;
});
