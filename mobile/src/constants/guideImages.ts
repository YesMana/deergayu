/** Durable Unsplash fallbacks when guide upload URLs 404 (parity with website). */
export const GUIDE_IMAGE_DEFAULT =
  'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800';

const U = {
  tea: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&q=80&w=800',
  turmeric: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800',
  honey: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&q=80&w=800',
  ginger: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800',
  herbs: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800',
  greens: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
  teacup: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&q=80&w=800',
  leaves: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&q=80&w=800',
  salad: 'https://images.unsplash.com/photo-1505576391880-b3f9d713dc4f?auto=format&fit=crop&q=80&w=800',
  berries: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&q=80&w=800',
  juice: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&q=80&w=800',
  greenTea: 'https://images.unsplash.com/photo-1582793988951-9aed5509eb97?auto=format&fit=crop&q=80&w=800',
};

export const GUIDE_IMAGE_BY_NAME: Record<string, string> = {
  'Amla Drink': U.berries,
  Koththamalli: U.spices,
  'Cumin Water': U.teacup,
  Iramusu: U.herbs,
  'Turmeric Milk': U.turmeric,
  'Ranawara Flower Tea': U.tea,
  Paspanguwa: U.spices,
  'Gotu Kola Herbal Porridge': U.greens,
  'Gotukola Kenda': U.greens,
  'Chamomile Tea': U.teacup,
  'Lemongrass Tea': U.greenTea,
  'Tulsi Tea': U.leaves,
  Veniwelgeta: U.herbs,
  'Honey and Lemon Drink': U.honey,
  'Ginger Tea': U.ginger,
  'Coriander, Cumin and Fennel Tea': U.tea,
  'Mukunuwenna (Sessile Joyweed)': U.salad,
  Karapincha: U.leaves,
  'Bael Fruit Drink': U.juice,
};

export function isEphemeralGuideUploadUrl(url = '') {
  const u = String(url || '');
  return /\/api\/uploads\//i.test(u) || /onrender\.com\/.*\/uploads\//i.test(u);
}

export function guideImageFallback(name = '') {
  return GUIDE_IMAGE_BY_NAME[name] || GUIDE_IMAGE_DEFAULT;
}

/** Prefer stored URL; keep ephemeral so fresh uploads can show; UI onError uses fallback. */
export function resolveGuideRemedyImage(item: { image?: string; en?: { name?: string }; name?: string }) {
  const url = (item?.image || '').trim();
  const name = item?.en?.name || item?.name || '';
  if (url.startsWith('data:image/')) return url;
  if (url && /^https?:\/\//i.test(url)) return url;
  return guideImageFallback(name);
}
