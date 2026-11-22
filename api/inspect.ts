import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';
  if (!apiKey) {
    console.error('[api/inspect] Missing GEMINI_API_KEY / LIVE_API_KEY.');
    return res.status(503).json({
      errorCode: 'MISSING_API_KEY',
      error: 'Voice service not configured. Please check API Key in Vercel Settings',
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  try {
    const { phrase, targetLanguage = 'Spanish', nativeLanguage = 'English' } = req.body || {};
    if (!phrase) {
      return res.status(400).json({ error: 'Phrase is required' });
    }

    const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
    let response: any = null;
    for (let i = 0; i < models.length; i++) {
      try {
        response = await ai.models.generateContent({
          model: models[i],
          contents: `Analyze this phrase in ${targetLanguage} for a learner whose native language is ${nativeLanguage}: "${phrase}".
Provide:
1. Exact ${nativeLanguage} translation
2. Phonetic pronunciation guide
3. Exact International Phonetic Alphabet (IPA) representation
4. Word-by-word token breakdown: [{ "word": "...", "lemma": "...", "partOfSpeech": "...", "meaning": "meaning in ${nativeLanguage}", "ipa": "..." }]
5. Grammar insight and cultural context / etiquette tip written in ${nativeLanguage}
6. How to say this in standard formal register (alternativeFormal) and casual register (alternativeCasual).
Return strictly valid JSON:
{
  "translation": "string (in ${nativeLanguage})",
  "pronunciation": "string",
  "ipa": "string",
  "tokens": [
    { "word": "string", "lemma": "string", "partOfSpeech": "string", "meaning": "string (in ${nativeLanguage})", "ipa": "string" }
  ],
  "grammarNote": "string (written in ${nativeLanguage})",
  "culturalTip": "string (written in ${nativeLanguage})",
  "alternativeFormal": "string",
  "alternativeCasual": "string"
}`,
          config: {
            responseMimeType: 'application/json',
          },
        });
        break;
      } catch (err: any) {
        if (i === models.length - 1) throw err;
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const parsed = JSON.parse(response.text || '{}');
    res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel serverless inspect error:', error);
    res.status(500).json({ error: error?.message || 'Inspection failed' });
  }
}
