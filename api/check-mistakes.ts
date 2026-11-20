import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { utterance, targetLanguage = 'Spanish', learnerLevel = 'Beginner', context = '' } = req.body || {};
    if (!utterance || String(utterance).trim().split(/\s+/).length < 2) {
      return res.status(200).json({ hasMistake: false, correction: null });
    }

    const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
    let response: any = null;
    for (let i = 0; i < models.length; i++) {
      try {
        response = await ai.models.generateContent({
          model: models[i],
          contents: `Analyze this single learner utterance in ${targetLanguage} (Level: ${learnerLevel}${context ? `, Scenario: ${context}` : ''}):
"${utterance}"

Determine if there is a clear grammar, vocabulary, sentence structure, or register mistake (ignore minor speech-to-text punctuation quirks).
If the sentence is already natural and correct, set "hasMistake": false and "correction": null.
If there is a genuine mistake, understand what the learner intended to say and return:
{
  "hasMistake": true,
  "correction": {
    "id": "corr-${Date.now()}",
    "original": "${String(utterance).replace(/"/g, '\\"')}",
    "intendedMeaning": "English meaning of what user intended",
    "corrected": "natural corrected sentence in ${targetLanguage}",
    "errorType": "Grammar" | "Vocabulary" | "Structure" | "Register",
    "explanation": "1-2 sentence friendly explanation",
    "additionalExample": "one extra example sentence in ${targetLanguage}"
  }
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

    const parsed = JSON.parse(response.text || '{"hasMistake":false,"correction":null}');
    res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel serverless check-mistakes error:', error);
    res.status(500).json({ error: error?.message || 'Mistake check failed' });
  }
}
