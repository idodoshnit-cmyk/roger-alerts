# אלעד הטכנאי · Elad Appliance Repair

One-page site built with Vite, React, TypeScript, Tailwind and GSAP.

```bash
npm install
npm run dev     # local development
npm run build   # dist/index.html: one self-contained file (JS, CSS, fonts inlined), works offline
```

- All text, devices and faults live in `src/content.ts`.
- **Reviews:** paste the three real Google review texts into `REVIEWS` in `src/content.ts` (text only). Until then the section shows the 5.0 rating only.
- **Share image:** `dist/og-image.png` sits next to `index.html`. Once there's a domain, change `og:image` / `twitter:image` in `index.html` to the absolute URL.
