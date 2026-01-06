const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const orderList = $("#orderList");
const emptyState = $("#emptyState");

const statusSelect = $("#statusSelect");
const resetBtn = $("#resetBtn");

const toast = $("#toast");

const statPayed = $("#statPayed");
const statPrep = $("#statPrep");
const statShipping = $("#statShipping");
const statDone = $("#statDone");

let currentTab = "orders";   // orders | delivery
let currentStatus = "ALL";   // ALL | PAYED | PREP | SHIPPING | DONE | CANCEL

function showToast(msg){
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 1600);
}

function formatKRWFromDataset(){
  // HTML에서 data-price="21900" 같이 넣으면 자동 포맷(선택)
  $$(".pprice[data-price]").forEach(el => {
    const n = Number(el.dataset.price || 0);
    if (!Number.isFinite(n)) return;
    el.textContent = n.toLocaleString("ko-KR") + "원";
  });
}

function computeStats(){
  const cards = $$(".order-card");

  const map = { PAYED:0, PREP:0, SHIPPING:0, DONE:0 };
  cards.forEach(c => {
    const st = c.dataset.status;
    if (map[st] !== undefined) map[st] += 1;
  });

  statPayed.textContent = map.PAYED;
  statPrep.textContent = map.PREP;
  statShipping.textContent = map.SHIPPING;
  statDone.textContent = map.DONE;
}

function applyFilter(){
  const cards = $$(".order-card");
  let visibleCount = 0;

  cards.forEach(c => {
    const matchStatus = (currentStatus === "ALL") || (c.dataset.status === currentStatus);
    c.style.display = matchStatus ? "" : "none";
    if (matchStatus) visibleCount += 1;
  });

  // empty 처리 (카드가 0개면 empty 보여주고 리스트 숨김)
  if (visibleCount === 0){
    emptyState.hidden = false;
  }else{
    emptyState.hidden = true;
  }
}

function applyTab(){
  // 배송조회 탭에서만 배송박스 표시
  const showDelivery = currentTab === "delivery";
  $$("[data-delivery]").forEach(box => {
    box.hidden = !showDelivery;
  });
}

function setTab(tab){
  currentTab = tab;
  $$(".tab").forEach(b => b.classList.toggle("is-active", b.dataset.tab === tab));
  applyTab();
  showToast(tab === "orders" ? "주문내역" : "배송조회");
}

function bindEvents(){
  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  statusSelect.addEventListener("change", (e) => {
    currentStatus = e.target.value;
    applyFilter();
  });

  resetBtn.addEventListener("click", () => {
    currentStatus = "ALL";
    statusSelect.value = "ALL";
    applyFilter();
    showToast("필터 초기화");
  });

  $$(".stat").forEach(s => {
    s.addEventListener("click", () => {
      const st = s.dataset.status;
      currentStatus = st;
      statusSelect.value = st;
      applyFilter();
    });
  });

  // 카드 버튼 예시
  orderList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === "detail") showToast("주문 상세 (예시)");
    if (action === "track") showToast("배송 조회 (예시)");
  });

  $("#backBtn").addEventListener("click", () => history.back());
  $("#menuBtn").addEventListener("click", () => showToast("메뉴 (예시)"));

  const goShopBtn = $("#goShopBtn");
  if (goShopBtn){
    goShopBtn.addEventListener("click", () => showToast("쇼핑 페이지로 이동 (예시)"));
  }

  $("#dateFilterBtn").addEventListener("click", () => showToast("기간 설정 (예시)"));
}

function init(){
  formatKRWFromDataset();
  computeStats();
  applyTab();
  applyFilter();
  bindEvents();
}

init();