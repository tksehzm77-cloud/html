// ✅ 자동 실행 + "한 번만" 실행(끝에 도달하면 autoplay stop)
// ✅ 다음 버튼: 마지막 슬라이드면 링크 이동, 아니면 다음 슬라이드

const dots = Array.from(document.querySelectorAll(".dot"));
const nextBtn = document.querySelector(".nextBtn");

function setActiveDot(index) {
  dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
}

const swiper = new Swiper(".walkthroughSwiper", {
  slidesPerView: 1,
  spaceBetween: 0,
  speed: 600,
  loop: false,
  allowTouchMove: true,

  autoplay: {
    delay: 2800,
    disableOnInteraction: false
  },

  on: {
    init(s) {
      setActiveDot(s.activeIndex);
    },
    slideChange(s) {
      setActiveDot(s.activeIndex);

      // 마지막 슬라이드에 도달하면 자동재생 "한 번만" 실행되도록 stop
      if (s.activeIndex === s.slides.length - 1) {
        // slideChange 타이밍 안정화
        setTimeout(() => {
          if (s.autoplay && s.autoplay.running) s.autoplay.stop();
        }, 50);
      }
    }
  }
});

// dot 클릭 이동(원하면 유지, 원치 않으면 삭제 가능)
dots.forEach((dot, idx) => {
  dot.addEventListener("click", () => swiper.slideTo(idx));
});

nextBtn.addEventListener("click", () => {
  const lastIndex = swiper.slides.length - 1;

  if (swiper.activeIndex < lastIndex) {
    swiper.slideNext();
    return;
  }

  // 마지막 슬라이드: 링크 이동
  const href = nextBtn.dataset.href;
  if (href) window.location.href = href;
});
