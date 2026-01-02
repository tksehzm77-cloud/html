const swiper = new Swiper('.walkthroughSwiper', {
  direction: 'horizontal',
  slidesPerView: 1,
  loop: false,

  // ✅ 자동 슬라이드
  autoplay: {
    delay: 2500,                // 2.5초마다 이동 (원하는 값으로 조절)
    disableOnInteraction: false // 사용자가 스와이프/클릭해도 계속 자동재생
  },

  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },

  speed: 600, // 전환 속도(원하는 값으로 조절)
});

// ✅ SKIP -> 로그인 페이지 이동
document.getElementById('skipBtn').addEventListener('click', () => {
  window.location.href = './login.html';
});
