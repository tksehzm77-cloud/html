const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const cq = $("#cq");
const clearBtn = $("#clearBtn");
const searchBtn = $("#searchBtn");
const feedList = $("#feedList");
const emptyState = $("#emptyState");
const toast = $("#toast");

let currentTab = "feed";     // feed | events | custom
let currentChip = "ALL";     // ALL | HOT | NEW | NEAR

/* ===== Mock Posts (UI 확인용) =====
   이미지/아이콘은 HTML img를 사용. 여기서는 게시글 미디어 이미지만 경로로 렌더링.
*/
const POSTS = [
  {
    type: "events",
    user: "유설화",
    time: "방금",
    title: "달몽 민화 특별전 다녀왔어요!",
    text: "전통 채색이 정말 예쁘고, 굿즈도 많아서 추천해요. 다음엔 체험도 해보고 싶어요.",
    tags: ["전시·체험", "제주", "민화"],
    likes: 24,
    comments: 6,
    saved: 11,
    media: "./images/post1.png",
    userPic: "./images/profile1.png",
  },
  {
    type: "custom",
    user: "백이안",
    time: "2시간 전",
    title: "노리개 + 미니백 조합 꿀팁 공유",
    text: "가방에 달 때 길이감 맞추면 훨씬 예뻐요. 금색 포인트 들어간 노리개랑 찰떡!",
    tags: ["커스텀", "노리개", "키링"],
    likes: 58,
    comments: 13,
    saved: 22,
    media: "./images/post2.png",
    userPic: "./images/profile2.png",
  },
  {
    type: "feed",
    user: "나유이",
    time: "어제",
    title: "한복 저고리 셔츠로 데일리룩 완성",
    text: "요즘 한복 모티브 셔츠가 진짜 활용도 좋아요. 기본 청바지랑 입으면 깔끔!",
    tags: ["한복", "데일리", "추천"],
    likes: 41,
    comments: 9,
    saved: 8,
    media: "./images/post3.png",
    userPic: "./images/profile3.png",
  },
];

function showToast(msg){
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.hidden=true, 1500);
}

function matchesTab(post){
  if (currentTab === "feed") return true;
  return post.type === currentTab;
}

function matchesQuery(post, q){
  const k = q.trim().toLowerCase();
  if (!k) return true;
  const pool = `${post.title} ${post.text} ${post.tags.join(" ")}`.toLowerCase();
  return pool.includes(k);
}

function applyChip(list){
  if (currentChip === "ALL") return list;

  if (currentChip === "HOT"){
    return [...list].sort((a,b)=>b.likes - a.likes);
  }
  if (currentChip === "NEW"){
    return list; // demo: 그대로
  }
  if (currentChip === "NEAR"){
    // demo: 가까운 글(예시) - 실제 위치 기반은 추후 연동
    return list.filter(p => p.tags.includes("제주"));
  }
  return list;
}

function render(){
  const query = cq.value;
  const filtered = POSTS.filter(p => matchesTab(p) && matchesQuery(p, query));
  const finalList = applyChip(filtered);

  feedList.innerHTML = "";
  emptyState.hidden = finalList.length > 0;

  finalList.forEach(p => {
    const el = document.createElement("article");
    el.className = "card post";

    el.innerHTML = `
      <div class="post-head">
        <div class="user">
          <div class="user-pic">
            <img src="${p.userPic}" alt="${p.user}">
          </div>
          <div class="user-meta">
            <div class="user-name">${p.user}</div>
            <div class="user-sub">${p.time}</div>
          </div>
        </div>
        <button class="kebab" type="button" aria-label="더보기" data-act="more">
          <img class="icon-mini" src="./images/more.png" alt="더보기">
        </button>
      </div>

      <div class="post-title">${p.title}</div>
      <div class="post-text">${p.text}</div>

      <div class="post-tags">
        ${p.tags.map(t => `<span class="tag">#${t}</span>`).join("")}
      </div>

      <div class="media">
        <!-- ✅ 게시글 썸네일도 img로 (사용자가 이미지 교체 가능) -->
        <img src="${p.media}" alt="게시글 이미지">
      </div>

      <div class="post-actions">
        <div class="action-left">
          <button class="action-btn" type="button" data-act="like">
            <img class="icon-mini" src="./images/like.png" alt="좋아요">
            좋아요 <span class="count">${p.likes}</span>
          </button>
          <button class="action-btn" type="button" data-act="comment">
            <img class="icon-mini" src="./images/pencil2.png" alt="댓글">
            댓글 <span class="count">${p.comments}</span>
          </button>
        </div>

        <button class="action-btn" type="button" data-act="save">
          <img class="icon-mini" src="./images/down.png" alt="저장">
          저장 <span class="count">${p.saved}</span>
        </button>
      </div>
    `;

    feedList.appendChild(el);
  });
}

function setTab(tab){
  currentTab = tab;
  $$(".tab").forEach(b => b.classList.toggle("is-active", b.dataset.tab === tab));
  render();
  showToast(tab === "feed" ? "피드" : (tab === "events" ? "전시·체험" : "커스텀 조합"));
}

function setChip(chip){
  currentChip = chip;
  $$(".chip").forEach(c => c.classList.toggle("is-active", c.dataset.chip === chip));
  render();
}

function toggleClear(){
  clearBtn.hidden = !(cq.value && cq.value.length > 0);
}

/* Events */
$("#backBtn").addEventListener("click", () => history.back());
$("#bellBtn").addEventListener("click", () => showToast("알림 (예시)"));

cq.addEventListener("input", () => {
  toggleClear();
  render();
});
cq.addEventListener("keydown", (e) => {
  if (e.key === "Enter"){
    e.preventDefault();
    render();
  }
});

clearBtn.addEventListener("click", () => {
  cq.value = "";
  toggleClear();
  render();
  cq.focus();
});

searchBtn.addEventListener("click", render);

$$(".tab").forEach(btn => btn.addEventListener("click", ()=>setTab(btn.dataset.tab)));
$$(".chip").forEach(btn => btn.addEventListener("click", ()=>setChip(btn.dataset.chip)));

$("#tagAllBtn").addEventListener("click", () => { cq.value=""; toggleClear(); setTab("feed"); });
$("#tagExBtn").addEventListener("click", () => { cq.value="전시"; toggleClear(); setTab("events"); render(); });
$("#tagCustomBtn").addEventListener("click", () => { cq.value="커스텀"; toggleClear(); setTab("custom"); render(); });

$("#openComposerBtn").addEventListener("click", () => showToast("글쓰기 열기 (예시)"));
$("#photoBtn").addEventListener("click", () => showToast("사진 첨부 (예시)"));
$("#locationBtn").addEventListener("click", () => showToast("위치 첨부 (예시)"));
$("#fabBtn").addEventListener("click", () => showToast("글쓰기 (예시)"));
$("#writeBtn").addEventListener("click", () => showToast("글쓰기 (예시)"));

feedList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;

  const act = btn.dataset.act;
  if (act === "like") showToast("좋아요 (예시)");
  if (act === "comment") showToast("댓글 (예시)");
  if (act === "save") showToast("저장 (예시)");
  if (act === "more") showToast("더보기 (예시)");
});

/* Init */
toggleClear();
render();