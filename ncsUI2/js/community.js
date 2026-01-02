// ===== Stories Swiper (상단 가로 슬라이드) =====
const storiesSwiper = new Swiper(".storiesSwiper", {
  slidesPerView: "auto",
  spaceBetween: 12,
  freeMode: true,
  grabCursor: true,
});

// ===== Post Swiper (게시글 이미지 여러 장일 때) =====
// 화면에 여러 개 있을 수 있으니 모두 초기화
document.querySelectorAll(".postSwiper").forEach((el) => {
  new Swiper(el, {
    slidesPerView: 1,
    spaceBetween: 0,
    loop: false,
    pagination: {
      el: el.querySelector(".swiper-pagination"),
      clickable: true,
    },
  });
});

// (옵션) "만들기" 버튼 클릭 예시
document.querySelector(".btn--primary")?.addEventListener("click", () => {
  alert("만들기 버튼 클릭!");
});
