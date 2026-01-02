document.addEventListener("DOMContentLoaded", () => {
  const screen = document.querySelector(".screen");
  screen.classList.add("is-loaded");

  /* ===== 3초 후 슬라이드 화면 이동 ===== */
  setTimeout(() => {
    window.location.href = "slide.html"; 
  }, 3000);

  /* 모바일 더블탭 확대 방지 */
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );
});
