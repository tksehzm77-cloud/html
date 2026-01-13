/* =========================
  Helpers
========================= */
const $ = (sel, parent = document) => parent.querySelector(sel);

function pad2(n){ return String(n).padStart(2, "0"); }

function toast(msg){
  alert(msg);
}

/* =========================
  Countdown: 다음 22:00까지 남은 시간
========================= */
function getNextTenPM(now = new Date()){
  const target = new Date(now);
  target.setHours(22, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  return target;
}

function startCountdown(){
  const elH = $("#cdH");
  const elM = $("#cdM");
  const elS = $("#cdS");
  if (!elH || !elM || !elS) return;

  const tick = () => {
    const now = new Date();
    const target = getNextTenPM(now);
    const diff = target - now;

    const totalSec = Math.max(0, Math.floor(diff / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    elH.textContent = pad2(h);
    elM.textContent = pad2(m);
    elS.textContent = pad2(s);
  };

  tick();
  setInterval(tick, 1000);
}

/* =========================
  Wishlist sample render
========================= */
const sampleWishes = [
  { id: 1050, name: "에어팟", date: "2026.01.13" },
  { id: 1049, name: "스타벅스 기프티콘", date: "2026.01.13" },
  { id: 1048, name: "영화관 티켓", date: "2026.01.12" },
  { id: 1047, name: "치킨 기프티콘", date: "2026.01.12" },
  { id: 1046, name: "편의점 상품권", date: "2026.01.11" },
];

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderWishes(list){
  const tbody = $("#wishTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  list.forEach((row) => {
    const div = document.createElement("div");
    div.className = "t-row";
    div.setAttribute("role", "row");
    div.innerHTML = `
      <div class="t-cell" role="cell">${row.id}</div>
      <div class="t-cell" role="cell">${escapeHtml(row.name)}</div>
      <div class="t-cell" role="cell">${row.date}</div>
    `;
    tbody.appendChild(div);
  });
}

/* =========================
  Modal
========================= */
const modal = $("#applyModal");
const applyBtn = $("#applyBtn");
const heroApplyBtn = $("#heroApplyBtn");
const modalCloseBtn = $("#modalCloseBtn");
const modalCancelBtn = $("#modalCancelBtn");

function openModal(){
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    const first = document.querySelector('#contactForm input[name="Name"]');
    first && first.focus();
  }, 0);

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function closeModal(){
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

function getSelectedPrize(){
  return document.querySelector('input[name="prize"]:checked')?.value || "";
}

function collectEventData(){
  const answer = ($("#answerInput")?.value || "").trim();
  const prize = getSelectedPrize();
  return { answer, prize };
}

function validateBeforeOpen(){
  const { answer, prize } = collectEventData();
  if (!prize){
    toast("선물을 선택해주세요.");
    return false;
  }
  if (!answer){
    toast("정답을 입력해주세요.");
    $("#answerInput")?.focus();
    return false;
  }
  return true;
}

function normalizePhone(phone){
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  return String(phone).trim();
}

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================
  Google Sheet submit (요청한 폼 형식)
========================= */
function bindGoogleSheetForm() {
  const scriptURL = "https://script.google.com/macros/s/AKfycbySYt5ca86JKFKOEm7AsRRhPnAE4Zo6ZKyCnJx4-aVFqosJz4-oZh6RvRUNMJve-wjmOA/exec"; // 너가 가진 웹앱 URL 넣기
  const form = document.forms["submit-to-google-sheet"];
  const msg = document.getElementById("formStatus"); // index.html에 있는 상태 문구

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // ✅ 이벤트 섹션에서 정답/경품 선택값을 hidden input에 넣고 전송
    const answer = (document.getElementById("answerInput")?.value || "").trim();
    const prize = document.querySelector('input[name="prize"]:checked')?.value || "";

    if (!prize) return toast("선물을 선택해주세요.");
    if (!answer) return toast("정답을 입력해주세요.");

    document.getElementById("hiddenAnswer").value = answer;
    document.getElementById("hiddenPrize").value = prize;
    document.getElementById("hiddenCreatedAt").value = new Date().toISOString();

    // 전화번호 정규화(선택)
    const telEl = form.querySelector('input[name="Tel"]');
    if (telEl) telEl.value = normalizePhone(telEl.value);

    fetch(scriptURL, { method: "POST", body: new FormData(form) })
      .then(() => {
        if (msg) msg.innerHTML = "응모가 완료되었습니다!";
        setTimeout(() => {
          if (msg) msg.innerHTML = "";
        }, 5000);

        form.reset();
        closeModal();
        toast("응모 완료!");
      })
      .catch((error) => {
        console.error("Error!", error.message);
        if (msg) msg.innerHTML = "전송 실패! URL/배포 설정을 확인하세요.";
        setTimeout(() => {
          if (msg) msg.innerHTML = "";
        }, 5000);
      });
  });
}


/* =========================
  Events
========================= */
function bindEvents(){
  applyBtn?.addEventListener("click", () => {
    if (!validateBeforeOpen()) return;
    openModal();
  });

  heroApplyBtn?.addEventListener("click", () => {
    $("#event")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      if (!validateBeforeOpen()) return;
      openModal();
    }, 450);
  });

  modalCloseBtn?.addEventListener("click", closeModal);
  modalCancelBtn?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "true") closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
  });

  $("#wishAddBtn")?.addEventListener("click", () => {
    const input = $("#wishInput");
    const val = (input?.value || "").trim();
    if (!val) return toast("원하는 선물을 입력해주세요.");

    const id = (sampleWishes[0]?.id || 1050) + 1;
    const date = new Date();
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    sampleWishes.unshift({ id, name: val, date: `${y}.${m}.${d}` });
    renderWishes(sampleWishes);
    input.value = "";
  });

  $("#videoPlayBtn")?.addEventListener("click", () => {
    toast("영상 재생 영역입니다. 실제 영상 연결 시 iframe/플레이어로 교체하세요.");
  });

  // ✅ 구글 시트 전송 바인딩
  bindGoogleSheetForm();
}

/* =========================
  Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  startCountdown();
  renderWishes(sampleWishes);
  bindEvents();
});
