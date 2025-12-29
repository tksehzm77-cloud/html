const swiper = new Swiper('.swiper', {
  // Optional parameters
    direction: 'horizontal',
    effect: 'fade',
    speed: 800,
    loop: true,
    autoplay: {
    delay: 3000,
    disableOnInteraction: false, // swipe 후에도 계속 자동 실행
    pauseOnMouseEnter: true,     // 마우스 올리면 정지
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
const toggleBtn = document.querySelector('.swiper-btn-toggle');

toggleBtn.addEventListener('click', () => {
  if (toggleBtn.classList.contains('play')) {
    swiper.autoplay.start();
    toggleBtn.classList.remove('play');
  } else {
    swiper.autoplay.stop();
    toggleBtn.classList.add('play');
  }
});