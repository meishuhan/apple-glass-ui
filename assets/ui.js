// 全站交互：语言角标、主题/背景、按钮涟漪、提交加载态、验证码重发倒计时、中英文翻译（运行时词典）
(function () {
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 隐私模式等：忽略 */ } }
  var lang = root.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 翻译 ---------- */
  var dict = null;
  var ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  function tx(str) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(str); var core = m[2];
    if (!core || !/[㐀-鿿（）。，：；《》“”！？]/.test(core)) return str;
    var out = lookup(core);
    return out === core ? str : m[1] + out + m[3];
  }
  function lookup(core) {
    if (dict.exact[core] !== undefined) return dict.exact[core];
    for (var i = 0; i < dict.patterns.length; i++) {
      var p = dict.patterns[i], r = p._re || (p._re = new RegExp(p.re)), mm = r.exec(core);
      if (!mm) continue;
      return p.to.replace(/\$(\d)/g, function (_, n) {
        var g = mm[+n] || '';
        return (p.tr && p.tr.indexOf(+n) >= 0 && dict.exact[g] !== undefined) ? dict.exact[g] : g;
      });
    }
    return core;
  }
  function walk(node) {
    if (node.nodeType === 3) { var t = tx(node.nodeValue); if (t !== node.nodeValue) node.nodeValue = t; return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || node.hasAttribute('data-no-i18n')) return;
    ATTRS.forEach(function (a) { if (node.hasAttribute(a)) { var v = node.getAttribute(a), n = tx(v); if (n !== v) node.setAttribute(a, n); } });
    if (tag === 'INPUT' && (node.type === 'submit' || node.type === 'button') && node.value) node.value = tx(node.value);
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  function startI18n() {
    var done = function () { root.classList.add('i18n-ready'); };
    setTimeout(done, 2000);
    var url = document.querySelector('script[data-dict]');
    fetch(url ? url.getAttribute('data-dict') : '/js/i18n-en.json').then(function (r) { return r.json(); }).then(function (d) {
      dict = d; document.title = tx(document.title); walk(document.body);
      new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          if (m.type === 'characterData') walk(m.target);
          else m.addedNodes.forEach(function (n) { walk(n); });
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
      done();
    }).catch(done);
  }

  /* ---------- 工具区：语言角标 + 外观 ---------- */
  var L = lang === 'en' ? { look: 'Appearance', theme: 'Theme', bg: 'Background', auto: 'Auto', light: 'Light', dark: 'Dark',
    bgs: { aurora: 'Aurora', dusk: 'Dusk', ocean: 'Ocean', mint: 'Mint', plain: 'Plain' }, sw: 'Switch language',
    fx: 'Effects', spot: 'Cursor glow', spotHint: 'Background shifts with the pointer; cards gain edge highlights',
    fabric: 'Flowing silk (WebGL)', fabricHint: 'Fancier but uses more power; not recommended on phones',
    hint: 'Want to try the flowing silk background?', yes: 'Try it', no: 'No thanks' }
    : { look: '外观', theme: '主题', bg: '背景', auto: '自动', light: '浅色', dark: '深色',
    bgs: { aurora: '极光', dusk: '暮色', ocean: '海湾', mint: '青柠', plain: '纯净' }, sw: '切换语言',
    fx: '特效', spot: '光斑跟随', spotHint: '背景随鼠标轻微移动，卡片边缘有高光',
    fabric: '丝绸流动（WebGL）', fabricHint: '更炫，但更耗电；手机上不建议',
    hint: '想试试丝绸流动的动态背景吗？', yes: '试试', no: '不用了' };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function buildTools() {
    var host = document.querySelector('.topbar .nav') || document.querySelector('.topbar');
    if (!host) return;
    var box = el('span', 'tools');
    var lb = el('button', 'tbtn lang', '<b class="' + (lang === 'zh' ? 'on' : '') + '">中</b> | <b class="' + (lang === 'en' ? 'on' : '') + '">EN</b>');
    lb.type = 'button'; lb.setAttribute('aria-label', L.sw); lb.title = L.sw; lb.setAttribute('data-no-i18n', '');
    lb.addEventListener('click', function () { set('portal.lang', lang === 'en' ? 'zh' : 'en'); location.reload(); });
    var ab = el('button', 'tbtn look', '◐'); ab.type = 'button'; ab.setAttribute('aria-label', L.look); ab.title = L.look; ab.setAttribute('data-no-i18n', '');
    var pop = null;
    function closePop() { if (pop) { pop.remove(); pop = null; } }
    ab.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pop) return closePop();
      pop = el('div', 'tpop'); pop.setAttribute('data-no-i18n', '');
      var th = get('portal.theme') || 'auto', bg = get('portal.bg') || 'aurora';
      pop.appendChild(el('h4', '', L.theme));
      var seg = el('div', 'seg');
      [['auto', L.auto], ['light', L.light], ['dark', L.dark]].forEach(function (o) {
        var b = el('button', o[0] === th ? 'on' : '', o[1]); b.type = 'button';
        b.addEventListener('click', function () { set('portal.theme', o[0]); applyLook(); seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); });
        seg.appendChild(b);
      });
      pop.appendChild(seg);
      pop.appendChild(el('h4', '', L.bg));
      var sw = el('div', 'swatches');
      Object.keys(L.bgs).forEach(function (k) {
        var b = el('button', k === bg ? 'on' : ''); b.type = 'button'; b.setAttribute('data-bg', k); b.title = L.bgs[k]; b.setAttribute('aria-label', L.bgs[k]);
        b.addEventListener('click', function () { set('portal.bg', k); applyLook(); sw.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); });
        sw.appendChild(b);
      });
      pop.appendChild(sw);
      pop.appendChild(el('h4', '', L.fx));
      function toggle(label, hint, key, on, fn) {
        var row = el('div', 'toggle'), txt = el('span', '', label + '<small>' + hint + '</small>'), b = el('button', 'sw'); b.type = 'button';
        b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.setAttribute('aria-label', label);
        b.addEventListener('click', function () { var v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v); fn(v); });
        row.appendChild(txt); row.appendChild(b); pop.appendChild(row);
      }
      toggle(L.spot, L.spotHint, 'spot', spotOn(), function (v) { set('portal.fx.spot', v ? 'on' : 'off'); applyFx(); });
      /* 丝绸脚本按需加载：面板打开时再加载，加载完成后补上开关（面板仍开着才补） */
      var mine = pop;
      if (fineMotion()) loadFabric(function () {
        if (pop !== mine || !PortalFabric.supported()) return;
        toggle(L.fabric, L.fabricHint, 'fabric', get('portal.fx.fabric') === 'on', function (v) { set('portal.fx.fabric', v ? 'on' : 'off'); applyFx(); });
      });
      pop.addEventListener('click', function (ev) { ev.stopPropagation(); });
      box.appendChild(pop);
    });
    document.addEventListener('click', closePop);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
    box.appendChild(lb); box.appendChild(ab); host.appendChild(box);
  }
  /* ---------- 特效：光斑跟随（默认开）与丝绸 WebGL（默认关，首页提示一次） ---------- */
  function fineMotion() { return !reduce && matchMedia('(pointer: fine)').matches && matchMedia('(hover: hover)').matches; }
  function spotOn() { return get('portal.fx.spot') !== 'off'; }
  function applyFx() {
    root.classList.toggle('fx-spot', spotOn() && fineMotion());
    if (window.PortalFabric && fineMotion() && get('portal.fx.fabric') === 'on') PortalFabric.start(); else if (window.PortalFabric) PortalFabric.stop();
  }
  var mxT = .5, myT = .3, mxC = .5, myC = .3, fxRaf = 0;
  function fxLoop() {
    mxC += (mxT - mxC) * .12; myC += (myT - myC) * .12;
    root.style.setProperty('--mx', (mxC * 100).toFixed(2) + '%'); root.style.setProperty('--my', (myC * 100).toFixed(2) + '%');
    root.style.setProperty('--px', (mxC - .5).toFixed(3)); root.style.setProperty('--py', (myC - .5).toFixed(3));
    fxRaf = (Math.abs(mxT - mxC) + Math.abs(myT - myC) > .001) ? requestAnimationFrame(fxLoop) : 0;
  }
  document.addEventListener('pointermove', function (e) {
    if (!root.classList.contains('fx-spot') || e.pointerType === 'touch') return;
    mxT = e.clientX / innerWidth; myT = e.clientY / innerHeight; if (!fxRaf) fxRaf = requestAnimationFrame(fxLoop);
    var c = e.target.closest && e.target.closest('.card');
    if (c) { var r = c.getBoundingClientRect(); c.style.setProperty('--cx', (e.clientX - r.left) + 'px'); c.style.setProperty('--cy', (e.clientY - r.top) + 'px'); }
  }, { passive: true });
  function loadFabric(cb) {
    if (window.PortalFabric) return cb();
    var s = document.createElement('script'); s.src = '/js/fabric.js'; s.onload = cb; document.head.appendChild(s);
  }
  function maybeHint() {
    if (!document.querySelector('.hero') || get('portal.fx.hint') || get('portal.fx.fabric') === 'on' || !fineMotion()) return;
    loadFabric(function () {
      if (!PortalFabric.supported()) return;
      setTimeout(function () {
        var t = el('div', 'toast'); t.setAttribute('role', 'dialog'); t.setAttribute('data-no-i18n', '');
        t.appendChild(el('span', '', L.hint));
        var y = el('button', 'primary', L.yes), n = el('button', '', L.no); y.type = n.type = 'button';
        y.addEventListener('click', function () { set('portal.fx.hint', '1'); set('portal.fx.fabric', 'on'); t.remove(); applyFx(); });
        n.addEventListener('click', function () { set('portal.fx.hint', '1'); t.remove(); });
        t.appendChild(y); t.appendChild(n); document.body.appendChild(t);
      }, 2500);
    });
  }
  function revealOnScroll() {
    var els = document.querySelectorAll('.sr'); if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .15 });
    els.forEach(function (e) { io.observe(e); });
  }

  function applyLook() {
    var th = get('portal.theme'), bg = get('portal.bg');
    if (th === 'light' || th === 'dark') root.setAttribute('data-theme', th); else root.removeAttribute('data-theme');
    root.setAttribute('data-bg', bg || 'aurora');
  }

  /* ---------- 点击涟漪 + 提交加载态 ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (reduce) return;
    var b = e.target.closest('button, a.btn');
    if (!b || b.disabled || b.closest('.tpop')) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    var s = el('span', 'ripple'); s.style.width = s.style.height = d + 'px';
    s.style.left = (e.clientX - r.left - d / 2) + 'px'; s.style.top = (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 650);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, btn = e.submitter || f.querySelector('button[type=submit], button:not([type])');
    if (!btn || f.hasAttribute('data-no-loading') || e.defaultPrevented) return;
    if (f.__busy) { e.preventDefault(); return; }       // 防重复提交
    f.__busy = true; btn.classList.add('loading');
    setTimeout(function () { f.__busy = false; btn.classList.remove('loading'); }, 15000);   // 兜底（如下载型响应不会离开页面）
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) document.querySelectorAll('button.loading').forEach(function (b) { b.classList.remove('loading'); b.form && (b.form.__busy = false); });
  });

  /* ---------- 验证码发送：请求中状态 + 成功后 60 秒重发倒计时 ---------- */
  document.body.addEventListener('htmx:afterRequest', function (e) {
    var b = e.detail.elt; if (!b || b.tagName !== 'BUTTON' || !/\/send$/.test(b.getAttribute('hx-post') || '')) return;
    setTimeout(function () {
      var slot = b.nextElementSibling, ok = slot && slot.querySelector('.ok, .msg.ok');
      if (!ok && !(slot && /\.ok\b/.test(slot.className))) return;
      var orig = b.getAttribute('data-orig') || b.textContent; b.setAttribute('data-orig', orig);
      var left = 60; b.disabled = true;
      (function tick() {
        if (left <= 0) { b.disabled = false; b.textContent = orig; return; }
        var s = lang === 'en' ? 'Resend in ' + left + 's' : '重新获取（' + left + 's）';
        b.textContent = s; left--; setTimeout(tick, 1000);
      })();
    }, 0);
  });

  function init() {
    applyLook(); buildTools(); revealOnScroll();
    if (fineMotion() && get('portal.fx.fabric') === 'on') loadFabric(applyFx); else applyFx();
    maybeHint();
    if (lang === 'en') startI18n();
    var hero = document.querySelector('.hero'); if (hero) hero.classList.add('reveal');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
