// Vercel Serverless Function - AyurBot Chat
// This runs server-side on Vercel (Node.js), NOT on cPanel
// Calls Gemini API directly - no cPanel/DNS needed!

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, lang } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured. Please add GEMINI_API_KEY in Vercel environment variables.' });
  }

  const systemPrompt = `You are AyurBot, a friendly and knowledgeable Ayurvedic health assistant for the Deergayu platform in Sri Lanka.
You specialize in traditional Ayurvedic medicine, herbal remedies, and holistic wellness from Sri Lankan and Indian Ayurvedic traditions.

Your role:
- Provide accurate, helpful Ayurvedic health information
- Suggest traditional herbal home remedies (e.g., ginger, turmeric, neem, kohomba, ranawara, etc.)
- Explain Ayurvedic principles (Vata, Pitta, Kapha doshas)
- Recommend lifestyle and dietary adjustments based on Ayurvedic wisdom
- Suggest seeing a doctor for serious conditions
- Be warm, supportive, and encouraging

Important rules:
- Always recommend consulting a qualified Ayurvedic doctor for serious issues
- Never claim to diagnose or prescribe medical treatment
- Keep responses concise (3-5 sentences max) and easy to read
- If asked about booking a doctor, mention they can use Deergayu's Channeling page
- If asked about products, mention they can check the Deergayu Shop

${lang === 'si' ? 'RESPOND IN SINHALA LANGUAGE.' : lang === 'ta' ? 'RESPOND IN TAMIL LANGUAGE.' : 'RESPOND IN ENGLISH.'}

User message: ${message}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 400,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error('Gemini API error:', errData);
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(502).json({ error: 'No response from AI' });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
