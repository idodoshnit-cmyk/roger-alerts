(function () {
  'use strict';
  var D = document, root = D.documentElement;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IMG = function (n) { return (window.__IMG && window.__IMG[n]) || ('img/work/' + n + '.webp'); };
  var TAU = Math.PI * 2;

  /* ---------- words: wrap each word so headlines can rise in ---------- */
  function split(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = D.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(D.createTextNode(' ')); return; }
            var w = D.createElement('span'); w.className = 'w';
            var s = D.createElement('span'); s.textContent = p; s.style.setProperty('--i', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
  }
  $$('.split').forEach(split);
  $$('.q blockquote').forEach(split);

  /* ---------- intro ---------- */
  var heroBits = $$('.hero .split, .hero .rv');
  function ready() {
    if (root.classList.contains('go')) return;
    root.classList.add('ready', 'go');
    setTimeout(function () { heroBits.forEach(function (e) { e.classList.add('in'); }); }, RM ? 0 : 380);
  }
  var firstImg = $('.card-a img');
  var waitImg = firstImg && firstImg.decode ? firstImg.decode().catch(function () {}) : Promise.resolve();
  var waitFonts = (D.fonts && D.fonts.ready) || Promise.resolve();
  Promise.race([Promise.all([waitImg, waitFonts]), new Promise(function (r) { setTimeout(r, 2000); })]).then(function () { setTimeout(ready, 250); });

  /* ---------- reveal on enter ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    $$('.rv, .split').forEach(function (el) { if (heroBits.indexOf(el) < 0) io.observe(el); });
  } else $$('.rv, .split').forEach(function (el) { el.classList.add('in'); });

  /* ---------- the liquid ---------- */
  var canvas = $('#fluid'), fluid = null, liquidOn = true, tsim = 0, last = 0, nextBurst = 0;
  var small = Math.min(innerWidth, innerHeight) < 700 || innerWidth < 900;
  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
    var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w > 1920) { h = Math.round(h * 1920 / w); w = 1920; }
    if (!w || !h) return false;
    if (Math.abs(canvas.width - w) > 2 || Math.abs(canvas.height - h) > 120) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }
  var portrait = function () { return canvas.width < canvas.height; };
  var EM = [
    { cx: 0.66, cy: 0.52, ax: 0.27, ay: 0.34, wx: 0.050, wy: 0.071, ph: 0.0, col: [0.060, 0.000, 0] },
    { cx: 0.60, cy: 0.46, ax: 0.33, ay: 0.30, wx: -0.041, wy: 0.063, ph: 2.1, col: [0.030, 0.020, 0] },
    { cx: 0.72, cy: 0.56, ax: 0.23, ay: 0.36, wx: 0.067, wy: -0.045, ph: 4.2, col: [0.075, 0.000, 0] }
  ];
  function emit(t, dt) {
    var P = portrait(), k = dt * 60;
    for (var i = 0; i < EM.length; i++) {
      var e = EM[i], cx = P ? 0.5 : e.cx, cy = P ? 0.40 : e.cy, ax = P ? 0.42 : e.ax, ay = P ? 0.36 : e.ay;
      var a = e.wx * t * TAU + e.ph, b = e.wy * t * TAU + e.ph * 1.3;
      var x = cx + ax * Math.sin(a), y = cy + ay * Math.cos(b);
      var vx = ax * e.wx * TAU * Math.cos(a), vy = -ay * e.wy * TAU * Math.sin(b);
      fluid.splat(x, y, vx * 950 * k, vy * 950 * k, [e.col[0] * k, e.col[1] * k, 0], 0.0034);
    }
  }
  function burst(strong) {
    var P = portrait();
    var x = P ? 0.15 + Math.random() * 0.7 : 0.36 + Math.random() * 0.6, y = P ? 0.08 + Math.random() * 0.6 : 0.1 + Math.random() * 0.8;
    var ang = Math.random() * TAU, f = (strong ? 760 : 420) + Math.random() * 420;
    var white = Math.random() < 0.32;
    fluid.splat(x, y, Math.cos(ang) * f, Math.sin(ang) * f, white ? [0.06, 0.42, 0] : [0.55 + Math.random() * 0.4, 0, 0], 0.006 + Math.random() * 0.006);
  }
  function prewarm() {
    for (var i = 0; i < 9; i++) burst(true);
    for (var s = 0; s < 46; s++) { tsim += 0.016; emit(tsim, 0.016); fluid.step(0.016); }
    nextBurst = tsim + 1.2;
  }
  function draw() { fluid.render(tsim, portrait(), portrait() ? 0.64 : 0.56); }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!fluid || !liquidOn || D.hidden || fluid.isLost()) { last = now; return; }
    var dt = Math.min((now - last) / 1000, 0.033); last = now;
    if (dt <= 0) return;
    tsim += dt; emit(tsim, dt);
    if (tsim > nextBurst) { burst(false); nextBurst = tsim + 2.2 + Math.random() * 2.2; }
    fluid.step(dt); draw();
  }
  function startLiquid() {
    if (!window.createFluid) return;
    sizeCanvas();
    try { fluid = createFluid(canvas, { sim: small ? 96 : 128, dye: small ? 640 : 1024, iter: small ? 14 : 18 }); } catch (err) { fluid = null; }
    if (!fluid) return;
    root.classList.add('liquid');
    prewarm(); draw();
    if (!RM) { last = performance.now(); requestAnimationFrame(frame); }
    var rt;
    addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { small = Math.min(innerWidth, innerHeight) < 700 || innerWidth < 900; if (sizeCanvas()) { fluid.rebuild(); prewarm(); draw(); } }, 180);
    });
    var px = null, py = null;
    addEventListener('pointermove', function (e) {
      if (!liquidOn || RM) return;
      var x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight;
      if (px !== null) {
        var dx = x - px, dy = y - py, sp = Math.sqrt(dx * dx + dy * dy);
        if (sp > 0.0006 && sp < 0.3) fluid.splat(x, y, dx * 5600, dy * 5600, [Math.min(0.32, sp * 16), Math.min(0.1, sp * 3.5), 0], 0.0022);
      }
      px = x; py = y;
    }, { passive: true });
    addEventListener('pointerdown', function (e) {
      if (!liquidOn || RM) return;
      var x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight, a = Math.random() * TAU;
      fluid.splat(x, y, Math.cos(a) * 700, Math.sin(a) * 700, [0.5, 0.12, 0], 0.005);
    }, { passive: true });
  }
  startLiquid();
  // only simulate while a liquid section is on screen
  var heroEl = $('.hero'), contactEl = $('.contact'), footEl = $('.footer'), seen = { h: true, c: false, f: false };
  if ('IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen[e.target === heroEl ? 'h' : e.target === contactEl ? 'c' : 'f'] = e.isIntersecting; });
      liquidOn = seen.h || seen.c || seen.f;
    }, { threshold: 0 });
    io2.observe(heroEl); io2.observe(contactEl); io2.observe(footEl);
  }

  /* ---------- hero photo cards: keep changing ---------- */
  function slideshow(card, every, delay) {
    var imgs = $$('img', card), chip = $('.chip span', card), i = 0;
    if (imgs.length < 2 || RM) return;
    function next() {
      if (D.hidden || !seen.h) return;
      var n = (i + 1) % imgs.length, im = imgs[n], prev = imgs[i];
      var go = function () {
        im.style.setProperty('--x', (18 + Math.random() * 64) + '%'); im.style.setProperty('--y', (14 + Math.random() * 72) + '%');
        im.classList.add('in');
        if (chip) { chip.parentNode.classList.add('swap'); setTimeout(function () { chip.textContent = im.getAttribute('data-cap'); chip.parentNode.classList.remove('swap'); }, 360); }
        setTimeout(function () { prev.classList.remove('on'); im.classList.remove('in'); im.classList.add('on'); }, 1300);
        i = n;
      };
      if (im.decode) im.decode().then(go, go); else go();
    }
    setTimeout(function () { next(); setInterval(next, every); }, delay);
  }
  slideshow($('.card-a'), 3600, 3200);
  slideshow($('.card-b'), 3600, 5000);
  // gentle tilt towards the pointer
  var cards = $('#cards');
  if (cards && !RM && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    heroEl.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cards.style.transform = 'rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
    }, { passive: true });
    cards.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1)';
  }

  /* ---------- water-ripple transition for the work viewer (falls back to CSS) ---------- */
  function createRipple(cv) {
    var gl; try { gl = cv.getContext('webgl', { alpha: false, antialias: false }) || cv.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return null;
    var vsrc = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    var fsrc = 'precision highp float;varying vec2 v;uniform sampler2D A,B;uniform vec4 fa,fb;uniform float t,asp;uniform vec2 c;' +
      'vec2 cv(vec2 uv,vec4 f){return (uv-.5)*f.xy+.5+f.zw;}' +
      'void main(){vec2 d=v-c;d.x*=asp;float r=length(d);float e=t*t*(3.-2.*t);float R=e*(1.25*max(asp,1.)+.6)-.06;' +
      'float band=smoothstep(R-.5,R-.03,r)*(1.-smoothstep(R,R+.06,r));float ph=(r-R)*30.;float amp=band*(1.-e*.85);' +
      'vec2 dir=d/(r+.0001);dir.x/=asp;vec2 off=dir*sin(ph)*amp*.024;' +
      'float m=1.-smoothstep(R-.07,R+.02,r);' +
      'vec3 a=texture2D(A,cv(v+off,fa)).rgb,b=texture2D(B,cv(v+off,fb)).rgb;vec3 col=mix(a,b,m);' +
      'float crest=cos(ph)*amp;col+=vec3(.82,.92,1.)*max(crest,0.)*.26;col*=1.-max(-crest,0.)*.14;gl_FragColor=vec4(col,1.);}';
    function sh(ty, s) { var o = gl.createShader(ty); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vsrc)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fsrc)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['A', 'B', 'fa', 'fb', 't', 'asp', 'c'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    function tex(img) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); // throws if the image is not same-origin
      return t;
    }
    var A = null, B = null, itA = null, itB = null, raf = 0;
    function fit(it) {
      var ca = cv.width / cv.height, ia = it.w / it.h, sx = 1, sy = 1;
      if (ia > ca) sx = ca / ia; else sy = ia / ca;
      return [sx, sy, (it.fx - 0.5) * (1 - sx), (0.5 - it.fy) * (1 - sy)];
    }
    function size() { var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr); if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; } }
    function paint(t, cx, cy) {
      size(); gl.viewport(0, 0, cv.width, cv.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A); gl.uniform1i(U.A, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B); gl.uniform1i(U.B, 1);
      var fa = fit(itA), fb = fit(itB);
      gl.uniform4f(U.fa, fa[0], fa[1], fa[2], fa[3]); gl.uniform4f(U.fb, fb[0], fb[1], fb[2], fb[3]);
      gl.uniform1f(U.t, t); gl.uniform1f(U.asp, cv.width / cv.height); gl.uniform2f(U.c, cx, cy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    var api = {
      ok: true,
      set: function (img, it) { A = B = tex(img); itA = itB = it; paint(1, 0.5, 0.5); },
      to: function (img, it, done) {
        var nt = tex(img);
        if (A && A !== B) gl.deleteTexture(A);
        A = B; itA = itB; B = nt; itB = it;
        var cx = 0.25 + Math.random() * 0.5, cy = 0.25 + Math.random() * 0.5, t0 = performance.now(), dur = RM ? 1 : 1350;
        cancelAnimationFrame(raf);
        (function tick(now) {
          var t = Math.min((now - t0) / dur, 1); paint(t, cx, cy);
          if (t < 1) raf = requestAnimationFrame(tick); else { if (A !== B) gl.deleteTexture(A); A = B; itA = itB; done && done(); }
        })(t0);
      },
      redraw: function () { if (A) paint(1, 0.5, 0.5); }
    };
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); api.ok = false; cv.parentNode.classList.remove('gl'); });
    return api;
  }

  /* ---------- work: tabs + auto-playing viewer ---------- */
  var ITEMS = window.__WORK || [], viewer = $('#viewer');
  if (viewer && ITEMS.length) (function () {
    var imgA = $('img.a', viewer), imgB = $('img.b', viewer), vcap = $('#vcap'), vtag = $('#vtag'), vcount = $('#vcount');
    var tabs = $$('.tab'), panels = $$('.panel'), strips = $$('.thumbs'), thumbs = $$('.thumbs button'), playBtn = $('#vplay');
    var cur = -1, busy = false, queued = null, timer = 0, playing = !RM, inView = false, DUR = 3100;
    var glv = createRipple($('canvas', viewer));
    var cache = {};
    function load(i) { if (!cache[i]) { var im = new Image(); im.decoding = 'async'; im.src = IMG(ITEMS[i].n); cache[i] = im; } return cache[i]; }
    function tabOf(i) { return ITEMS[i].t; }
    function setUI(i) {
      var it = ITEMS[i], t = it.t;
      tabs.forEach(function (b) { var on = b.getAttribute('data-tab') === t; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; if (!on) { b.style.setProperty('--pd', '0s'); b.style.setProperty('--p', 0); } });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-tab') !== t; });
      strips.forEach(function (g) { g.hidden = g.getAttribute('data-tab') !== t; });
      thumbs.forEach(function (b) {
        var on = +b.getAttribute('data-i') === i; b.setAttribute('aria-current', on ? 'true' : 'false');
        if (on) { var g = b.parentNode, x = b.offsetLeft - (g.clientWidth - b.offsetWidth) / 2; try { g.scrollTo({ left: x, behavior: RM ? 'auto' : 'smooth' }); } catch (e) { g.scrollLeft = x; } }
      });
      vcap.classList.add('swap');
      setTimeout(function () { vcap.textContent = it.cap; vcap.classList.remove('swap'); }, 300);
      vtag.textContent = it.tag || '';
      var same = ITEMS.filter(function (x) { return x.t === t; }), k = same.indexOf(it);
      vcount.textContent = (k + 1 < 10 ? '0' : '') + (k + 1) + ' / ' + (same.length < 10 ? '0' : '') + same.length;
      imgA.alt = it.alt;
      var tab = tabs.filter(function (b) { return b.getAttribute('data-tab') === t; })[0];
      if (tab) {
        tab.style.setProperty('--pd', '0s'); tab.style.setProperty('--p', k / same.length); void tab.offsetWidth;
        if (playing && inView) { tab.style.setProperty('--pd', (DUR + 1200) + 'ms'); tab.style.setProperty('--p', (k + 1) / same.length); }
      }
    }
    function schedule() { clearTimeout(timer); if (playing && inView && !D.hidden) timer = setTimeout(function () { show((cur + 1) % ITEMS.length); }, DUR); }
    function finish() { busy = false; if (queued !== null) { var q = queued; queued = null; show(q); } else schedule(); load((cur + 1) % ITEMS.length); }
    function cssSwap(im, it, first) {
      if (first || RM) { imgA.src = im.src; imgA.style.objectPosition = (it.fx * 100) + '% ' + (it.fy * 100) + '%'; finish(); return; }
      imgB.src = im.src; imgB.style.objectPosition = (it.fx * 100) + '% ' + (it.fy * 100) + '%';
      imgB.style.setProperty('--x', (20 + Math.random() * 60) + '%'); imgB.style.setProperty('--y', (20 + Math.random() * 60) + '%');
      imgB.classList.add('in');
      setTimeout(function () { imgA.src = im.src; imgA.style.objectPosition = imgB.style.objectPosition; imgB.classList.remove('in'); finish(); }, 1180);
    }
    function show(i) {
      if (i === cur) { schedule(); return; }
      if (busy) { queued = i; return; }
      busy = true; clearTimeout(timer);
      var it = ITEMS[i], im = load(i), first = cur < 0;
      var go = function () {
        setUI(i);
        if (glv && glv.ok) {
          try {
            if (first) { glv.set(im, it); viewer.classList.add('gl'); cur = i; imgA.src = im.src; finish(); }
            else { cur = i; glv.to(im, it, finish); }
            return;
          } catch (err) { glv.ok = false; viewer.classList.remove('gl'); }
        }
        cur = i; cssSwap(im, it, first);
      };
      if (im.complete && im.naturalWidth) go(); else if (im.decode) im.decode().then(go, go); else { im.onload = go; im.onerror = go; }
    }
    tabs.forEach(function (b) {
      b.addEventListener('click', function () { var t = b.getAttribute('data-tab'); for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].t === t) { show(i); break; } });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var k = tabs.indexOf(b) + (e.key === 'ArrowRight' ? 1 : -1); k = (k + tabs.length) % tabs.length; tabs[k].focus(); tabs[k].click();
      });
    });
    thumbs.forEach(function (b) { b.addEventListener('click', function () { show(+b.getAttribute('data-i')); }); });
    $('#vprev').addEventListener('click', function () { show((cur - 1 + ITEMS.length) % ITEMS.length); });
    $('#vnext').addEventListener('click', function () { show((cur + 1) % ITEMS.length); });
    playBtn.addEventListener('click', function () {
      playing = !playing;
      playBtn.setAttribute('aria-pressed', playing ? 'false' : 'true'); playBtn.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
      $('use', playBtn).setAttribute('href', playing ? '#i-pause' : '#i-play');
      if (playing) { setUI(cur); schedule(); } else { clearTimeout(timer); tabs.forEach(function (t) { t.style.setProperty('--pd', '0s'); }); }
    });
    if (RM) { playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Play slideshow'); $('use', playBtn).setAttribute('href', '#i-play'); }
    show(0);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) { if (cur >= 0 && !busy) { setUI(cur); schedule(); } } else clearTimeout(timer); }, { threshold: 0.25 }).observe(viewer);
    else { inView = true; schedule(); }
    D.addEventListener('visibilitychange', function () { if (!D.hidden && !busy) schedule(); });
    addEventListener('resize', function () { if (glv && glv.ok) glv.redraw(); });
  })();

  /* ---------- reviews ---------- */
  (function () {
    var qs = $$('#quotes .q'), dots = $('#dots'), photo = $('#revphoto'), box = $('.rev-box');
    if (!qs.length) return;
    var i = 0, timer = 0, on = false;
    qs.forEach(function (q, k) {
      var b = D.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Review ' + (k + 1)); b.setAttribute('aria-current', k === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { go(k); }); dots.appendChild(b);
    });
    if (qs.length < 2) dots.hidden = true;
    function go(n) {
      qs[i].classList.remove('on'); i = (n + qs.length) % qs.length; qs[i].classList.add('on');
      $$('button', dots).forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      var ph = qs[i].getAttribute('data-photo');
      if (ph) { var im = $('img', photo); im.src = IMG(ph); im.alt = qs[i].getAttribute('data-alt') || ''; photo.classList.remove('off'); } else photo.classList.add('off');
      plan();
    }
    function plan() { clearTimeout(timer); if (on && !RM && qs.length > 1) timer = setTimeout(function () { go(i + 1); }, 6500); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { on = es[0].isIntersecting; if (on) plan(); else clearTimeout(timer); }, { threshold: 0.3 }).observe(box);
    box.addEventListener('pointerenter', function () { clearTimeout(timer); });
    box.addEventListener('pointerleave', plan);
  })();

  /* ---------- header + mobile call bar ---------- */
  var header = $('#header'), callbar = $('#callbar'), lastY = 0;
  function onScroll() {
    var y = window.pageYOffset, h = innerHeight;
    header.classList.toggle('solid', y > h - 90);
    header.classList.toggle('away', y > 500 && y > lastY + 2 && y < D.body.scrollHeight - h - 200);
    if (y < lastY - 2) header.classList.remove('away');
    if (callbar) callbar.classList.toggle('show', y > 380 && !seen.c);
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $$('[data-quote]').forEach(function (a) { a.addEventListener('click', function () { setTimeout(function () { var f = $('#f-name'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 900); }); });
  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- quote form ---------- */
  var form = $('#quote');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = $('#status'), label = $('#sendlabel'), bad = null;
    [['f-name', 'e-name'], ['f-phone', 'e-phone'], ['f-post', 'e-post']].forEach(function (p) {
      var inp = $('#' + p[0]), wrong = !inp.value.trim() || (p[0] === 'f-phone' && inp.value.replace(/\D/g, '').length < 7);
      inp.parentNode.classList.toggle('bad', wrong); inp.setAttribute('aria-invalid', wrong ? 'true' : 'false');
      if (wrong) { inp.setAttribute('aria-describedby', p[1]); if (!bad) bad = inp; } else inp.removeAttribute('aria-describedby');
    });
    status.className = 'status';
    if (bad) { bad.focus(); return; }
    var fail = function () { status.textContent = 'Sorry, that did not send. Please call us on 0116 478 5346.'; status.className = 'status no'; label.textContent = 'Send request'; };
    if (form.action.indexOf('YOUR_FORM_ID') > -1 || !window.fetch) { fail(); return; }
    label.textContent = 'Sending…';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw 0; form.reset(); label.textContent = 'Send request';
      status.textContent = 'Thanks. We have your request and will ring you back.'; status.className = 'status ok';
    }).catch(fail);
  });

  /* ---------- consent, map, dialogs ---------- */
  var KEY = 'jk_consent', ck = $('#ck'), mapBox = $('#map'), mapsToggle = $('#ck-maps'), mapHTML = mapBox ? mapBox.innerHTML : '';
  function readC() { try { var c = JSON.parse(localStorage.getItem(KEY)); if (c && Date.now() - c.ts < 365 * 864e5) return c; } catch (e) {} return null; }
  function applyC(maps) {
    if (mapsToggle) mapsToggle.checked = !!maps;
    if (!mapBox) return;
    if (maps) { if (!$('iframe', mapBox)) mapBox.innerHTML = '<iframe title="Map showing Unit 1L04, 90 Sanvey Gate, Leicester" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=90%20Sanvey%20Gate%2C%20Leicester%20LE1%204BQ&z=15&output=embed"></iframe>'; }
    else if ($('iframe', mapBox)) { mapBox.innerHTML = mapHTML; bindMap(); }
  }
  function saveC(maps) {
    try { localStorage.setItem(KEY, JSON.stringify({ maps: !!maps, ts: Date.now() })); } catch (e) {}
    applyC(maps);
    if (ck) { ck.classList.remove('show'); setTimeout(function () { ck.hidden = true; }, 700); }
  }
  function bindMap() { var b = $('#mapbtn'); if (b) b.addEventListener('click', function () { saveC(true); }); }
  bindMap();
  var c0 = readC();
  if (c0) applyC(c0.maps);
  else if (ck) setTimeout(function () { ck.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { ck.classList.add('show'); }); }); }, RM ? 600 : 4200);
  $$('[data-ck]').forEach(function (b) { b.addEventListener('click', function () { saveC(b.getAttribute('data-ck') === 'accept'); }); });
  var saveBtn = $('#ck-save'); if (saveBtn) saveBtn.addEventListener('click', function () { saveC(mapsToggle.checked); $('#dlg-cookies').close(); });
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('dialog[open]').forEach(function (d) { d.close(); });
      var d = $('#dlg-' + b.getAttribute('data-open')); if (!d) return;
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    });
  });
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { var d = b.closest('dialog'); if (d.close) d.close(); else d.removeAttribute('open'); }); });
  $$('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d && d.close) d.close(); }); });
})();
