import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';
  if (!apiKey) {
    console.error('[api/check-mistakes] Missing GEMINI_API_KEY / LIVE_API_KEY.');
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
      utterance,
      targetLanguage = 'Spanish',
      nativeLanguage = 'English',
      learnerLevel = 'Beginner',
      context = '',
      objectives = [],
    } = req.body || {};
    if (!utterance || String(utterance).trim().split(/\s+/).length < 2) {
      return res.status(200).json({ hasMistake: false, correction: null, completedObjectives: [] });
    }

    const pendingObjectives = Array.isArray(objectives)
      ? objectives.filter((o: any) => !o.completed).map((o: any) => ({
          id: o.id,
          title: o.title,
          description: o.description,
        }))
      : [];

    const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
    let response: any = null;
    for (let i = 0; i < models.length; i++) {
      try {
        response = await ai.models.generateContent({
          model: models[i],
          contents: `Analyze this single learner utterance in ${targetLanguage} (Level: ${learnerLevel}, Learner Native Language: ${nativeLanguage}${context ? `, Scenario: ${context}` : ''}):
"${utterance}"
${
  pendingObjectives.length > 0
    ? `\nPending scenario mission objectives:\n${JSON.stringify(pendingObjectives)}`
    : ''
}

Tasks:
1. Determine if there is a clear grammar, vocabulary, sentence structure, or register mistake (ignore minor speech-to-text punctuation quirks).
   - If natural and correct, set "hasMistake": false and "correction": null.
   - If there is a genuine mistake, understand what the learner intended and populate "correction" with explanations in ${nativeLanguage}.
2. Check if the learner's utterance clearly accomplishes any of the pending scenario mission objectives above; include their exact titles in "completedObjectives" (otherwise []).

Return strictly valid JSON:
{
  "hasMistake": boolean,
  "correction": {
    "id": "corr-${Date.now()}",
    "original": "${String(utterance).replace(/"/g, '\\"')}",
    "intendedMeaning": "${nativeLanguage} meaning of what user intended",
    "corrected": "natural corrected sentence in ${targetLanguage}",
    "errorType": "Grammar" | "Vocabulary" | "Structure" | "Register",
    "explanation": "1-2 sentence friendly explanation in ${nativeLanguage}",
    "additionalExample": "one extra example sentence in ${targetLanguage}"
  } | null,
  "completedObjectives": ["exact objective title if completed"]
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

    const parsed = JSON.parse(
      response.text || '{"hasMistake":false,"correction":null,"completedObjectives":[]}'
    );
    res.status(200).json({
      hasMistake: Boolean(parsed.hasMistake),
      correction: parsed.correction || null,
      completedObjectives: Array.isArray(parsed.completedObjectives) ? parsed.completedObjectives : [],
    });
  } catch (error: any) {
    console.error('Vercel serverless check-mistakes error:', error);
    res.status(500).json({ error: error?.message || 'Mistake check failed' });
  }
}
