/* Tevel – motion layer: hero parallax, ribbons that answer the scroll, titles word by word,
   card tilt and light, magnetic buttons. Everything here is decoration:
   the page works the same without it. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  root.classList.add('fx');

  /* ---------- titles: one word at a time ---------- */
  function split(el) {
    var host = el.firstElementChild && el.firstElementChild.tagName === 'SPAN' ? el.firstElementChild : el;
    var text = host.textContent.trim();
    if (!text || el.classList.contains('is-split')) return;
    var words = text.split(/\s+/);
    host.textContent = '';
    words.forEach(function (word, i) {
      var w = document.createElement('span');
      w.className = 'w';
      w.style.setProperty('--w', i);
      var inner = document.createElement('span');
      inner.textContent = word;
      w.appendChild(inner);
      host.appendChild(w);
      if (i < words.length - 1) host.appendChild(document.createTextNode(' '));
    });
    el.classList.add('is-split');
  }
  if (!reduce.matches) {
    $$('[data-reveal="mask"]').forEach(split);
    var sub = $('.hero__sub');
    if (sub) split(sub);
  }

  /* ---------- hero: the sea sinks slower than the page, the logo lifts away ---------- */
  var hero = $('.hero');
  var heroH = hero ? hero.offsetHeight : 0;
  var lastHp = -1;
  function heroFrame() {
    if (!hero || reduce.matches) return;
    var hp = Math.min(Math.max(window.scrollY / (heroH || 1), 0), 1);
    if (Math.abs(hp - lastHp) < 0.002) return;
    lastHp = hp;
    hero.style.setProperty('--hp', hp.toFixed(3));
  }

  /* ---------- ribbons: drift on their own, faster while the page moves ---------- */
  var ribbons = $$('[data-ribbon]').map(function (track) {
    var set = track.firstElementChild;
    return { track: track, set: set, dir: +track.getAttribute('data-ribbon') || 1, x: 0, w: set ? set.offsetWidth : 0 };
  });
  var ribbonOn = false;
  var lastY = window.scrollY;
  var boost = 0;
  var lastT = 0;

  function ribbonFrame(t) {
    var dt = lastT ? Math.min(t - lastT, 64) : 16;
    lastT = t;
    var y = window.scrollY;
    var v = y - lastY;
    lastY = y;
    boost += (Math.min(Math.abs(v), 80) * 0.9 - boost) * 0.12;
    if (!ribbonOn) return;
    var speed = (reduce.matches ? 0 : 0.045) + boost * 0.02;
    ribbons.forEach(function (r) {
      if (!r.w) r.w = r.set.offsetWidth;
      if (!r.w) return;
      r.x = (r.x + speed * dt) % r.w;
      var tx = r.dir > 0 ? r.x - r.w : -r.x;
      r.track.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,0,0)';
    });
  }

  var ribbonBox = $('.ribbon');
  if (ribbonBox && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { ribbonOn = entries[0].isIntersecting; }, { rootMargin: '120px 0px' }).observe(ribbonBox);
  } else {
    ribbonOn = true;
  }

  /* one loop for both */
  function loop(t) {
    heroFrame();
    ribbonFrame(t);
    window.requestAnimationFrame(loop);
  }
  window.requestAnimationFrame(loop);

  window.addEventListener('resize', function () {
    heroH = hero ? hero.offsetHeight : 0;
    lastHp = -1;
    ribbons.forEach(function (r) { r.w = r.set ? r.set.offsetWidth : 0; });
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ribbons.forEach(function (r) { r.w = r.set ? r.set.offsetWidth : 0; }); });
  }

  /* ---------- footer: the logo breathes in when the footer comes near ---------- */
  var foot = $('.foot');
  if (foot && 'IntersectionObserver' in window) {
    var fo = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { foot.classList.add('is-near'); fo.disconnect(); }
    }, { threshold: 0.15 });
    fo.observe(foot);
  } else if (foot) {
    foot.classList.add('is-near');
  }

  /* ---------- cards: tilt toward the mouse, with a light on the photo ---------- */
  if (fine.matches && !reduce.matches) {
    $$('.card[data-product]').forEach(function (card) {
      var box = $('.card__box', card);
      var gal = $('.gal', card);
      if (!box || !gal) return;
      var raf = 0;
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        if (raf) return;
        raf = window.requestAnimationFrame(function () {
          raf = 0;
          var r = box.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          card.classList.add('is-tilt');
          box.style.setProperty('--rx', ((px - 0.5) * 7).toFixed(2) + 'deg');
          box.style.setProperty('--ry', ((0.5 - py) * 6).toFixed(2) + 'deg');
          gal.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
          gal.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        });
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilt');
        box.style.setProperty('--rx', '0deg');
        box.style.setProperty('--ry', '0deg');
      });
    });

    /* buttons lean toward the mouse */
    $$('.btn, .card__cta, .pill').forEach(function (btn) {
      btn.classList.add('is-magnet');
      btn.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) + 'px');
        btn.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

})();
