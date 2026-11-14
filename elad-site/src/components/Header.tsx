import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PHONE_DISPLAY, PHONE_TEL, UI, type Lang } from '../content';
import { CloseIcon, MenuIcon, PhoneIcon } from './icons';
import { gsap, prefersReducedMotion } from '../motion';

export function Header({ lang, onToggleLang }: { lang: Lang; onToggleLang: () => void }) {
  const t = UI[lang];
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !panel.current || prefersReducedMotion()) return;
    const links = panel.current.querySelectorAll('li');
    const tl = gsap.timeline();
    tl.from(panel.current, { opacity: 0, y: -8, duration: 0.3, ease: 'power2.out' }).from(
      links,
      { opacity: 0, y: -6, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' },
      '-=0.15',
    );
    return () => {
      tl.kill();
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        {t.skip}
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <a href="#top" className="flex min-h-[44px] flex-col justify-center leading-none" onClick={() => setOpen(false)}>
          <span className="font-head text-[1.3rem] font-extrabold tracking-tight text-navy">{t.brand}</span>
          <span className="mt-1 text-[0.8rem] font-semibold text-navy-600">{t.brandSub}</span>
        </a>

        <nav aria-label={t.menu} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {t.nav.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-[1rem] font-semibold text-navy-600 transition-colors hover:text-navy"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            lang={lang === 'he' ? 'en' : 'he'}
            aria-label={t.langSwitchLabel}
            className="btn btn-ghost min-h-[44px] px-3 text-[0.95rem]"
          >
            {t.langSwitch}
          </button>
          <a href={PHONE_TEL} className="btn btn-call hidden min-h-[44px] lg:inline-flex" aria-label={t.callLabel}>
            <PhoneIcon />
            <span dir="ltr">{PHONE_DISPLAY}</span>
          </a>
          <button
            ref={menuBtn}
            type="button"
            className="btn btn-ghost h-11 min-h-[44px] w-11 px-0 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.closeMenu : t.menu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <div ref={panel} id="mobile-menu" className="border-t border-navy-100 bg-white lg:hidden">
          <nav aria-label={t.menu} className="container-page py-2">
            <ul>
              {t.nav.map(([id, label]) => (
                <li key={id} className="border-b border-navy-100 last:border-0">
                  <a
                    href={`#${id}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[52px] items-center font-head text-lg font-bold text-navy"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
