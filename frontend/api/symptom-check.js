// Vercel Serverless Function - AI Symptom Checker
// Calls Gemini AI + Firestore REST API to match real doctors & products
// Runs server-side on Vercel - no cPanel/DNS needed!

const FIREBASE_API_KEY = 'AIzaSyBzMjfN55p3pu43krCTHHm7wjVwA6FoUmw';
const PROJECT_ID = 'deergayu-9de41';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper: Run a Firestore structured query
async function firestoreQuery(structuredQuery) {
  const url = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data
    .filter(r => r.document)
    .map(r => {
      const fields = r.document.fields || {};
      const extract = (f) => {
        if (!f) return null;
        return f.stringValue ?? f.integerValue ?? f.doubleValue ?? f.booleanValue ?? null;
      };
      return {
        id: r.document.name.split('/').pop(),
        name: extract(fields.name),
        role: extract(fields.role),
        status: extract(fields.status),
        profileImageUrl: extract(fields.profileDetails?.mapValue?.fields?.profileImageUrl),
        specialty: extract(fields.profileDetails?.mapValue?.fields?.specialty),
        address: extract(fields.profileDetails?.mapValue?.fields?.address),
        price: extract(fields.price),
        category: extract(fields.category),
        imageUrl: extract(fields.imageUrl),
        description: extract(fields.description),
        stock: extract(fields.stock),
      };
    });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symptom, lang } = req.body || {};
  if (!symptom) return res.status(400).json({ error: 'Symptom is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured. Add GEMINI_API_KEY in Vercel environment variables.' });
  }

  try {
    // ── 1. Fetch real doctors and products from Firestore in parallel ──
    const [rawDoctors, rawProducts] = await Promise.allSettled([
      firestoreQuery({
        from: [{ collectionId: 'users' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'approved' } } },
              { fieldFilter: { field: { fieldPath: 'role' }, op: 'IN', value: { arrayValue: { values: [
                { stringValue: 'doctor' },
                { stringValue: 'clinic' },
                { stringValue: 'organization' }
              ] } } } }
            ]
          }
        },
        limit: 30
      }),
      firestoreQuery({
        from: [{ collectionId: 'products' }],
        where: {
          fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'approved' } }
        },
        limit: 50
      })
    ]);

    const doctors = rawDoctors.status === 'fulfilled' ? rawDoctors.value : [];
    const products = rawProducts.status === 'fulfilled' ? rawProducts.value : [];

    // ── 2. Build lists for AI prompt ──
    const doctorList = doctors
      .filter(d => d.name)
      .map(d => `- ${d.name} (${d.role || 'Ayurvedic Expert'})${d.specialty ? ` | Specialty: ${d.specialty}` : ''}${d.address ? ` | Location: ${d.address}` : ''}`)
      .join('\n') || 'No approved doctors listed yet';

    const productList = products
      .filter(p => p.name)
      .map(p => `- ${p.name}${p.category ? ` | Category: ${p.category}` : ''}${p.price ? ` | Rs.${p.price}` : ''}`)
      .join('\n') || 'No approved products listed yet';

    // ── 3. Ask Gemini AI ──
    const prompt = `You are AyurBot, an expert Ayurvedic health assistant for the Deergayu platform in Sri Lanka.

A patient has described their symptoms. Analyze using Ayurvedic principles and:
1. Give a brief Ayurvedic analysis of the likely condition (2-3 sentences, mention relevant dosha if appropriate)
2. Suggest 3-4 specific natural home remedies from Sri Lankan Ayurveda tradition
3. From the AVAILABLE DOCTORS LIST below, pick the top 2-3 most suitable for this symptom (use EXACT names from list)
4. From the AVAILABLE PRODUCTS LIST below, pick the top 2-3 most suitable for this symptom (use EXACT names from list)

Respond ONLY as valid JSON in this EXACT format (no extra text):
{
  "analysis": "Ayurvedic analysis here...",
  "remedies": ["remedy 1", "remedy 2", "remedy 3"],
  "recommendedDoctors": ["Exact Doctor Name from list"],
  "recommendedProducts": ["Exact Product Name from list"]
}

Language for analysis and remedies: ${lang === 'si' ? 'Sinhala (සිංහල)' : lang === 'ta' ? 'Tamil (தமிழ்)' : 'English'}

Patient Symptom: "${symptom}"

AVAILABLE DOCTORS ON DEERGAYU PLATFORM:
${doctorList}

AVAILABLE PRODUCTS ON DEERGAYU PLATFORM:
${productList}

Rules:
- Only pick names that EXACTLY appear in the lists above
- If no matching doctor/product exists, return empty array []
- Do not invent names
- Keep analysis helpful and warm`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error('Gemini error:', errData);
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from AI response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in AI response:', rawText);
      return res.status(502).json({ error: 'AI returned unexpected format' });
    }

    let aiResult;
    try {
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON parse error:', e);
      return res.status(502).json({ error: 'Failed to parse AI response' });
    }

    // ── 4. Match AI names back to real DB objects ──
    const normalize = str => (str || '').toLowerCase().trim();

    const matchedDoctors = doctors.filter(d =>
      d.name && aiResult.recommendedDoctors?.some(name =>
        normalize(d.name).includes(normalize(name)) ||
        normalize(name).includes(normalize(d.name))
      )
    ).slice(0, 3);

    const matchedProducts = products.filter(p =>
      p.name && aiResult.recommendedProducts?.some(name =>
        normalize(p.name).includes(normalize(name)) ||
        normalize(name).includes(normalize(p.name))
      )
    ).slice(0, 3);

    res.json({
      analysis: aiResult.analysis || '',
      remedies: aiResult.remedies || [],
      doctors: matchedDoctors,
      products: matchedProducts
    });

  } catch (err) {
    console.error('Symptom check error:', err);
    res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
