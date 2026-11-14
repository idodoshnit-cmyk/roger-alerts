import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { HERO_DEVICES, PHONE_DISPLAY, PHONE_TEL, UI, type Lang } from '../content';
import { CheckIcon, PhoneIcon, Stars, WhatsAppIcon } from './icons';
import { gsap, MOTION_OK } from '../motion';

export function Hero({ lang, waHref }: { lang: Lang; waHref: string }) {
  const t = UI[lang];
  const h1 = useRef<HTMLHeadingElement>(null);
  const stack = useRef<HTMLSpanElement>(null);
  const facts = useRef<HTMLDivElement>(null);

  // Keep the rotating device name on one line at any width: if the widest name does not
  // fit, shrink the heading just enough. All names share one grid cell, so the box is
  // always as wide as the widest name and nothing around it moves while they rotate.
  const fit = useCallback(() => {
    const el = h1.current;
    const box = stack.current;
    if (!el || !box) return;
    el.style.fontSize = '';
    const avail = el.clientWidth;
    const need = box.scrollWidth;
    if (need > avail) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${Math.floor(size * (avail / need) * 0.98)}px`;
    }
  }, []);

  useLayoutEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (h1.current) ro.observe(h1.current);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [fit, lang]);

  // Rotate the device name: old one rises and fades out, next one rises in. Position + opacity only.
  useLayoutEffect(() => {
    const box = stack.current;
    if (!box) return;
    const words = Array.from(box.children) as HTMLElement[];
    gsap.set(words, { opacity: 0, yPercent: 0 });
    gsap.set(words[0], { opacity: 1 });
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const tl = gsap.timeline({ repeat: -1 });
      words.forEach((w, i) => {
        const next = words[(i + 1) % words.length];
        tl.to(w, { opacity: 0, yPercent: -35, duration: 0.45, ease: 'power2.in' }, '+=2.2').fromTo(
          next,
          { opacity: 0, yPercent: 35 },
          { opacity: 1, yPercent: 0, duration: 0.55, ease: 'power2.out', immediateRender: false },
          '-=0.15',
        );
      });
    });
    return () => mm.revert();
  }, [lang]);

  // Secondary hero content eases in. The heading and the buttons are never moved.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      if (!facts.current) return;
      gsap.from(facts.current.querySelectorAll('[data-fact]'), {
        opacity: 0,
        y: 14,
        duration: 0.5,
        stagger: 0.08,
        delay: 0.15,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="top" aria-labelledby="hero-title" className="border-b border-navy-100 bg-paper">
      <div className="container-page grid gap-8 pb-10 pt-7 sm:pt-12 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12 lg:pb-16 lg:pt-14">
        <div className="min-w-0">
          <h1
            ref={h1}
            id="hero-title"
            className={
              lang === 'he'
                ? 'text-[clamp(2.4rem,11.5vw,4.4rem)] leading-[1.08] text-navy'
                : 'text-[clamp(2rem,9vw,4rem)] leading-[1.08] text-navy'
            }
          >
            <span className="sr-only">{t.heroSr}</span>
            <span aria-hidden="true" className="block">
              {t.heroPrefix && <span className="block">{t.heroPrefix}</span>}
              <span ref={stack} className="grid w-max max-w-none justify-items-start whitespace-nowrap">
                {HERO_DEVICES.map((d) => (
                  <span key={d.en} className="underline-blue [grid-area:1/1] will-change-transform">
                    {d[lang]}
                  </span>
                ))}
              </span>
              <span className="block">{t.heroSuffix}</span>
            </span>
          </h1>

          <p className="mt-4 max-w-[34rem] text-[1.1rem] leading-relaxed text-navy-600 sm:text-xl">{t.heroSub}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={waHref} className="btn btn-wa min-h-[56px] px-6 text-[1.1rem]">
              <WhatsAppIcon className="h-6 w-6 shrink-0" />
              {t.waCta}
            </a>
            <a href={PHONE_TEL} className="btn btn-call min-h-[56px] px-6 text-[1.1rem]" aria-label={t.callLabel}>
              <PhoneIcon className="h-5 w-5 shrink-0" />
              <span dir="ltr">{PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>

        <div ref={facts} className="card p-5 sm:p-6">
          <div data-fact className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-navy-100 pb-4">
            <Stars className="h-6 w-6" />
            <span className="font-head text-xl font-extrabold" aria-label={t.ratingLabel}>
              {t.rating}
            </span>
          </div>
          <ul className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-1">
            {t.facts.map((f) => (
              <li key={f} data-fact className="flex items-center gap-2.5 text-[1.05rem] font-semibold">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-navy">
                  <CheckIcon className="h-4 w-4" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function useLangDocument(lang: Lang) {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.title =
      lang === 'he'
        ? 'אלעד הטכנאי | תיקון מוצרי חשמל ביתיים בירושלים'
        : 'Elad Appliance Repair | Home appliance repair in Jerusalem';
  }, [lang]);
}
