// 이미지 src가 비어있으면 숨기고, src가 있으면 보이게 처리
function toggleImgVisibility(imgEl, fallbackEl) {
  const src = (imgEl.getAttribute("src") || "").trim();
  if (src) {
    imgEl.style.display = "block";
    if (fallbackEl) fallbackEl.style.display = "none";
  } else {
    imgEl.style.display = "none";
    if (fallbackEl) fallbackEl.style.display = "flex";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 로고
  const logo = document.querySelector(".logo");
  const logoFallback = document.querySelector(".logo-fallback");
  if (logo) toggleImgVisibility(logo, logoFallback);

  // SNS 아이콘들
  document.querySelectorAll(".sns-btn").forEach((btn) => {
    const img = btn.querySelector(".sns-ico");
    const fallback = btn.querySelector(".sns-fallback");
    if (img) toggleImgVisibility(img, fallback);
  });

  // 폼 제출(데모: 새로고침 방지)
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = form.userId.value.trim();
    const pw = form.password.value.trim();

    if (!id) {
      alert("아이디 또는 이메일을 입력해주세요.");
      form.userId.focus();
      return;
    }
    if (!pw) {
      alert("비밀번호를 입력해주세요.");
      form.password.focus();
      return;
    }

    // 실제 로그인 로직은 여기서 연결
    alert("로그인 시도(데모) — 실제 API 연동은 여기에서 처리하세요.");
  });
});
