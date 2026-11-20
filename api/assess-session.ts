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
    const {
      scenarioTitle,
      language = 'Spanish',
      level = 'Beginner',
      durationSeconds = 0,
      transcript = [],
      completedObjectives = [],
      hasVoiceEvidence = false,
      voicedSeconds = 0,
    } = req.body || {};

    const userTurns = transcript.filter((t: any) => t.role === 'user' && t.text?.trim());

    if (userTurns.length === 0) {
      return res.status(200).json({
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

Scenario: ${scenarioTitle}
Target Difficulty: ${level}
Duration: ${durationSeconds} seconds
Completed Objectives: ${JSON.stringify(completedObjectives)}
Voice Audio Evidence Available: ${canAssessPronunciation ? `YES (${Math.round(voicedSeconds)}s of live microphone speech transcribed)` : 'NO (do NOT invent or estimate a pronunciation score)'}

Actual Conversation Transcript:
${dialogueText}

Instructions:
1. Base EVERY score and observation strictly on the actual learner turns above. Do not invent mistakes or praise things the learner never said.
2. Score from 0 to 100 for: overallScore, grammarAccuracy, vocabularyUsage, speakingFluency, sentenceStructure.
3. Pronunciation rules (CRITICAL):
   ${
     canAssessPronunciation
       ? '- Set "pronunciationAvailable": true and provide a realistic "pronunciationScore" (0-100) based on transcription clarity, phonetic accuracy of recognized words, and spoken phrasing, with a concise "pronunciationNote".'
       : '- Set "pronunciationAvailable": false, "pronunciationScore": null, and explain in "pronunciationNote" that pronunciation was not scored due to insufficient voice audio evidence.'
   }
4. Identify real mistakes made by the learner in "mistakes" (up to 6) with original, intendedMeaning, corrected, errorType ("Grammar" | "Vocabulary" | "Structure" | "Register"), explanation, additionalExample.
5. Suggest up to 4 "betterAlternatives" (original, improved, contextNote).
6. Suggest 3 to 5 "wordsToPractice" (word, translation, phonetics, reason, exampleSentence).
7. Provide 2-3 "strengths", a 2-sentence "summaryFeedback", and "cefrEstimate".

Return strictly valid JSON.`,
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
    res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Vercel serverless assess error:', error);
    res.status(500).json({ error: error?.message || 'Assessment failed' });
  }
}
