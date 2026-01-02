// ====== State ======
let autoLogin = true;
let saveId = false;

const optAuto = document.getElementById("optAuto");
const optSave = document.getElementById("optSave");
const form = document.getElementById("loginForm");

function setOptionUI(btn, checked) {
  const dot = btn.querySelector(".dot");
  btn.setAttribute("aria-pressed", String(checked));
  dot.classList.toggle("is-checked", checked);
}

// init
setOptionUI(optAuto, autoLogin);
setOptionUI(optSave, saveId);

// toggles
optAuto.addEventListener("click", () => {
  autoLogin = !autoLogin;
  setOptionUI(optAuto, autoLogin);
});

optSave.addEventListener("click", () => {
  saveId = !saveId;
  setOptionUI(optSave, saveId);
});

// form submit
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const userId = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!userId) {
    alert("아이디 또는 이메일을 입력해주세요.");
    return;
  }
  if (!password) {
    alert("비밀번호를 입력해주세요.");
    return;
  }

  // ✅ 로그인 성공 처리 (데모)
  // 실제 서비스에서는 여기서 서버 인증 후 성공 시 이동
  location.href = "home.html";
});


  // 예시: 실제 프로젝트에서는 서버 인증/API 연결
  // 아이디 저장 옵션(데모)
  if (saveId) {
    localStorage.setItem("JEJU_LOOP_SAVED_ID", userId);
  } else {
    localStorage.removeItem("JEJU_LOOP_SAVED_ID");
  }

  // // 자동 로그인 옵션(데모)
  // localStorage.setItem("JEJU_LOOP_AUTO_LOGIN", autoLogin ? "1" : "0");

  // alert("로그인 버튼이 눌렸습니다. (데모)");


// restore saved id
(function restore() {
  const saved = localStorage.getItem("JEJU_LOOP_SAVED_ID");
  if (saved) {
    document.getElementById("userId").value = saved;
    saveId = true;
    setOptionUI(optSave, saveId);
  }

  const auto = localStorage.getItem("JEJU_LOOP_AUTO_LOGIN");
  if (auto !== null) {
    autoLogin = auto === "1";
    setOptionUI(optAuto, autoLogin);
  }
})();

// bottom links (demo)
document.getElementById("findId").addEventListener("click", (e) => {
  e.preventDefault();
  alert("아이디 찾기 (데모)");
});
document.getElementById("findPw").addEventListener("click", (e) => {
  e.preventDefault();
  alert("비밀번호 찾기 (데모)");
});
document.getElementById("signup").addEventListener("click", (e) => {
  e.preventDefault();
  alert("회원가입 (데모)");
});

// social buttons (demo)
document.getElementById("kakaoBtn").addEventListener("click", () => alert("카카오 로그인 (데모)"));
document.getElementById("naverBtn").addEventListener("click", () => alert("네이버 로그인 (데모)"));
document.getElementById("facebookBtn").addEventListener("click", () => alert("페이스북 로그인 (데모)"));
