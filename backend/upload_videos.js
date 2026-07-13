require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (assuming serviceAccountKey.json is in backend)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
try {
  if (Object.keys(serviceAccount).length > 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp({
      projectId: 'deergayu-9de41'
    });
  }
} catch(e) { console.error(e) }

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore();

const initialVideos = [
    {
      youtubeId: "JmD8sF4GisQ",
      title: {
        en: "Introduction to Ayurvedic Daily Routines (Dinacharya)",
        si: "ආයුර්වේද දෛනික චර්යාවන් හඳුන්වාදීම (දිනචර්යාව)",
        ta: "ஆயுர்வேத தினசரி வழக்கங்கள் அறிமுகம் (தினச்சரியம்)"
      },
      description: {
        en: "Learn how to align your daily schedule with nature's rhythm to boost energy, improve focus, and enhance longevity.",
        si: "සුවපත් දිවියක් සඳහා දෛනික කාලසටහන සොබාදහමට අනුකූලව සකසා ගන්නේ කෙසේදැයි ඉගෙන ගන්න.",
        ta: "ஆற்றலை அதிகரிக்கவும், கவனத்தை மேம்படுத்தவும் உங்கள் தினசரி அட்டவணையை இயற்கையோடு எவ்வாறு சீரமைப்பது என்பதைக் கற்றுக்கொள்ளுங்கள்."
      },
      category: "Daily Routines",
      duration: "12:45"
    },
    {
      youtubeId: "GV_B9J6ZJkM",
      title: {
        en: "Understanding Your Dosha: Vata, Pitta, and Kapha",
        si: "ඔබේ දෝෂය හඳුනාගන්න: වාත, පිත සහ කප",
        ta: "உங்கள் தோஷத்தைப் புரிந்துகொள்வது: வாத, பித்த, கப"
      },
      description: {
        en: "Explore the three body humors (Doshas) in Ayurveda and discover how to find balance tailored to your unique body constitution.",
        si: "ශරීරයේ පවතින වාත, පිත, කප ත්‍රිදෝෂයන් සහ ඒවා සමබරව තබාගෙන නිරෝගී වන ආකාරය තේරුම් ගන්න.",
        ta: "ஆயுர்வேதத்தில் உள்ள மூன்று உடல் தோஷங்களை ஆராய்ந்து, உங்கள் தனித்துவமான உடலமைப்பிற்கு ஏற்ப எவ்வாறு சமநிலையைக் கண்டறிவது என்பதைக் கண்டறியவும்."
      },
      category: "Daily Routines",
      duration: "15:20"
    },
    {
      youtubeId: "PZg-67B_84w",
      title: {
        en: "Top 5 Ayurvedic Herbs for Immune Health",
        si: "ප්‍රතිශක්තිය වඩවන ප්‍රධාන ආයුර්වේද ඖෂධ පැළෑටි 5ක්",
        ta: "நோய் எதிர்ப்புச் சக்திக்கு தேவையான 5 சிறந்த ஆயுர்வேத மூலிகைகள்"
      },
      description: {
        en: "Boost your natural defense system using power herbs like Ashwagandha, Turmeric, Amalaki, Giloy, and Ginger.",
        si: "අශ්වගන්ධ, කහ, නෙල්ලි වැනි ප්‍රතිශක්තිකරණය වඩවන ප්‍රමුඛ දේශීය ඖෂධ පැළෑටි සහ ඒවායේ ගුණ පිළිබඳව දැනුවත් වන්න.",
        ta: "அஸ்வகந்தா, மஞ்சள், நெல்லிக்காய் போன்ற மூலிகைகளைப் பயன்படுத்தி உங்கள் இயற்கையான நோய் எதிர்ப்பு அமைப்பை மேம்படுத்துங்கள்."
      },
      category: "Herbs",
      duration: "08:15"
    },
    {
      youtubeId: "K9sZ-tY_W3k",
      title: {
        en: "Ayurvedic Diet Tips for a Healthy Digestion",
        si: "නිරෝගී ජීර්ණ පද්ධතියක් සඳහා ආයුර්වේද ආහාර උපදෙස්",
        ta: "ஆரோக்கியமான செரிமானத்திற்கான ஆயுர்வேத உணவு குறிப்புகள்"
      },
      description: {
        en: "According to Ayurveda, health starts in the gut. Learn how to ignite your digestive fire (Agni) with the right food habits.",
        si: "ආයුර්වේදයට අනුව නිරෝගී බවේ රහස ආහාර ජීර්ණයයි. නිවැරදි ආහාර පුරුදු මඟින් ඔබේ ජඨරාග්නිය වර්ධනය කරගන්නා ආකාරය ඉගෙන ගන්න.",
        ta: "ஆயுர்வேதத்தின்படி, ஆரோக்கியம் வயிற்றில் தொடங்குகிறது. சரியான உணவுப் பழக்கவழக்கங்கள் மூலம் உங்கள் செரிமானத்தை எவ்வாறு மேம்படுத்துவது என்று தெரிந்துகொள்ளுங்கள்."
      },
      category: "Nutrition",
      duration: "10:30"
    },
    {
      youtubeId: "xRveC0yG0aM",
      title: {
        en: "Ayurvedic Morning Yoga Flow & Meditation",
        si: "උදෑසන ආයුර්වේද යෝගා සහ භාවනා පුහුණුව",
        ta: "ஆயுர்வேத காலை யோகா மற்றும் தியான பயிற்சி"
      },
      description: {
        en: "Start your day with a gentle Ayurvedic-aligned yoga flow to wake up the body, stimulate organs, and clear the mind.",
        si: "ශරීරය අවදි කිරීමට, ඉන්ද්‍රියයන් උත්තේජනය කිරීමට සහ මනස සන්සුන් කිරීමට උදෑසන යෝගා ව්‍යායාම මාලාවක්.",
        ta: "உடலை எழுப்பவும், உறுப்புகளைத் தூண்டவும், மனதைத் தெளிவுபடுத்தவும் மென்மையான காலை யோகா பயிற்சியுடன் உங்கள் நாளைத் தொடங்குங்கள்."
      },
      category: "Yoga & Mind",
      duration: "18:40"
    }
  ];

async function uploadVideos() {
  try {
    for (const v of initialVideos) {
      await db.collection('videos').add({
        ...v,
        createdAt: FieldValue.serverTimestamp()
      });
      console.log("Added " + v.youtubeId);
    }
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

uploadVideos();
