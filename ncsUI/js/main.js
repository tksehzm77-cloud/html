const swiper = new Swiper(".onboarding-swiper", {
  slidesPerView: 1,
  spaceBetween: 0,

  /* 자동 실행 (1회) */
  autoplay: {
    delay: 3000,                // 3초 간격
    disableOnInteraction: false // 터치해도 멈추지 않음
  },

  speed: 600,

  /* 페이지 버튼 */
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  loop: false, // 반드시 false
});

/* 마지막 슬라이드 도달 시 자동 실행 완전 중지 */
swiper.on("reachEnd", () => {
  swiper.autoplay.stop();
});
setTimeout(() => {
  window.location.href = "../index.html";
}, 10000);