document.addEventListener("DOMContentLoaded", () => {
  const tabs = Array.from(document.querySelectorAll(".tab"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");

      // 탭별 데이터 로딩/필터링을 연결하려면 여기서 처리
      // const key = tab.dataset.tab;
    });
  });

  // 잠금 아이템 클릭 방지(원하면 제거 가능)
  document.querySelectorAll(".item-card.is-locked").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // 예: 해금 안내 모달/페이지 연결
    });
  });
});
