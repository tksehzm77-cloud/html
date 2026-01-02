const form = document.getElementById("signupForm");
const agreeBtn = document.getElementById("agreeAll");

let agreed = false;

agreeBtn.addEventListener("click", () => {
  agreed = !agreed;
  agreeBtn.querySelector(".dot").classList.toggle("is-checked", agreed);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!agreed) {
    alert("약관에 동의해주세요.");
    return;
  }

  alert("회원가입 완료 (데모)");
  location.href = "login.html";
});
