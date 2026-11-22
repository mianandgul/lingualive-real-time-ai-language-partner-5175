import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());

const serverApiKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey: serverApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

// Geo / Locale auto-detection endpoint
const GEO_COUNTRY_TO_LANG: Record<string, { lang: string; currency: string; countryName: string }> = {
  US: { lang: 'en', currency: 'USD', countryName: 'United States' },
  GB: { lang: 'en', currency: 'GBP', countryName: 'United Kingdom' },
  CA: { lang: 'en', currency: 'USD', countryName: 'Canada' },
  AU: { lang: 'en', currency: 'USD', countryName: 'Australia' },
  PK: { lang: 'ur', currency: 'PKR', countryName: 'Pakistan' },
  IN: { lang: 'hi', currency: 'INR', countryName: 'India' },
  BD: { lang: 'bn', currency: 'BDT', countryName: 'Bangladesh' },
  SA: { lang: 'ar', currency: 'SAR', countryName: 'Saudi Arabia' },
  AE: { lang: 'ar', currency: 'AED', countryName: 'United Arab Emirates' },
  EG: { lang: 'ar', currency: 'USD', countryName: 'Egypt' },
  ES: { lang: 'es', currency: 'EUR', countryName: 'Spain' },
  MX: { lang: 'es', currency: 'USD', countryName: 'Mexico' },
  FR: { lang: 'fr', currency: 'EUR', countryName: 'France' },
  DE: { lang: 'de', currency: 'EUR', countryName: 'Germany' },
  IT: { lang: 'it', currency: 'EUR', countryName: 'Italy' },
  PT: { lang: 'pt', currency: 'EUR', countryName: 'Portugal' },
  BR: { lang: 'pt', currency: 'BRL', countryName: 'Brazil' },
  JP: { lang: 'ja', currency: 'JPY', countryName: 'Japan' },
  KR: { lang: 'ko', currency: 'KRW', countryName: 'South Korea' },
  CN: { lang: 'zh', currency: 'CNY', countryName: 'China' },
  TR: { lang: 'tr', currency: 'TRY', countryName: 'Turkey' },
  RU: { lang: 'ru', currency: 'RUB', countryName: 'Russia' },
};

const SUPPORTED_GEO_LANGS = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'hi', 'ur', 'zh', 'ja', 'ko', 'tr', 'ru', 'bn',
]);

app.get('/api/geo', (req: Request, res: Response) => {
  const rawCountry = String(
    req.headers['x-vercel-ip-country'] ||
      req.headers['cf-ipcountry'] ||
      req.headers['x-appengine-country'] ||
      ''
  )
    .trim()
    .toUpperCase();
  const acceptLangRaw = String(req.headers['accept-language'] || '');
  const primaryAcceptLang = acceptLangRaw.split(',')[0]?.split(';')[0]?.trim() || 'en';
  const acceptLangBase = primaryAcceptLang.split('-')[0].toLowerCase();
  const countryInfo = GEO_COUNTRY_TO_LANG[rawCountry];
  const defaultAppLang =
    countryInfo?.lang || (SUPPORTED_GEO_LANGS.has(acceptLangBase) ? acceptLangBase : 'en');

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    countryCode: rawCountry || null,
    countryName: countryInfo?.countryName || null,
    currency: countryInfo?.currency || 'USD',
    defaultAppLang,
    acceptLanguage: primaryAcceptLang,
  });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY),
    time: new Date().toISOString(),
  });
});

// Shared ephemeral token minting handler for /api/token and /api/live-token
async function handleLiveTokenRequest(_req: Request, res: Response) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';
  if (!apiKey) {
    console.error('[Voice Token Error] Missing GEMINI_API_KEY / LIVE_API_KEY in environment variables.');
    return res.status(503).json({
      errorCode: 'MISSING_API_KEY',
      error: 'Voice service not configured. Please check API Key in Vercel Settings',
    });
  }

  try {
    const tokenAi = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    const token = await tokenAi.authTokens.create({
      config: {
        uses: 1,
      },
    });

    if (!token?.name) {
      console.error('[Voice Token Error] authTokens.create returned empty token:', token);
      return res.status(500).json({
        errorCode: 'TOKEN_CREATE_FAILED',
        error: 'Live voice token response was empty.',
      });
    }

    res.json({ token: token.name });
  } catch (error: any) {
    const errMsg = error?.message || String(error) || 'Failed to mint ephemeral live token.';
    console.error('[Voice Token Error] Failed to create ephemeral live token:', error);
    if (isMissingOrInvalidKeyError(errMsg)) {
      return res.status(503).json({
        errorCode: 'MISSING_API_KEY',
        error: 'Voice service not configured. Please check API Key in Vercel Settings',
        details: errMsg,
      });
    }
    res.status(500).json({
      errorCode: 'TOKEN_CREATE_FAILED',
      error: errMsg,
    });
  }
}

app.post('/api/live-token', handleLiveTokenRequest);
app.get('/api/live-token', handleLiveTokenRequest);
app.post('/api/token', handleLiveTokenRequest);
app.get('/api/token', handleLiveTokenRequest);

// Standard text / interactive chat partner endpoint using gemini-3.8-flash
app.post('/api/chat', async (req: Request, res: Response) => {
  const activeKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';
  if (!activeKey) {
    console.error('[server /api/chat] Missing GEMINI_API_KEY / LIVE_API_KEY.');
    return res.status(503).json({
      errorCode: 'MISSING_API_KEY',
      error: 'Voice service not configured. Please check API Key in Vercel Settings',
    });
  }

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
    } = req.body;

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

    // Format chat contents
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
      } catch (callErr: any) {
        if (i === models.length - 1) throw callErr;
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

    res.json(parsed);
  } catch (error: any) {
    console.error('Chat error:', error);
    const errMsg = error?.message || 'Chat generation failed';
    if (isMissingOrInvalidKeyError(errMsg)) {
      return res.status(503).json({
        errorCode: 'MISSING_API_KEY',
        error: 'Voice service not configured. Please check API Key in Vercel Settings',
      });
    }
    res.status(500).json({ error: errMsg });
  }
});

// Word / Sentence Inspector endpoint for deep learning
app.post('/api/inspect', async (req: Request, res: Response) => {
  try {
    const { phrase, targetLanguage = 'Spanish', nativeLanguage = 'English' } = req.body;
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

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Inspect error:', error);
    res.status(500).json({ error: error?.message || 'Inspection failed' });
  }
});

// Comprehensive AI Conversation Feedback & Mistake Assessment endpoint
app.post('/api/assess-session', async (req: Request, res: Response) => {
  try {
    const {
      scenarioTitle,
      language = 'Spanish',
      nativeLanguage = 'English',
      level = 'Beginner',
      durationSeconds = 0,
      transcript = [],
      completedObjectives = [],
      hasVoiceEvidence = false,
      voicedSeconds = 0,
    } = req.body;

    const userTurns = transcript.filter((t: any) => t.role === 'user' && t.text?.trim());

    if (userTurns.length === 0) {
      return res.json({
        insufficientData: true,
        overallScore: null,
        grammarAccuracy: null,
        pronunciationAvailable: false,
        pronunciationScore: null,
        pronunciationNote:
          'No spoken or written learner turns were recorded in this session, so pronunciation and performance scores were not generated.',
        vocabularyUsage: null,
        speakingFluency: null,
        sentenceStructure: null,
        cefrEstimate: level === 'Beginner' ? 'A1' : level === 'Intermediate' ? 'B1' : 'C1',
        mistakes: [],
        betterAlternatives: [],
        wordsToPractice: [],
        strengths: [],
        summaryFeedback:
          'Speak or send at least one message during your practice call to receive a detailed AI learning report.',
      });
    }

    const canAssessPronunciation = Boolean(
      hasVoiceEvidence && userTurns.length >= 2 && Number(voicedSeconds) >= 3
    );

    const dialogueText = transcript
      .slice(-24)
      .map((t: any) => `${t.role === 'user' ? 'Learner' : 'Partner'}: "${t.text}"`)
      .join('\n');

    const models = ['gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    let response: any = null;
    for (let i = 0; i < models.length; i++) {
      try {
        response = await ai.models.generateContent({
          model: models[i],
          contents: `You are a senior language learning coach and CEFR evaluator assessing a learner's real conversation in ${language}.
Write all feedback, explanations, and translations in the learner's native language: ${nativeLanguage}.

Scenario: ${scenarioTitle}
Target Difficulty: ${level}
Duration: ${durationSeconds} seconds
Completed Objectives: ${JSON.stringify(completedObjectives)}
Voice Audio Evidence Available: ${canAssessPronunciation ? `YES (${Math.round(voicedSeconds)}s of live microphone speech transcribed)` : 'NO (do NOT invent or estimate a pronunciation score)'}

Actual Conversation Transcript:
${dialogueText}

Instructions:
1. Base EVERY score and observation strictly on the actual learner turns above. Do not invent mistakes or praise things the learner never said.
2. Score from 0 to 100 for:
   - overallScore
   - grammarAccuracy
   - vocabularyUsage
   - speakingFluency
   - sentenceStructure
3. Pronunciation rules (CRITICAL):
   ${
     canAssessPronunciation
       ? `- Because live speech recognition and audio timing evidence was captured, set "pronunciationAvailable": true and provide a realistic "pronunciationScore" (0-100) based on transcription clarity, phonetic accuracy of recognized words, and spoken phrasing, with a concise "pronunciationNote" in ${nativeLanguage} citing what was observed.`
       : `- Because sufficient live audio/speech evidence was NOT captured, you MUST set "pronunciationAvailable": false, "pronunciationScore": null, and explain in "pronunciationNote" (in ${nativeLanguage}) that pronunciation was not scored due to insufficient voice audio evidence.`
   }
4. Identify real mistakes made by the learner in "mistakes" (up to 6):
   - "original": exact sentence/phrase the learner said
   - "intendedMeaning": what the learner intended to say in ${nativeLanguage}
   - "corrected": natural corrected version in ${language}
   - "errorType": one of "Grammar", "Vocabulary", "Structure", "Register"
   - "explanation": clear, helpful explanation in ${nativeLanguage} of why
   - "additionalExample": one extra natural example sentence in ${language}
   (If the learner made zero mistakes, return an empty array [].)
5. Suggest up to 4 "betterAlternatives" showing more natural/native ways to express phrases the learner actually used (with contextNote in ${nativeLanguage}).
6. Suggest 3 to 5 "wordsToPractice" relevant to what the learner struggled with or used in this scenario, each with:
   - "word", "translation" (in ${nativeLanguage}), "phonetics", "reason" (in ${nativeLanguage}), "exampleSentence".
7. Provide 2-3 "strengths" (in ${nativeLanguage}) and a concise 2-sentence "summaryFeedback" (in ${nativeLanguage}).
8. Estimate "cefrEstimate" ("A1" | "A2" | "B1" | "B2" | "C1" | "C2").

Return strictly valid JSON matching:
{
  "insufficientData": false,
  "overallScore": number,
  "grammarAccuracy": number,
  "pronunciationAvailable": boolean,
  "pronunciationScore": number | null,
  "pronunciationNote": "string",
  "vocabularyUsage": number,
  "speakingFluency": number,
  "sentenceStructure": number,
  "cefrEstimate": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "mistakes": [
    {
      "id": "string",
      "original": "string",
      "intendedMeaning": "string",
      "corrected": "string",
      "errorType": "Grammar" | "Vocabulary" | "Structure" | "Register",
      "explanation": "string",
      "additionalExample": "string"
    }
  ],
  "betterAlternatives": [
    { "original": "string", "improved": "string", "contextNote": "string" }
  ],
  "wordsToPractice": [
    { "word": "string", "translation": "string", "phonetics": "string", "reason": "string", "exampleSentence": "string" }
  ],
  "strengths": ["string"],
  "summaryFeedback": "string"
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
    if (!canAssessPronunciation) {
      parsed.pronunciationAvailable = false;
      parsed.pronunciationScore = null;
      if (!parsed.pronunciationNote) {
        parsed.pronunciationNote =
          'Insufficient audio evidence — speak for at least a few turns with your microphone active to assess pronunciation.';
      }
    }
    res.json(parsed);
  } catch (error: any) {
    console.error('Assess error:', error);
    res.status(500).json({ error: error?.message || 'Assessment failed' });
  }
});

// Quiet non-interrupting Smart Mistake Detection + Mission Objective Check endpoint for live turns
app.post('/api/check-mistakes', async (req: Request, res: Response) => {
  try {
    const {
      utterance,
      targetLanguage = 'Spanish',
      nativeLanguage = 'English',
      learnerLevel = 'Beginner',
      context = '',
      objectives = [],
    } = req.body;
    if (!utterance || String(utterance).trim().split(/\s+/).length < 2) {
      return res.json({ hasMistake: false, correction: null, completedObjectives: [] });
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
   - If there is a genuine mistake, understand what the learner intended and populate "correction" in ${nativeLanguage}.
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
    res.json({
      hasMistake: Boolean(parsed.hasMistake),
      correction: parsed.correction || null,
      completedObjectives: Array.isArray(parsed.completedObjectives) ? parsed.completedObjectives : [],
    });
  } catch (error: any) {
    console.error('Check mistakes error:', error);
    res.status(500).json({ error: error?.message || 'Mistake check failed' });
  }
});

// AI Custom Scenario Generator endpoint
app.post('/api/generate-scenario', async (req: Request, res: Response) => {
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
    } = req.body;

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

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Generate scenario error:', error);
    res.status(500).json({ error: error?.message || 'Scenario generation failed' });
  }
});

// Text to speech endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Supported voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const voiceName = allowedVoices.includes(voice) ? voice : 'Kore';

    let response: any = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });
        break;
      } catch (err: any) {
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempts));
      }
    }

    const base64Audio =
      response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio generated' });
    }

    // Returns audio/wav base64 data URL
    res.json({ audioDataUrl: `data:audio/wav;base64,${base64Audio}` });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error?.message || 'TTS generation failed' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Mount WebSocket server for Live API real-time voice streaming
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', (clientWs: WebSocket) => {
  let liveSession: any = null;
  let isClosed = false;

  const cleanupSession = () => {
    if (liveSession) {
      try {
        liveSession.close();
      } catch (err) {
        console.error('Error closing live session:', err);
      }
      liveSession = null;
    }
  };

  clientWs.on('close', () => {
    isClosed = true;
    cleanupSession();
  });

  clientWs.on('error', (err) => {
    console.error('Client WS error:', err);
    cleanupSession();
  });

  clientWs.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'ping') {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: 'pong' }));
        }
        return;
      }

      if (msg.type === 'init') {
        cleanupSession();

        const {
          targetLanguage = 'Spanish',
          nativeLanguage = 'English',
          learnerLevel = 'Beginner',
          scenario = 'Café Order',
          voiceName = 'Zephyr',
          scenarioDetails = '',
          aiPersonality = '',
          userRole = '',
        } = msg;

        const systemInstruction = `You are an authentic, engaging native language speaking partner for real-time conversation practice.
Target Language: ${targetLanguage}
Learner Native Language: ${nativeLanguage}
Learner Level: ${learnerLevel}
Roleplay Scenario: ${scenario}
${aiPersonality ? `AI Character Personality: ${aiPersonality}` : ''}
${userRole ? `Learner's Role: ${userRole}` : ''}
${scenarioDetails ? `Scenario Context: ${scenarioDetails}` : ''}

Key guidelines for voice conversation:
1. Speak in ${targetLanguage}. Speak clearly and at an appropriate pace for ${learnerLevel} level.
2. Keep turns short and conversational (1-2 sentences at a time) so the learner has ample space to speak and practice.
3. If the learner hesitates, stumbles, or uses ${nativeLanguage}, be warm and patient. Encourage them and prompt them with easy vocabulary.
4. Do not interrupt or lecture the learner on every grammar mistake; if they make minor errors, rephrase naturally in your response so the conversation flows smoothly.
5. Embody your character, personality, and situation authentically and make it engaging and realistic.`;

        // Connect to Gemini Live API
        if (!(process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY)) {
          console.error('[WS /live] Missing GEMINI_API_KEY / LIVE_API_KEY environment variable.');
          if (clientWs.readyState === WebSocket.OPEN && !isClosed) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                errorCode: 'MISSING_API_KEY',
                message: 'Voice service not configured. Please check API Key in Vercel Settings',
              })
            );
          }
          return;
        }

        try {
          let sessionReadySent = false;
          let readyFallbackTimer: NodeJS.Timeout | null = null;
          const notifySessionReady = () => {
            if (readyFallbackTimer) {
              clearTimeout(readyFallbackTimer);
              readyFallbackTimer = null;
            }
            if (!sessionReadySent && clientWs.readyState === WebSocket.OPEN && !isClosed) {
              sessionReadySent = true;
              clientWs.send(
                JSON.stringify({
                  type: 'session_ready',
                  language: targetLanguage,
                  scenario,
                })
              );
            }
          };

          liveSession = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
                },
              },
              systemInstruction,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
            callbacks: {
              onopen: () => {
                readyFallbackTimer = setTimeout(() => {
                  notifySessionReady();
                }, 600);
              },
              onmessage: (serverMsg: any) => {
                if (clientWs.readyState !== WebSocket.OPEN || isClosed) return;

                if (serverMsg.setupComplete) {
                  notifySessionReady();
                }

                // Handle audio chunks (24kHz PCM)
                const parts = serverMsg.serverContent?.modelTurn?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'audio',
                          audio: part.inlineData.data,
                        })
                      );
                    }
                    if (part.text) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'model_text_chunk',
                          text: part.text,
                        })
                      );
                    }
                  }
                }

                // Handle input audio transcription (user's spoken words)
                const inputTranscriptText =
                  serverMsg.serverContent?.inputTranscription?.text ||
                  serverMsg.serverContent?.inputAudioTranscription?.text;
                if (inputTranscriptText) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'user_transcription',
                      text: inputTranscriptText,
                    })
                  );
                }

                // Handle output audio transcription (model's spoken words)
                const outputTranscriptText =
                  serverMsg.serverContent?.outputTranscription?.text ||
                  serverMsg.serverContent?.outputAudioTranscription?.text;
                if (outputTranscriptText) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'model_transcription',
                      text: outputTranscriptText,
                    })
                  );
                }

                // Handle interruption signal (barge-in)
                if (serverMsg.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                // Handle turn completion
                if (serverMsg.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                }
              },
              onerror: (e: any) => {
                console.error('Gemini Live session error:', e);
                const errMsg = e?.message || 'Live session error.';
                if (clientWs.readyState === WebSocket.OPEN && !isClosed) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'error',
                      errorCode: isMissingOrInvalidKeyError(errMsg) ? 'MISSING_API_KEY' : 'LIVE_ERROR',
                      message: isMissingOrInvalidKeyError(errMsg)
                        ? 'Voice service not configured. Please check API Key in Vercel Settings'
                        : errMsg,
                    })
                  );
                }
              },
              onclose: () => {
                if (readyFallbackTimer) {
                  clearTimeout(readyFallbackTimer);
                  readyFallbackTimer = null;
                }
                if (clientWs.readyState === WebSocket.OPEN && !isClosed) {
                  clientWs.send(JSON.stringify({ type: 'session_closed' }));
                }
              },
            },
          });
        } catch (connErr: any) {
          console.error('Failed to connect to Live API:', connErr);
          const errMsg = connErr?.message || 'Could not establish Live API connection.';
          if (clientWs.readyState === WebSocket.OPEN && !isClosed) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                errorCode: isMissingOrInvalidKeyError(errMsg) ? 'MISSING_API_KEY' : 'LIVE_CONNECT_ERROR',
                message: isMissingOrInvalidKeyError(errMsg)
                  ? 'Voice service not configured. Please check API Key in Vercel Settings'
                  : errMsg,
              })
            );
          }
        }
        return;
      }

      // Relay client audio stream (16kHz PCM little-endian base64) to Gemini Live
      if (msg.type === 'audio' && msg.data && liveSession) {
        liveSession.sendRealtimeInput({
          audio: {
            data: msg.data,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
        return;
      }

      // Relay client text message to Live session
      if (msg.type === 'text' && msg.text && liveSession) {
        liveSession.sendRealtimeInput({
          text: msg.text,
        });
        return;
      }

      // Signal end of audio
      if (msg.type === 'audio_end' && liveSession) {
        liveSession.sendRealtimeInput({
          audioStreamEnd: true,
        });
        return;
      }
    } catch (parseErr) {
      console.error('Error handling WebSocket message:', parseErr);
    }
  });
});

// Mount Vite middleware for dev or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Serve static assets from public folder directly (verification files, manifests, icons)
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(Number(port), '0.0.0.0', () => {
    console.log(`LinguaLive server running on http://0.0.0.0:${port}`);
  });
}

startServer();
