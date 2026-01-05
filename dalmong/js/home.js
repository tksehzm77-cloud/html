// ===== Banner Swiper =====
const bannerSwiper = new Swiper(".bannerSwiper", {
  loop: true,
  speed: 450,
  autoplay: {
    delay: 3500,
    disableOnInteraction: false,
  },
  pagination: {
    el: ".bannerPagination",
    clickable: true,
  },
});

// ===== Recent Clicked Swiper (가로 스와이프) =====
const recentSwiper = new Swiper(".recentSwiper", {
  slidesPerView: "auto",
  spaceBetween: 14,
  freeMode: true,
  grabCursor: true,
});
