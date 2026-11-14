// All site text lives here. Only facts supplied by the business are used.

export type Lang = 'he' | 'en';

export const PHONE_DISPLAY = '058-588-3323';
export const PHONE_TEL = 'tel:+972585883323';
export const WA_BASE = 'https://wa.me/972585883323';

export function waLink(message: string): string {
  return `${WA_BASE}?text=${encodeURIComponent(message)}`;
}

type T = { he: string; en: string };

export type DeviceId = 'fridge' | 'freezer' | 'washer' | 'dryer' | 'oven' | 'ac' | 'winx';

export interface Device {
  id: DeviceId;
  /** Plural name, used in lists and the hero heading. */
  plural: T;
  /** Singular name, used in the WhatsApp message ("ב" + singular). */
  single: T;
  /** Faults that make sense for this device only. */
  faults: T[];
}

export const DEVICES: Device[] = [
  {
    id: 'fridge',
    plural: { he: 'מקררים', en: 'Refrigerators' },
    single: { he: 'מקרר', en: 'refrigerator' },
    faults: [
      { he: 'לא מקרר', en: 'Not cooling' },
      { he: 'קרח מצטבר', en: 'Ice building up' },
      { he: 'מים מתחת למקרר', en: 'Water under the fridge' },
      { he: 'רעש חריג', en: 'Unusual noise' },
      { he: 'לא נדלק', en: "Won't turn on" },
    ],
  },
  {
    id: 'freezer',
    plural: { he: 'פריזרים', en: 'Freezers' },
    single: { he: 'פריזר', en: 'freezer' },
    faults: [
      { he: 'לא מקפיא', en: 'Not freezing' },
      { he: 'קרח מצטבר', en: 'Ice building up' },
      { he: 'הדלת לא נאטמת', en: "Door doesn't seal" },
      { he: 'רעש חריג', en: 'Unusual noise' },
      { he: 'לא נדלק', en: "Won't turn on" },
    ],
  },
  {
    id: 'washer',
    plural: { he: 'מכונות כביסה', en: 'Washing machines' },
    single: { he: 'מכונת כביסה', en: 'washing machine' },
    faults: [
      { he: 'לא מסחררת', en: "Won't spin" },
      { he: 'לא מוציאה מים', en: "Won't drain" },
      { he: 'דולפת', en: 'Leaking' },
      { he: 'רועשת או רועדת', en: 'Loud or shaking' },
      { he: 'הדלת לא נפתחת', en: "Door won't open" },
      { he: 'לא נדלקת', en: "Won't turn on" },
    ],
  },
  {
    id: 'dryer',
    plural: { he: 'מייבשים', en: 'Dryers' },
    single: { he: 'מייבש', en: 'dryer' },
    faults: [
      { he: 'לא מחמם', en: 'Not heating' },
      { he: 'התוף לא מסתובב', en: "Drum doesn't turn" },
      { he: 'נכבה באמצע', en: 'Stops mid-cycle' },
      { he: 'רעש חריג', en: 'Unusual noise' },
      { he: 'לא נדלק', en: "Won't turn on" },
    ],
  },
  {
    id: 'oven',
    plural: { he: 'תנורים', en: 'Ovens' },
    single: { he: 'תנור', en: 'oven' },
    faults: [
      { he: 'לא מחמם', en: 'Not heating' },
      { he: 'מחמם לא אחיד', en: 'Heats unevenly' },
      { he: 'מקפיץ את החשמל', en: 'Trips the breaker' },
      { he: 'הכפתורים או הטיימר לא עובדים', en: 'Controls or timer not working' },
      { he: 'לא נדלק', en: "Won't turn on" },
    ],
  },
  {
    id: 'ac',
    plural: { he: 'מזגנים', en: 'Air conditioners' },
    single: { he: 'מזגן', en: 'air conditioner' },
    faults: [
      { he: 'לא מקרר', en: 'Not cooling' },
      { he: 'לא מחמם', en: 'Not heating' },
      { he: 'מטפטף מים', en: 'Dripping water' },
      { he: 'רעש חריג', en: 'Unusual noise' },
      { he: 'קוד שגיאה בתצוגה', en: 'Error code on display' },
      { he: 'לא נדלק', en: "Won't turn on" },
    ],
  },
  {
    id: 'winx',
    plural: { he: 'חימום מים Winx', en: 'Winx water heating' },
    single: { he: 'חימום מים Winx', en: 'Winx water heating' },
    faults: [
      { he: 'אין מים חמים', en: 'No hot water' },
      { he: 'המים לא מספיק חמים', en: "Water isn't hot enough" },
      { he: 'מקפיץ את החשמל', en: 'Trips the breaker' },
      { he: 'נזילה', en: 'Leak' },
      { he: 'קוד שגיאה בתצוגה', en: 'Error code on display' },
    ],
  },
];

/** Devices used by the rotating word in the hero heading (Winx is too long for one line at 320px). */
export const HERO_DEVICES: T[] = [
  { he: 'מקררים', en: 'Refrigerator' },
  { he: 'פריזרים', en: 'Freezer' },
  { he: 'מכונות כביסה', en: 'Washing machine' },
  { he: 'מייבשים', en: 'Dryer' },
  { he: 'תנורים', en: 'Oven' },
  { he: 'מזגנים', en: 'Air conditioner' },
];

/**
 * Real Google review texts go here (text only: no names, no count).
 * The section shows the 5.0 rating on its own until these are filled in.
 */
export const REVIEWS: T[] = [];

export function buildMessage(lang: Lang, device: Device | null, fault: T | null, details: string): string {
  let msg: string;
  if (lang === 'he') {
    msg = device ? `היי, יש לי תקלה ב${device.single.he}` : 'היי, יש לי תקלה';
    if (device && fault) msg += `: ${fault.he}`;
  } else {
    msg = device ? `Hi, I have a problem with my ${device.single.en}` : 'Hi, I have an appliance problem';
    if (device && fault) msg += `: ${fault.en}`;
  }
  const extra = details.trim();
  return extra ? `${msg}\n${extra}` : msg;
}

export const UI = {
  he: {
    skip: 'דילוג לתוכן',
    nav: [
      ['devices', 'מכשירים'],
      ['reviews', 'ביקורות'],
      ['repairs', 'תיקונים'],
      ['certs', 'הסמכות'],
      ['area', 'אזור שירות'],
      ['contact', 'יצירת קשר'],
    ] as [string, string][],
    brand: 'אלעד הטכנאי',
    brandSub: 'תיקון מוצרי חשמל',
    langSwitch: 'English',
    langSwitchShort: 'EN',
    langSwitchLabel: 'Switch to English',
    menu: 'תפריט',
    closeMenu: 'סגירת התפריט',
    heroPrefix: 'תיקון',
    heroSuffix: 'בירושלים',
    heroSr: 'תיקון מקררים, פריזרים, מכונות כביסה, מייבשים, תנורים ומזגנים בירושלים',
    heroSub: 'מקררים, פריזרים, מכונות כביסה, מייבשים, תנורים, מזגנים וחימום מים Winx. כל החברות.',
    waCta: 'שליחת הודעה בוואטסאפ',
    waShort: 'וואטסאפ',
    callShort: 'חיוג',
    callLabel: `חיוג ל-${PHONE_DISPLAY}`,
    rating: '5.0 בגוגל',
    ratingLabel: 'דירוג 5.0 מתוך 5 בגוגל',
    facts: ['בתחום מאז 2000', 'הסמכות משרד העבודה', 'תעודת אחריות', 'שירות גם באנגלית'],
    devicesTitle: 'מכשירים',
    devicesNote: 'מתקנים רק את המכשירים האלה. כל החברות.',
    devicesHint: 'לחיצה על מכשיר מציגה תקלות נפוצות.',
    reviewsTitle: 'ביקורות',
    reviewsRating: 'דירוג בגוגל',
    repairsTitle: 'תיקונים',
    repairsLead: 'בוחרים מכשיר ותקלה, וההודעה לוואטסאפ מוכנה.',
    pickDevice: 'מכשיר',
    pickFault: 'תקלה',
    pickDeviceFirst: 'בחרו קודם מכשיר.',
    preview: 'ההודעה שתישלח',
    previewNote: 'אפשר לערוך את ההודעה בוואטסאפ לפני השליחה.',
    sendWa: 'שליחה בוואטסאפ',
    certsTitle: 'הסמכות',
    certsGroup: 'הסמכות משרד העבודה',
    certs: ['מערכות קירור', 'מיזוג אוויר', 'חשמלאי'],
    since: 'בתחום מאז',
    warranty: 'תעודת אחריות',
    warrantyNote: 'על התיקון',
    english: 'שירות גם באנגלית',
    englishNote: 'English spoken',
    areaTitle: 'אזור שירות',
    areaLead: 'ירושלים ומבשרת ציון.',
    north: 'צפון',
    northPlaces: 'פסגת זאב, נווה יעקב',
    city: 'ירושלים',
    cityNote: 'כל השכונות שביניהן',
    south: 'דרום',
    southPlaces: 'גילה, הר חומה',
    alsoLabel: 'וגם',
    also: 'מבשרת ציון',
    contactTitle: 'יצירת קשר',
    contactLead: 'ממלאים, ונפתחת הודעה מוכנה בוואטסאפ. או פשוט מתקשרים.',
    formDevice: 'מכשיר',
    formDevicePlaceholder: 'בחירת מכשיר',
    formFault: 'תקלה',
    formFaultPlaceholder: 'בחירת תקלה (לא חובה)',
    formDetails: 'פרטים נוספים (לא חובה)',
    formDetailsPlaceholder: 'למשל: דגם, מתי התחילה התקלה',
    orCall: 'או בטלפון',
    footerLine: 'תיקון מוצרי חשמל ביתיים בירושלים',
    footerArea: 'ירושלים ומבשרת ציון',
  },
  en: {
    skip: 'Skip to content',
    nav: [
      ['devices', 'Appliances'],
      ['reviews', 'Reviews'],
      ['repairs', 'Repairs'],
      ['certs', 'Licenses'],
      ['area', 'Service area'],
      ['contact', 'Contact'],
    ] as [string, string][],
    brand: 'Elad Appliance Repair',
    brandSub: 'Jerusalem',
    langSwitch: 'עברית',
    langSwitchShort: 'עב',
    langSwitchLabel: 'מעבר לעברית',
    menu: 'Menu',
    closeMenu: 'Close menu',
    heroPrefix: '',
    heroSuffix: 'repair in Jerusalem',
    heroSr: 'Refrigerator, freezer, washing machine, dryer, oven and air conditioner repair in Jerusalem',
    heroSub: 'Refrigerators, freezers, washing machines, dryers, ovens, air conditioners and Winx water heating. All brands.',
    waCta: 'Message on WhatsApp',
    waShort: 'WhatsApp',
    callShort: 'Call',
    callLabel: `Call ${PHONE_DISPLAY}`,
    rating: '5.0 on Google',
    ratingLabel: 'Rated 5.0 out of 5 on Google',
    facts: ['In the trade since 2000', 'Ministry of Labor licensed', 'Warranty certificate', 'English spoken'],
    devicesTitle: 'Appliances',
    devicesNote: 'Only these appliances are repaired. All brands.',
    devicesHint: 'Tap an appliance to see common faults.',
    reviewsTitle: 'Reviews',
    reviewsRating: 'Google rating',
    repairsTitle: 'Repairs',
    repairsLead: 'Pick the appliance and the fault, and the WhatsApp message is ready.',
    pickDevice: 'Appliance',
    pickFault: 'Fault',
    pickDeviceFirst: 'Pick an appliance first.',
    preview: 'Message to be sent',
    previewNote: 'You can edit it in WhatsApp before sending.',
    sendWa: 'Send on WhatsApp',
    certsTitle: 'Licenses',
    certsGroup: 'Ministry of Labor licenses',
    certs: ['Refrigeration systems', 'Air conditioning', 'Electrician'],
    since: 'In the trade since',
    warranty: 'Warranty certificate',
    warrantyNote: 'for the repair',
    english: 'English spoken',
    englishNote: 'שירות גם באנגלית',
    areaTitle: 'Service area',
    areaLead: 'Jerusalem and Mevaseret Zion.',
    north: 'North',
    northPlaces: "Pisgat Ze'ev, Neve Yaakov",
    city: 'Jerusalem',
    cityNote: 'All neighborhoods in between',
    south: 'South',
    southPlaces: 'Gilo, Har Homa',
    alsoLabel: 'Also',
    also: 'Mevaseret Zion',
    contactTitle: 'Contact',
    contactLead: 'Fill this in to open a ready WhatsApp message. Or just call.',
    formDevice: 'Appliance',
    formDevicePlaceholder: 'Choose an appliance',
    formFault: 'Fault',
    formFaultPlaceholder: 'Choose a fault (optional)',
    formDetails: 'More details (optional)',
    formDetailsPlaceholder: 'E.g. model, when the problem started',
    orCall: 'Or by phone',
    footerLine: 'Home appliance repair in Jerusalem',
    footerArea: 'Jerusalem and Mevaseret Zion',
  },
} as const;

export type Strings = (typeof UI)['he'] | (typeof UI)['en'];
