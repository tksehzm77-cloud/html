// ===== Bottom Nav active toggle =====
const navItems = document.querySelectorAll(".navItem");
navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    navItems.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
});

// ===== Guide Slider: swipe (no library) =====
const slider = document.getElementById("guideSlider");
const track = slider.querySelector(".guideTrack");
const slides = Array.from(track.children);

let currentIndex = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;
let baseTranslate = 0;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getStep() {
  // 슬라이드 1장의 이동 거리 = 슬라이드 너비 + gap
  const first = slides[0];
  const slideWidth = first.getBoundingClientRect().width;
  const gap = parseFloat(getComputedStyle(track).gap || "12");
  return slideWidth + gap;
}

function maxIndex() {
  // 마지막 슬라이드까지 이동 가능한 인덱스(대략)
  return slides.length - 1;
}

function setTranslate(x, withAnim = true) {
  track.style.transition = withAnim ? "transform 220ms ease" : "none";
  track.style.transform = `translateX(${x}px)`;
}

function snapTo(index) {
  const step = getStep();
  currentIndex = clamp(index, 0, maxIndex());
  baseTranslate = -currentIndex * step;
  setTranslate(baseTranslate, true);
}

// 터치/마우스 공통 좌표
function pointX(e) {
  if (e.touches && e.touches[0]) return e.touches[0].clientX;
  return e.clientX;
}

function onDown(e) {
  isDragging = true;
  startX = pointX(e);
  currentX = startX;
  track.style.transition = "none";
}

function onMove(e) {
  if (!isDragging) return;
  currentX = pointX(e);
  const dx = currentX - startX;
  setTranslate(baseTranslate + dx, false);
}

function onUp() {
  if (!isDragging) return;
  isDragging = false;

  const dx = currentX - startX;
  const threshold = 40; // 스와이프 판정

  if (dx < -threshold) snapTo(currentIndex + 1);
  else if (dx > threshold) snapTo(currentIndex - 1);
  else snapTo(currentIndex); // 원위치
}

// 터치 이벤트
slider.addEventListener("touchstart", onDown, { passive: true });
slider.addEventListener("touchmove", onMove, { passive: true });
slider.addEventListener("touchend", onUp);

// 마우스 드래그(PC 테스트용)
slider.addEventListener("mousedown", onDown);
window.addEventListener("mousemove", onMove);
window.addEventListener("mouseup", onUp);

// 초기 스냅
snapTo(0);

// 리사이즈 시 step 변경되므로 위치 재계산
window.addEventListener("resize", () => snapTo(currentIndex));
