const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

let genAI;

function getModel() {
  if (!config.geminiApiKey) {
    throw Object.assign(new Error('Gemini API key not configured'), { status: 500, code: 'AI_NOT_CONFIGURED' });
  }
  if (!genAI) genAI = new GoogleGenerativeAI(config.geminiApiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

function parseJsonFromText(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid AI response format');
  return JSON.parse(jsonMatch[0]);
}

function langLabel(lang) {
  if (lang === 'si') return 'Sinhala';
  if (lang === 'ta') return 'Tamil';
  return 'English';
}

async function chat(message, lang) {
  const model = getModel();
  const systemPrompt = `You are AyurBot, an expert Ayurvedic assistant for the Deergayu platform in Sri Lanka.
Your job is to provide safe, natural Ayurvedic home remedies for common ailments.
If the ailment is serious, strongly advise them to consult a doctor via the 'Channeling' page.
Keep your answers brief, friendly, and highly relevant to Ayurveda.
The user is speaking in ${langLabel(lang)}. Please reply in the same language.
User's message: ${message}`;

  const result = await model.generateContent(systemPrompt);
  return result.response.text();
}

async function analyzeSymptoms(symptom, lang, providersList, productsList) {
  const model = getModel();
  const prompt = `You are AyurBot, an expert Ayurvedic assistant for the Deergayu platform in Sri Lanka.
A patient has described their symptoms. Your job is to:
1. Give a brief Ayurvedic analysis of the likely condition (2-3 sentences)
2. Suggest 2-4 natural home remedies based on Sri Lankan Ayurveda
3. From the list of REAL doctors on our platform, pick the TOP 3 most suitable ones for this symptom
4. From the list of REAL products on our platform, pick the TOP 3 most suitable ones for this symptom

RESPOND ONLY IN VALID JSON in this exact format:
{
  "analysis": "Brief Ayurvedic analysis...",
  "remedies": ["remedy 1", "remedy 2", "remedy 3"],
  "recommendedDoctors": ["exact name from list", "exact name from list"],
  "recommendedProducts": ["exact product name from list", "exact product name from list"]
}

Language: ${langLabel(lang)}
Patient Symptom: ${symptom}

AVAILABLE DOCTORS ON PLATFORM:
${providersList || 'No doctors available yet'}

AVAILABLE PRODUCTS ON PLATFORM:
${productsList || 'No products available yet'}

If no matching doctors/products exist for this symptom, return empty arrays. Do not make up names.`;

  const result = await model.generateContent(prompt);
  return parseJsonFromText(result.response.text());
}

function matchByName(docs, recommendedNames, limit = 3) {
  return docs
    .filter((d) =>
      recommendedNames?.some((name) => {
        const docName = d.data().name?.toLowerCase() || '';
        const recName = name.toLowerCase();
        return docName.includes(recName) || recName.includes(docName);
      })
    )
    .map((d) => ({ id: d.id, ...d.data(), profileDetails: d.data().profileDetails || {} }))
    .slice(0, limit);
}

module.exports = { chat, analyzeSymptoms, matchByName, parseJsonFromText };
