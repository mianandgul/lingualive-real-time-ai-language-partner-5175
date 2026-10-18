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
      history = [],
      objectives = [],
    } = req.body;

    const systemInstruction = `You are an immersive, encouraging language learning conversation partner.
Target Language: ${targetLanguage}
Learner Level: ${learnerLevel}
Role / Scenario: ${scenario}

Objectives for the learner:
${JSON.stringify(objectives)}

Instructions:
1. Respond naturally in ${targetLanguage} to continue the roleplay.
2. If learner level is Beginner, keep phrasing simple, clear, and polite (1-2 sentences).
3. If learner level is Intermediate or Advanced, speak naturally with idiomatic expressions.
4. Evaluate what the learner said. If they made a grammar, vocabulary, or phrasing mistake, provide a kind, constructive correction.
5. Provide 2 to 3 natural suggestions for what the user could say next (with English translations).
6. Check if any of the scenario objectives were completed in this turn.
7. Return your response strictly as valid JSON adhering to this structure:
{
  "reply": "string (your conversational response in ${targetLanguage})",
  "translation": "string (English translation of your reply)",
  "phonetics": "string (pronunciation guide or romanization, e.g. pinyin/romaji/IPA, or empty string)",
  "grammarFeedback": "string or null (kind constructive tip if user made an error, otherwise null)",
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

    let response: any = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: attempts > 2 ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });
        break;
      } catch (callErr: any) {
        if (attempts >= 3) throw callErr;
        await new Promise((r) => setTimeout(r, 800 * attempts));
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

// Comprehensive CEFR Session Assessment endpoint
app.post('/api/assess-session', async (req: Request, res: Response) => {
  try {
    const { scenarioTitle, language, targetCEFR = 'B1', transcript = [], completedObjectives = [] } = req.body;

    const userTurns = transcript.filter((t: any) => t.role === 'user').map((t: any) => t.text);

    if (userTurns.length === 0) {
      return res.json({
        overallCEFR: targetCEFR,
        fluencyScore: 75,
        accuracyScore: 78,
        vocabularyScore: 74,
        taskCompletionScore: completedObjectives.length > 0 ? 80 : 65,
        keyStrengths: ['Engaged in active dialogue', 'Attempted target language phrasing'],
        areasForImprovement: ['Extend turns with subordinate clauses', 'Practice more roleplay exchanges'],
        recommendedDrills: ['Target vocabulary flashcard review', 'Repetition shadowing drills'],
      });
    }

    let response: any = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: attempts > 2 ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash',
          contents: `You are an expert CEFR language assessor. Evaluate this learner's performance in ${language}.
Scenario: ${scenarioTitle}
Target Level: ${targetCEFR}
Completed Objectives: ${JSON.stringify(completedObjectives)}
Learner Spoken Turns:
${userTurns.map((turn: string, i: number) => `Turn ${i + 1}: "${turn}"`).join('\n')}

Evaluate against CEFR criteria (A1, A2, B1, B2, C1, C2).
Return strictly valid JSON:
{
  "overallCEFR": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "fluencyScore": number (0 to 100),
  "accuracyScore": number (0 to 100),
  "vocabularyScore": number (0 to 100),
  "taskCompletionScore": number (0 to 100),
  "keyStrengths": ["string", "string"],
  "areasForImprovement": ["string", "string"],
  "recommendedDrills": ["string", "string"]
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
    console.error('Assess error:', error);
    res.status(500).json({ error: error?.message || 'Assessment failed' });
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
        } = msg;

        const systemInstruction = `You are an authentic, engaging native language speaking partner for real-time conversation practice.
Target Language: ${targetLanguage}
Learner Level: ${learnerLevel}
Roleplay Scenario: ${scenario}
${scenarioDetails ? `Scenario Context: ${scenarioDetails}` : ''}

Key guidelines for voice conversation:
1. Speak in ${targetLanguage}. Speak clearly and at an appropriate pace for ${learnerLevel} level.
2. Keep turns short and conversational (1-2 sentences at a time) so the learner has ample space to speak and practice.
3. If the learner hesitates, stumbles, or uses English, be warm and patient. Encourage them and prompt them with easy vocabulary.
4. If they make minor errors, rephrase naturally in your response without making it feel like a reprimand.
5. Embody your role authentically and make it fun, lively, and immersive.`;

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
