/* ===========================================================================
   mecmûa · dark-mode toggle
   Shared across every page. The theme attribute is applied pre-paint by a
   tiny inline script in each page's <head>; this file builds the floating
   toggle and handles persistence (localStorage key "mecmua-theme").
   ========================================================================== */
(function () {
  var KEY = 'mecmua-theme';
  var root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function apply(mode) {
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    if (btn) {
      var dark = mode === 'dark';
      btn.textContent = dark ? '☾' : '☀';
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = dark ? 'The Sanctuary, after dark — switch to day' : 'Switch to night';
    }
  }

  var btn;
  function build() {
    if (document.querySelector('.dm-toggle')) return;
    btn = document.createElement('button');
    btn.className = 'dm-toggle';
    btn.type = 'button';
    btn.onclick = function () { apply(current() === 'dark' ? 'light' : 'dark'); };
    document.body.appendChild(btn);
    apply(current());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
