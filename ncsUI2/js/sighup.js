const form = document.getElementById("signupForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  alert("회원가입 완료 (데모)");
  // 실제 서비스에서는 가입 완료 후 로그인 페이지 이동
  location.href = "login.html";
});
