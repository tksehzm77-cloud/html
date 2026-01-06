// ====== 페이지 경로(원하는 파일명으로 바꿔도 됨) ======
const ROUTES = {
  home: "home.html",
  signup: "signup.html",
  findId: "find-id.html",
  findPw: "find-password.html",
};

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

// 아이디 저장(옵션) - 데모 로컬스토리지
const STORAGE_KEY = "saved_user_id";

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

  // ====== 아이디 저장 불러오기 ======
  const form = document.getElementById("loginForm");
  const userIdInput = form.elements["userId"];
  const saveIdCheckbox = form.elements["saveId"];

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    userIdInput.value = saved;
    saveIdCheckbox.checked = true;
  }

  // ====== 로그인 제출 → home.html 이동 ======
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = userIdInput.value.trim();
    const pw = form.elements["password"].value.trim();

    if (!id) {
      alert("아이디 또는 이메일을 입력해주세요.");
      userIdInput.focus();
      return;
    }
    if (!pw) {
      alert("비밀번호를 입력해주세요.");
      form.elements["password"].focus();
      return;
    }

    // 아이디 저장 처리
    if (saveIdCheckbox.checked) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    // 실제 로그인 API 연동은 여기에서 처리
    // 성공 시 홈으로 이동
    window.location.href = ROUTES.home;
  });

  // ====== SNS 간편로그인 클릭(연동 자리) ======
  document.querySelectorAll(".sns-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const provider = btn.dataset.provider;

      // 여기에서 각 provider별 OAuth/SDK 연동 코드 넣으면 됨
      // 예: window.location.href = `/auth/${provider}`;
      alert(`${provider} 간편로그인 연동 자리입니다. (여기에 연동 코드 삽입)`);
    });
  });
});