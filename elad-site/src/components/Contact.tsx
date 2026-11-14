import { useRef } from 'react';
import { DEVICES, PHONE_DISPLAY, PHONE_TEL, UI, WA_BASE, type Device, type DeviceId, type Lang } from '../content';
import { PhoneIcon, WhatsAppIcon } from './icons';
import { useReveal } from '../motion';

type Props = {
  lang: Lang;
  device: Device | null;
  faultIdx: number | null;
  details: string;
  onDevice: (id: DeviceId | null) => void;
  onFault: (idx: number | null) => void;
  onDetails: (v: string) => void;
  waHref: string;
};

export function Contact({ lang, device, faultIdx, details, onDevice, onFault, onDetails, waHref }: Props) {
  const t = UI[lang];
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <section ref={ref} id="contact" aria-labelledby="contact-title" className="section border-t border-navy-100 bg-white">
      <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div>
          <h2 id="contact-title" data-reveal className="h2">
            {t.contactTitle}
          </h2>
          <p data-reveal className="mt-3 text-xl text-navy-600">
            {t.contactLead}
          </p>
          <div data-reveal className="mt-6 hidden lg:block">
            <p className="label text-navy-600">{t.orCall}</p>
            <a href={PHONE_TEL} className="btn btn-call min-h-[56px] px-6" aria-label={t.callLabel}>
              <PhoneIcon />
              <span dir="ltr">{PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>

        <form
          data-reveal
          className="rounded-2xl border border-navy-100 bg-paper p-5 sm:p-7"
          action={WA_BASE}
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = waHref;
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="f-device" className="label">
                {t.formDevice}
              </label>
              <select
                id="f-device"
                className="field"
                value={device?.id ?? ''}
                onChange={(e) => onDevice((e.target.value || null) as DeviceId | null)}
              >
                <option value="">{t.formDevicePlaceholder}</option>
                {DEVICES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lang === 'en' ? d.single.en.charAt(0).toUpperCase() + d.single.en.slice(1) : d.single.he}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-fault" className="label">
                {t.formFault}
              </label>
              <select
                id="f-fault"
                className="field"
                disabled={!device}
                value={faultIdx ?? ''}
                onChange={(e) => onFault(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">{device ? t.formFaultPlaceholder : t.pickDeviceFirst}</option>
                {device?.faults.map((f, i) => (
                  <option key={i} value={i}>
                    {f[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5">
            <label htmlFor="f-details" className="label">
              {t.formDetails}
            </label>
            <textarea
              id="f-details"
              rows={3}
              className="field min-h-[96px] resize-y py-3"
              placeholder={t.formDetailsPlaceholder}
              value={details}
              onChange={(e) => onDetails(e.target.value)}
            />
          </div>
          <a href={waHref} className="btn btn-wa mt-6 min-h-[56px] w-full text-[1.1rem]">
            <WhatsAppIcon className="h-6 w-6 shrink-0" />
            {t.sendWa}
          </a>
          <div className="mt-4 lg:hidden">
            <a href={PHONE_TEL} className="btn btn-call min-h-[56px] w-full" aria-label={t.callLabel}>
              <PhoneIcon />
              <span dir="ltr">{PHONE_DISPLAY}</span>
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}

export function Footer({ lang, waHref }: { lang: Lang; waHref: string }) {
  const t = UI[lang];
  return (
    <footer className="bg-navy pb-28 pt-12 text-white lg:pb-12">
      <div className="container-page grid gap-8 sm:grid-cols-2 sm:items-end">
        <div>
          <p className="font-head text-2xl font-extrabold">{lang === 'he' ? 'אלעד הטכנאי' : 'Elad Appliance Repair'}</p>
          <p className="mt-0.5 text-[1.05rem] text-navy-200" lang={lang === 'he' ? 'en' : 'he'}>
            {lang === 'he' ? 'Elad Appliance Repair' : 'אלעד הטכנאי'}
          </p>
          <p className="mt-3 text-[1.05rem] text-navy-200">{t.footerLine}</p>
          <p className="text-[1.05rem] text-navy-200">{t.footerArea}</p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <a href={PHONE_TEL} className="inline-flex min-h-[44px] items-center gap-2 font-head text-xl font-bold hover:text-blue-300" aria-label={t.callLabel}>
            <PhoneIcon />
            <span dir="ltr">{PHONE_DISPLAY}</span>
          </a>
          <a href={waHref} className="inline-flex min-h-[44px] items-center gap-2 font-head text-xl font-bold hover:text-blue-300">
            <WhatsAppIcon className="h-5 w-5 text-wa" />
            {t.waShort}
          </a>
          <p className="mt-3 text-[0.95rem] text-navy-200">© {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}

/** Fixed bar on phones: WhatsApp and call are always one tap away. */
export function MobileBar({ lang, waHref }: { lang: Lang; waHref: string }) {
  const t = UI[lang];
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white px-3 pt-2.5 lg:hidden"
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-xl gap-2.5">
        <a href={waHref} className="btn btn-wa min-h-[52px] flex-[1.5] px-3">
          <WhatsAppIcon className="h-6 w-6 shrink-0" />
          {t.waShort}
        </a>
        <a href={PHONE_TEL} className="btn btn-call min-h-[52px] flex-1 px-3" aria-label={t.callLabel}>
          <PhoneIcon />
          {t.callShort}
        </a>
      </div>
    </div>
  );
}
