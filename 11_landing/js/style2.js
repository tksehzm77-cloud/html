/* =========================
  Helpers
========================= */
const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toast(msg) {
  // 간단 알림 (원하면 UI 토스트로 확장 가능)
  alert(msg);
}

/* =========================
  Countdown: 다음 22:00까지 남은 시간
========================= */
function getNextTenPM(now = new Date()) {
  const target = new Date(now);
  target.setHours(22, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  return target;
}

function startCountdown() {
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
  Wishlist sample render (하단 테이블)
========================= */
const sampleWishes = [
  { id: 1050, name: "에어팟", date: "2026.01.13" },
  { id: 1049, name: "스타벅스 기프티콘", date: "2026.01.13" },
  { id: 1048, name: "영화관 티켓", date: "2026.01.12" },
  { id: 1047, name: "치킨 기프티콘", date: "2026.01.12" },
  { id: 1046, name: "편의점 상품권", date: "2026.01.11" },
];

function renderWishes(list) {
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

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
  Modal (응모 팝업)
========================= */
const modal = $("#applyModal");
const applyBtn = $("#applyBtn");
const heroApplyBtn = $("#heroApplyBtn");
const modalCloseBtn = $("#modalCloseBtn");
const modalCancelBtn = $("#modalCancelBtn");
const applyForm = $("#applyForm");

function openModal() {
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  // 첫 입력으로 포커스
  setTimeout(() => {
    const first = $("#nameInput");
    first && first.focus();
  }, 0);

  // 스크롤 잠금
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

function getSelectedPrize() {
  const checked = document.querySelector('input[name="prize"]:checked');
  return checked ? checked.value : "";
}

function collectEventData() {
  const answer = ($("#answerInput")?.value || "").trim();
  const prize = getSelectedPrize();
  return { answer, prize };
}

function validateBeforeOpen() {
  const { answer, prize } = collectEventData();

  if (!prize) {
    toast("선물을 선택해주세요.");
    return false;
  }
  if (!answer) {
    toast("정답을 입력해주세요.");
    $("#answerInput")?.focus();
    return false;
  }
  return true;
}

function normalizePhone(phone) {
  // 01012345678 또는 010-1234-5678 형태를 010-1234-5678로 맞춤(간단)
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return phone.trim();
}

function isValidEmail(email) {
  // 너무 빡빡하지 않은 기본 검증
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function persistEntry(entry) {
  const key = "conects_entries";
  const prev = JSON.parse(localStorage.getItem(key) || "[]");
  prev.unshift(entry);
  localStorage.setItem(key, JSON.stringify(prev));
}

/* =========================
  Event bindings
========================= */
function bindEvents() {
  // 응모하기(이벤트 카드)
  applyBtn?.addEventListener("click", () => {
    if (!validateBeforeOpen()) return;
    openModal();
  });

  // 히어로 CTA도 동일하게 (이벤트로 스크롤 + 모달)
  heroApplyBtn?.addEventListener("click", () => {
    // 이벤트 섹션으로 이동
    $("#event")?.scrollIntoView({ behavior: "smooth", block: "start" });

    // 살짝 기다렸다가 모달
    setTimeout(() => {
      if (!validateBeforeOpen()) return;
      openModal();
    }, 450);
  });

  // 모달 닫기
  modalCloseBtn?.addEventListener("click", closeModal);
  modalCancelBtn?.addEventListener("click", closeModal);

  // dim 클릭 닫기
  modal?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "true") closeModal();
  });

  // ESC 닫기
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("is-open")) {
      closeModal();
    }
  });

  // 모달 제출
  applyForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = ($("#nameInput")?.value || "").trim();
    const phoneRaw = ($("#phoneInput")?.value || "").trim();
    const email = ($("#emailInput")?.value || "").trim();

    if (!name) return toast("성함을 입력해주세요.");
    if (!phoneRaw) return toast("전화번호를 입력해주세요.");
    if (!email) return toast("이메일을 입력해주세요.");
    if (!isValidEmail(email)) return toast("이메일 형식이 올바르지 않습니다.");

    const phone = normalizePhone(phoneRaw);
    const { answer, prize } = collectEventData();

    const payload = {
      name,
      phone,
      email,
      answer,
      prize,
      createdAt: new Date().toISOString(),
      ua: navigator.userAgent,
    };

    // ✅ 실제 서버 연동 시 여기서 fetch로 전송하면 됩니다.
    // fetch("/api/apply", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) })

    // 데모: 로컬 저장
    persistEntry(payload);

    console.log("[응모 데이터]", payload);
    closeModal();
    toast("응모가 완료되었습니다! (데모: 로컬 저장 처리)");
    applyForm.reset();
  });

  // Wishlist 등록(데모)
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

  // 영상 버튼(데모)
  $("#videoPlayBtn")?.addEventListener("click", () => {
    toast("영상 재생 영역입니다. 실제 영상 연결 시 iframe/플레이어로 교체하세요.");
  });
}

/* =========================
  Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  startCountdown();
  renderWishes(sampleWishes);
  bindEvents();
});
