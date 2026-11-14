import { useLayoutEffect, useRef } from 'react';
import { DEVICES, REVIEWS, UI, type Device, type DeviceId, type Lang } from '../content';
import { CheckIcon, Stars, WhatsAppIcon } from './icons';
import { gsap, prefersReducedMotion, useReveal } from '../motion';

type Sel = {
  lang: Lang;
  device: Device | null;
  faultIdx: number | null;
  onDevice: (id: DeviceId) => void;
  onFault: (idx: number | null) => void;
};

/* ---------------------------------- Devices ---------------------------------- */

export function Devices({ lang, onPick }: { lang: Lang; onPick: (id: DeviceId) => void }) {
  const t = UI[lang];
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <section ref={ref} id="devices" aria-labelledby="devices-title" className="section">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 id="devices-title" data-reveal className="h2">
            {t.devicesTitle}
          </h2>
          <p data-reveal className="mt-3 text-xl font-bold">
            {t.devicesNote}
          </p>
          <p data-reveal className="mt-1 text-[1.05rem] text-navy-600">
            {t.devicesHint}
          </p>
        </div>
        <ul data-reveal className="card mt-8 grid gap-px overflow-hidden bg-navy-100 sm:grid-cols-2">
          {DEVICES.map((d) => (
            <li key={d.id} className="bg-white sm:last:odd:col-span-2">
              <button
                type="button"
                onClick={() => onPick(d.id)}
                className="flex min-h-[64px] w-full items-center px-5 text-start font-head text-[1.3rem] font-bold text-navy transition-[background-color,transform] duration-150 hover:bg-paper active:translate-y-px active:bg-navy-100 sm:px-6"
              >
                {d.plural[lang]}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------- Reviews ---------------------------------- */

export function Reviews({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <section ref={ref} id="reviews" aria-labelledby="reviews-title" className="section border-y border-navy-100 bg-white">
      <div className="container-page">
        <h2 id="reviews-title" data-reveal className="h2">
          {t.reviewsTitle}
        </h2>
        <div className={REVIEWS.length ? 'mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]' : 'mt-8'}>
          <div data-reveal className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-2">
            <span className="font-head text-6xl font-extrabold leading-none" aria-label={t.ratingLabel}>
              5.0
            </span>
            <div>
              <Stars className="h-6 w-6" />
              <p className="mt-1 text-[1.05rem] font-semibold text-navy-600">{t.reviewsRating}</p>
            </div>
          </div>
          {REVIEWS.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {REVIEWS.map((r, i) => (
                <figure
                  key={i}
                  data-reveal
                  className={`rounded-2xl border border-navy-100 bg-paper p-6 ${i === 0 ? 'md:col-span-2' : ''}`}
                >
                  <Stars className="h-4 w-4" />
                  <blockquote className="mt-3 text-[1.1rem] leading-relaxed">{r[lang]}</blockquote>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Repairs ---------------------------------- */

export function Repairs({ lang, device, faultIdx, onDevice, onFault, message, waHref }: Sel & { message: string; waHref: string }) {
  const t = UI[lang];
  const ref = useRef<HTMLElement>(null);
  const faultsRef = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLParagraphElement>(null);
  useReveal(ref);

  // New fault options slide in one after another when the device changes.
  useLayoutEffect(() => {
    if (!faultsRef.current || prefersReducedMotion()) return;
    const tween = gsap.from(faultsRef.current.children, {
      opacity: 0,
      x: lang === 'he' ? 10 : -10,
      duration: 0.35,
      stagger: 0.04,
      ease: 'power2.out',
      clearProps: 'opacity,transform',
    });
    return () => {
      tween.revert();
    };
  }, [device?.id, lang]);

  useLayoutEffect(() => {
    if (!bubble.current || prefersReducedMotion()) return;
    const tween = gsap.fromTo(bubble.current, { opacity: 0.35 }, { opacity: 1, duration: 0.35, ease: 'power1.out' });
    return () => {
      tween.kill();
    };
  }, [message]);

  return (
    <section ref={ref} id="repairs" aria-labelledby="repairs-title" className="section">
      <div className="container-page">
        <h2 id="repairs-title" data-reveal className="h2">
          {t.repairsTitle}
        </h2>
        <p data-reveal className="mt-3 max-w-2xl text-xl text-navy-600">
          {t.repairsLead}
        </p>

        <div data-reveal className="card mt-8 grid lg:grid-cols-[1.4fr_1fr]">
          <div className="p-5 sm:p-7">
            <fieldset>
              <legend className="label text-lg">{t.pickDevice}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEVICES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="pill"
                    aria-pressed={device?.id === d.id}
                    onClick={() => onDevice(d.id)}
                  >
                    {capitalize(d.single[lang], lang)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="label text-lg">{t.pickFault}</legend>
              {device ? (
                <div ref={faultsRef} className="mt-2 flex flex-wrap gap-2">
                  {device.faults.map((f, i) => (
                    <button
                      key={`${device.id}-${i}`}
                      type="button"
                      className="pill"
                      aria-pressed={faultIdx === i}
                      onClick={() => onFault(faultIdx === i ? null : i)}
                    >
                      {f[lang]}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[1.05rem] text-navy-600">{t.pickDeviceFirst}</p>
              )}
            </fieldset>
          </div>

          <div className="flex flex-col border-t border-navy-100 bg-paper p-5 sm:p-7 lg:rounded-e-2xl lg:border-s lg:border-t-0">
            <p className="label">{t.preview}</p>
            <p
              ref={bubble}
              aria-live="polite"
              className="mt-1 whitespace-pre-line rounded-2xl rounded-ss-md border border-navy-100 bg-white p-4 text-[1.1rem] leading-relaxed"
            >
              {message}
            </p>
            <p className="mt-2 text-[0.95rem] text-navy-600">{t.previewNote}</p>
            <a href={waHref} className="btn btn-wa mt-5 w-full lg:mt-auto">
              <WhatsAppIcon className="h-6 w-6 shrink-0" />
              {t.sendWa}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function capitalize(s: string, lang: Lang) {
  return lang === 'en' ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ------------------------------- Certifications ------------------------------ */

export function Certs({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <section ref={ref} id="certs" aria-labelledby="certs-title" className="section border-y border-navy-100 bg-white">
      <div className="container-page">
        <h2 id="certs-title" data-reveal className="h2">
          {t.certsTitle}
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div data-reveal className="rounded-2xl border border-navy-100 bg-paper p-6 sm:p-7">
            <h3 className="text-xl sm:text-2xl">{t.certsGroup}</h3>
            <ul className="mt-5 space-y-3">
              {t.certs.map((c) => (
                <li key={c} className="flex items-center gap-3 text-[1.2rem] font-semibold">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-white">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <dl data-reveal className="grid gap-px overflow-hidden rounded-2xl border border-navy-100 bg-navy-100">
            <div className="flex items-baseline justify-between gap-4 bg-white p-5 sm:p-6">
              <dt className="text-[1.05rem] font-semibold text-navy-600">{t.since}</dt>
              <dd className="font-head text-4xl font-extrabold">2000</dd>
            </div>
            <div className="bg-white p-5 sm:p-6">
              <dt className="font-head text-xl font-bold">{t.warranty}</dt>
              <dd className="mt-0.5 text-[1.05rem] text-navy-600">{t.warrantyNote}</dd>
            </div>
            <div className="bg-white p-5 sm:p-6">
              <dt className="font-head text-xl font-bold">{t.english}</dt>
              <dd className="mt-0.5 text-[1.05rem] text-navy-600" lang={lang === 'he' ? 'en' : 'he'}>
                {t.englishNote}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Service area ------------------------------ */

export function Area({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  const stops = [
    { k: t.north, v: t.northPlaces, main: false },
    { k: t.city, v: t.cityNote, main: true },
    { k: t.south, v: t.southPlaces, main: false },
  ];
  return (
    <section ref={ref} id="area" aria-labelledby="area-title" className="section">
      <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div>
          <h2 id="area-title" data-reveal className="h2">
            {t.areaTitle}
          </h2>
          <p data-reveal className="mt-3 text-xl text-navy-600">
            {t.areaLead}
          </p>
        </div>
        <div data-reveal className="card p-6 sm:p-7">
          <ol className="relative">
            <span aria-hidden="true" className="absolute bottom-5 top-5 w-[3px] rounded-full bg-blue-100 start-[9px]" />
            {stops.map((s) => (
              <li key={s.k} className="relative flex gap-5 py-3">
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-1.5 h-[21px] w-[21px] shrink-0 rounded-full border-[3px] border-blue ${s.main ? 'bg-blue' : 'bg-white'}`}
                />
                <div>
                  <p className={`font-head font-bold ${s.main ? 'text-2xl' : 'text-xl'}`}>{s.k}</p>
                  <p className="text-[1.1rem] text-navy-600">{s.v}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 border-t border-navy-100 pt-5">
            <span className="text-[1.05rem] font-semibold text-navy-600">{t.alsoLabel}</span>
            <span className="font-head text-xl font-bold">{t.also}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
