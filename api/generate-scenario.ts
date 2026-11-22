import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';
  if (!apiKey) {
    console.error('[api/generate-scenario] Missing GEMINI_API_KEY / LIVE_API_KEY.');
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
      title,
      language = 'Spanish',
      nativeLanguage = 'English',
      level = 'Beginner',
      aiCharacter = 'Friendly Local',
      aiPersonality = 'Warm & Encouraging',
      userRole = 'Language Learner',
      situation = '',
    } = req.body || {};

    if (!title || !aiCharacter) {
      return res.status(400).json({ error: 'Scenario title and AI character are required' });
    }

    const models = ['gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    let response: any = null;
    for (let i = 0; i < models.length; i++) {
      try {
        response = await ai.models.generateContent({
          model: models[i],
          contents: `Create a realistic, immersive language learning roleplay setup in ${language} for a learner whose native language is ${nativeLanguage}.
Title: ${title}
Difficulty Level: ${level}
AI Character: ${aiCharacter}
AI Personality: ${aiPersonality}
User Role: ${userRole}
Situation Description: ${situation || title}

Return strictly valid JSON:
{
  "starterGreeting": "authentic opening line spoken by ${aiCharacter} in ${language}, matching ${level} difficulty and ${aiPersonality} personality",
  "starterTranslation": "accurate ${nativeLanguage} translation of starterGreeting",
  "starterPhonetics": "clear romanization / phonetic pronunciation guide for starterGreeting",
  "culturalEtiquetteNote": "1 concise practical cultural tip in ${nativeLanguage} for this situation in ${language}",
  "objectives": [
    { "id": "obj-1", "title": "short 3-5 word mission title in ${nativeLanguage}", "description": "actionable hint for learner in ${nativeLanguage}", "completed": false },
    { "id": "obj-2", "title": "short 3-5 word mission title in ${nativeLanguage}", "description": "actionable hint for learner in ${nativeLanguage}", "completed": false },
    { "id": "obj-3", "title": "short 3-5 word mission title in ${nativeLanguage}", "description": "actionable hint for learner in ${nativeLanguage}", "completed": false }
  ],
  "usefulPhrases": [
    { "text": "phrase in ${language}", "translation": "${nativeLanguage} translation" },
    { "text": "phrase in ${language}", "translation": "${nativeLanguage} translation" },
    { "text": "phrase in ${language}", "translation": "${nativeLanguage} translation" },
    { "text": "phrase in ${language}", "translation": "${nativeLanguage} translation" }
  ]
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

    res.status(200).json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Vercel serverless generate-scenario error:', error);
    res.status(500).json({ error: error?.message || 'Scenario generation failed' });
  }
}
