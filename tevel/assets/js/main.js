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
    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (s) {
      var source = document.createElement('source');
      source.src = video.dataset.base + key + '.' + s[0];
      source.type = s[1];
      video.appendChild(source);
    });
    video.dataset.loaded = '1';
    video.load();
  }

  function play() {
    if (!video) return;
    loadVideo();
    var attempt = video.play();
    if (attempt && attempt.catch) {
      /* autoplay refused (low power mode and the like): the still picture stays and the button offers play */
      attempt.catch(function () { setToggle(true); });
    }
  }

  if (video) {
    video.muted = true;

    video.addEventListener('playing', function () {
      video.classList.add('is-on');
      setToggle(false);
    });
    video.addEventListener('pause', function () {
      if (userPaused || !heroVisible) setToggle(true);
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
        if (video.paused) {
          userPaused = false;
          play();
        } else {
          userPaused = true;
          video.pause();
        }
      });
    }

    if (reduceMotion.matches || saveData) {
      userPaused = true;
      setToggle(true);
    } else {
      play();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) {
          if (!userPaused) play();
        } else if (!video.paused) {
          video.pause();
        }
      }, { threshold: 0.05 }).observe(hero);
    }
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
      link.addEventListener('click', function () { closeMenu(false); });
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
    qvPanel.focus({ preventScroll: true });
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

  /* ---------- gallery slider: changes by itself, and by hand ---------- */

  var slider = $('[data-slider]');
  if (slider) {
    var sSlides = $$('.slide', slider);
    var sSegs = $$('.slider__seg', slider);
    var sCur = $('[data-slide-cur]', slider);
    var sPlay = $('[data-slide-play]', slider);
    var sStage = $('.slider__stage', slider);
    var sIndex = 0;
    var holds = { hover: false, view: true, page: false, user: false };

    function sPaused() {
      slider.classList.toggle('is-paused', holds.hover || !holds.view || holds.page);
    }

    function show(i) {
      var n = sSlides.length;
      sIndex = ((i % n) + n) % n;
      sSlides.forEach(function (s, k) {
        var on = k === sIndex;
        s.classList.toggle('is-active', on);
        if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
        var pic = $('.slide__img', s);
        if (on && pic && pic.loading === 'lazy') pic.loading = 'eager';
      });
      sSegs.forEach(function (seg, k) {
        seg.removeAttribute('aria-current');
        seg.classList.toggle('is-done', k < sIndex);
      });
      void slider.offsetWidth;
      sSegs[sIndex].setAttribute('aria-current', 'true');
      if (sCur) sCur.textContent = (sIndex + 1 < 10 ? '0' : '') + (sIndex + 1);
      /* warm the next picture so the change is instant */
      var next = sSlides[(sIndex + 1) % n];
      $$('img', next).forEach(function (im) { im.loading = 'eager'; });
    }

    function stop(on) {
      holds.user = on;
      slider.classList.toggle('is-stopped', on);
      sPlay.setAttribute('aria-label', on ? 'הפעלת ההחלפה האוטומטית' : 'עצירת ההחלפה האוטומטית');
      if (!on) show(sIndex);
    }

    $('.slider__segs', slider).addEventListener('animationend', function () {
      if (!holds.user) show(sIndex + 1);
    });
    $('[data-slide-next]', slider).addEventListener('click', function () { show(sIndex + 1); });
    $('[data-slide-prev]', slider).addEventListener('click', function () { show(sIndex - 1); });
    sSegs.forEach(function (seg, k) { seg.addEventListener('click', function () { show(k); }); });
    sPlay.addEventListener('click', function () { stop(!holds.user); });

    slider.addEventListener('mouseenter', function () { holds.hover = true; sPaused(); });
    slider.addEventListener('mouseleave', function () { holds.hover = false; sPaused(); });
    slider.addEventListener('focusin', function () { holds.hover = true; sPaused(); });
    slider.addEventListener('focusout', function () { holds.hover = false; sPaused(); });
    document.addEventListener('visibilitychange', function () { holds.page = document.hidden; sPaused(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { holds.view = entries[0].isIntersecting; sPaused(); }, { threshold: 0.25 }).observe(slider);
    }

    /* swipe: in a right-to-left page, a swipe to the right brings the next picture */
    var startX = null;
    var startY = 0;
    sStage.addEventListener('pointerdown', function (e) { startX = e.clientX; startY = e.clientY; });
    sStage.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(sIndex + (dx > 0 ? 1 : -1));
    });
    sStage.addEventListener('pointercancel', function () { startX = null; });
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(sIndex + 1);
      if (e.key === 'ArrowRight') show(sIndex - 1);
    });

    if (reduceMotion.matches) stop(true);
    show(0);
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
      if (item.emb && item.text.trim()) lines.push('הטקסט לרקמה: ' + item.text.trim());
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
      btn.setAttribute('aria-label', has ? 'פתיחת הסל, ' + (n === 1 ? 'פריט אחד' : n + ' פריטים') : 'פתיחת הסל');
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
    $('.line__name', li).textContent = product.name;
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
    $('[data-remove]', li).addEventListener('click', function () { removeItem(item); });
    check.addEventListener('change', function () {
      item.emb = check.checked;
      field.hidden = !item.emb;
      updateLine(li, item);
      sync(true);
      if (item.emb) input.focus();
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
    btn.setAttribute('role', 'button');
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      btn.classList.add('is-added');
      window.setTimeout(function () { btn.classList.remove('is-added'); }, 1600);
      flyToBag(card, function () { addItem(card.dataset.product); });
    });
    btn.addEventListener('keydown', function (event) {
      if (event.key === ' ') {
        event.preventDefault();
        btn.click();
      }
    });
  });

  var qvAdd = qv && $('[data-qv-add]', qv);
  if (qvAdd) {
    qvAdd.addEventListener('click', function () {
      if (!qvProduct) return;
      addItem(qvProduct);
      closeViewer(false);
      if (barCart) {
        barCart.classList.remove('is-catch');
        void barCart.offsetWidth;
        barCart.classList.add('is-catch');
      }
    });
  }

  render();
  sync(false);
})();
