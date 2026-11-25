(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  /* ---------- hero video ---------- */

  var hero = document.querySelector('.hero');
  var video = hero && hero.querySelector('.hero__video');
  var toggle = hero && hero.querySelector('.hero__toggle');
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
    var base = video.dataset.base + key;
    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (s) {
      var source = document.createElement('source');
      source.src = base + '.' + s[0];
      source.type = s[1];
      video.appendChild(source);
    });
    video.dataset.loaded = '1';
    video.load();
  }

  function play() {
    if (!video) return;
    loadVideo();
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        /* autoplay refused (low power mode etc.): the poster stays, the button offers play */
        setToggle(true);
      });
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

    /* The poster is the clip's first frame, so fading the video out just before the
       loop point and back in after it turns the cut into a cross-fade. */
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

  /* ---------- top bar ---------- */

  var bar = document.querySelector('.bar');
  var brand = hero && hero.querySelector('.hero__brand');
  if (bar && brand && 'IntersectionObserver' in window) {
    bar.inert = true;
    new IntersectionObserver(function (entries) {
      var show = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
      bar.classList.toggle('is-on', show);
      bar.inert = !show;
    }).observe(brand);
  }

  /* ---------- reveal on scroll ---------- */

  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    root.classList.add('reveal-on');
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { revealer.observe(el); });
  }

  /* ---------- product galleries ---------- */

  document.querySelectorAll('[data-gal]').forEach(function (gal) {
    var track = gal.querySelector('.gal__track');
    var slides = Array.prototype.slice.call(track.children);
    var dots = Array.prototype.slice.call(gal.querySelectorAll('.gal__dot'));
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
      /* direction-agnostic: works the same in RTL and LTR */
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
    var prev = gal.querySelector('.gal__nav--prev');
    var next = gal.querySelector('.gal__nav--next');
    if (prev) prev.addEventListener('click', function () { go(current - 1); });
    if (next) next.addEventListener('click', function () { go(current + 1); });
  });
})();
