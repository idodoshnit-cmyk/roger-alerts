import { useCallback, useMemo, useState } from 'react';
import { buildMessage, DEVICES, waLink, type DeviceId, type Lang } from './content';
import { Header } from './components/Header';
import { Hero, useLangDocument } from './components/Hero';
import { Area, Certs, Devices, Repairs, Reviews } from './components/Sections';
import { Contact, Footer, MobileBar } from './components/Contact';
import { prefersReducedMotion } from './motion';

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'he') return q;
    const saved = window.localStorage.getItem('lang');
    if (saved === 'en' || saved === 'he') return saved;
  } catch {
    /* storage can be blocked; Hebrew is the default */
  }
  return 'he';
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [deviceId, setDeviceId] = useState<DeviceId | null>(null);
  const [faultIdx, setFaultIdx] = useState<number | null>(null);
  const [details, setDetails] = useState('');

  useLangDocument(lang);

  const device = DEVICES.find((d) => d.id === deviceId) ?? null;
  const fault = device && faultIdx !== null ? device.faults[faultIdx] ?? null : null;
  const message = useMemo(() => buildMessage(lang, device, fault, details), [lang, device, fault, details]);
  const waHref = waLink(message);

  const toggleLang = useCallback(() => {
    setLang((l) => {
      const next = l === 'he' ? 'en' : 'he';
      try {
        window.localStorage.setItem('lang', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const chooseDevice = useCallback((id: DeviceId | null) => {
    setDeviceId(id);
    setFaultIdx(null);
  }, []);

  // From the appliance list: select it and bring the fault picker into view.
  const pickFromList = useCallback(
    (id: DeviceId) => {
      chooseDevice(id);
      requestAnimationFrame(() => {
        document
          .getElementById('repairs')
          ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      });
    },
    [chooseDevice],
  );

  return (
    <>
      <Header lang={lang} onToggleLang={toggleLang} />
      <main id="main">
        <Hero lang={lang} waHref={waHref} />
        <Devices lang={lang} onPick={pickFromList} />
        <Reviews lang={lang} />
        <Repairs
          lang={lang}
          device={device}
          faultIdx={faultIdx}
          onDevice={chooseDevice}
          onFault={setFaultIdx}
          message={message}
          waHref={waHref}
        />
        <Certs lang={lang} />
        <Area lang={lang} />
        <Contact
          lang={lang}
          device={device}
          faultIdx={faultIdx}
          details={details}
          onDevice={chooseDevice}
          onFault={setFaultIdx}
          onDetails={setDetails}
          waHref={waHref}
        />
      </main>
      <Footer lang={lang} waHref={waHref} />
      <MobileBar lang={lang} waHref={waHref} />
    </>
  );
}
