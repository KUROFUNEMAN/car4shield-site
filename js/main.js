/* car 4 shield fukuoka ─ 仕掛け
   ① ヒーロー：指先・マウスの位置で塗装の艶の当たりが動く（光の帯はCSSでゆっくり）
   ② 施工前／施工後スライダー
   ③ スクロールでフィルムが貼られていく
   ④ 料金：サイズを選ぶと金額が切り替わる
   ⑤ 指先の光を映すパネル
   動きを減らす設定（prefers-reduced-motion）では、自動の動きは止め、操作したときだけ反応する。 */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.remove('no-js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header */
  var hd = d.querySelector('.hd');
  function onScrollHd() { if (hd) hd.classList.toggle('is-solid', window.scrollY > 40 || !d.querySelector('.hero, .hx-hero, .page-hd')); }
  onScrollHd(); window.addEventListener('scroll', onScrollHd, { passive: true });
  var mb = d.querySelector('.menu-btn');
  if (mb) {
    mb.addEventListener('click', function () {
      var open = d.body.classList.toggle('menu-open');
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    d.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { d.body.classList.remove('menu-open'); mb.setAttribute('aria-expanded', 'false'); }); });
  }

  /* reveal */
  var rvs = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('in'); });

  /* ① hero sheen follows pointer */
  var hero = d.querySelector('.hero');
  if (hero) {
    var sheen = hero.querySelector('.sheen'), raf1 = 0, tx = 62, ty = 58;
    function setSheen() { raf1 = 0; sheen.style.setProperty('--lx', tx + '%'); sheen.style.setProperty('--ly', ty + '%'); }
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width * 100).toFixed(1); ty = ((e.clientY - r.top) / r.height * 100).toFixed(1);
      if (!raf1) raf1 = requestAnimationFrame(setSheen);
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { tx = 62; ty = 58; if (!raf1) raf1 = requestAnimationFrame(setSheen); });
  }

  /* 見せ場：スクロールに合わせて、車が枠の外へ迫り出す（切り抜いた車の層を手前へ） */
  var track = d.querySelector('.hero-track');
  if (track && hero) {
    var pop = hero.querySelector('.car-pop-in'), pimg = hero.querySelector('.car-pop img'), rafH = 0;
    var CAR = { u: .463, v: .622 }; /* 元写真の中での車の中心 */
    function origin() {
      var W = hero.clientWidth, H = hero.clientHeight, iw = 1600, ih = 1200;
      var s = Math.max(W / iw, H / ih), pos = getComputedStyle(pimg).objectPosition.split(' ');
      var px = parseFloat(pos[0]) / 100, py = parseFloat(pos[1]) / 100;
      var ox = (W - iw * s) * px + CAR.u * iw * s, oy = (H - ih * s) * py + CAR.v * ih * s;
      pop.style.setProperty('--ox', ox + 'px'); pop.style.setProperty('--oy', oy + 'px');
      var pic = hero.querySelector('.car-pop picture'); if (pic) { pic.style.setProperty('--ox', ox + 'px'); pic.style.setProperty('--oy', oy + 'px'); }
    }
    function hupd() {
      rafH = 0;
      var r = track.getBoundingClientRect(), total = track.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
      var e = p * p * (3 - 2 * p);
      pop.style.setProperty('--cs', (1 + e * .6).toFixed(4));
      pop.style.setProperty('--ty', (e * window.innerHeight * .1).toFixed(1) + 'px');
      hero.style.setProperty('--dim', (e * .62).toFixed(3));
      hero.style.setProperty('--fs', (1 - e * .06).toFixed(4));
      hero.style.setProperty('--to', Math.max(0, 1 - p * 2.6).toFixed(3));
      hero.style.setProperty('--tt', (-p * 60).toFixed(1) + 'px');
    }
    origin();
    window.addEventListener('resize', function () { origin(); hupd(); });
    if (!reduce) { hupd(); window.addEventListener('scroll', function () { if (!rafH) rafH = requestAnimationFrame(hupd); }, { passive: true }); }
  }


  (function () {
  /* ════════ HEX LIGHT × SHIELD ════════ */
  /* 開幕：飛ばせる。2回目以降は短く */
  var intro = d.getElementById('intro');
  if (intro) {
    var endIntro = function () { if (!intro) return; intro.classList.add('gone'); var i0 = intro; intro = null; setTimeout(function () { i0.remove(); }, 500); };
    try { localStorage.setItem('c4s-intro', '1'); } catch (e) {}
    var dur = intro.classList.contains('short') ? 1600 : 3450;
    setTimeout(endIntro, dur);
    intro.querySelector('.intro-skip').addEventListener('click', endIntro);
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { if (intro && performance.now() > 600) endIntro(); }, { once: true, passive: true }); });
  }

  /* ヒーロー：カーソル（指）が懐中電灯になる */
  var hx = d.querySelector('.hx-hero');
  if (hx) {
    var stg = hx.querySelector('.hx-stage-in'), layers = hx.querySelectorAll('.hx-lit, .hx-hexrefl'), mx = -1, my = -1, user = false, rafT = 0, t0 = performance.now();
    function torch(x, y) {
      var hr = hx.getBoundingClientRect(), sr = stg.getBoundingClientRect();
      hx.style.setProperty('--mx', (x - hr.left) + 'px'); hx.style.setProperty('--my', (y - hr.top) + 'px');
      var sx = (x - sr.left) / sr.width * 100, sy = (y - sr.top) / sr.height * 100;
      layers.forEach(function (l) { l.style.setProperty('--sx', sx + '%'); l.style.setProperty('--sy', sy + '%'); l.style.setProperty('--tr', Math.max(170, sr.width * .2) + 'px'); });
    }
    hx.addEventListener('pointermove', function (e) { user = true; mx = e.clientX; my = e.clientY; if (!rafT) rafT = requestAnimationFrame(function () { rafT = 0; torch(mx, my); }); }, { passive: true });
    hx.addEventListener('pointerdown', function (e) { user = true; torch(e.clientX, e.clientY); }, { passive: true });
    /* 触っていない間は、光がゆっくり車体をなでる（動きを減らす設定では止めて中央） */
    function idle(now) {
      if (!user) {
        var sr = stg.getBoundingClientRect(), t = (now - t0) / 1000;
        var x = sr.left + sr.width * (.5 + .36 * Math.sin(t * .45)), y = sr.top + sr.height * (.45 + .18 * Math.sin(t * .9));
        torch(x, y);
        requestAnimationFrame(idle);
      }
    }
    if (reduce) { var sr0 = stg.getBoundingClientRect(); torch(sr0.left + sr0.width * .55, sr0.top + sr0.height * .45); }
    else requestAnimationFrame(idle);
    var trk = d.querySelector('.hero-track'), rafS = 0;
    function hscroll() {
      rafS = 0;
      var r = trk.getBoundingClientRect(), total = trk.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0, e = p * p * (3 - 2 * p);
      stg.style.setProperty('--cs', (1 + e * .7).toFixed(4));
      stg.style.setProperty('--ty', (e * window.innerHeight * .12).toFixed(1) + 'px');
      hx.style.setProperty('--to', Math.max(0, 1 - p * 2.8).toFixed(3));
      hx.style.setProperty('--tt', (-p * 70).toFixed(1) + 'px');
      if (user) torch(mx, my);
    }
    if (!reduce && trk) { hscroll(); window.addEventListener('scroll', function () { if (!rafS) rafS = requestAnimationFrame(hscroll); }, { passive: true }); }
  }

  /* フィルムを剥がす */
  var pb = d.getElementById('peel-box');
  if (pb) {
    var film = pb.querySelector('.peel-film'), fsh = pb.querySelector('.peel-fshadow'), flap = pb.querySelector('.peel-flap'), handle = pb.querySelector('.peel-handle');
    var W = 0, H = 0, P = null, anim = 0, REST = 34;
    function size() { W = pb.clientWidth; H = pb.clientHeight; }
    function clipHalf(poly, M, n, keepNeg) {
      var out = [], f = function (q) { return (q[0] - M[0]) * n[0] + (q[1] - M[1]) * n[1]; };
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
        var ina = keepNeg ? fa <= 0 : fa > 0, inb = keepNeg ? fb <= 0 : fb > 0;
        if (ina) out.push(a);
        if (ina !== inb) { var t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      return out;
    }
    function poly2css(pts, ox, oy) { return pts.length ? 'polygon(' + pts.map(function (q) { return (q[0] + ox).toFixed(1) + 'px ' + (q[1] + oy).toFixed(1) + 'px'; }).join(',') + ')' : 'polygon(0 0,0 0,0 0)'; }
    function draw(px, py) {
      P = [px, py];
      var C = [W, H], dx = C[0] - px, dy = C[1] - py, len = Math.hypot(dx, dy);
      if (len < 1) { film.style.setProperty('--clip', 'none'); fsh.style.setProperty('--clip', 'none'); fsh.style.setProperty('--fsh', 'none'); flap.style.setProperty('--fclip', 'polygon(0 0,0 0,0 0)'); return; }
      var n = [dx / len, dy / len], M = [(C[0] + px) / 2, (C[1] + py) / 2];
      var rect = [[0, 0], [W, 0], [W, H], [0, H]];
      var keep = clipHalf(rect, M, n, true), gone = clipHalf(rect, M, n, false);
      var kc = poly2css(keep, 0, 0);
      film.style.setProperty('--clip', kc); fsh.style.setProperty('--clip', kc);
      var refl = gone.map(function (q) { var k = 2 * ((q[0] - M[0]) * n[0] + (q[1] - M[1]) * n[1]); return [q[0] - k * n[0], q[1] - k * n[1]]; });
      flap.style.setProperty('--fclip', poly2css(refl, W, H));
      /* 影と反射：折り目からの距離で濃淡 */
      var ang = Math.atan2(-n[0], n[1]) * 180 / Math.PI; /* CSSの角度：-n 方向へ */
      var u = [-n[0], -n[1]];
      var Lg = Math.abs(W * u[0]) + Math.abs(H * u[1]), s = (M[0] - W / 2) * u[0] + (M[1] - H / 2) * u[1] + Lg / 2;
      var sh = Math.min(70, len * .35);
      fsh.style.setProperty('--fsh', 'linear-gradient(' + ang + 'deg, rgba(0,0,0,0) ' + (s - .5) + 'px, rgba(0,0,0,.42) ' + s + 'px, rgba(0,0,0,0) ' + (s + sh) + 'px)');
      var W3 = W * 3, H3 = H * 3, Lf = Math.abs(W3 * u[0]) + Math.abs(H3 * u[1]), sf = (M[0] - W / 2) * u[0] + (M[1] - H / 2) * u[1] + Lf / 2, depth = len / 2;
      fsh.style.setProperty('--fsh', fsh.style.getPropertyValue('--fsh'));
      flap.style.setProperty('--fbg', 'linear-gradient(' + ang + 'deg, #fbfdfe ' + sf + 'px, #dfe8ed ' + (sf + depth * .35) + 'px, #f4f8fa ' + (sf + depth * .6) + 'px, #b9c7cf ' + (sf + depth) + 'px), linear-gradient(' + (ang + 120) + 'deg, rgba(190,225,235,.0), rgba(214,200,236,.35), rgba(190,225,235,0))');
      pb.classList.toggle('done', len > Math.hypot(W, H) * 1.9);
    }
    function rest() { draw(W - REST, H - REST); }
    function animateTo(tx, ty, ms, cb) {
      cancelAnimationFrame(anim);
      if (reduce) { draw(tx, ty); cb && cb(); return; }
      var sx = P ? P[0] : W, sy = P ? P[1] : H, st = performance.now();
      (function step(now) { var q = Math.min(1, (now - st) / ms), e = 1 - Math.pow(1 - q, 3); draw(sx + (tx - sx) * e, sy + (ty - sy) * e); if (q < 1) anim = requestAnimationFrame(step); else cb && cb(); })(st);
    }
    function peelAll() { animateTo(-W * 1.05, -H * 1.05, 1400); }
    size(); rest();
    window.addEventListener('resize', function () { var done = pb.classList.contains('done'); size(); if (done) draw(-W * 1.05, -H * 1.05); else rest(); });
    var drag = false, off = [0, 0];
    handle.addEventListener('pointerdown', function (e) {
      drag = true; pb.classList.add('dragging'); handle.setPointerCapture(e.pointerId); cancelAnimationFrame(anim);
      var r = pb.getBoundingClientRect(); off = [P[0] - (e.clientX - r.left), P[1] - (e.clientY - r.top)];
    });
    handle.addEventListener('pointermove', function (e) {
      if (!drag) return; var r = pb.getBoundingClientRect();
      draw(Math.max(-W * 1.1, Math.min(W, e.clientX - r.left + off[0])), Math.max(-H * 1.1, Math.min(H, e.clientY - r.top + off[1])));
      handle.style.right = (W - P[0] - 55) + 'px'; handle.style.bottom = (H - P[1] - 55) + 'px';
    });
    function up() {
      if (!drag) return; drag = false; pb.classList.remove('dragging');
      var peeled = Math.hypot(W - P[0], H - P[1]) / Math.hypot(W, H);
      handle.style.right = '0px'; handle.style.bottom = '0px';
      if (peeled > .55) peelAll(); else animateTo(W - REST, H - REST, 700);
    }
    handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    handle.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); peelAll(); } });
    d.getElementById('peel-reset').addEventListener('click', function () { animateTo(W - REST, H - REST, 900); });
    d.getElementById('peel-auto').addEventListener('click', function () { if (reduce) { peelAll(); return; } animateTo(W * .45, H * .3, 900, function () { setTimeout(peelAll, 250); }); });
    /* 見えたら一度だけ、角を少しめくって誘う */
    if (!reduce && 'IntersectionObserver' in window) {
      var po = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { po.disconnect(); setTimeout(function () { if (!drag) animateTo(W * .78, H * .7, 800, function () { setTimeout(function () { if (!drag) animateTo(W - REST, H - REST, 700); }, 500); }); }, 500); } }, { threshold: .7 });
      po.observe(pb);
    }
  }

  /* 選ばれる理由：スクロールで場面が切り替わる */
  var cine = d.querySelector('.cine');
  if (cine && !reduce) {
    var slides = cine.querySelectorAll('.cine-slide'), dots = cine.querySelectorAll('.cine-dots li'), cur = -1, rafC = 0;
    function cupd() {
      rafC = 0;
      var r = cine.getBoundingClientRect(), total = cine.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.max(0, Math.min(.999, -r.top / total)) : 0, i = Math.floor(p * slides.length);
      if (i !== cur) { cur = i; slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); }); dots.forEach(function (s, k) { s.classList.toggle('on', k === i); }); }
    }
    cupd(); window.addEventListener('scroll', function () { if (!rafC) rafC = requestAnimationFrame(cupd); }, { passive: true });
  }

  /* 施工事例：ドラッグで流れる */
  var gal = d.querySelector('.gal');
  if (gal) {
    var gd = false, gx = 0, gs = 0, moved = 0, bar = d.querySelector('.gal-bar span');
    gal.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; gd = true; moved = 0; gx = e.clientX; gs = gal.scrollLeft; });
    window.addEventListener('pointermove', function (e) { if (!gd) return; var dx = e.clientX - gx; moved = Math.max(moved, Math.abs(dx)); if (moved > 4) gal.classList.add('drag'); gal.scrollLeft = gs - dx; });
    window.addEventListener('pointerup', function () { if (!gd) return; gd = false; setTimeout(function () { gal.classList.remove('drag'); }, 0); });
    gal.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    d.querySelectorAll('.gal-btn').forEach(function (b) { b.addEventListener('click', function () { gal.scrollBy({ left: +b.dataset.dir * gal.clientWidth * .7, behavior: reduce ? 'auto' : 'smooth' }); }); });
    function gp() { var m = gal.scrollWidth - gal.clientWidth; if (bar) bar.style.setProperty('--gp', (10 + 90 * (m > 0 ? gal.scrollLeft / m : 1)) + '%'); }
    gal.addEventListener('scroll', gp, { passive: true }); gp();
  }


  })();
  (function () {
  /* コーティング比較表：国産／輸入・新車／既存車・車種クラスで金額が切り替わり、選んだ列が光る */
  var cdEl = d.getElementById('coat-data');
  if (cdEl) {
    var CDATA = JSON.parse(cdEl.textContent), st = { mk: 'dom', age: 'new', c: 'M', g: 'GG' };
    var ct = d.querySelector('.ct'), chips = d.querySelector('.coat-cls .chips');
    var nf = function (n) { return n.toLocaleString('ja-JP'); };
    function sel(g) { st.g = g; ct.querySelectorAll('[data-g]').forEach(function (c) { if (c.tagName !== 'BUTTON') c.classList.toggle('sel', c.dataset.g === g); }); }
    function renderChips() {
      var list = CDATA[st.mk]; if (list.indexOf(st.c) < 0) st.c = list.indexOf('M') >= 0 ? 'M' : list[0];
      chips.innerHTML = list.map(function (c) { return '<button type="button" data-c="' + c + '" aria-pressed="' + (c === st.c) + '">' + c + '</button>'; }).join('');
    }
    function render() {
      var list = CDATA[st.mk], i = list.indexOf(st.c);
      CDATA.grades.forEach(function (g) {
        var v = CDATA.price[st.mk][g.id], td = ct.querySelector('.price-row td[data-g="' + g.id + '"]');
        td.querySelector('.cp em').textContent = nf(v[st.age][i]);
        var ov = td.querySelector('.ov'); if (ov && v.overlay) ov.textContent = 'オーバーレイ（1レイヤー追加）＋' + nf(v.overlay[i]) + '円';
      });
      var mkName = st.mk === 'dom' ? '国産車' : '輸入車';
      d.getElementById('ct-cond').textContent = mkName + '・' + st.c + '・' + (st.age === 'new' ? '新車施工' : '既存車');
      d.getElementById('cls-now').textContent = mkName + ' ' + st.c;
      var cars = (st.mk === 'dom' ? CDATA.carsDom : CDATA.carsImp)[st.c] || {};
      d.getElementById('cars-list').innerHTML = Object.keys(cars).map(function (m) { return '<div><dt>' + m + '</dt><dd>' + cars[m] + '</dd></div>'; }).join('');
      chips.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.c === st.c ? 'true' : 'false'); });
    }
    d.querySelectorAll('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        var grp = b.parentNode; grp.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (b.dataset.mk) { st.mk = b.dataset.mk; renderChips(); }
        if (b.dataset.age) st.age = b.dataset.age;
        render();
      });
    });
    chips.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.c = b.dataset.c; render(); });
    ct.querySelectorAll('thead button').forEach(function (b) { b.addEventListener('click', function () { sel(b.dataset.g); }); });
    ct.querySelectorAll('tbody td[data-g]').forEach(function (td) { td.addEventListener('click', function () { sel(td.dataset.g); }); });
    sel('GG'); render();
  }

  })();

  /* 膜を貼る：なぞった所から新車の艶に（PPF／ラッピング） */
  (function () {
    var f = d.getElementById('film'); if (!f) return;
    var newImg = f.querySelector('.f-new img'), range = d.getElementById('film-range'), x = 0, anim = 0, dragging = false, mode = 'ppf', color = 'green';
    var MSG = { ppf: 'この一枚で、新車の艶に。', wrap: '色ごと、生まれ変わる。' };
    var NAME = { green: 'ブリティッシュグリーン', gunmetal: 'ガンメタ', matte: 'マットブラック' };
    function set(v) {
      x = Math.max(0, Math.min(100, v));
      f.style.setProperty('--x', x + '%'); f.style.setProperty('--p', (x / 100).toFixed(3));
      range.value = Math.round(x);
      f.classList.toggle('is-done', x >= 99.5);
    }
    function pos(e) { var r = f.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    f.addEventListener('pointerdown', function (e) { dragging = true; cancelAnimationFrame(anim); f.setPointerCapture && f.setPointerCapture(e.pointerId); var p = pos(e); if (p > x) set(p); });
    f.addEventListener('pointermove', function (e) { if (!dragging) return; var p = pos(e); if (p > x) set(p); });
    function up() { if (!dragging) return; dragging = false; if (x > 82) to(100, 500); }
    f.addEventListener('pointerup', up); f.addEventListener('pointercancel', up);
    range.addEventListener('input', function () { set(+range.value); });
    function to(target, ms) {
      cancelAnimationFrame(anim);
      if (reduce) { set(target); return; }
      var s0 = x, t0 = performance.now();
      (function step(now) { var q = Math.min(1, (now - t0) / ms), e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; set(s0 + (target - s0) * e); if (q < 1) anim = requestAnimationFrame(step); })(t0);
    }
    function src() { return newImg.dataset[mode === 'ppf' ? 'ppf' : color] + '.jpg'; }
    function apply() {
      newImg.src = src();
      d.getElementById('film-msg').textContent = MSG[mode];
      d.getElementById('film-after').textContent = 'AFTER ─ ' + (mode === 'ppf' ? 'PPF' : 'ラッピング（' + NAME[color] + '）');
      d.querySelector('.film-colors').hidden = mode !== 'wrap';
    }
    d.querySelectorAll('.film-modes button').forEach(function (b) { b.addEventListener('click', function () {
      mode = b.dataset.mode; d.querySelectorAll('.film-modes button').forEach(function (z) { z.setAttribute('aria-pressed', z === b ? 'true' : 'false'); });
      apply(); set(0); to(100, 2200);
    }); });
    d.querySelectorAll('.film-colors button').forEach(function (b) { b.addEventListener('click', function () {
      color = b.dataset.color; d.querySelectorAll('.film-colors button').forEach(function (z) { z.setAttribute('aria-pressed', z === b ? 'true' : 'false'); });
      apply(); set(0); to(100, 2200);
    }); });
    d.getElementById('film-auto').addEventListener('click', function () { set(0); to(100, 2600); });
    d.getElementById('film-reset').addEventListener('click', function () { cancelAnimationFrame(anim); set(0); });
    /* 他の色を先に読んでおく（見えてから） */
    if ('IntersectionObserver' in window) {
      var pre = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { pre.disconnect(); ['green', 'gunmetal', 'matte'].forEach(function (k) { var i = new Image(); i.src = newImg.dataset[k] + '.jpg'; });
        if (!reduce && x === 0) setTimeout(function () { if (!dragging && x === 0) to(14, 900); }, 400); } }, { threshold: .6 });
      pre.observe(f);
    }
    set(0);
  })();

  /* ② before / after */
  d.querySelectorAll('.compare').forEach(function (c) {
    var range = c.querySelector('input[type=range]'), dragging = false;
    function set(p) { p = Math.max(0, Math.min(100, p)); c.style.setProperty('--x', p + '%'); if (range) range.value = p; }
    function fromEvent(e) { var r = c.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }
    c.addEventListener('pointerdown', function (e) { if (e.target === range) return; dragging = true; c.setPointerCapture && c.setPointerCapture(e.pointerId); fromEvent(e); });
    c.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); else if (e.pointerType === 'mouse') fromEvent(e); });
    c.addEventListener('pointerup', function () { dragging = false; });
    c.addEventListener('pointercancel', function () { dragging = false; });
    if (range) range.addEventListener('input', function () { set(+range.value); });
    if (!reduce && 'IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { c.classList.add('hint'); o.disconnect(); } }, { threshold: .6 });
      o.observe(c);
    }
  });
  /* 比較の写真を切り替え（PPF／コーティング） */
  var tabs = d.querySelectorAll('.ba-tabs button');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var c = d.querySelector('#compare');
      c.querySelectorAll('img').forEach(function (im) { im.src = b.dataset.src; });
      c.querySelector('.lbl.r').textContent = b.dataset.after;
      var t = d.querySelector('#ba-text'); if (t) t.textContent = b.dataset.text;
    });
  });

  /* ③ film applied by scroll */
  var stage = d.querySelector('.wrapstage');
  if (stage) {
    var car = stage.querySelector('.car-stage'), pct = stage.querySelector('.pct b'), notes = stage.querySelectorAll('.stage-notes span'), raf3 = 0;
    function upd() {
      raf3 = 0;
      var r = stage.getBoundingClientRect(), vh = window.innerHeight;
      var total = r.height - vh, p = total > 0 ? (-r.top) / total : 1;
      p = Math.max(0, Math.min(1, p));
      var e = p < .1 ? 0 : p > .9 ? 1 : (p - .1) / .8;
      var v = Math.round(e * 100);
      car.style.setProperty('--p', v + '%');
      car.style.setProperty('--edge', v <= 0 || v >= 100 ? 0 : 1);
      if (pct) pct.textContent = v;
      if (notes.length) notes.forEach(function (n, i) { n.style.color = (i === 0 && v < 34) || (i === 1 && v >= 34 && v < 100) || (i === 2 && v >= 100) ? 'var(--on-dark)' : ''; });
    }
    if (reduce) { car.style.setProperty('--p', '100%'); car.style.setProperty('--edge', 0); if (pct) pct.textContent = '100'; }
    else { upd(); window.addEventListener('scroll', function () { if (!raf3) raf3 = requestAnimationFrame(upd); }, { passive: true }); window.addEventListener('resize', upd); }
  }

  /* ④ price by size */
  var P = {
    S: { dim: '10.5㎥未満', f: 233800, b: 770000, w: 693000, s: .78 },
    M: { dim: '10.5〜12.2㎥', f: 288800, b: 841500, w: 770000, s: .86 },
    L: { dim: '12.2〜14.0㎥', f: 335500, b: 935000, w: 858000, s: .93 },
    LL: { dim: '14.0〜17.7㎥', f: 385000, b: 1155000, w: 990000, s: 1 },
    XL: { dim: '17.7㎥以上', f: 440000, b: 1342000, w: 1265000, s: 1.08 }
  };
  var sizeBtns = d.querySelectorAll('.sizes button');
  if (sizeBtns.length) {
    var outs = { f: d.getElementById('pf'), b: d.getElementById('pb'), w: d.getElementById('pw') }, sil = d.querySelector('.silhouette svg'), cur = { f: P.M.f, b: P.M.b, w: P.M.w }, anim = 0;
    var fmt = function (n) { return Math.round(n).toLocaleString('ja-JP'); };
    function show(k) {
      var t = P[k];
      sizeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.size === k ? 'true' : 'false'); });
      if (sil) sil.style.transform = 'scale(' + t.s + ')';
      d.getElementById('pdim').textContent = k + '　' + t.dim;
      if (reduce) { ['f', 'b', 'w'].forEach(function (x) { outs[x].textContent = fmt(t[x]); cur[x] = t[x]; }); return; }
      var from = { f: cur.f, b: cur.b, w: cur.w }, t0 = performance.now(), dur = 700;
      cancelAnimationFrame(anim);
      (function step(now) {
        var q = Math.min(1, (now - t0) / dur), ez = 1 - Math.pow(1 - q, 3);
        ['f', 'b', 'w'].forEach(function (x) { cur[x] = from[x] + (t[x] - from[x]) * ez; outs[x].textContent = fmt(cur[x]); });
        if (q < 1) anim = requestAnimationFrame(step);
      })(t0);
    }
    sizeBtns.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.size); }); });
    show('M');
  }

  /* ⑤ light panels */
  d.querySelectorAll('.rc').forEach(function (el) {
    function mv(e) { var r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); el.style.setProperty('--o', 1); }
    el.addEventListener('pointermove', mv, { passive: true });
    el.addEventListener('pointerdown', mv, { passive: true });
    el.addEventListener('pointerleave', function () { el.style.setProperty('--o', 0); });
  });
  /* スマホ：画面の中央に来たパネルに、そっと光を置く（指でなぞればその場所が光る） */
  if (!reduce && window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
    var lo = new IntersectionObserver(function (es) { es.forEach(function (e) { var el = e.target; el.style.setProperty('--mx', '70%'); el.style.setProperty('--my', '18%'); el.style.setProperty('--o', e.isIntersecting ? .8 : 0); }); }, { rootMargin: '-35% 0px -35% 0px' });
    d.querySelectorAll('.rc').forEach(function (el) { lo.observe(el); });
  }

  /* Instagram：施工事例に近づいたら公式の埋め込みを読む。読めなければサムネイルとリンクのまま */
  var reels = d.querySelector('.reels, .gal');
  if (reels) {
    var loaded = false;
    function loadIG() {
      if (loaded) return; loaded = true;
      var s = d.createElement('script'); s.async = true; s.src = 'https://www.instagram.com/embed.js';
      s.onload = function () { if (window.instgrm) window.instgrm.Embeds.process(); };
      d.body.appendChild(s);
    }
    if ('IntersectionObserver' in window) {
      var ig = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { loadIG(); ig.disconnect(); } }, { rootMargin: '600px 0px' });
      ig.observe(reels);
    } else loadIG();
  }

  /* map は近づいてから読む */
  var mf = d.querySelector('iframe[data-src]');
  if (mf && 'IntersectionObserver' in window) {
    var mo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { mf.src = mf.dataset.src; mo.disconnect(); } }, { rootMargin: '400px 0px' });
    mo.observe(mf);
  } else if (mf) mf.src = mf.dataset.src;
})();
