(() => {
  const language = document.documentElement.lang === 'en' ? 'en' : 'zh';
  try {
    const saved = localStorage.getItem('crossstore-language');
    if (language === 'zh' && saved === 'en') {
      const path = location.pathname === '/credits.html' ? '/en/credits.html' : '/en/';
      location.replace(path + location.search + location.hash);
    }
  } catch { /* Private browsing may block storage; explicit locale links still work. */ }
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-locale-link]');
    if (!link) return;
    try { localStorage.setItem('crossstore-language', link.dataset.localeLink); } catch { /* Optional preference. */ }
    if (location.hash && !link.hash) link.hash = location.hash;
  });
})();
