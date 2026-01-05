// 모바일에서 주소창/툴바 때문에 100vh가 흔들리는 문제 보정
function setVH() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh * 100}px`);
}

window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', setVH);
setVH();

// 3초 후 워크스루 화면으로 이동
// ✅ 아래 경로를 실제 워크스루 파일명으로 바꿔주세요 (예: ./walkthrough.html)
// setTimeout(() => {
//   window.location.href = "slide.html";
// }, 3000);
