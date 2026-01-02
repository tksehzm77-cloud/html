let map, places, geocoder, infoWindow;
let markers = [];

const $keyword = document.getElementById("keyword");
const $btn = document.getElementById("searchBtn");
const $results = document.getElementById("results");

function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}

function makeMarker(position) {
  const marker = new kakao.maps.Marker({ position });
  marker.setMap(map);
  markers.push(marker);
  return marker;
}

function setBoundsByPoints(points) {
  const bounds = new kakao.maps.LatLngBounds();
  points.forEach(p => bounds.extend(p));
  map.setBounds(bounds);
}

function openInfo(marker, title, address) {
  infoWindow.setContent(`
    <div style="padding:8px 10px; font-size:13px; line-height:1.35;">
      <b>${title}</b><br/>
      <span style="color:#6b7280;">${address || ""}</span>
    </div>
  `);
  infoWindow.open(map, marker);
}

function renderList(items, onClick) {
  $results.innerHTML = "";
  items.forEach((it, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="name">${idx + 1}. ${it.name}</div>
      <div class="addr">${it.addr || ""}</div>
    `;
    li.addEventListener("click", () => onClick(it));
    $results.appendChild(li);
  });
}

function searchAll() {
  const q = ($keyword.value || "").trim();
  if (!q) {
    alert("검색어를 입력해주세요.");
    $keyword.focus();
    return;
  }

  // 1) ✅ 키워드(장소/POI) 검색 먼저: 역, 시청, 카페, 학교 등
  places.keywordSearch(q, (data, status) => {
    if (status === kakao.maps.services.Status.OK && data.length) {
      clearMarkers();
      infoWindow.close();

      const points = [];
      const listItems = data.slice(0, 10).map(p => {
        const pos = new kakao.maps.LatLng(p.y, p.x);
        points.push(pos);

        const marker = makeMarker(pos);
        kakao.maps.event.addListener(marker, "click", () => {
          openInfo(marker, p.place_name, p.road_address_name || p.address_name);
        });

        return {
          name: p.place_name,
          addr: p.road_address_name || p.address_name || "",
          latlng: pos,
          _marker: marker
        };
      });

      setBoundsByPoints(points);

      renderList(listItems, (it) => {
        map.panTo(it.latlng);
        map.setLevel(3);
        openInfo(it._marker, it.name, it.addr);
      });

      // 첫 번째 결과 자동 포커스
      map.panTo(listItems[0].latlng);
      map.setLevel(3);
      openInfo(listItems[0]._marker, listItems[0].name, listItems[0].addr);
      return;
    }

    // 2) ✅ 키워드 결과가 없으면 주소 검색(도로명/지번/지역명)으로 fallback
    geocoder.addressSearch(q, (result, status2) => {
      if (status2 === kakao.maps.services.Status.OK && result.length) {
        clearMarkers();
        infoWindow.close();

        const pos = new kakao.maps.LatLng(result[0].y, result[0].x);
        const marker = makeMarker(pos);

        map.setCenter(pos);
        map.setLevel(3);

        openInfo(marker, q, result[0].address_name || "");

        renderList(
          [{ name: q, addr: result[0].address_name || "", latlng: pos, _marker: marker }],
          (it) => openInfo(it._marker, it.name, it.addr)
        );
      } else {
        clearMarkers();
        infoWindow.close();
        $results.innerHTML = `<li><div class="name">검색 결과가 없습니다.</div><div class="addr">다른 키워드로 시도해보세요.</div></li>`;
        alert("검색 결과가 없습니다. (장소/주소 모두 실패)");
      }
    });
  });
}

kakao.maps.load(() => {
  const container = document.getElementById("map");

  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 기본
    level: 6,
  });

  places = new kakao.maps.services.Places();
  geocoder = new kakao.maps.services.Geocoder();
  infoWindow = new kakao.maps.InfoWindow({ zIndex: 10 });

  $btn.addEventListener("click", searchAll);
  $keyword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAll();
  });
});
