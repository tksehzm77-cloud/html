(function () {
  const backBtn = document.getElementById('backBtn');
  const cameraBtn = document.getElementById('cameraBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const bioToggle = document.getElementById('bioToggle');

  // ✅ 뒤로가기: 마이 페이지로 이동
  backBtn?.addEventListener('click', () => {
    location.href = 'https://tksehzm77-cloud.github.io/html/dalmong/my.html';
  });

  cameraBtn?.addEventListener('click', () => {
    console.log('프로필 변경 클릭');
  });

  bioToggle?.addEventListener('change', (e) => {
    console.log('생체인식 사용:', e.target.checked);
  });

  logoutBtn?.addEventListener('click', () => {
    console.log('logout');
    // location.href = 'login.html';
  });

  const goByDataHref = (el) => {
    const href = el.getAttribute('data-href');
    if (href && href !== '#') location.href = href;
  };

  document.querySelectorAll('.panel a.row').forEach((row) => {
    row.addEventListener('click', (e) => {
      e.preventDefault();
      goByDataHref(row);
    });
  });
})();
