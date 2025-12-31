// Guide 이미지 3개 슬라이드 (손으로 쓸어넘기기)
const guideSwiper = new Swiper(".guideSwiper", {
  slidesPerView: "auto",
  spaceBetween: 14,
  freeMode: true,
  grabCursor: true,
  resistanceRatio: 0.65,
});

// (선택) 하단 네비 active 토글(데모)
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".nav-item").forEach((i) => i.classList.remove("is-active"));
    item.classList.add("is-active");
  });
});
