// 아이콘/이미지는 사용자가 src를 채워 넣는 구조입니다.
// 링크 이동은 data-href 값을 바꾸면 그대로 동작합니다.

(function () {
  const backBtn = document.getElementById('backBtn');
  const menuBtn = document.getElementById('menuBtn');

  // 상단 버튼 동작(필요 없으면 제거 가능)
  backBtn?.addEventListener('click', () => {
    // 원하는 페이지로 보내고 싶으면 아래처럼 교체:
    // location.href = 'prev.html';
    history.back();
  });

  menuBtn?.addEventListener('click', () => {
    // 메뉴 오픈 동작은 사용자 구현에 맞게 연결
    // 예: location.href = 'menu.html';
    console.log('menu click');
  });

  // "나의 아바타 꾸미기" 버튼 링크
  const avatarDecorateLink = document.getElementById('avatarDecorateLink');
  avatarDecorateLink?.addEventListener('click', (e) => {
    e.preventDefault();
    // 원하는 페이지로 교체:
    // location.href = 'avatar.html';
    console.log('go avatar decorate');
  });

  // 리스트/하단네비 공통 링크 처리
  const goByDataHref = (el) => {
    const href = el.getAttribute('data-href');
    if (href && href !== '#') location.href = href;
  };

  document.querySelectorAll('.list-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      goByDataHref(item);
    });
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      goByDataHref(item);
    });
  });
})();
