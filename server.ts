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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Ephemeral token endpoint for secure client Live API connections
app.post('/api/live-token', async (_req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
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

    res.json({ token: token.name });
  } catch (error: any) {
    console.error('Failed to create ephemeral live token:', error);
    res.status(500).json({
      error: error?.message || 'Failed to mint ephemeral live token.',
    });
  }
});

// Standard text / interactive chat partner endpoint using gemini-3.8-flash
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      targetLanguage = 'Spanish',
      learnerLevel = 'Beginner',
      scenario = 'Café Order',
      aiPersonality = '',
      situation = '',
      history = [],
      objectives = [],
    } = req.body;

    const systemInstruction = `You are an immersive, encouraging language learning conversation partner.
Target Language: ${targetLanguage}
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
4. Evaluate what the learner said. If they made a grammar, vocabulary, or sentence-structure mistake, keep your spoken reply natural (do not lecture!) and provide a structured correction in "mistakeCorrection" plus a short friendly "grammarFeedback" note.
5. Provide 2 to 3 natural suggestions for what the user could say next (with English translations).
6. Check if any of the scenario objectives were completed in this turn.
7. Return your response strictly as valid JSON adhering to this structure:
{
  "reply": "string (your conversational response in ${targetLanguage})",
  "translation": "string (English translation of your reply)",
  "phonetics": "string (pronunciation guide or romanization, e.g. pinyin/romaji/IPA, or empty string)",
  "grammarFeedback": "string or null (kind constructive tip if user made an error, otherwise null)",
  "mistakeCorrection": {
    "original": "exact user sentence with error",
    "intendedMeaning": "what the user meant in English",
    "corrected": "natural corrected sentence in ${targetLanguage}",
    "errorType": "Grammar | Vocabulary | Structure | Register",
    "explanation": "brief clear explanation",
    "additionalExample": "one extra example sentence in ${targetLanguage}"
  } | null,
  "suggestedReplies": [
    { "text": "phrase in ${targetLanguage}", "translation": "English translation" }
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
    res.status(500).json({ error: error?.message || 'Chat generation failed' });
  }
});

// Word / Sentence Inspector endpoint for deep learning
app.post('/api/inspect', async (req: Request, res: Response) => {
  try {
    const { phrase, targetLanguage = 'Spanish' } = req.body;
    if (!phrase) {
      return res.status(400).json({ error: 'Phrase is required' });
    }

    let response: any = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: attempts > 2 ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash',
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
        break;
      } catch (err: any) {
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempts));
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
       ? '- Because live speech recognition and audio timing evidence was captured, set "pronunciationAvailable": true and provide a realistic "pronunciationScore" (0-100) based on transcription clarity, phonetic accuracy of recognized words, and spoken phrasing, with a concise "pronunciationNote" citing what was observed.'
       : '- Because sufficient live audio/speech evidence was NOT captured, you MUST set "pronunciationAvailable": false, "pronunciationScore": null, and explain in "pronunciationNote" that pronunciation was not scored due to insufficient voice audio evidence.'
   }
4. Identify real mistakes made by the learner in "mistakes" (up to 6):
   - "original": exact sentence/phrase the learner said
   - "intendedMeaning": what the learner intended to say in English
   - "corrected": natural corrected version in ${language}
   - "errorType": one of "Grammar", "Vocabulary", "Structure", "Register"
   - "explanation": clear, helpful explanation of why
   - "additionalExample": one extra natural example sentence in ${language}
   (If the learner made zero mistakes, return an empty array [].)
5. Suggest up to 4 "betterAlternatives" showing more natural/native ways to express phrases the learner actually used.
6. Suggest 3 to 5 "wordsToPractice" relevant to what the learner struggled with or used in this scenario, each with:
   - "word", "translation" (in English), "phonetics", "reason", "exampleSentence".
7. Provide 2-3 "strengths" and a concise 2-sentence "summaryFeedback".
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

// Quiet non-interrupting Smart Mistake Detection endpoint for live turns
app.post('/api/check-mistakes', async (req: Request, res: Response) => {
  try {
    const { utterance, targetLanguage = 'Spanish', learnerLevel = 'Beginner', context = '' } = req.body;
    if (!utterance || String(utterance).trim().split(/\s+/).length < 2) {
      return res.json({ hasMistake: false, correction: null });
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
    res.json(parsed);
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
          contents: `Create a realistic, immersive language learning roleplay setup in ${language}.
Title: ${title}
Difficulty Level: ${level}
AI Character: ${aiCharacter}
AI Personality: ${aiPersonality}
User Role: ${userRole}
Situation Description: ${situation || title}

Return strictly valid JSON:
{
  "starterGreeting": "authentic opening line spoken by ${aiCharacter} in ${language}, matching ${level} difficulty and ${aiPersonality} personality",
  "starterTranslation": "accurate English translation of starterGreeting",
  "starterPhonetics": "clear romanization / phonetic pronunciation guide for starterGreeting",
  "culturalEtiquetteNote": "1 concise practical cultural tip for this situation in ${language}",
  "objectives": [
    { "id": "obj-1", "title": "short 3-5 word mission title", "description": "actionable hint for learner", "completed": false },
    { "id": "obj-2", "title": "short 3-5 word mission title", "description": "actionable hint for learner", "completed": false },
    { "id": "obj-3", "title": "short 3-5 word mission title", "description": "actionable hint for learner", "completed": false }
  ],
  "usefulPhrases": [
    { "text": "phrase in ${language}", "translation": "English translation" },
    { "text": "phrase in ${language}", "translation": "English translation" },
    { "text": "phrase in ${language}", "translation": "English translation" },
    { "text": "phrase in ${language}", "translation": "English translation" }
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
          learnerLevel = 'Beginner',
          scenario = 'Café Order',
          voiceName = 'Zephyr',
          scenarioDetails = '',
          aiPersonality = '',
          userRole = '',
        } = msg;

        const systemInstruction = `You are an authentic, engaging native language speaking partner for real-time conversation practice.
Target Language: ${targetLanguage}
Learner Level: ${learnerLevel}
Roleplay Scenario: ${scenario}
${aiPersonality ? `AI Character Personality: ${aiPersonality}` : ''}
${userRole ? `Learner's Role: ${userRole}` : ''}
${scenarioDetails ? `Scenario Context: ${scenarioDetails}` : ''}

Key guidelines for voice conversation:
1. Speak in ${targetLanguage}. Speak clearly and at an appropriate pace for ${learnerLevel} level.
2. Keep turns short and conversational (1-2 sentences at a time) so the learner has ample space to speak and practice.
3. If the learner hesitates, stumbles, or uses English, be warm and patient. Encourage them and prompt them with easy vocabulary.
4. Do not interrupt or lecture the learner on every grammar mistake; if they make minor errors, rephrase naturally in your response so the conversation flows smoothly.
5. Embody your character, personality, and situation authentically and make it engaging and realistic.`;

        // Connect to Gemini Live API
        try {
          let sessionReadySent = false;
          const notifySessionReady = () => {
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
                notifySessionReady();
              },
              onmessage: (serverMsg: any) => {
                if (clientWs.readyState !== WebSocket.OPEN || isClosed) return;

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
                if (serverMsg.serverContent?.inputAudioTranscription?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'user_transcription',
                      text: serverMsg.serverContent.inputAudioTranscription.text,
                    })
                  );
                }

                // Handle output audio transcription (model's spoken words)
                if (serverMsg.serverContent?.outputAudioTranscription?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'model_transcription',
                      text: serverMsg.serverContent.outputAudioTranscription.text,
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
                if (clientWs.readyState === WebSocket.OPEN && !isClosed) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'error',
                      message:
                        e?.message ||
                        'Live session error. Reverting to interactive mode.',
                    })
                  );
                }
              },
              onclose: () => {
                if (clientWs.readyState === WebSocket.OPEN && !isClosed) {
                  clientWs.send(JSON.stringify({ type: 'session_closed' }));
                }
              },
            },
          });
          notifySessionReady();
        } catch (connErr: any) {
          console.error('Failed to connect to Live API:', connErr);
          if (clientWs.readyState === WebSocket.OPEN && !isClosed) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message:
                  connErr?.message ||
                  'Could not establish Live API connection. Please verify your GEMINI_API_KEY.',
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
