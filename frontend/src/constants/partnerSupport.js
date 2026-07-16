/** Partner / staff support contacts — NOT shown to normal customers. */
export const PARTNER_SUPPORT = {
  /** Primary WhatsApp for doctors, vendors, admin, yantra/mantra partners */
  whatsappPrimary: {
    label: '071 990 9299',
    display: '0719909299',
    e164: '94719909299',
  },
  /** Secondary line */
  phoneSecondary: {
    label: '076 220 9299',
    display: '0762209299',
    e164: '94762209299',
  },
};

export function waMeUrl(e164, text) {
  const base = `https://wa.me/${e164}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const PARTNER_WA_PRESET =
  'Hi Deergayu Support — I need help with my partner account on the platform.';
