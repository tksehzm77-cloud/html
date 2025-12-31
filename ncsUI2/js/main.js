document.addEventListener("DOMContentLoaded", () => {
  // 로고 페이드/플로팅 애니메이션 트리거
  const screen = document.querySelector(".screen");
  screen.classList.add("is-loaded");

  // 더블탭 확대 방지(모바일 UX)
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
});
