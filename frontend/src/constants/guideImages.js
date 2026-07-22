/** Durable fallback images for Ayurvedic Guide remedies (verified Unsplash URLs). */
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
  teapot: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800',
  teacup: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&q=80&w=800',
  leaves: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&q=80&w=800',
  salad: 'https://images.unsplash.com/photo-1505576391880-b3f9d713dc4f?auto=format&fit=crop&q=80&w=800',
  cocktail: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&q=80&w=800',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800',
  iced: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=800',
  lemon: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&q=80&w=800',
  berries: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&q=80&w=800',
  juice: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&q=80&w=800',
  greenTea: 'https://images.unsplash.com/photo-1582793988951-9aed5509eb97?auto=format&fit=crop&q=80&w=800',
  citrus: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800',
};

export const GUIDE_IMAGE_BY_NAME = {
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

/** True when URL points at Render/local disk uploads that get wiped on restart. */
export function isEphemeralGuideUploadUrl(url = '') {
  const u = String(url || '');
  return /\/api\/uploads\//i.test(u) || /\/uploads\/\d{10,}-/i.test(u);
}

export function resolveGuideRemedyImage(remedy) {
  const name = remedy?.en?.name || remedy?.name || '';
  const url = (remedy?.image || '').trim();
  if (url && !isEphemeralGuideUploadUrl(url) && /^https?:\/\//i.test(url)) {
    return url;
  }
  return GUIDE_IMAGE_BY_NAME[name] || GUIDE_IMAGE_DEFAULT;
}
