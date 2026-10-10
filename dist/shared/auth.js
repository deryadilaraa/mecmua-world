/* ===========================================================================
   mecmûa · Auth (local mockup)
   A magic-link style sign-in that behaves locally — no backend.
   Session is kept in localStorage ("mecmua-session"). Drop this on any page:
     <script defer src="../_shared/auth.js"></script>
   Then:
     • element with [data-auth-open]   → opens the sign-in modal on click
     • element with [data-auth-label]  → text set to "Sign in" or the member's first name
     • element with [data-auth-link]   → href set to the account page
     • body[data-auth-redirect]        → after sign-in, go to the account page
   API: window.mecmuaAuth.get() / .signIn({name,email}) / .signOut() / .onChange(fn)
   =========================================================================== */
(function () {
  var KEY = 'mecmua-session';
  var listeners = [];

  function get() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function set(sess) {
    try { sess ? localStorage.setItem(KEY, JSON.stringify(sess)) : localStorage.removeItem(KEY); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(sess); } catch (e) {} });
    paint();
  }
  function signIn(o) {
    var name = (o && o.name || '').trim();
    var email = (o && o.email || '').trim();
    if (!name) name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    set({ name: name, email: email, joined: get() ? get().joined : Date.now() });
  }
  function signOut() { set(null); }
  function onChange(fn) { listeners.push(fn); return fn; }
  function first(s) { return (s && s.name ? s.name.split(' ')[0] : ''); }

  // path to the account page, relative to whatever page we're on
  function accountHref() {
    var p = location.pathname;
    if (/\/account\//.test(p)) return './index.html';
    return '../account/index.html';
  }

  function paint() {
    var s = get();
    document.querySelectorAll('[data-auth-label]').forEach(function (el) {
      el.textContent = s ? first(s) : 'Sign in';
    });
    document.querySelectorAll('[data-auth-link]').forEach(function (el) {
      el.setAttribute('href', accountHref());
    });
    document.querySelectorAll('[data-auth-avatar]').forEach(function (el) {
      el.textContent = s ? (first(s)[0] || '✦').toUpperCase() : '✦';
      el.style.display = s ? '' : 'none';
    });
  }

  /* ---- modal ---- */
  var modal;
  function buildModal() {
    if (modal) return modal;
    var css = document.createElement('style');
    css.textContent = [
      '.mq-scrim{position:fixed;inset:0;z-index:2000;background:rgba(6,8,24,0.66);backdrop-filter:blur(6px);display:none;place-items:center;padding:24px}',
      '.mq-scrim.on{display:grid}',
      '.mq-card{width:min(420px,94vw);background:#0c1132;border:1px solid rgba(214,178,112,0.32);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,0.55);overflow:hidden;position:relative;font-family:var(--font-text,system-ui)}',
      '.mq-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(80% 50% at 50% 0%,rgba(120,150,255,0.12),transparent 70%)}',
      '.mq-x{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(214,178,112,0.3);background:transparent;color:#f2e9dd;cursor:pointer;font-size:14px;z-index:2}',
      '.mq-body{position:relative;padding:38px 34px 34px;z-index:1}',
      '.mq-star{font-size:18px;color:#e6c785;text-align:center;letter-spacing:0.5em;padding-left:0.5em}',
      '.mq-h{font-family:var(--font-display,var(--font-serif,serif));text-transform:lowercase;letter-spacing:0.02em;font-weight:400;font-size:30px;text-align:center;margin:12px 0 4px;background:linear-gradient(180deg,#e8d09a,#d2a851 60%,#b98b3d);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.mq-sub{font-family:var(--font-serif,serif);font-style:italic;font-size:15px;color:rgba(242,233,221,0.7);text-align:center;margin:0 0 24px}',
      '.mq-tabs{display:flex;gap:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(214,178,112,0.2);border-radius:999px;padding:4px;margin:0 auto 22px;width:max-content}',
      '.mq-tab{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(243,236,221,0.6);background:transparent;border:none;border-radius:999px;padding:9px 18px;cursor:pointer}',
      '.mq-tab.on{background:rgba(214,178,112,0.16);color:#e6c785}',
      '.mq-field{margin-bottom:14px}',
      '.mq-field label{display:block;font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(243,236,221,0.5);margin-bottom:7px}',
      '.mq-field input{width:100%;box-sizing:border-box;font-family:var(--font-serif,serif);font-size:16px;padding:13px 16px;border-radius:11px;border:1px solid rgba(214,178,112,0.3);background:rgba(255,255,255,0.03);color:#f4ecdd;outline:none;transition:border-color .2s}',
      '.mq-field input:focus{border-color:rgba(214,178,112,0.7)}',
      '.mq-btn{width:100%;font-family:var(--font-mono,monospace);text-transform:uppercase;letter-spacing:0.18em;font-size:11px;padding:15px 0;border-radius:999px;border:none;background:linear-gradient(180deg,#e8d09a,#d2a851 60%,#b98b3d);color:#2a1410;cursor:pointer;margin-top:6px;transition:filter .15s}',
      '.mq-btn:hover{filter:brightness(1.06)}',
      '.mq-note{font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(243,236,221,0.4);text-align:center;margin-top:18px;line-height:1.7}',
      '.mq-sent{text-align:center}',
      '.mq-env{font-size:40px;margin:6px 0 14px}',
      '.mq-sent .mq-em{font-family:var(--font-serif,serif);font-style:italic;color:#e6c785}',
      '.mq-link{margin-top:22px}'
    ].join('');
    document.head.appendChild(css);

    modal = document.createElement('div');
    modal.className = 'mq-scrim';
    modal.innerHTML =
      '<div class="mq-card"><div class="mq-glow"></div><button class="mq-x" aria-label="Close">✕</button>' +
      '<div class="mq-body" id="mq-body"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('.mq-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    return modal;
  }

  var mode = 'in';
  function renderForm() {
    var body = document.getElementById('mq-body');
    var isUp = mode === 'up';
    body.innerHTML =
      '<div class="mq-star">✦</div>' +
      '<h2 class="mq-h">' + (isUp ? 'join the sanctuary' : 'welcome back') + '</h2>' +
      '<p class="mq-sub">' + (isUp ? 'A quiet corner for depth & beauty.' : 'What you seek is also seeking you.') + '</p>' +
      '<div class="mq-tabs"><button class="mq-tab ' + (!isUp ? 'on' : '') + '" data-m="in">Sign in</button>' +
      '<button class="mq-tab ' + (isUp ? 'on' : '') + '" data-m="up">Create account</button></div>' +
      (isUp ? '<div class="mq-field"><label>Your name</label><input id="mq-name" type="text" placeholder="e.g. Lilad" autocomplete="name"></div>' : '') +
      '<div class="mq-field"><label>Email</label><input id="mq-email" type="email" placeholder="you@example.com" autocomplete="email"></div>' +
      '<button class="mq-btn" id="mq-send">Send me a magic link →</button>' +
      '<div class="mq-note">No password — we email you a link.<br>Designed mockup · your session is saved in this browser.</div>';
    body.querySelectorAll('.mq-tab').forEach(function (t) { t.onclick = function () { mode = t.dataset.m; renderForm(); }; });
    body.querySelector('#mq-send').onclick = function () {
      var email = (body.querySelector('#mq-email').value || '').trim();
      var name = isUp ? (body.querySelector('#mq-name').value || '').trim() : '';
      if (!/^\S+@\S+\.\S+$/.test(email)) { body.querySelector('#mq-email').focus(); body.querySelector('#mq-email').style.borderColor = '#c0264b'; return; }
      renderSent(name, email);
    };
  }
  function renderSent(name, email) {
    var body = document.getElementById('mq-body');
    body.innerHTML =
      '<div class="mq-sent"><div class="mq-env">✉</div>' +
      '<h2 class="mq-h">check your email</h2>' +
      '<p class="mq-sub">We sent a link to <span class="mq-em">' + email.replace(/</g, '&lt;') + '</span></p>' +
      '<button class="mq-btn mq-link" id="mq-open">✦ Open your link →</button>' +
      '<div class="mq-note">(In a live site this lands in your inbox.<br>Here, tap above to continue.)</div></div>';
    body.querySelector('#mq-open').onclick = function () {
      signIn({ name: name, email: email });
      close();
      if (document.body.hasAttribute('data-auth-redirect')) location.href = accountHref();
    };
  }
  function open() { buildModal(); mode = 'in'; renderForm(); modal.classList.add('on'); }
  function close() { if (modal) modal.classList.remove('on'); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-auth-open]');
    if (t) { e.preventDefault(); if (get()) { location.href = accountHref(); } else { open(); } }
  });

  window.mecmuaAuth = { get: get, signIn: signIn, signOut: signOut, onChange: onChange, open: open, first: first };
  if (document.readyState !== 'loading') paint(); else document.addEventListener('DOMContentLoaded', paint);
})();
