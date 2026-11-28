(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  /* ---------- hero video ---------- */

  var hero = $('.hero');
  var video = hero && $('.hero__video', hero);
  var toggle = hero && $('.hero__toggle', hero);
  var userPaused = false;
  var heroVisible = true;

  function setToggle(paused) {
    if (!toggle) return;
    toggle.dataset.state = paused ? 'paused' : 'playing';
    toggle.setAttribute('aria-label', paused ? toggle.dataset.labelPlay : toggle.dataset.labelPause);
  }

  function loadVideo() {
    if (!video || video.dataset.loaded) return;
    var key = window.matchMedia('(max-width: 767px)').matches ? 'm' : 'd';
    [['mp4', 'video/mp4']].forEach(function (s) {
      var source = document.createElement('source');
      source.src = video.dataset.base + key + '.' + s[0];
      source.type = s[1];
      video.appendChild(source);
    });
    video.dataset.loaded = '1';
    video.load();
  }

  /* When the phone will not autoplay video (iPhone low power mode, in-app viewers such as the
     Claude app), the same clip runs as an animated picture instead, which is never blocked.
     From then on the video is never asked to play again: in some viewers a play() after a tap
     opens the clip full screen in the phone's own player. */
  var anim = null;
  var blocked = false;

  function showAnim() {
    if (!hero) return;
    if (!anim) {
      var key = window.matchMedia('(max-width: 767px)').matches ? 'm' : 'd';
      var base = (video ? video.dataset.base : 'assets/video/hero-') + key + '-anim.';
      anim = document.createElement('picture');
      anim.className = 'hero__anim';
      anim.setAttribute('aria-hidden', 'true');
      var source = document.createElement('source');
      source.type = 'image/avif';
      source.srcset = base + 'avif';
      var pic = document.createElement('img');
      pic.alt = '';
      pic.decoding = 'async';
      pic.addEventListener('load', function () { anim.classList.add('is-on'); });
      pic.src = base + 'webp';
      anim.appendChild(source);
      anim.appendChild(pic);
      var after = video || $('.hero__poster', hero);
      after.parentNode.insertBefore(anim, after.nextSibling);
    }
    anim.hidden = false;
    setToggle(false);
  }

  function goAnim() {
    if (blocked || !video) return;
    blocked = true;
    try { video.pause(); } catch (err) { /* ignore */ }
    video.preload = 'none';
    video.hidden = true;
    if (!userPaused) showAnim();
  }

  function play() {
    if (!video || blocked) return;
    loadVideo();
    var attempt = video.play();
    if (attempt && attempt.catch) {
      attempt.catch(function (err) {
        if (err && (err.name === 'NotAllowedError' || err.name === 'NotSupportedError')) goAnim();
      });
    }
  }

  if (video) {
    video.muted = true;
    video.defaultMuted = true;

    video.addEventListener('playing', function () {
      if (blocked) { video.pause(); return; }
      video.classList.add('is-on');
      setToggle(false);
    });
    video.addEventListener('error', function () { if (!blocked) goAnim(); }, true);
    /* ready to play but still standing: autoplay was quietly refused */
    video.addEventListener('canplay', function () {
      window.setTimeout(function () {
        if (!blocked && !userPaused && heroVisible && video.paused) goAnim();
      }, 900);
    });
    video.addEventListener('pause', function () {
      if (!blocked && (userPaused || !heroVisible)) setToggle(true);
    });

    /* The still picture under the video is the clip's first frame, so fading the video out just
       before the loop point and back in after it turns the cut into a cross-fade. */
    video.addEventListener('timeupdate', function () {
      var d = video.duration;
      if (!d) return;
      var t = video.currentTime;
      hero.classList.toggle('is-seam', t > d - 0.8 || t < 0.06);
    });

    if (toggle) {
      toggle.addEventListener('click', function () {
        if (blocked) {
          userPaused = !userPaused;
          if (userPaused) {
            if (anim) anim.hidden = true;
            setToggle(true);
          } else {
            showAnim();
          }
        } else if (video.paused) {
          userPaused = false;
          play();
        } else {
          userPaused = true;
          video.pause();
        }
      });
    }

    /* the clip always starts by itself */
    play();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !userPaused && heroVisible) play();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].intersectionRatio > 0.2;
        if (heroVisible) {
          if (!userPaused) play();
        } else if (!video.paused) {
          video.pause();
        }
      }, { threshold: [0, 0.2] }).observe(hero);
    }
  }

  /* ---------- Instagram and WhatsApp on the side ---------- */

  var social = $('.social');
  var footCta = $('.foot__cta');
  if (social) {
    if (footCta && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        social.classList.toggle('is-away', entries[0].isIntersecting);
      }, { rootMargin: '0px 0px -40px 0px' }).observe(footCta);
    }
    var lastY = window.scrollY;
    var idle = 0;
    var narrow = window.matchMedia('(max-width: 899px)');
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (Math.abs(y - lastY) > 4) {
        social.classList.toggle('is-tucked', narrow.matches && y > lastY && y > window.innerHeight * 0.6);
        lastY = y;
      }
      window.clearTimeout(idle);
      idle = window.setTimeout(function () { social.classList.remove('is-tucked'); }, 900);
    }, { passive: true });
    social.addEventListener('focusin', function () { social.classList.remove('is-tucked', 'is-away'); });
  }

  /* ---------- top bar: turns solid once the hero has scrolled away ---------- */

  var bar = $('[data-bar]');
  var themeMeta = $('meta[name="theme-color"]');
  if (bar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var solid = !entries[0].isIntersecting;
      bar.classList.toggle('is-solid', solid);
      /* the browser's own bar follows: deep sea over the hero, ivory over the shop */
      if (themeMeta) themeMeta.content = solid ? '#faf6ef' : '#0c2e35';
    }, { rootMargin: '-92px 0px 0px 0px' }).observe(hero);
  } else if (bar) {
    bar.classList.add('is-solid');
  }

  /* ---------- menu (phones) ---------- */

  var menu = $('#menu');
  var menuBtn = $('[data-menu-open]');
  var menuPanel = menu && $('.menu__panel', menu);
  var menuTimer = 0;
  var menuReturn = null;

  function pageInert(on, except) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === except || el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE' || el.hasAttribute('data-live')) return;
      el.inert = on;
    });
  }

  function openMenu() {
    window.clearTimeout(menuTimer);
    menuReturn = document.activeElement;
    menu.hidden = false;
    pageInert(true, menu);
    root.classList.add('is-locked');
    void menu.offsetWidth;
    menu.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuPanel.focus({ preventScroll: true });
  }

  function closeMenu(restoreFocus) {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    pageInert(false, menu);
    root.classList.remove('is-locked');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuTimer = window.setTimeout(function () { menu.hidden = true; }, reduceMotion.matches ? 0 : 520);
    if (restoreFocus !== false && menuReturn && menuReturn.focus) menuReturn.focus({ preventScroll: true });
  }

  if (menu && menuBtn) {
    menuBtn.hidden = false;
    menuBtn.addEventListener('click', openMenu);
    $$('[data-menu-close]', menu).forEach(function (el) {
      el.addEventListener('click', function () { closeMenu(); });
    });
    $$('[data-menu-link]', menu).forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu(false);
        var target = document.querySelector(link.hash);
        var heading = target && (target.matches('[tabindex]') ? target : target.querySelector('[tabindex="-1"]'));
        if (heading) window.setTimeout(function () { heading.focus({ preventScroll: true }); }, 60);
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
    });
  }

  /* ---------- reveal on scroll ---------- */

  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    root.classList.add('reveal-on');
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');
        revealer.unobserve(el);
        window.setTimeout(function () { el.classList.add('is-done'); }, 2200);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { revealer.observe(el); });
  }

  /* ---------- product photos: cross-fade, by hand and by themselves ---------- */

  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  $$('[data-gal]').forEach(function (gal, cardIndex) {
    var slides = $$('.gal__slide', gal);
    var dots = $$('.gal__dot', gal);
    var current = 0;
    var timer = 0;
    var inView = false;
    var hovering = false;
    var touched = false;

    function go(i) {
      var n = slides.length;
      current = ((i % n) + n) % n;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === current); });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === current ? 'true' : 'false'); });
    }

    /* each card changes on its own beat, only while it is on screen and nobody is handling it */
    function schedule() {
      window.clearTimeout(timer);
      if (reduceMotion.matches || slides.length < 2 || !inView || hovering || touched) return;
      timer = window.setTimeout(function () { go(current + 1); schedule(); }, 4200 + (cardIndex % 4) * 650);
    }

    function handled() {
      touched = true;
      window.clearTimeout(timer);
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { handled(); go(i); });
    });
    var prev = $('.gal__nav--prev', gal);
    var next = $('.gal__nav--next', gal);
    if (prev) prev.addEventListener('click', function () { handled(); go(current - 1); });
    if (next) next.addEventListener('click', function () { handled(); go(current + 1); });

    if (slides.length > 1 && fineHover) {
      gal.addEventListener('mouseenter', function () { hovering = true; window.clearTimeout(timer); if (current === 0) go(1); });
      gal.addEventListener('mouseleave', function () { hovering = false; go(0); schedule(); });
    }

    /* swipe: in a right-to-left page, a swipe to the right brings the next photo */
    var sx = null;
    var sy = 0;
    gal.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    gal.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx;
      var dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
        handled();
        go(current + (dx > 0 ? 1 : -1));
        gal.dataset.swiped = '1';
        window.setTimeout(function () { delete gal.dataset.swiped; }, 350);
      }
    });
    gal.addEventListener('pointercancel', function () { sx = null; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) schedule(); else window.clearTimeout(timer);
      }, { threshold: 0.55 }).observe(gal);
    }
  });

  /* ---------- photo viewer ---------- */

  var qv = $('#qv');
  var qvPanel = qv && $('.qv__panel', qv);
  var qvTrack = qv && $('[data-qv-track]', qv);
  var qvDots = qv && $('[data-qv-dots]', qv);
  var qvProduct = null;
  var qvReturn = null;
  var qvTimer = 0;

  function qvMark(i) {
    $$('button', qvDots).forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  }

  function openViewer(card, startAt) {
    if (!qv) return;
    window.clearTimeout(qvTimer);
    qvProduct = card.dataset.product;
    qvReturn = document.activeElement;
    var pics = $$('.gal__slide img', card);
    qvTrack.textContent = '';
    qvDots.textContent = '';
    pics.forEach(function (pic, k) {
      var li = document.createElement('li');
      var im = new Image();
      im.src = pic.getAttribute('src');
      im.alt = pic.alt;
      im.width = pic.width || 1000;
      im.height = pic.height || 1000;
      li.appendChild(im);
      qvTrack.appendChild(li);
      if (pics.length > 1) {
        var d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('aria-label', 'תמונה ' + (k + 1) + ' מתוך ' + pics.length);
        d.addEventListener('click', function () {
          var target = qvTrack.children[k];
          qvTrack.scrollBy({ left: target.getBoundingClientRect().left - qvTrack.getBoundingClientRect().left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        });
        qvDots.appendChild(d);
      }
    });
    $('[data-qv-name]', qv).textContent = card.dataset.name;
    $('[data-qv-price]', qv).textContent = card.dataset.price + '\u00a0₪';
    $('[data-qv-add]', qv).setAttribute('aria-label', 'הוספה לסל, ' + card.dataset.name);
    qv.hidden = false;
    pageInert(true, qv);
    root.classList.add('is-locked');
    void qv.offsetWidth;
    qv.classList.add('is-open');
    var first = qvTrack.children[startAt || 0];
    if (first) qvTrack.scrollLeft += first.getBoundingClientRect().left - qvTrack.getBoundingClientRect().left;
    qvMark(startAt || 0);
    zoomFrom(card, startAt || 0);
    qvPanel.focus({ preventScroll: true });
  }

  function zoomFrom(card, at) {
    var srcImg = $$('.gal__slide img', card)[at];
    var li = qvTrack.children[at];
    var dstImg = li && li.firstChild;
    if (reduceMotion.matches || !srcImg || !dstImg || !srcImg.animate) return;
    var a = srcImg.closest('.gal').getBoundingClientRect();
    if (a.bottom < 0 || a.top > window.innerHeight) return;
    qv.classList.add('is-zooming');
    var b = dstImg.getBoundingClientRect();
    var endR = window.matchMedia('(min-width: 820px)').matches ? '0 28px 28px 0' : '28px 28px 0 0';
    var c = new Image();
    c.src = srcImg.currentSrc || srcImg.src;
    c.alt = '';
    c.className = 'fly fly--qv';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    dstImg.style.opacity = '0';
    c.animate([
      { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', borderRadius: '22px 22px 0 0' },
      { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', borderRadius: endR }
    ], { duration: 560, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }).onfinish = function () {
      dstImg.style.opacity = '';
      if (c.parentNode) c.parentNode.removeChild(c);
      qv.classList.remove('is-zooming');
    };
  }

  function closeViewer(restore) {
    if (!qv || !qv.classList.contains('is-open')) return;
    qv.classList.remove('is-open');
    pageInert(false, qv);
    root.classList.remove('is-locked');
    qvTimer = window.setTimeout(function () { qv.hidden = true; }, reduceMotion.matches ? 0 : 380);
    if (restore !== false && qvReturn && qvReturn.focus) qvReturn.focus({ preventScroll: true });
  }

  if (qv) {
    $$('[data-qv-close]', qv).forEach(function (el) { el.addEventListener('click', function () { closeViewer(); }); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && qv.classList.contains('is-open')) closeViewer();
    });
    qvTrack.addEventListener('scroll', function () {
      var w = qvTrack.clientWidth || 1;
      qvMark(Math.round(Math.abs(qvTrack.scrollLeft) / w));
    }, { passive: true });
    $$('[data-product]').forEach(function (card) {
      var open = function () {
        var at = 0;
        $$('.gal__dot', card).forEach(function (d, k) { if (d.getAttribute('aria-current') === 'true') at = k; });
        openViewer(card, at);
      };
      var zoom = $('[data-qv-open]', card);
      if (zoom) zoom.addEventListener('click', open);
      $$('.gal__slide img', card).forEach(function (pic) {
        pic.addEventListener('click', function () {
          var g = $('[data-gal]', card);
          if (g && g.dataset.swiped) return;
          open();
        });
      });
    });
  }

  /* ---------- gallery carousel: slides by itself, and by hand ---------- */

  var slider = $('[data-slider]');
  if (slider) {
    var track = $('.slider__track', slider);
    var stage = $('.slider__stage', slider);
    var real = $$('.slide', slider);
    var N = real.length;
    var segs = $$('.slider__seg', slider);
    var curEl = $('[data-slide-cur]', slider);
    var playBtn = $('[data-slide-play]', slider);
    var DIR = document.documentElement.dir === 'rtl' ? 1 : -1;
    var EASE = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    var pos = 0;
    var step = 0;
    var holds = { hover: false, focus: false, view: true, page: false, user: false, drag: false, near: false };
    var DUR = 2000;                 /* time on each picture */
    var elapsed = 0;
    slider.style.setProperty('--dur', DUR + 'ms');

    function snapActive(i) {
      all.forEach(function (s, k) { s.style.transition = 'none'; s.classList.toggle('is-active', k === i); });
      void track.offsetWidth;
      all.forEach(function (s) { s.style.transition = ''; });
    }

    /* copies of the first pictures at the end make the loop seamless */
    var CLONES = 3;
    for (var c = 0; c < CLONES; c++) {
      var copy = real[c].cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.removeAttribute('aria-label');
      copy.removeAttribute('role');
      copy.removeAttribute('aria-roledescription');
      track.appendChild(copy);
    }
    var all = $$('.slide', slider);

    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      step = all[0].getBoundingClientRect().width + gap;
    }

    function place(animate, extra) {
      track.style.transition = animate ? EASE : 'none';
      track.style.transform = 'translate3d(' + (DIR * (pos * step) + (extra || 0)) + 'px, 0, 0)';
    }

    function paint() {
      var k = ((pos % N) + N) % N;
      all.forEach(function (s, i) { s.classList.toggle('is-active', i === pos); });
      real.forEach(function (s, i) { if (i === k) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true'); });
      segs.forEach(function (seg, i) {
        seg.removeAttribute('aria-current');
        seg.classList.toggle('is-done', i < k);
      });
      void slider.offsetWidth;
      segs[k].setAttribute('aria-current', 'true');
      if (curEl) curEl.textContent = (k + 1 < 10 ? '0' : '') + (k + 1);
      /* make sure the next pictures are loading */
      for (var t = pos; holds.near && t < Math.min(pos + 4, all.length); t++) {
        var im = $('img', all[t]);
        if (im && im.loading === 'lazy') im.loading = 'eager';
      }
    }

    /* one picture at a time: the next one fades in over the last */
    function go(target) {
      pos = ((target % N) + N) % N;
      elapsed = 0;
      paint();
    }

    track.addEventListener('transitionend', function (e) {
      if (e.target !== track) return;
      if (pos >= N) {               /* on a copy: jump back to the real picture, unseen */
        pos -= N;
        place(false);
        snapActive(pos);
      }
    });

    function paused() {
      return holds.hover || holds.focus || !holds.view || holds.page || holds.drag;
    }

    function sync() {
      slider.classList.toggle('is-paused', paused());
    }

    /* the clock: a JS timer, so it also runs when the phone asks for less motion */
    var lastTick = Date.now();
    window.setInterval(function () {
      var now = Date.now();
      var dt = Math.min(now - lastTick, 400);
      lastTick = now;
      if (holds.user || paused()) return;
      elapsed += dt;
      if (elapsed >= DUR) go(pos + 1);
    }, 100);

    function stop(on) {
      holds.user = on;
      slider.classList.toggle('is-stopped', on);
      playBtn.setAttribute('aria-label', on ? 'הפעלת ההחלפה האוטומטית' : 'עצירת ההחלפה האוטומטית');
      if (!on) paint();
    }

    $('[data-slide-next]', slider).addEventListener('click', function () { go(pos + 1); });
    $('[data-slide-prev]', slider).addEventListener('click', function () { go(pos - 1); });
    segs.forEach(function (seg, i) { seg.addEventListener('click', function () { go(i); }); });
    playBtn.addEventListener('click', function () { stop(!holds.user); });

    /* a mouse resting on the gallery holds it; a finger tap does not (touch has no "leave") */
    slider.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { holds.hover = true; sync(); } });
    slider.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { holds.hover = false; sync(); } });
    slider.addEventListener('focusin', function (e) {
      var kb = false;
      try { kb = e.target.matches(':focus-visible'); } catch (err) { kb = false; }
      holds.focus = kb; sync();
    });
    slider.addEventListener('focusout', function () { holds.focus = false; sync(); });
    document.addEventListener('visibilitychange', function () { holds.page = document.hidden; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { holds.view = entries[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(slider);
      var nearWatch = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        holds.near = true;
        paint();
        nearWatch.disconnect();
      }, { rootMargin: '600px 0px' });
      nearWatch.observe(slider);
    }

    /* drag: the strip follows the finger, then settles on the nearest picture */
    var sx = null;
    var sy = 0;
    var dx = 0;
    var horizontal = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      sx = e.clientX; sy = e.clientY; dx = 0; horizontal = null;
    });
    stage.addEventListener('pointermove', function (e) {
      if (sx === null) return;
      var mx = e.clientX - sx;
      var my = e.clientY - sy;
      if (horizontal === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
        horizontal = Math.abs(mx) > Math.abs(my);
        if (horizontal) { holds.drag = true; sync(); try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      }
      if (horizontal) {
        dx = mx;
        place(false, dx);
      }
    });
    function release() {
      if (sx === null) return;
      sx = null;
      if (horizontal) {
        holds.drag = false;
        sync();
        var moved = DIR * dx / (step || 1);          /* positive: towards the next picture */
        var by = Math.abs(dx) > 40 ? (moved > 0 ? Math.max(1, Math.round(moved)) : Math.min(-1, Math.round(moved))) : 0;
        go(pos + by);
      }
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(pos + DIR);
      if (e.key === 'ArrowRight') go(pos - DIR);
    });

    window.addEventListener('resize', function () { measure(); place(false); });
    measure();
    place(false);
    /* the client asked for the gallery to keep moving on its own; the pause button stays for anyone who wants it still */
    paint();
  }

  /* ---------- cart ---------- */

  var cartEl = $('#cart');
  if (!cartEl) return;

  var STORE_KEY = 'tevel-cart-v1';
  var WA = cartEl.dataset.wa;
  var EMB_PRICE = parseInt(cartEl.dataset.embPrice, 10) || 0;
  var MAX_QTY = 10;
  var NBSP = ' ';

  var products = Object.create(null);
  $$('[data-product]').forEach(function (el) {
    products[el.dataset.product] = {
      id: el.dataset.product,
      name: el.dataset.name,
      price: parseInt(el.dataset.price, 10),
      thumb: el.dataset.thumb
    };
  });

  var panel = $('.cart__panel', cartEl);
  var linesEl = $('[data-cart-lines]', cartEl);
  var emptyEl = $('[data-cart-empty]', cartEl);
  var footEl = $('[data-cart-foot]', cartEl);
  var totalEl = $('[data-cart-total]', cartEl);
  var sendEl = $('[data-cart-send]', cartEl);
  var undoEl = $('[data-cart-undo]', cartEl);
  var undoTextEl = $('[data-cart-undo-text]', cartEl);
  var undoBtn = $('[data-cart-undo-btn]', cartEl);
  var countEls = $$('[data-cart-count]');
  var openBtns = $$('[data-cart-open]');
  var liveEl = $('[data-live]');
  var lineTpl = $('#cart-line');
  var minibar = $('[data-minibar]');
  var miniCount = $('[data-minibar-count]');
  var miniTotal = $('[data-minibar-total]');
  var barCart = $('.bar__cart');

  var uid = 0;
  var lastFocus = null;
  var closeTimer = 0;
  var undoTimer = 0;
  var removed = null;
  var items = load();

  function money(n) {
    return n.toLocaleString('he-IL') + NBSP + '₪';
  }
  function unitPrice(item) {
    return products[item.id].price + (item.emb ? EMB_PRICE : 0);
  }
  function count() {
    return items.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }
  function total() {
    return items.reduce(function (sum, item) { return sum + unitPrice(item) * item.qty; }, 0);
  }
  function countLabel(n) {
    return n === 1 ? 'פריט אחד בסל' : n + ' פריטים בסל';
  }

  function load() {
    var raw;
    try { raw = JSON.parse(window.localStorage.getItem(STORE_KEY)); } catch (e) { raw = null; }
    if (!Array.isArray(raw)) return [];
    return raw.filter(function (item) {
      return item && typeof item.id === 'string' && Object.prototype.hasOwnProperty.call(products, item.id);
    }).map(function (item) {
      return {
        k: 'l' + (++uid),
        id: item.id,
        qty: Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 1)),
        emb: !!item.emb,
        text: String(item.text || '').slice(0, 40)
      };
    });
  }

  function save() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(items.map(function (item) {
        return { id: item.id, qty: item.qty, emb: item.emb, text: item.text };
      })));
    } catch (e) { /* private mode or blocked storage: the cart still works for this visit */ }
  }

  function announce(text) {
    if (!liveEl) return;
    liveEl.textContent = '';
    window.setTimeout(function () { liveEl.textContent = text; }, 60);
  }

  function bump(el) {
    el.classList.remove('is-bump');
    void el.offsetWidth;
    el.classList.add('is-bump');
    window.setTimeout(function () { el.classList.remove('is-bump'); }, 520);
  }

  /* The order as one WhatsApp message. Every line opens with a Hebrew word and keeps Latin names away
     from the numbers, so it reads in the right order inside a right-to-left chat bubble. */
  function message() {
    var lines = [];
    items.forEach(function (item) {
      var line = 'דגם ' + products[item.id].name + ', כמות ' + item.qty;
      if (item.emb) line += ', עם רקמה אישית';
      lines.push(line + ' – ' + money(unitPrice(item) * item.qty));
      if (item.emb) lines.push('הטקסט לרקמה: ' + (item.text.trim() || '___'));
    });
    return 'היי, אשמח להזמין:\n\n' + lines.join('\n') + '\n\nסה״כ: ' + money(total());
  }

  function sync(animate) {
    var n = count();
    var has = n > 0;
    emptyEl.hidden = has;
    footEl.hidden = !has;
    totalEl.textContent = money(total());
    if (animate) bump(totalEl);
    sendEl.href = 'https://wa.me/' + WA + (has ? '?text=' + encodeURIComponent(message()) : '');
    countEls.forEach(function (el) {
      el.hidden = !has;
      el.textContent = n;
    });
    openBtns.forEach(function (btn) {
      btn.setAttribute('aria-label', has ? 'פתיחת סל הקניות, ' + (n === 1 ? 'פריט אחד' : n + ' פריטים') : 'פתיחת סל הקניות');
    });
    var headCount = $('[data-cart-n]', cartEl);
    if (headCount) headCount.textContent = has ? n : '';
    if (minibar) {
      minibar.hidden = !has;
      miniCount.textContent = n === 1 ? 'פריט אחד' : n + ' פריטים';
      miniTotal.textContent = money(total());
    }
    root.classList.toggle('has-cart', has);
    save();
  }

  function updateLine(li, item) {
    $('[data-qty]', li).textContent = item.qty;
    $('[data-line-price]', li).textContent = money(unitPrice(item) * item.qty);
    var unit = $('[data-line-unit]', li);
    if (unit) {
      unit.hidden = item.qty < 2 && !item.emb;
      unit.textContent = item.qty > 1
        ? item.qty + ' × ' + money(unitPrice(item))
        : money(products[item.id].price) + ' + ' + money(EMB_PRICE);
    }
    $('[data-dec]', li).disabled = item.qty <= 1;
    $('[data-inc]', li).disabled = item.qty >= MAX_QTY;
  }

  function buildLine(item, index, isNew) {
    var product = products[item.id];
    var li = lineTpl.content.firstElementChild.cloneNode(true);
    li.dataset.k = item.k;
    li.style.setProperty('--n', index);
    if (isNew) li.classList.add('is-new');

    var img = $('.line__img', li);
    img.src = product.thumb;
    img.alt = '';
    $('.line__name .latin', li).textContent = product.name;
    /* the mark keeps the plus sign on the left of the number in right-to-left text */
    $('[data-emb-price-label]', li).textContent = '\u200e+' + money(EMB_PRICE);
    $('.qty', li).setAttribute('aria-label', 'כמות, ' + product.name);
    $('[data-remove]', li).setAttribute('aria-label', 'הסרה, ' + product.name);

    var check = $('[data-emb]', li);
    var field = $('[data-emb-field]', li);
    var input = $('[data-emb-text]', li);
    var fieldId = 'emb-text-' + item.k;
    input.id = fieldId;
    $('.field__label', li).setAttribute('for', fieldId);
    check.checked = item.emb;
    field.hidden = !item.emb;
    input.value = item.text;

    $('[data-dec]', li).addEventListener('click', function () {
      if (item.qty <= 1) return;
      item.qty -= 1;
      updateLine(li, item);
      sync(true);
      announce(product.name + ', כמות ' + item.qty);
    });
    $('[data-inc]', li).addEventListener('click', function () {
      if (item.qty >= MAX_QTY) return;
      item.qty += 1;
      updateLine(li, item);
      sync(true);
      announce(product.name + ', כמות ' + item.qty);
    });
    $('[data-remove]', li).addEventListener('click', function () {
      if (li.dataset.leaving) return;
      if (reduceMotion.matches || !li.animate) { removeItem(item); return; }
      li.dataset.leaving = '1';
      li.style.overflow = 'hidden';
      li.animate([
        { height: li.offsetHeight + 'px', opacity: 1, paddingTop: '20px', paddingBottom: '20px' },
        { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' }
      ], { duration: 320, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' }).onfinish = function () { removeItem(item); };
    });
    check.addEventListener('change', function () {
      item.emb = check.checked;
      field.hidden = !item.emb;
      updateLine(li, item);
      sync(true);
      if (item.emb) input.focus();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    });
    input.addEventListener('input', function () {
      item.text = input.value;
      sync(false);
    });

    updateLine(li, item);
    return li;
  }

  function render(newKey) {
    linesEl.textContent = '';
    items.forEach(function (item, index) {
      linesEl.appendChild(buildLine(item, index, newKey === true || item.k === newKey));
    });
  }

  function addItem(id) {
    var existing = null;
    items.forEach(function (item) {
      if (item.id === id && !item.emb) existing = item;
    });
    if (existing) {
      existing.qty = Math.min(MAX_QTY, existing.qty + 1);
      render(existing.k);
    } else {
      var item = { k: 'l' + (++uid), id: id, qty: 1, emb: false, text: '' };
      items.push(item);
      render(item.k);
    }
    hideUndo();
    sync(true);
    countEls.forEach(bump);
    if (minibar && !minibar.hidden) { bump(miniCount); bump(miniTotal); }
    announce(products[id].name + ' נוסף לסל. ' + countLabel(count()));
  }

  function removeItem(item) {
    var index = items.indexOf(item);
    if (index < 0) return;
    items.splice(index, 1);
    removed = { item: item, index: index };
    render();
    sync(true);
    undoTextEl.textContent = products[item.id].name + ' הוסר מהסל';
    undoEl.hidden = false;
    undoBtn.focus();
    armUndoTimer();
    announce(products[item.id].name + ' הוסר מהסל');
  }

  /* the undo offer stays while someone is on it (keyboard focus or pointer) */
  function armUndoTimer() {
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(function () {
      if (undoEl.contains(document.activeElement) || undoEl.matches(':hover')) armUndoTimer();
      else hideUndo();
    }, 10000);
  }

  function hideUndo() {
    window.clearTimeout(undoTimer);
    if (!undoEl.hidden && undoEl.contains(document.activeElement)) panel.focus();
    undoEl.hidden = true;
    removed = null;
  }

  undoBtn.addEventListener('click', function () {
    if (!removed) return;
    var back = removed;
    items.splice(Math.min(back.index, items.length), 0, back.item);
    removed = null;
    window.clearTimeout(undoTimer);
    undoEl.hidden = true;
    render(back.item.k);
    sync(true);
    panel.focus();
    announce(products[back.item.id].name + ' הוחזר לסל');
  });

  /* open / close */

  function setBackgroundInert(on) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === cartEl || el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE' || el === liveEl || el === menu) return;
      el.inert = on;
    });
  }

  function openCart() {
    window.clearTimeout(closeTimer);
    if (cartEl.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    cartEl.hidden = false;
    setBackgroundInert(true);
    root.classList.add('is-locked');
    void cartEl.offsetWidth;
    cartEl.classList.add('is-open');
    openBtns.forEach(function (btn) { btn.setAttribute('aria-expanded', 'true'); });
    panel.focus({ preventScroll: true });
  }

  function closeCart() {
    if (!cartEl.classList.contains('is-open')) return;
    cartEl.classList.remove('is-open');
    setBackgroundInert(false);
    root.classList.remove('is-locked');
    openBtns.forEach(function (btn) { btn.setAttribute('aria-expanded', 'false'); });
    closeTimer = window.setTimeout(function () { cartEl.hidden = true; }, 360);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  openBtns.forEach(function (btn) {
    btn.hidden = false;
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', openCart);
  });
  $$('[data-cart-close]', cartEl).forEach(function (el) {
    el.addEventListener('click', closeCart);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && cartEl.classList.contains('is-open')) closeCart();
  });

  /* the picture on show flies from the card into the bag in the top bar */
  function flyToBag(card, done) {
    var target = barCart && barCart.getBoundingClientRect();
    var dots = $$('.gal__dot', card);
    var index = 0;
    dots.forEach(function (d, k) { if (d.getAttribute('aria-current') === 'true') index = k; });
    var picture = $$('.gal__slide img', card)[index];
    if (reduceMotion.matches || !target || !picture || !picture.animate) { done(); return; }
    var from = picture.getBoundingClientRect();
    if (from.bottom < 0 || from.top > window.innerHeight) { done(); return; }
    var clone = new Image();
    clone.src = picture.currentSrc || picture.src;
    clone.className = 'fly';
    clone.alt = '';
    clone.setAttribute('aria-hidden', 'true');
    clone.style.left = from.left + 'px';
    clone.style.top = from.top + 'px';
    clone.style.width = from.width + 'px';
    clone.style.height = from.height + 'px';
    document.body.appendChild(clone);
    var dx = target.left + target.width / 2 - (from.left + from.width / 2);
    var dy = target.top + target.height / 2 - (from.top + from.height / 2);
    var s = 28 / from.width;
    var anim = clone.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '16px' },
      { transform: 'translate(' + dx * 0.5 + 'px, ' + (dy * 0.35 - 60) + 'px) scale(' + Math.max(s, 0.42) + ')', opacity: 1, borderRadius: '40px', offset: 0.55 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')', opacity: 0.2, borderRadius: '50%' }
    ], { duration: 820, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' });
    anim.onfinish = function () {
      clone.parentNode.removeChild(clone);
      if (barCart) {
        barCart.classList.remove('is-catch');
        void barCart.offsetWidth;
        barCart.classList.add('is-catch');
      }
      done();
    };
  }

  /* add-to-cart buttons: without this script each one is a plain link to WhatsApp for that model */
  $$('[data-add]').forEach(function (btn) {
    var card = btn.closest('[data-product]');
    if (!card) return;
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      btn.classList.add('is-added');
      window.setTimeout(function () { btn.classList.remove('is-added'); }, 1600);
      flyToBag(card, function () { addItem(card.dataset.product); });
    });
  });

  var qvAdd = qv && $('[data-qv-add]', qv);
  if (qvAdd) {
    qvAdd.addEventListener('click', function () {
      if (!qvProduct || qvAdd.disabled) return;
      addItem(qvProduct);
      var path = qvAdd.querySelector('path');
      var label = qvAdd.lastChild;
      path.setAttribute('d', 'M3 8.5l3.2 3.2L13 5');
      label.nodeValue = 'נוסף לסל';
      qvAdd.disabled = true;
      window.setTimeout(function () {
        closeViewer();
        if (barCart) {
          barCart.classList.remove('is-catch');
          void barCart.offsetWidth;
          barCart.classList.add('is-catch');
        }
        window.setTimeout(function () {
          path.setAttribute('d', 'M8 3v10M3 8h10');
          label.nodeValue = 'הוספה לסל';
          qvAdd.disabled = false;
        }, 400);
      }, reduceMotion.matches ? 0 : 550);
    });
  }

  render();
  sync(false);
})();
