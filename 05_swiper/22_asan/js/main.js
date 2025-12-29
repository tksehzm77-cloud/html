const swiper = new Swiper('.swiper', {
  // Optional parameters
    // effect: 'fade',
    direction: 'horizontal',
    loop: true,
//   자동 실행
autoplay: {
    delay: 1000, // 3초마다 슬라이드 변경
    disableOnInteraction: false, // 사용자 터치 후에도 자동 실행 유지
    },

  // If we need pagination
    pagination: {
    el: '.swiper-pagination',
    clickable: true,
    },

  // Navigation arrows
    navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
    },

  // And if we need scrollbar
    scrollbar: {
    el: '.swiper-scrollbar',
    },
});