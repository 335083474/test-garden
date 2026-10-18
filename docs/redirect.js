(() => {
  const base = '/test-garden';
  const target = new URL('https://test-garden-first-edition.liuq75061.chatgpt.site/');
  const p = window.location.pathname;
  const suffix = p === base || p === base + '/' || p === base + '/index.html'
    ? '/' : p.startsWith(base + '/') ? p.slice(base.length) : '/';
  target.pathname = suffix;
  target.search = window.location.search;
  target.hash = window.location.hash;
  for (const link of document.querySelectorAll('[data-continue]')) link.href = target.href;
  window.location.replace(target.href);
})();
