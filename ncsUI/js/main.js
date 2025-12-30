document.addEventListener("DOMContentLoaded", () => {
  const swiper = new Swiper(".onboarding-swiper", {
    slidesPerView: 1,
    spaceBetween: 0,

    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },

    speed: 600,

    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },

    loop: false,

    // ✅ 버튼/링크 클릭 막힘 방지
    preventClicks: false,
    preventClicksPropagation: false,
  });

  // ✅ 마지막 슬라이드 도달 시 자동 실행 1회 종료
  swiper.on("reachEnd", () => {
    swiper.autoplay.stop();
  });

  // ✅ 시작하기 → 로그인 페이지 이동
  const startBtn = document.getElementById("startBtn");
  startBtn.addEventListener("click", () => {
    window.location.assign("/login"); // 또는 "/login"
  });
});


setTimeout(() => {
  window.location.href = "index2.html";
}, 10000);