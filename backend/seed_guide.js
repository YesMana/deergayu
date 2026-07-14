const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

dotenv.config();

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
  } else {
    admin.initializeApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

const db = getFirestore();

const remedies = [
  {
    image: 'https://images.unsplash.com/photo-1596541223130-5d564415f0d4?auto=format&fit=crop&q=80&w=400',
    en: { name: 'Paspanguwa', ingredients: 'Coriander, Ginger, Pathpadagam, Katuwelbatu, Veniwelgeta', uses: 'Common cold, fever, body aches, and boosting immunity.', preparation: 'Boil all 5 ingredients in 4 cups of water until it reduces to 1 cup. Drink warm, optionally with jaggery.' },
    si: { name: 'පස්පංගුව', ingredients: 'කොත්තමල්ලි, ඉඟුරු, පත්පාඩගම්, කටුවැල්බටු, වෙනිවැල්ගැට', uses: 'සෙම්ප්‍රතිශ්‍යාව, උණ, ඇඟපත වේදනාව සහ ප්‍රතිශක්තිය වැඩි කිරීමට.', preparation: 'මේ ඖෂධ 5ම වතුර කෝප්ප 4ක් දමා කෝප්ප 1කට සිඳෙන්නට හැර උණුවෙන්ම බොන්න.' },
    ta: { name: 'பஸ்பங்குவ', ingredients: 'கொத்தமல்லி, இஞ்சி, பத்பாடகம், கட்டுவெல்படு, வெனிவெல்கெட', uses: 'ஜலதோஷம், காய்ச்சல், உடல் வலி மற்றும் நோய் எதிர்ப்பு சக்தியை அதிகரிக்கும்.', preparation: 'இந்த 5 பொருட்களையும் 4 கப் தண்ணீரில் 1 கப்பாக குறையும் வரை கொதிக்க வைக்கவும். சூடாக குடிக்கவும்.' }
  },
  {
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400',
    en: { name: 'Koththamalli', ingredients: 'Coriander seeds, Ginger (optional)', uses: 'Mild fever, sore throat, indigestion, and as a cooling drink.', preparation: 'Roast coriander seeds lightly, crush them, and boil with water. Strain and drink warm.' },
    si: { name: 'කොත්තමල්ලි', ingredients: 'කොත්තමල්ලි ඇට, ඉඟුරු', uses: 'සුළු උණ, උගුරේ අමාරුව, ආහාර අරුචිය සහ ඇඟ නිවීමට.', preparation: 'කොත්තමල්ලි ඇට මද ගින්නේ බැද, තලා වතුරෙන් තම්බා පෙරා උණුවෙන් බොන්න.' },
    ta: { name: 'கொத்தமல்லி', ingredients: 'கொத்தமல்லி விதைகள், இஞ்சி', uses: 'லேசான காய்ச்சல், தொண்டை வலி, மற்றும் உடலை குளிர்விக்க.', preparation: 'கொத்தமல்லி விதைகளை லேசாக வறுத்து, தண்ணீரில் கொதிக்க வைத்து வடிகட்டி சூடாக குடிக்கவும்.' }
  },
  {
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400',
    en: { name: 'Veniwelgeta', ingredients: 'Yellow Vine (Coscinium fenestratum)', uses: 'Pain relief, reducing inflammation, wound healing, and treating tetanus.', preparation: 'Boil the dried stems in water for 15-20 minutes. Drink the bitter decoction.' },
    si: { name: 'වෙනිවැල්ගැට', ingredients: 'වෙනිවැල්ගැට', uses: 'වේදනා නාශකයක් ලෙස, ඉදිමුම් අඩු කිරීමට සහ තුවාල සුව කිරීමට.', preparation: 'වියළි වෙනිවැල්ගැට කැබලි විනාඩි 15-20ක් පමණ තම්බා එහි තිත්ත කසාය පානය කරන්න.' },
    ta: { name: 'வெனிவெல்கெட', ingredients: 'வெனிவெல்கெட', uses: 'வலி நிவாரணி, வீக்கத்தை குறைத்தல், காயங்களை ஆற்றுதல்.', preparation: 'காய்ந்த வெனிவெல்கெட துண்டுகளை 15-20 நிமிடங்கள் தண்ணீரில் கொதிக்க வைத்து கசப்பான கஷாயத்தை குடிக்கவும்.' }
  },
  {
    image: 'https://images.unsplash.com/photo-1589363460779-cb495392ee5a?auto=format&fit=crop&q=80&w=400',
    en: { name: 'Iramusu', ingredients: 'Indian Sarsaparilla (Hemidesmus indicus)', uses: 'Purifying blood, cooling the body, improving skin complexion.', preparation: 'Boil the dried roots in water and drink as a regular tea.' },
    si: { name: 'ඉරමුසු', ingredients: 'ඉරමුසු', uses: 'රුධිරය පිරිසිදු කිරීමට, ශරීරය සිසිල් කිරීමට සහ සම පැහැපත් කිරීමට.', preparation: 'වියළි ඉරමුසු මුල් තම්බා සාමාන්‍ය තේ පානයක් ලෙස බොන්න.' },
    ta: { name: 'இரமுசு', ingredients: 'நன்னாரி (இரமுசு)', uses: 'இரத்தத்தை சுத்திகரித்தல், உடலை குளிர்வித்தல், மற்றும் சருமத்தை மேம்படுத்துதல்.', preparation: 'காய்ந்த வேர்களை தண்ணீரில் கொதிக்க வைத்து தேநீர் போல குடிக்கவும்.' }
  },
  {
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400',
    en: { name: 'Gotukola Kenda', ingredients: 'Gotukola leaves, Red rice, Coconut milk, Garlic, Ginger', uses: 'Enhancing memory, improving eyesight, and nourishing the body.', preparation: 'Blend Gotukola leaves, extract juice, and cook with boiled red rice gruel and coconut milk.' },
    si: { name: 'ගොටුකොළ කැඳ', ingredients: 'ගොටුකොළ, රතු කැකුළු සහල්, පොල් කිරි, සුදුළූණු, ඉඟුරු', uses: 'මතක ශක්තිය වැඩි කිරීමට, ඇස් පෙනීම වර්ධනයට සහ ශරීරය පෝෂණය කිරීමට.', preparation: 'ගොටුකොළ කොටා යුෂ ගෙන, තම්බාගත් රතු කැකුළු සහල් සහ පොල් කිරි සමඟ මිශ්‍ර කර උයාගන්න.' },
    ta: { name: 'வல்லாரை கஞ்சி', ingredients: 'வல்லாரை இலைகள், சிவப்பு அரிசி, தேங்காய் பால், பூண்டு, இஞ்சி', uses: 'நினைவாற்றலை அதிகரித்தல், கண்பார்வையை மேம்படுத்துதல் மற்றும் உடலை போஷித்தல்.', preparation: 'வல்லாரை இலைகளை அரைத்து சாறு எடுத்து, சமைத்த சிவப்பு அரிசி மற்றும் தேங்காய் பாலுடன் கலக்கவும்.' }
  },
  {
    image: 'https://images.unsplash.com/photo-1606579294215-64bc63bba2c2?auto=format&fit=crop&q=80&w=400',
    en: { name: 'Karapincha', ingredients: 'Curry leaves', uses: 'Lowering cholesterol, improving digestion, and controlling diabetes.', preparation: 'Extract juice from fresh leaves and mix with a little lime and salt, or consume as a gruel.' },
    si: { name: 'කරපිංචා', ingredients: 'කරපිංචා කොළ', uses: 'කොලෙස්ටරෝල් අඩු කිරීමට, දිරවීම පහසු කිරීමට සහ දියවැඩියාව පාලනයට.', preparation: 'නැවුම් කොළ කොටා යුෂ ගෙන දෙහි සහ ලුණු ස්වල්පයක් සමඟ පානය කරන්න, නැතහොත් කැඳ ලෙස සාදාගන්න.' },
    ta: { name: 'கறிவேப்பிலை', ingredients: 'கறிவேப்பிலை', uses: 'கொலஸ்ட்ராலைக் குறைத்தல், செரிமானத்தை மேம்படுத்துதல் மற்றும் நீரிழிவு நோயைக் கட்டுப்படுத்துதல்.', preparation: 'புதிய இலைகளிலிருந்து சாறு எடுத்து சிறிதளவு எலுமிச்சை மற்றும் உப்புடன் கலந்து குடிக்கவும்.' }
  }
];

const routines = [
  {
    order: 1, icon: 'Sun',
    en: { time: '5:00 AM - 6:00 AM', title: 'Brahma Muhurta (Wake Up)', description: 'Wake up 1.5 hours before sunrise. This is the most peaceful time of day, ideal for spiritual practices.', tips: 'Gently stretch in bed | Express gratitude | Avoid checking your phone immediately' },
    si: { time: 'පෙ.ව. 5:00 - 6:00', title: 'බ්‍රහ්ම මුහුර්තය (අවදි වීම)', description: 'හිරු උදාවට පැය 1.5කට පෙර අවදි වන්න. මෙය දවසේ නිස්කලංකම වේලාව වන අතර ආධ්‍යාත්මික කටයුතු සඳහා ඉතා යෝග්‍ය වේ.', tips: 'ඇඳේ සිටම ඇඟ මැලි කඩන්න | ස්වභාවධර්මයට ස්තූති කරන්න | අවදි වූ ගමන් ජංගම දුරකථනය බැලීමෙන් වළකින්න' },
    ta: { time: 'காலை 5:00 - 6:00', title: 'பிரம்மா முஹூர்த்தம் (எழுதல்)', description: 'சூரிய உதயத்திற்கு 1.5 மணி நேரத்திற்கு முன்பு எழுந்திருங்கள். இது நாளின் மிகவும் அமைதியான நேரம்.', tips: 'படுக்கையில் மெதுவாக நீட்டவும் | இயற்கைக்கு நன்றி தெரிவிக்கவும் | உடனடியாக தொலைபேசியைப் பார்ப்பதைத் தவிர்க்கவும்' }
  },
  {
    order: 2, icon: 'Droplet',
    en: { time: '6:00 AM - 6:30 AM', title: 'Purification & Cleansing', description: 'Cleanse the senses. Wash your face, scrape your tongue to remove toxins, and drink warm water.', tips: 'Use a copper tongue scraper | Drink warm lemon water | Brush teeth with herbal toothpaste' },
    si: { time: 'පෙ.ව. 6:00 - 6:30', title: 'පිරිසිදු වීම', description: 'මුහුණ සෝදා, දිව මැද විස ඉවත් කරගන්න. ආහාර දිරවීම උත්තේජනය කිරීම සඳහා උණුසුම් ජලය වීදුරුවක් පානය කරන්න.', tips: 'තඹ දිව මදින උපකරණයක් භාවිතා කරන්න | උණුසුම් දෙහි වතුර බොන්න | ඖෂධීය දන්තාලේප භාවිතා කරන්න' },
    ta: { time: 'காலை 6:00 - 6:30', title: 'சுத்திகரிப்பு', description: 'முகம் கழுவி, நாக்கை சுத்தம் செய்து நச்சுக்களை அகற்றவும். செரிமானத்தைத் தூண்ட வெதுவெதுப்பான நீரைக் குடிக்கவும்.', tips: 'செம்பு நாக்கு வழிப்பான் பயன்படுத்தவும் | வெதுவெதுப்பான எலுமிச்சை நீர் குடிக்கவும் | மூலிகை பற்பசை பயன்படுத்தவும்' }
  },
  {
    order: 3, icon: 'Activity',
    en: { time: '6:30 AM - 7:30 AM', title: 'Movement & Meditation', description: 'Engage in gentle exercise like Yoga, followed by breathwork and meditation.', tips: 'Sun salutations | 10-15 minutes of meditation | Abhyanga (self-massage)' },
    si: { time: 'පෙ.ව. 6:30 - 7:30', title: 'ව්‍යායාම සහ භාවනා', description: 'යෝගා වැනි සැහැල්ලු ව්‍යායාමවල නිරත වන්න, ඉන්පසු ප්‍රාණයාම සහ භාවනා කරන්න.', tips: 'සූර්ය නමස්කාරය | විනාඩි 10-15ක නිහඬ භාවනාව | ස්නානයට පෙර ඇඟේ තෙල් ගෑම (අභ්‍යංග)' },
    ta: { time: 'காலை 6:30 - 7:30', title: 'உடற்பயிற்சி & தியானம்', description: 'யோகா போன்ற மென்மையான உடற்பயிற்சிகளை மேற்கொள்ளவும், பின்னர் மூச்சுப் பயிற்சி மற்றும் தியானம்.', tips: 'சூரிய நமஸ்காரம் | 10-15 நிமிட தியானம் | குளிப்பதற்கு முன் எண்ணெய் மசாஜ் (அப்யங்கா)' }
  },
  {
    order: 4, icon: 'Coffee',
    en: { time: '7:30 AM - 8:30 AM', title: 'Light Breakfast', description: 'Eat a nourishing, warm breakfast appropriate for your Dosha.', tips: 'Warm oatmeal or herbal gruel | Avoid cold or heavy foods | Eat only when genuinely hungry' },
    si: { time: 'පෙ.ව. 7:30 - 8:30', title: 'සැහැල්ලු උදෑසන ආහාරය', description: 'ඔබේ දෝෂයට ගැලපෙන පෝෂ්‍යදායී, උණුසුම් උදෑසන ආහාරයක් ගන්න.', tips: 'ඖෂධීය කැඳ වීදුරුවක් | සීතල හෝ බර ආහාර වලින් වළකින්න | බඩගිනි නම් පමණක් ආහාර ගන්න' },
    ta: { time: 'காலை 7:30 - 8:30', title: 'காலை உணவு', description: 'உங்கள் தோஷத்திற்கு ஏற்ற சத்தான, சூடான காலை உணவை உண்ணுங்கள்.', tips: 'மூலிகை கஞ்சி | குளிர்ந்த அல்லது கனமான உணவுகளைத் தவிர்க்கவும் | பசியாக இருக்கும்போது மட்டுமே சாப்பிடவும்' }
  },
  {
    order: 5, icon: 'Sun',
    en: { time: '12:00 PM - 1:00 PM', title: 'Lunch (Main Meal)', description: 'Pitta dosha is at its peak. This should be your largest and most complex meal of the day.', tips: 'Include all 6 tastes | Eat in a calm environment | Sit for 10 minutes after eating' },
    si: { time: 'ප.ව. 12:00 - 1:00', title: 'ප්‍රධාන ආහාරය (දිවා ආහාරය)', description: 'දිවා කාලයේ ඔබේ ආහාර දිරවීමේ ගින්න (අග්නි) උපරිම වේ. මෙය දවසේ විශාලතම ආහාර වේල විය යුතුය.', tips: 'රස 6ම (පැණි, ඇඹුල්, ලුණු, තිත්ත, කහට, සැර) ඇතුළත් කරගන්න | නිදහස් පරිසරයක ආහාර ගන්න | කෑමෙන් පසු විනාඩි 10ක් විවේක ගන්න' },
    ta: { time: 'பகல் 12:00 - 1:00', title: 'மதிய உணவு', description: 'பகல் நேரத்தில் உங்கள் செரிமான தீ உச்சத்தில் இருக்கும். இது நாளின் மிகப்பெரிய உணவாக இருக்க வேண்டும்.', tips: '6 சுவைகளையும் சேர்க்கவும் | அமைதியான சூழலில் சாப்பிடவும் | சாப்பிட்ட பிறகு 10 நிமிடம் ஓய்வெடுக்கவும்' }
  },
  {
    order: 6, icon: 'Moon',
    en: { time: '6:00 PM - 7:00 PM', title: 'Light Dinner', description: 'As the sun goes down, your digestive fire weakens. Eat a light, warm dinner.', tips: 'Soups, steamed vegetables | Avoid heavy proteins | Take a short, gentle walk after eating' },
    si: { time: 'ප.ව. 6:00 - 7:00', title: 'රාත්‍රී ආහාරය', description: 'හිරු බැස යන විට ආහාර දිරවීම දුර්වල වේ. නින්දට පැය 2-3කට පෙර සැහැල්ලු රාත්‍රී ආහාරයක් ගන්න.', tips: 'සුප්, තැම්බූ එළවළු | බර ප්‍රෝටීන් සහිත ආහාර වලින් වළකින්න | කෑමෙන් පසු කෙටි ඇවිදීමක නිරත වන්න' },
    ta: { time: 'மாலை 6:00 - 7:00', title: 'இரவு உணவு', description: 'சூரியன் மறையும் போது செரிமானம் பலவீனமடைகிறது. இலகுவான இரவு உணவை உண்ணுங்கள்.', tips: 'சூப், வேகவைத்த காய்கறிகள் | கனமான புரதங்களைத் தவிர்க்கவும் | சாப்பிட்ட பிறகு சிறிது நேரம் நடக்கவும்' }
  },
  {
    order: 7, icon: 'Moon',
    en: { time: '9:30 PM - 10:00 PM', title: 'Rest & Sleep', description: 'Wind down your day. Promote deep, restorative sleep.', tips: 'Drink warm milk with nutmeg | Read a calming book | Ensure the room is dark and cool' },
    si: { time: 'ප.ව. 9:30 - 10:00', title: 'නින්ද සහ විවේකය', description: 'දවස අවසන් আপন කරන්න. කඵ දෝෂය ප්‍රමුඛ වන මේ වේලාව ගැඹුරු නින්දකට උදව් වේ.', tips: 'සාදික්කා හෝ කහ මිශ්‍ර උණු කිරි වීදුරුවක් බොන්න | සන්සුන් පොතක් කියවන්න | කාමරය අඳුරුව සහ සිසිල්ව තබාගන්න' },
    ta: { time: 'இரவு 9:30 - 10:00', title: 'ஓய்வு & தூக்கம்', description: 'ஆழ்ந்த உறக்கத்திற்கு தயாராகுங்கள்.', tips: 'ஜாதிக்காய் கலந்த சூடான பால் குடிக்கவும் | புத்தகம் படிக்கவும் | அறையை இருட்டாகவும் குளிர்ந்தும் வைத்திருக்கவும்' }
  }
];

async function seed() {
  console.log('Seeding herbal_remedies...');
  const batch1 = db.batch();
  for (let r of remedies) {
    const ref = db.collection('herbal_remedies').doc();
    batch1.set(ref, { ...r, createdAt: FieldValue.serverTimestamp() });
  }
  await batch1.commit();

  console.log('Seeding daily_routines...');
  const batch2 = db.batch();
  for (let r of routines) {
    const ref = db.collection('daily_routines').doc();
    batch2.set(ref, { ...r, createdAt: FieldValue.serverTimestamp() });
  }
  await batch2.commit();

  console.log('Done!');
  process.exit();
}

seed();
