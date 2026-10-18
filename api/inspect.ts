import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phrase, targetLanguage = 'Spanish' } = req.body || {};
    if (!phrase) {
      return res.status(400).json({ error: 'Phrase is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze this phrase in ${targetLanguage}: "${phrase}".
Provide:
1. Exact English translation
2. Phonetic pronunciation guide
3. Exact International Phonetic Alphabet (IPA) representation
4. Word-by-word token breakdown: [{ "word": "...", "lemma": "...", "partOfSpeech": "...", "meaning": "...", "ipa": "..." }]
5. Grammar insight and cultural context / etiquette tip
6. How to say this in standard formal register (alternativeFormal) and casual register (alternativeCasual).
Return strictly valid JSON:
{
  "translation": "string",
  "pronunciation": "string",
  "ipa": "string",
  "tokens": [
    { "word": "string", "lemma": "string", "partOfSpeech": "string", "meaning": "string", "ipa": "string" }
  ],
  "grammarNote": "string",
  "culturalTip": "string",
  "alternativeFormal": "string",
  "alternativeCasual": "string"
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel serverless inspect error:', error);
    res.status(500).json({ error: error?.message || 'Inspection failed' });
  }
}
