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
    toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
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
  if (bar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-solid', !entries[0].isIntersecting);
    }, { rootMargin: '-92px 0px 0px 0px' }).observe(hero);
  } else if (bar) {
    bar.classList.add('is-solid');
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

  /* ---------- product galleries ---------- */

  $$('[data-gal]').forEach(function (gal) {
    var track = $('.gal__track', gal);
    var slides = Array.prototype.slice.call(track.children);
    var dots = $$('.gal__dot', gal);
    var current = 0;

    function mark(i) {
      current = i;
      dots.forEach(function (dot, j) {
        dot.setAttribute('aria-current', j === i ? 'true' : 'false');
      });
    }

    function go(i) {
      var n = slides.length;
      var target = slides[((i % n) + n) % n];
      /* direction-agnostic: the same in RTL and LTR */
      var delta = target.getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollBy({ left: delta, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    if ('IntersectionObserver' in window) {
      var watcher = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) mark(slides.indexOf(entry.target));
        });
      }, { root: track, threshold: 0.6 });
      slides.forEach(function (slide) { watcher.observe(slide); });
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { go(i); });
    });
    var prev = $('.gal__nav--prev', gal);
    var next = $('.gal__nav--next', gal);
    if (prev) prev.addEventListener('click', function () { go(current - 1); });
    if (next) next.addEventListener('click', function () { go(current + 1); });
  });

  /* ---------- cart ---------- */

  var cartEl = $('#cart');
  if (!cartEl) return;

  var STORE_KEY = 'tevel-cart-v1';
  var WA = cartEl.dataset.wa;
  var EMB_PRICE = parseInt(cartEl.dataset.embPrice, 10) || 0;
  var MAX_QTY = 10;
  var NBSP = ' ';

  var products = {};
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
      return item && products[item.id];
    }).map(function (item) {
      return {
        k: 'l' + (++uid),
        id: item.id,
        qty: Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 1)),
        emb: !!item.emb,
        text: String(item.text || '').slice(0, 24)
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

  /* the order as one WhatsApp message */
  function message() {
    var lines = items.map(function (item) {
      var line = 'דגם ' + products[item.id].name + ' × ' + item.qty;
      if (item.emb) {
        var text = item.text.trim();
        line += ' + רקמה אישית' + (text ? ': "' + text + '"' : '');
      }
      return line + ' – ' + money(unitPrice(item) * item.qty);
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
      btn.setAttribute('aria-label', has ? 'פתיחת הסל, ' + countLabel(n) : 'פתיחת הסל');
    });
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
    $('[data-remove]', li).setAttribute('aria-label', 'הסרת ' + product.name + ' מהסל');

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
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(hideUndo, 7000);
    announce(products[item.id].name + ' הוסר מהסל');
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
    announce(products[back.item.id].name + ' חזר לסל');
  });

  /* open / close */

  function setBackgroundInert(on) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === cartEl || el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE' || el === liveEl) return;
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
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', openCart);
  });
  $$('[data-cart-close]', cartEl).forEach(function (el) {
    el.addEventListener('click', closeCart);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && cartEl.classList.contains('is-open')) closeCart();
  });

  /* add-to-cart buttons: without this script each one is a plain link to WhatsApp for that model */
  $$('[data-add]').forEach(function (btn) {
    var card = btn.closest('[data-product]');
    if (!card) return;
    btn.setAttribute('role', 'button');
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      addItem(card.dataset.product);
      btn.classList.add('is-added');
      window.setTimeout(function () { btn.classList.remove('is-added'); }, 1600);
      window.setTimeout(openCart, reduceMotion.matches ? 0 : 420);
    });
    btn.addEventListener('keydown', function (event) {
      if (event.key === ' ') {
        event.preventDefault();
        btn.click();
      }
    });
  });

  render();
  sync(false);
})();
