const swiper = new Swiper('.walkthroughSwiper', {
  direction: 'horizontal',
  slidesPerView: 1,
  loop: false,

  // ✅ 자동 슬라이드 (1회 실행)
  autoplay: {
    delay: 2500,
    disableOnInteraction: false,
  },

  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },

  speed: 600,

  // ✅ 마지막 슬라이드 도착 시 autoplay 중지
  on: {
    reachEnd: function () {
      this.autoplay.stop();
    }
  }
});

// ✅ SKIP → 로그인 페이지 이동
document.getElementById('skipBtn').addEventListener('click', () => {
  window.location.href = './login.html';
});
