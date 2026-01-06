const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const q = $("#q");
const clearBtn = $("#clearBtn");
const searchBtn = $("#searchBtn");
const sortSelect = $("#sortSelect");

const chipWrap = $("#chipWrap");
const resetChipsBtn = $("#resetChipsBtn");

const recentList = $("#recentList");
const clearRecentBtn = $("#clearRecentBtn");

const resultGrid = $("#resultGrid");
const emptyResult = $("#emptyResult");

const toast = $("#toast");

const RECENT_KEY = "dm_recent_searches_v1";
const MAX_RECENT = 8;

let activeChip = null;

/* ===== Mock Results (UI 확인용 / 이미지 HTML에서 넣는 구조) =====
   실제로는 서버 응답에 맞춰 데이터를 바꿔주면 됩니다.
*/
const MOCK_RESULTS = [
  { title: "민화 아이폰 케이스", sub: "케이스 · 베스트", price: 21900, img: "./images/case.png" },
  { title: "바다 테마 노리개", sub: "노리개 · 신상", price: 48900, img: "./images/norigae1.png" },
  { title: "한복 저고리 셔츠", sub: "한복 · 인기", price: 65000, img: "./images/hanbok.png" },
  { title: "마법 소녀 노리개", sub: "노리개 · 추천", price: 45900, img: "./images/norigae2.png" },
];

function showToast(msg){
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.hidden = true, 1500);
}

function formatPrice(n){
  return Number(n || 0).toLocaleString("ko-KR") + "원";
}

/* ===== Recent ===== */
function loadRecent(){
  try{
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}
function saveRecent(arr){
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
}
function addRecent(keyword){
  const k = keyword.trim();
  if (!k) return;

  const prev = loadRecent().filter(x => x !== k);
  const next = [k, ...prev].slice(0, MAX_RECENT);
  saveRecent(next);
  renderRecent();
}
function removeRecent(keyword){
  const next = loadRecent().filter(x => x !== keyword);
  saveRecent(next);
  renderRecent();
}
function clearRecent(){
  saveRecent([]);
  renderRecent();
}

function renderRecent(){
  const items = loadRecent();
  recentList.innerHTML = "";

  if (items.length === 0){
    const li = document.createElement("li");
    li.style.color = "rgba(107,114,128,.95)";
    li.style.fontSize = "12px";
    li.style.padding = "6px 2px";
    li.textContent = "최근 검색어가 없어요.";
    recentList.appendChild(li);
    return;
  }

  items.forEach(text => {
    const li = document.createElement("li");
    li.className = "recent-item";
    li.innerHTML = `
      <div class="recent-left">
        <img class="icon-mini" src="./images/icon-clock.svg" alt="">
        <div class="recent-text" title="${text}">${text}</div>
      </div>
      <div class="recent-actions">
        <button class="icon-mini-btn" type="button" data-act="use" data-key="${text}" aria-label="검색">
          <img class="icon-mini" src="./images/search.png" alt="">
        </button>
        <button class="icon-mini-btn" type="button" data-act="del" data-key="${text}" aria-label="삭제">
          <img class="icon-mini" src="./images/trash.png" alt="">
        </button>
      </div>
    `;
    recentList.appendChild(li);
  });
}

/* ===== Results ===== */
function applySort(list){
  const v = sortSelect.value;

  const copy = [...list];
  if (v === "PRICE_LOW") copy.sort((a,b)=>a.price-b.price);
  if (v === "PRICE_HIGH") copy.sort((a,b)=>b.price-a.price);
  if (v === "NEW") copy.reverse(); // demo
  return copy;
}

function searchData(keyword){
  const k = keyword.trim().toLowerCase();
  if (!k) return [];

  // demo: title에 포함되면 노출
  return MOCK_RESULTS.filter(x => x.title.toLowerCase().includes(k) || x.sub.toLowerCase().includes(k));
}

function renderResults(list){
  resultGrid.innerHTML = "";
  emptyResult.hidden = list.length > 0;

  if (list.length === 0) return;

  const sorted = applySort(list);
  sorted.forEach(item => {
    const el = document.createElement("article");
    el.className = "card result-card";
    el.innerHTML = `
      <div class="result-thumb">
        <!-- ✅ 결과 썸네일: HTML img로 렌더링 (이미지는 사용자가 교체 가능) -->
        <img src="${item.img}" alt="${item.title}">
      </div>
      <div class="result-meta">
        <div class="result-title">${item.title}</div>
        <div class="result-sub">${item.sub}</div>
        <div class="result-price">${formatPrice(item.price)}</div>
      </div>
    `;
    resultGrid.appendChild(el);
  });
}

/* ===== Chips ===== */
function setChip(chipText){
  activeChip = chipText;
  $$(".chip").forEach(c => c.classList.toggle("is-active", c.dataset.chip === chipText));
  q.value = chipText;
  toggleClear();
  doSearch();
}

function resetChips(){
  activeChip = null;
  $$(".chip").forEach(c => c.classList.remove("is-active"));
}

/* ===== Search ===== */
function toggleClear(){
  clearBtn.hidden = !(q.value && q.value.length > 0);
}

function doSearch(){
  const keyword = q.value.trim();
  if (!keyword){
    renderResults([]);
    return;
  }
  addRecent(keyword);
  const found = searchData(keyword);
  renderResults(found);
}

/* ===== Events ===== */
$("#backBtn").addEventListener("click", () => history.back());
$("#filterBtn").addEventListener("click", () => showToast("필터 (예시)"));

q.addEventListener("input", () => {
  toggleClear();
  if (activeChip && q.value.trim() !== activeChip) resetChips();
});

q.addEventListener("keydown", (e) => {
  if (e.key === "Enter"){
    e.preventDefault();
    doSearch();
  }
});

clearBtn.addEventListener("click", () => {
  q.value = "";
  toggleClear();
  resetChips();
  renderResults([]);
  q.focus();
});

searchBtn.addEventListener("click", doSearch);

sortSelect.addEventListener("change", () => {
  // 현재 결과 재정렬
  const keyword = q.value.trim();
  renderResults(searchData(keyword));
});

chipWrap.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  setChip(btn.dataset.chip);
});

resetChipsBtn.addEventListener("click", () => {
  resetChips();
  showToast("카테고리 초기화");
});

clearRecentBtn.addEventListener("click", () => {
  clearRecent();
  showToast("최근 검색어 삭제");
});

recentList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;

  const act = btn.dataset.act;
  const key = btn.dataset.key;

  if (act === "use"){
    q.value = key;
    toggleClear();
    resetChips();
    doSearch();
  }
  if (act === "del"){
    removeRecent(key);
    showToast("삭제됨");
  }
});

/* Optional */
$("#voiceBtn").addEventListener("click", () => showToast("음성 검색 (예시)"));
$("#imageBtn").addEventListener("click", () => showToast("이미지 검색 (예시)"));

/* Init */
toggleClear();
renderRecent();
renderResults([]);