import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Sun, Coffee, Droplet, Moon, Activity, Info, BookOpen, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { resolveMediaUrl } from '../components/Admin/AdminUtils';
import SEO from '../components/SEO';
import './AyurvedicGuide.css';

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const guideData = {
  en: {
    title: "Ayurvedic Wellness Guide",
    subtitle: "Discover the ancient wisdom of Sri Lankan traditional medicine and daily routines to balance your mind, body, and spirit.",
    tab_remedies: "Herbal Remedies",
    tab_routine: "Daily Routine",
    remedies_title: "Traditional Sri Lankan Remedies",
    remedies_subtitle: "Time-tested natural solutions for common ailments.",
    routine_title: "Dinacharya: The Daily Routine",
    routine_subtitle: "Align your day with nature's rhythms for optimal health and vitality.",
    badge: "Traditional",
    ingredients_label: "Ingredients",
    bestfor_label: "Best For",
    prep_label: "Preparation",
    tips_label: "Quick Tips",
    remedies: [
      {
        id: 1, name: 'Paspanguwa',
        image: 'https://images.unsplash.com/photo-1596541223130-5d564415f0d4?auto=format&fit=crop&q=80&w=400',
        ingredients: ['Coriander', 'Ginger', 'Pathpadagam', 'Katuwelbatu', 'Veniwelgeta'],
        uses: 'Common cold, fever, body aches, and boosting immunity.',
        preparation: 'Boil all 5 ingredients in 4 cups of water until it reduces to 1 cup. Drink warm, optionally with jaggery.'
      },
      {
        id: 2, name: 'Koththamalli',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400',
        ingredients: ['Coriander seeds', 'Ginger (optional)'],
        uses: 'Mild fever, sore throat, indigestion, and as a cooling drink.',
        preparation: 'Roast coriander seeds lightly, crush them, and boil with water. Strain and drink warm.'
      },
      {
        id: 3, name: 'Veniwelgeta',
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400',
        ingredients: ['Yellow Vine (Coscinium fenestratum)'],
        uses: 'Pain relief, reducing inflammation, wound healing, and treating tetanus.',
        preparation: 'Boil the dried stems in water for 15-20 minutes. Drink the bitter decoction.'
      },
      {
        id: 4, name: 'Iramusu',
        image: 'https://images.unsplash.com/photo-1589363460779-cb495392ee5a?auto=format&fit=crop&q=80&w=400',
        ingredients: ['Indian Sarsaparilla (Hemidesmus indicus)'],
        uses: 'Purifying blood, cooling the body, improving skin complexion.',
        preparation: 'Boil the dried roots in water and drink as a regular tea.'
      },
      {
        id: 5, name: 'Gotukola Kenda',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400',
        ingredients: ['Gotukola leaves', 'Red rice', 'Coconut milk', 'Garlic', 'Ginger'],
        uses: 'Enhancing memory, improving eyesight, and nourishing the body.',
        preparation: 'Blend Gotukola leaves, extract juice, and cook with boiled red rice gruel and coconut milk.'
      },
      {
        id: 6, name: 'Karapincha',
        image: 'https://images.unsplash.com/photo-1606579294215-64bc63bba2c2?auto=format&fit=crop&q=80&w=400',
        ingredients: ['Curry leaves'],
        uses: 'Lowering cholesterol, improving digestion, and controlling diabetes.',
        preparation: 'Extract juice from fresh leaves and mix with a little lime and salt, or consume as a gruel.'
      }
    ],
    routine: [
      {
        time: '5:00 AM - 6:00 AM', title: 'Brahma Muhurta (Wake Up)', icon: <Sun size={24} />,
        description: 'Wake up 1.5 hours before sunrise. This is the most peaceful time of day, ideal for spiritual practices.',
        tips: ['Gently stretch in bed', 'Express gratitude', 'Avoid checking your phone immediately']
      },
      {
        time: '6:00 AM - 6:30 AM', title: 'Purification & Cleansing', icon: <Droplet size={24} />,
        description: 'Cleanse the senses. Wash your face, scrape your tongue to remove toxins, and drink warm water.',
        tips: ['Use a copper tongue scraper', 'Drink warm lemon water', 'Brush teeth with herbal toothpaste']
      },
      {
        time: '6:30 AM - 7:30 AM', title: 'Movement & Meditation', icon: <Activity size={24} />,
        description: 'Engage in gentle exercise like Yoga, followed by breathwork and meditation.',
        tips: ['Sun salutations', '10-15 minutes of meditation', 'Abhyanga (self-massage)']
      },
      {
        time: '7:30 AM - 8:30 AM', title: 'Light Breakfast', icon: <Coffee size={24} />,
        description: 'Eat a nourishing, warm breakfast appropriate for your Dosha.',
        tips: ['Warm oatmeal or herbal gruel', 'Avoid cold or heavy foods', 'Eat only when genuinely hungry']
      },
      {
        time: '12:00 PM - 1:00 PM', title: 'Lunch (Main Meal)', icon: <Sun size={24} color="#ff9800" />,
        description: 'Pitta dosha is at its peak. This should be your largest and most complex meal of the day.',
        tips: ['Include all 6 tastes', 'Eat in a calm environment', 'Sit for 10 minutes after eating']
      },
      {
        time: '6:00 PM - 7:00 PM', title: 'Light Dinner', icon: <Moon size={24} color="#5c6bc0" />,
        description: 'As the sun goes down, your digestive fire weakens. Eat a light, warm dinner.',
        tips: ['Soups, steamed vegetables', 'Avoid heavy proteins', 'Take a short, gentle walk after eating']
      },
      {
        time: '9:30 PM - 10:00 PM', title: 'Rest & Sleep', icon: <Moon size={24} />,
        description: 'Wind down your day. Promote deep, restorative sleep.',
        tips: ['Drink warm milk with nutmeg', 'Read a calming book', 'Ensure the room is dark and cool']
      }
    ]
  },
  si: {
    title: "ආයුර්වේද මාර්ගෝපදේශය",
    subtitle: "ශ්‍රී ලංකාවේ පාරම්පරික වෙදකමේ සහ දිනචරියාවේ රහස් මගින් ඔබේ මනස, ශරීරය සහ ආත්මය සමතුලිත කරගන්න.",
    tab_remedies: "අත් බෙහෙත්",
    tab_routine: "දිනචරියාව",
    remedies_title: "පාරම්පරික දේශීය අත් බෙහෙත්",
    remedies_subtitle: "සුලභ රෝගාබාධ සඳහා කාලයත් සමඟ ඔප්පු වූ ස්වභාවික විසඳුම්.",
    routine_title: "දිනචරියාව (Daily Routine)",
    routine_subtitle: "ප්‍රශස්ත සෞඛ්‍යයක් සඳහා ඔබේ දවස සොබාදහමේ රිද්මයට අනුකූලව ගත කරන්න.",
    badge: "පාරම්පරික",
    ingredients_label: "අඩංගු දේවල්",
    bestfor_label: "ගුණදායක රෝග",
    prep_label: "සාදන ආකාරය",
    tips_label: "ඉක්මන් උපදෙස්",
    remedies: [
      {
        id: 1, name: 'පස්පංගුව',
        image: 'https://images.unsplash.com/photo-1596541223130-5d564415f0d4?auto=format&fit=crop&q=80&w=400',
        ingredients: ['කොත්තමල්ලි', 'ඉඟුරු', 'පත්පාඩගම්', 'කටුවැල්බටු', 'වෙනිවැල්ගැට'],
        uses: 'සෙම්ප්‍රතිශ්‍යාව, උණ, ඇඟපත වේදනාව සහ ප්‍රතිශක්තිය වැඩි කිරීමට.',
        preparation: 'මේ ඖෂධ 5ම වතුර කෝප්ප 4ක් දමා කෝප්ප 1කට සිඳෙන්නට හැර උණුවෙන්ම බොන්න.'
      },
      {
        id: 2, name: 'කොත්තමල්ලි',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400',
        ingredients: ['කොත්තමල්ලි ඇට', 'ඉඟුරු'],
        uses: 'සුළු උණ, උගුරේ අමාරුව, ආහාර අරුචිය සහ ඇඟ නිවීමට.',
        preparation: 'කොත්තමල්ලි ඇට මද ගින්නේ බැද, තලා වතුරෙන් තම්බා පෙරා උණුවෙන් බොන්න.'
      },
      {
        id: 3, name: 'වෙනිවැල්ගැට',
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400',
        ingredients: ['වෙනිවැල්ගැට'],
        uses: 'වේදනා නාශකයක් ලෙස, ඉදිමුම් අඩු කිරීමට සහ තුවාල සුව කිරීමට.',
        preparation: 'වියළි වෙනිවැල්ගැට කැබලි විනාඩි 15-20ක් පමණ තම්බා එහි තිත්ත කසාය පානය කරන්න.'
      },
      {
        id: 4, name: 'ඉරමුසු',
        image: 'https://images.unsplash.com/photo-1589363460779-cb495392ee5a?auto=format&fit=crop&q=80&w=400',
        ingredients: ['ඉරමුසු'],
        uses: 'රුධිරය පිරිසිදු කිරීමට, ශරීරය සිසිල් කිරීමට සහ සම පැහැපත් කිරීමට.',
        preparation: 'වියළි ඉරමුසු මුල් තම්බා සාමාන්‍ය තේ පානයක් ලෙස බොන්න.'
      },
      {
        id: 5, name: 'ගොටුකොළ කැඳ',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400',
        ingredients: ['ගොටුකොළ', 'රතු කැකුළු සහල්', 'පොල් කිරි', 'සුදුළූණු', 'ඉඟුරු'],
        uses: 'මතක ශක්තිය වැඩි කිරීමට, ඇස් පෙනීම වර්ධනයට සහ ශරීරය පෝෂණය කිරීමට.',
        preparation: 'ගොටුකොළ කොටා යුෂ ගෙන, තම්බාගත් රතු කැකුළු සහල් සහ පොල් කිරි සමඟ මිශ්‍ර කර උයාගන්න.'
      },
      {
        id: 6, name: 'කරපිංචා',
        image: 'https://images.unsplash.com/photo-1606579294215-64bc63bba2c2?auto=format&fit=crop&q=80&w=400',
        ingredients: ['කරපිංචා කොළ'],
        uses: 'කොලෙස්ටරෝල් අඩු කිරීමට, දිරවීම පහසු කිරීමට සහ දියවැඩියාව පාලනයට.',
        preparation: 'නැවුම් කොළ කොටා යුෂ ගෙන දෙහි සහ ලුණු ස්වල්පයක් සමඟ පානය කරන්න, නැතහොත් කැඳ ලෙස සාදාගන්න.'
      }
    ],
    routine: [
      {
        time: 'පෙ.ව. 5:00 - 6:00', title: 'බ්‍රහ්ම මුහුර්තය (අවදි වීම)', icon: <Sun size={24} />,
        description: 'හිරු උදාවට පැය 1.5කට පෙර අවදි වන්න. මෙය දවසේ නිස්කලංකම වේලාව වන අතර ආධ්‍යාත්මික කටයුතු සඳහා ඉතා යෝග්‍ය වේ.',
        tips: ['ඇඳේ සිටම ඇඟ මැලි කඩන්න', 'ස්වභාවධර්මයට ස්තූති කරන්න', 'අවදි වූ ගමන් ජංගම දුරකථනය බැලීමෙන් වළකින්න']
      },
      {
        time: 'පෙ.ව. 6:00 - 6:30', title: 'පිරිසිදු වීම', icon: <Droplet size={24} />,
        description: 'මුහුණ සෝදා, දිව මැද විස ඉවත් කරගන්න. ආහාර දිරවීම උත්තේජනය කිරීම සඳහා උණුසුම් ජලය වීදුරුවක් පානය කරන්න.',
        tips: ['තඹ දිව මදින උපකරණයක් භාවිතා කරන්න', 'උණුසුම් දෙහි වතුර බොන්න', 'ඖෂධීය දන්තාලේප භාවිතා කරන්න']
      },
      {
        time: 'පෙ.ව. 6:30 - 7:30', title: 'ව්‍යායාම සහ භාවනා', icon: <Activity size={24} />,
        description: 'යෝගා වැනි සැහැල්ලු ව්‍යායාමවල නිරත වන්න, ඉන්පසු ප්‍රාණයාම සහ භාවනා කරන්න.',
        tips: ['සූර්ය නමස්කාරය', 'විනාඩි 10-15ක නිහඬ භාවනාව', 'ස්නානයට පෙර ඇඟේ තෙල් ගෑම (අභ්‍යංග)']
      },
      {
        time: 'පෙ.ව. 7:30 - 8:30', title: 'සැහැල්ලු උදෑසන ආහාරය', icon: <Coffee size={24} />,
        description: 'ඔබේ දෝෂයට ගැලපෙන පෝෂ්‍යදායී, උණුසුම් උදෑසන ආහාරයක් ගන්න.',
        tips: ['ඖෂධීය කැඳ වීදුරුවක්', 'සීතල හෝ බර ආහාර වලින් වළකින්න', 'බඩගිනි නම් පමණක් ආහාර ගන්න']
      },
      {
        time: 'ප.ව. 12:00 - 1:00', title: 'ප්‍රධාන ආහාරය (දිවා ආහාරය)', icon: <Sun size={24} color="#ff9800" />,
        description: 'දිවා කාලයේ ඔබේ ආහාර දිරවීමේ ගින්න (අග්නි) උපරිම වේ. මෙය දවසේ විශාලතම ආහාර වේල විය යුතුය.',
        tips: ['රස 6ම (පැණි, ඇඹුල්, ලුණු, තිත්ත, කහට, සැර) ඇතුළත් කරගන්න', 'නිදහස් පරිසරයක ආහාර ගන්න', 'කෑමෙන් පසු විනාඩි 10ක් විවේක ගන්න']
      },
      {
        time: 'ප.ව. 6:00 - 7:00', title: 'රාත්‍රී ආහාරය', icon: <Moon size={24} color="#5c6bc0" />,
        description: 'හිරු බැස යන විට ආහාර දිරවීම දුර්වල වේ. නින්දට පැය 2-3කට පෙර සැහැල්ලු රාත්‍රී ආහාරයක් ගන්න.',
        tips: ['සුප්, තැම්බූ එළවළු', 'බර ප්‍රෝටීන් සහිත ආහාර වලින් වළකින්න', 'කෑමෙන් පසු කෙටි ඇවිදීමක නිරත වන්න']
      },
      {
        time: 'ප.ව. 9:30 - 10:00', title: 'නින්ද සහ විවේකය', icon: <Moon size={24} />,
        description: 'දවස අවසන් කරන්න. කඵ දෝෂය ප්‍රමුඛ වන මේ වේලාව ගැඹුරු නින්දකට උදව් වේ.',
        tips: ['සාදික්කා හෝ කහ මිශ්‍ර උණු කිරි වීදුරුවක් බොන්න', 'සන්සුන් පොතක් කියවන්න', 'කාමරය අඳුරුව සහ සිසිල්ව තබාගන්න']
      }
    ]
  },
  ta: {
    title: "ஆயுர்வேத வழிகாட்டி",
    subtitle: "இலங்கையின் பாரம்பரிய மருத்துவத்தின் ரகசியங்கள் மற்றும் உங்கள் மனம், உடல், ஆத்மாவை சமநிலைப்படுத்த அன்றாட நடைமுறைகள்.",
    tab_remedies: "மூலிகை மருந்துகள்",
    tab_routine: "தினசரி வழக்கம்",
    remedies_title: "பாரம்பரிய இலங்கை வைத்தியம்",
    remedies_subtitle: "பொதுவான நோய்களுக்கான இயற்கை தீர்வுகள்.",
    routine_title: "தினசரி வழக்கம் (Dinacharya)",
    routine_subtitle: "உகந்த ஆரோக்கியத்திற்காக இயற்கையின் தாளத்துடன் உங்கள் நாளை சீரமைக்கவும்.",
    badge: "பாரம்பரிய",
    ingredients_label: "பொருட்கள்",
    bestfor_label: "இதற்கு சிறந்தது",
    prep_label: "தயாரிப்பு",
    tips_label: "குறிப்புகள்",
    remedies: [
      {
        id: 1, name: 'பஸ்பங்குவ',
        image: 'https://images.unsplash.com/photo-1596541223130-5d564415f0d4?auto=format&fit=crop&q=80&w=400',
        ingredients: ['கொத்தமல்லி', 'இஞ்சி', 'பத்பாடகம்', 'கட்டுவெல்படு', 'வெனிவெல்கெட'],
        uses: 'ஜலதோஷம், காய்ச்சல், உடல் வலி மற்றும் நோய் எதிர்ப்பு சக்தியை அதிகரிக்கும்.',
        preparation: 'இந்த 5 பொருட்களையும் 4 கப் தண்ணீரில் 1 கப்பாக குறையும் வரை கொதிக்க வைக்கவும். சூடாக குடிக்கவும்.'
      },
      {
        id: 2, name: 'கொத்தமல்லி',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400',
        ingredients: ['கொத்தமல்லி விதைகள்', 'இஞ்சி'],
        uses: 'லேசான காய்ச்சல், தொண்டை வலி, மற்றும் உடலை குளிர்விக்க.',
        preparation: 'கொத்தமல்லி விதைகளை லேசாக வறுத்து, தண்ணீரில் கொதிக்க வைத்து வடிகட்டி சூடாக குடிக்கவும்.'
      },
      {
        id: 3, name: 'வெனிவெல்கெட',
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400',
        ingredients: ['வெனிவெல்கெட'],
        uses: 'வலி நிவாரணி, வீக்கத்தை குறைத்தல், காயங்களை ஆற்றுதல்.',
        preparation: 'காய்ந்த வெனிவெல்கெட துண்டுகளை 15-20 நிமிடங்கள் தண்ணீரில் கொதிக்க வைத்து கசப்பான கஷாயத்தை குடிக்கவும்.'
      },
      {
        id: 4, name: 'இரமுசு',
        image: 'https://images.unsplash.com/photo-1589363460779-cb495392ee5a?auto=format&fit=crop&q=80&w=400',
        ingredients: ['நன்னாரி (இரமுசு)'],
        uses: 'இரத்தத்தை சுத்திகரித்தல், உடலை குளிர்வித்தல், மற்றும் சருமத்தை மேம்படுத்துதல்.',
        preparation: 'காய்ந்த வேர்களை தண்ணீரில் கொதிக்க வைத்து தேநீர் போல குடிக்கவும்.'
      },
      {
        id: 5, name: 'வல்லாரை கஞ்சி',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400',
        ingredients: ['வல்லாரை இலைகள்', 'சிவப்பு அரிசி', 'தேங்காய் பால்', 'பூண்டு', 'இஞ்சி'],
        uses: 'நினைவாற்றலை அதிகரித்தல், கண்பார்வையை மேம்படுத்துதல் மற்றும் உடலை போஷித்தல்.',
        preparation: 'வல்லாரை இலைகளை அரைத்து சாறு எடுத்து, சமைத்த சிவப்பு அரிசி மற்றும் தேங்காய் பாலுடன் கலக்கவும்.'
      },
      {
        id: 6, name: 'கறிவேப்பிலை',
        image: 'https://images.unsplash.com/photo-1606579294215-64bc63bba2c2?auto=format&fit=crop&q=80&w=400',
        ingredients: ['கறிவேப்பிலை'],
        uses: 'கொலஸ்ட்ராலைக் குறைத்தல், செரிமானத்தை மேம்படுத்துதல் மற்றும் நீரிழிவு நோயைக் கட்டுப்படுத்துதல்.',
        preparation: 'புதிய இலைகளிலிருந்து சாறு எடுத்து சிறிதளவு எலுமிச்சை மற்றும் உப்புடன் கலந்து குடிக்கவும்.'
      }
    ],
    routine: [
      {
        time: 'காலை 5:00 - 6:00', title: 'பிரம்மா முஹூர்த்தம் (எழுதல்)', icon: <Sun size={24} />,
        description: 'சூரிய உதயத்திற்கு 1.5 மணி நேரத்திற்கு முன்பு எழுந்திருங்கள். இது நாளின் மிகவும் அமைதியான நேரம்.',
        tips: ['படுக்கையில் மெதுவாக நீட்டவும்', 'இயற்கைக்கு நன்றி தெரிவிக்கவும்', 'உடனடியாக தொலைபேசியைப் பார்ப்பதைத் தவிர்க்கவும்']
      },
      {
        time: 'காலை 6:00 - 6:30', title: 'சுத்திகரிப்பு', icon: <Droplet size={24} />,
        description: 'முகம் கழுவி, நாக்கை சுத்தம் செய்து நச்சுக்களை அகற்றவும். செரிமானத்தைத் தூண்ட வெதுவெதுப்பான நீரைக் குடிக்கவும்.',
        tips: ['செம்பு நாக்கு வழிப்பான் பயன்படுத்தவும்', 'வெதுவெதுப்பான எலுமிச்சை நீர் குடிக்கவும்', 'மூலிகை பற்பசை பயன்படுத்தவும்']
      },
      {
        time: 'காலை 6:30 - 7:30', title: 'உடற்பயிற்சி & தியானம்', icon: <Activity size={24} />,
        description: 'யோகா போன்ற மென்மையான உடற்பயிற்சிகளை மேற்கொள்ளவும், பின்னர் மூச்சுப் பயிற்சி மற்றும் தியானம்.',
        tips: ['சூரிய நமஸ்காரம்', '10-15 நிமிட தியானம்', 'குளிப்பதற்கு முன் எண்ணெய் மசாஜ் (அப்யங்கா)']
      },
      {
        time: 'காலை 7:30 - 8:30', title: 'காலை உணவு', icon: <Coffee size={24} />,
        description: 'உங்கள் தோஷத்திற்கு ஏற்ற சத்தான, சூடான காலை உணவை உண்ணுங்கள்.',
        tips: ['மூலிகை கஞ்சி', 'குளிர்ந்த அல்லது கனமான உணவுகளைத் தவிர்க்கவும்', 'பசியாக இருக்கும்போது மட்டுமே சாப்பிடவும்']
      },
      {
        time: 'பகல் 12:00 - 1:00', title: 'மதிய உணவு', icon: <Sun size={24} color="#ff9800" />,
        description: 'பகல் நேரத்தில் உங்கள் செரிமான தீ உச்சத்தில் இருக்கும். இது நாளின் மிகப்பெரிய உணவாக இருக்க வேண்டும்.',
        tips: ['6 சுவைகளையும் சேர்க்கவும்', 'அமைதியான சூழலில் சாப்பிடவும்', 'சாப்பிட்ட பிறகு 10 நிமிடம் ஓய்வெடுக்கவும்']
      },
      {
        time: 'மாலை 6:00 - 7:00', title: 'இரவு உணவு', icon: <Moon size={24} color="#5c6bc0" />,
        description: 'சூரியன் மறையும் போது செரிமானம் பலவீனமடைகிறது. இலகுவான இரவு உணவை உண்ணுங்கள்.',
        tips: ['சூப், வேகவைத்த காய்கறிகள்', 'கனமான புரதங்களைத் தவிர்க்கவும்', 'சாப்பிட்ட பிறகு சிறிது நேரம் நடக்கவும்']
      },
      {
        time: 'இரவு 9:30 - 10:00', title: 'ஓய்வு & தூக்கம்', icon: <Moon size={24} />,
        description: 'ஆழ்ந்த உறக்கத்திற்கு தயாராகுங்கள்.',
        tips: ['ஜாதிக்காய் கலந்த சூடான பால் குடிக்கவும்', 'புத்தகம் படிக்கவும்', 'அறையை இருட்டாகவும் குளிர்ந்தும் வைத்திருக்கவும்']
      }
    ]
  }
};

const AyurvedicGuide = () => {
  const [activeTab, setActiveTab] = useState('remedies');
  const [activeCondition, setActiveCondition] = useState('general');
  const [dbRemedies, setDbRemedies] = useState([]);
  const [dbRoutines, setDbRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lang } = useLanguage();
  const data = guideData[lang] || guideData.en;

  const conditions = [
    { id: 'general', en: 'General Wellness', si: 'සාමාන්‍ය සෞඛ්‍යය', ta: 'பொது நல்வாழ்வு' },
    { id: 'diabetes', en: 'Diabetes', si: 'දියවැඩියාව', ta: 'நீரிழிவு' },
    { id: 'hypertension', en: 'High Blood Pressure', si: 'අධිරුධිර පීඩනය', ta: 'உயர் இரத்த அழுத்தம்' },
    { id: 'cholesterol', en: 'High Cholesterol', si: 'කොලෙස්ටරෝල්', ta: 'கொலஸ்ட்ரால்' }
  ];

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const [remRes, routRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'https://deergayu-api.onrender.com'}/api/guide/remedies`),
          fetch(`${import.meta.env.VITE_API_URL || 'https://deergayu-api.onrender.com'}/api/guide/routines`)
        ]);
        const remData = await remRes.json();
        const routData = await routRes.json();
        setDbRemedies(remData);
        setDbRoutines(routData);
      } catch (error) {
        console.error("Failed to fetch guide content:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const getIconComponent = (iconName, props) => {
    switch(iconName) {
      case 'Sun': return <Sun {...props} />;
      case 'Moon': return <Moon {...props} />;
      case 'Droplet': return <Droplet {...props} />;
      case 'Coffee': return <Coffee {...props} />;
      case 'Activity': return <Activity {...props} />;
      default: return <Info {...props} />;
    }
  };

  return (
    <div className="ayurvedic-guide-page page-transition">
      <SEO
        title="Ayurvedic Wellness Guide | Deergayu"
        description="Discover traditional Sri Lankan Ayurvedic remedies, herbal wisdom, and daily routines (Dinacharya) on Deergayu."
        url="https://deergayu.com/ayurvedic-guide"
        canonical="https://deergayu.com/ayurvedic-guide"
      />
      <div className="guide-hero">
        <motion.div 
          className="container"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 variants={fadeUpVariant} className="text-gradient">{data.title}</motion.h1>
          <motion.p variants={fadeUpVariant} className="lead-text">
            {data.subtitle}
          </motion.p>
        </motion.div>
      </div>

      <div className="container">
        <div className="tabs-container">
          <div className="tabs-header glass-panel">
            <button 
              className={`tab-btn ${activeTab === 'remedies' ? 'active' : ''}`}
              onClick={() => setActiveTab('remedies')}
            >
              <Leaf size={20} />
              {data.tab_remedies}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'routine' ? 'active' : ''}`}
              onClick={() => setActiveTab('routine')}
            >
              <Clock size={20} />
              {data.tab_routine}
            </button>
          </div>

          <div className="tab-content">
            <AnimatePresence mode="wait">
              {activeTab === 'remedies' && (
                <motion.div
                  key="remedies"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="section-header">
                    <h2>{data.remedies_title}</h2>
                    <p>{data.remedies_subtitle}</p>
                  </div>
                  
                  <div className="remedies-grid">
                    {loading ? <div className="loading-spinner">Loading...</div> : dbRemedies.map((item) => {
                      const remedy = item[lang] || item.en;
                      return (
                      <motion.div key={item.id} className="remedy-card glass-panel glass-panel-hover" variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <div className="remedy-image">
                          {item.image ? (
                            <img
                              src={resolveMediaUrl(item.image)}
                              alt={remedy?.name || 'Remedy'}
                              className="remedy-image-photo"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('remedy-image--missing');
                              }}
                            />
                          ) : null}
                          <div className="remedy-badge">{data.badge}</div>
                        </div>
                        <div className="remedy-content">
                          <h3>{remedy?.name}</h3>
                          
                          <div className="remedy-info-group">
                            <h4><Leaf size={16} /> {data.ingredients_label}</h4>
                            <p>{remedy?.ingredients}</p>
                          </div>
                          
                          <div className="remedy-info-group">
                            <h4><Activity size={16} /> {data.bestfor_label}</h4>
                            <p>{remedy?.uses}</p>
                          </div>
                          
                          <div className="remedy-info-group highlight">
                            <h4><BookOpen size={16} /> {data.prep_label}</h4>
                            <p>{remedy?.preparation}</p>
                          </div>
                        </div>
                      </motion.div>
                    )})}
                  </div>
                </motion.div>
              )}

              {activeTab === 'routine' && (
                <motion.div
                  key="routine"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="section-header">
                    <h2>{data.routine_title}</h2>
                    <p>{data.routine_subtitle}</p>
                  </div>

                  <div className="condition-filters" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '30px' }}>
                    {conditions.map(c => (
                      <button 
                        key={c.id} 
                        className={`filter-chip ${activeCondition === c.id ? 'active' : ''}`}
                        onClick={() => setActiveCondition(c.id)}
                      >
                        {c[lang]}
                      </button>
                    ))}
                  </div>
                  
                  <div className="routine-timeline">
                    {loading ? <div className="loading-spinner">Loading...</div> : dbRoutines.filter(r => (r.condition || 'general') === activeCondition).sort((a,b) => a.order - b.order).map((item, index, filteredArr) => {
                      const step = item[lang] || item.en;
                      const iconColor = item.icon === 'Sun' ? '#ff9800' : item.icon === 'Moon' ? '#5c6bc0' : undefined;
                      return (
                      <motion.div 
                        key={item.id} 
                        className="timeline-item"
                        variants={fadeUpVariant} 
                        initial="hidden" 
                        whileInView="visible" 
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="timeline-marker">
                          <div className="timeline-icon glass-panel">{getIconComponent(item.icon, { size: 24, color: iconColor })}</div>
                          {index !== filteredArr.length - 1 && <div className="timeline-line"></div>}
                        </div>
                        <div className="timeline-content glass-panel glass-panel-hover">
                          <div className="timeline-time">{step?.time}</div>
                          <h3>{step?.title}</h3>
                          <p>{step?.description}</p>
                          
                          <div className="timeline-tips">
                            <h4><Info size={14} /> {data.tips_label}</h4>
                            <ul>
                              {(Array.isArray(step?.tips)
                                ? step.tips
                                : String(step?.tips || '').split('|')
                              ).filter(Boolean).map((tip, i) => (
                                <li key={i}>{String(tip).trim()}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )})}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AyurvedicGuide;
