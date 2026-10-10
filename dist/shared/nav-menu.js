/* ===========================================================================
   mecmûa · collapsing nav
   Hides every nav link behind a single "Menu ✦" dropdown, leaving only the
   mecmûa wordmark in the bar. Self-contained (injects its own styles) so it
   works on any page regardless of which stylesheets are linked.
   Load with: <script defer src="../_shared/nav-menu.js"></script>
   =========================================================================== */
(function () {
  var CSS = "" +
    ".navmenu{position:relative;display:inline-block}" +
    ".navmenu-toggle{font-family:var(--font-mono,'DM Mono',monospace);text-transform:uppercase;letter-spacing:0.2em;" +
      "font-size:10px;color:rgba(243,236,221,0.74);background:transparent;border:1px solid rgba(214,178,112,0.38);" +
      "border-radius:999px;padding:9px 16px;cursor:pointer;display:inline-flex;align-items:center;gap:9px;" +
      "transition:color .2s,border-color .2s;white-space:nowrap}" +
    ".navmenu-toggle:hover,.navmenu.open .navmenu-toggle{color:#e6c785;border-color:rgba(214,178,112,0.7)}" +
    ".navmenu-toggle .nm-star{transition:transform .3s ease}" +
    ".navmenu.open .navmenu-toggle .nm-star{transform:rotate(90deg)}" +
    ".navmenu-panel{position:absolute;top:calc(100% + 12px);right:0;z-index:300;display:flex;flex-direction:column;gap:2px;" +
      "min-width:200px;background:rgba(9,12,38,0.97);-webkit-backdrop-filter:blur(16px) saturate(120%);" +
      "backdrop-filter:blur(16px) saturate(120%);border:1px solid rgba(214,178,112,0.3);border-radius:16px;padding:12px;" +
      "box-shadow:0 24px 60px rgba(0,0,0,0.55);opacity:0;visibility:hidden;transform:translateY(-8px);" +
      "transition:opacity .24s ease,transform .24s ease,visibility .24s}" +
    ".navmenu.open .navmenu-panel{opacity:1;visibility:visible;transform:translateY(0)}" +
    ".navmenu-panel a{display:block;padding:11px 15px;border-radius:9px;white-space:nowrap;" +
      "font-family:var(--font-mono,'DM Mono',monospace);text-transform:uppercase;letter-spacing:0.18em;font-size:10px;" +
      "color:rgba(243,236,221,0.74);transition:background .18s,color .18s}" +
    ".navmenu-panel a:hover,.navmenu-panel a.here{background:rgba(214,178,112,0.14);color:#e6c785}" +
    "@media print{.navmenu{display:none}}";

  function init() {
    var header = document.querySelector('header');
    if (!header) return;
    var nav = header.querySelector('nav.nav');
    if (!nav || nav.dataset.collapsed === '1') return;
    nav.dataset.collapsed = '1';

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'navmenu';
    var btn = document.createElement('button');
    btn.className = 'navmenu-toggle';
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML = 'Menu <span class="nm-star">\u2726</span>';

    nav.parentNode.insertBefore(wrap, nav);
    wrap.appendChild(btn);
    wrap.appendChild(nav);
    nav.classList.add('navmenu-panel');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      wrap.classList.toggle('open');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') wrap.classList.remove('open');
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') wrap.classList.remove('open');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
