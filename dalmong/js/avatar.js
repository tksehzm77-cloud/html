// 탭 활성화 토글(디자인용)
// 실제로는 탭별 목록을 바꾸는 로직을 여기에 연결하면 됩니다.
document.addEventListener("DOMContentLoaded", () => {
  const tabs = Array.from(document.querySelectorAll(".tab"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");

      // 필요 시: 탭별 데이터 로딩/필터링
      // const key = tab.dataset.tab;
      // console.log("active tab:", key);
    });
  });

  // 잠금 아이템 클릭 방지(원하면 제거 가능)
  const locked = document.querySelectorAll(".item-card.is-locked");
  locked.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // 필요 시: 구매/해금 안내 모달 연결
      // alert("잠금된 아이템입니다.");
    });
  });
});
