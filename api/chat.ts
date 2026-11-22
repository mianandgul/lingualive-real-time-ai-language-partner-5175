import { GoogleGenAI } from '@google/genai';

function isMissingOrInvalidKeyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('api_key') ||
    lower.includes('api key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthorized') ||
    lower.includes('unauthenticated') ||
    lower.includes('401') ||
    lower.includes('403')
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';
  if (!apiKey) {
    console.error('[api/chat] Missing GEMINI_API_KEY / LIVE_API_KEY in environment variables.');
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
    const {
      message,
      targetLanguage = 'Spanish',
      nativeLanguage = 'English',
      learnerLevel = 'Beginner',
      scenario = 'Café Order',
      aiPersonality = '',
      situation = '',
      history = [],
      objectives = [],
    } = req.body || {};

    const systemInstruction = `You are an immersive, encouraging language learning conversation partner.
Target Language: ${targetLanguage}
Learner Native Language (for translations & explanations): ${nativeLanguage}
Learner Level: ${learnerLevel}
Role / Scenario: ${scenario}
${aiPersonality ? `AI Personality / Demeanor: ${aiPersonality}` : ''}
${situation ? `Situation Context: ${situation}` : ''}

Objectives for the learner:
${JSON.stringify(objectives)}

Instructions:
1. Respond naturally in ${targetLanguage} to continue the roleplay, staying strictly in character.
2. If learner level is Beginner, keep phrasing simple, clear, and polite (1-2 sentences).
3. If learner level is Intermediate or Advanced, speak naturally with idiomatic expressions.
4. Evaluate what the learner said. If they made a grammar, vocabulary, or sentence-structure mistake, keep your spoken reply natural (do not lecture!) and provide a structured correction in "mistakeCorrection" plus a short friendly "grammarFeedback" note written in ${nativeLanguage}.
5. Provide 2 to 3 natural suggestions for what the user could say next (with ${nativeLanguage} translations).
6. Check if any of the scenario objectives were completed in this turn.
7. Return your response strictly as valid JSON adhering to this structure:
{
  "reply": "string (your conversational response in ${targetLanguage})",
  "translation": "string (${nativeLanguage} translation of your reply)",
  "phonetics": "string (pronunciation guide or romanization, e.g. pinyin/romaji/IPA, or empty string)",
  "grammarFeedback": "string or null (kind constructive tip in ${nativeLanguage} if user made an error, otherwise null)",
  "mistakeCorrection": {
    "original": "exact user sentence with error",
    "intendedMeaning": "what the user meant in ${nativeLanguage}",
    "corrected": "natural corrected sentence in ${targetLanguage}",
    "errorType": "Grammar | Vocabulary | Structure | Register",
    "explanation": "brief clear explanation in ${nativeLanguage}",
    "additionalExample": "one extra example sentence in ${targetLanguage}"
  } | null,
  "suggestedReplies": [
    { "text": "phrase in ${targetLanguage}", "translation": "${nativeLanguage} translation" }
  ],
  "completedObjectives": ["objective title 1", "objective title 2"]
}`;

    const contents: any[] = [];
    for (const h of history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message || 'Hello!' }],
    });

    const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
    let response: any = null;
    for (let i = 0; i < models.length; i++) {
      try {
        response = await ai.models.generateContent({
          model: models[i],
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });
        break;
      } catch (err: any) {
        if (i === models.length - 1) throw err;
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const raw = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        reply: raw,
        translation: '',
        phonetics: '',
        grammarFeedback: null,
        mistakeCorrection: null,
        suggestedReplies: [],
        completedObjectives: [],
      };
    }

    res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel serverless chat error:', error);
    const errMsg = error?.message || 'Chat generation failed';
    if (isMissingOrInvalidKeyError(errMsg)) {
      return res.status(503).json({
        errorCode: 'MISSING_API_KEY',
        error: 'Voice service not configured. Please check API Key in Vercel Settings',
      });
    }
    res.status(500).json({ error: errMsg });
  }
}
