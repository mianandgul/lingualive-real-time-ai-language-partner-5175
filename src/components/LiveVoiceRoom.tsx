import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Scenario, TranscriptItem, LiveVoiceName, VocabularyItem } from '../types';
import { LiveAudioPlayer, LiveAudioRecorder } from '../services/audioUtils';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptView } from './TranscriptView';
import { GoogleGenAI, Modality } from '@google/genai';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  CheckCircle2,
  Circle,
  HelpCircle,
  Send,
  AlertTriangle,
  RefreshCw,
  Radio,
  Key,
} from 'lucide-react';

interface LiveVoiceRoomProps {
  scenario: Scenario;
  selectedVoice: LiveVoiceName;
  onVoiceChange: (voice: LiveVoiceName) => void;
  onEndSession: (items: TranscriptItem[], completedObjectives: string[]) => void;
  onInspectPhrase: (phrase: string) => void;
  onSaveToVault: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onPlayTTS: (text: string) => void;
}

export const LiveVoiceRoom: React.FC<LiveVoiceRoomProps> = ({
  scenario,
  selectedVoice,
  onVoiceChange,
  onEndSession,
  onInspectPhrase,
  onSaveToVault,
  onPlayTTS,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [userVolume, setUserVolume] = useState<number>(0);
  const [modelVolume, setModelVolume] = useState<number>(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState<boolean>(false);
  const [customKeyInput, setCustomKeyInput] = useState<string>('');

  // Transcript items
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const currentModelTurnRef = useRef<string>('');

  // Objectives tracking
  const [objectives, setObjectives] = useState(scenario.objectives);

  // Fallback text input
  const [textInput, setTextInput] = useState<string>('');

  // Audio utility instances & performance state tracking refs
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveAudioRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const liveSessionRef = useRef<any>(null);
  const meterIntervalRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(isMuted);
  const sessionReadyRef = useRef<boolean>(false);
  const isMicReadyRef = useRef<boolean>(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Instantiate audio utilities once on mount
  useEffect(() => {
    if (!playerRef.current) playerRef.current = new LiveAudioPlayer();
    if (!recorderRef.current) recorderRef.current = new LiveAudioRecorder();

    return () => {
      cleanupAll();
    };
  }, []);

  // Sync starter greeting to transcript when scenario changes
  useEffect(() => {
    if (scenario.starterGreeting) {
      setTranscript([
        {
          id: `starter-turn-${scenario.id}`,
          role: 'model',
          text: scenario.starterGreeting,
          translation: scenario.starterTranslation,
          phonetics: scenario.starterPhonetics,
          timestamp: Date.now(),
        },
      ]);
    }
    setObjectives(scenario.objectives);
  }, [scenario.id, scenario.starterGreeting, scenario.starterTranslation, scenario.starterPhonetics, scenario.objectives]);

  const cleanupAll = useCallback(() => {
    if (connectionTimeoutRef.current) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (meterIntervalRef.current) {
      window.clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    if (playerRef.current) {
      playerRef.current.close();
    }
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
      } catch {
        // Ignore
      }
      liveSessionRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    sessionReadyRef.current = false;
    isMicReadyRef.current = false;
    isConnectingRef.current = false;
  }, []);

  // Helper to establish direct client-side Gemini Live connection (used on Vercel / serverless)
  const connectDirectLiveAPI = useCallback(async () => {
    let activeToken = '';
    let isEphemeral = false;

    // 1. Fetch an ephemeral token from /api/live-token (secure server-side generation)
    try {
      const res = await fetch('/api/live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          activeToken = data.token;
          isEphemeral = true;
        }
      }
    } catch (e) {
      console.warn('Could not fetch ephemeral token from /api/live-token:', e);
    }

    // 2. If no ephemeral token was returned, check for manual user key in localStorage
    if (!activeToken) {
      const userKey = localStorage.getItem('lingualive_gemini_key') || '';
      if (userKey) {
        activeToken = userKey;
        isEphemeral = false;
      }
    }

    // 3. If still no token or key, prompt the user with clear instructions
    if (!activeToken) {
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setIsConnecting(false);
      setIsConnected(false);
      isConnectingRef.current = false;
      setConnectionError(
        'Live voice requires a Gemini API key. Please add GEMINI_API_KEY to your Vercel Project Settings > Environment Variables, or enter your API key below.'
      );
      setShowApiKeyPrompt(true);
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: activeToken,
        ...(isEphemeral ? { httpOptions: { apiVersion: 'v1alpha' } } : {}),
      });

      const systemInstruction = `You are an authentic, engaging native language speaking partner for real-time conversation practice.
Target Language: ${scenario.language}
Learner Level: ${scenario.level}
Roleplay Scenario: ${scenario.title} (${scenario.partnerRole})
Scenario Context: ${scenario.description}. Starter context: ${scenario.starterGreeting}

Key guidelines for voice conversation:
1. Speak in ${scenario.language}. Speak clearly and at an appropriate pace for ${scenario.level} level.
2. Keep turns short and conversational (1-2 sentences at a time) so the learner has ample space to speak and practice.
3. If the learner hesitates, stumbles, or uses English, be warm and patient. Encourage them and prompt them with easy vocabulary.
4. If they make minor errors, rephrase naturally in your response without making it feel like a reprimand.
5. Embody your role authentically and make it fun, lively, and immersive.`;

      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice || 'Zephyr' },
            },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (connectionTimeoutRef.current) {
              window.clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            sessionReadyRef.current = true;
            setIsConnected(true);
            setConnectionError(null);
            setShowApiKeyPrompt(false);
            if (isMicReadyRef.current) {
              setIsConnecting(false);
              isConnectingRef.current = false;
            }
          },
          onmessage: (serverMsg: any) => {
            const parts = serverMsg.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data && playerRef.current) {
                  playerRef.current.playChunk(part.inlineData.data);
                  setIsModelSpeaking(true);
                }
                if (part.text) {
                  currentModelTurnRef.current += part.text;
                  updateStreamingModelTurn(currentModelTurnRef.current);
                }
              }
            }
            if (serverMsg.serverContent?.inputAudioTranscription?.text) {
              appendUserTurn(serverMsg.serverContent.inputAudioTranscription.text);
            }
            if (serverMsg.serverContent?.outputAudioTranscription?.text) {
              currentModelTurnRef.current = serverMsg.serverContent.outputAudioTranscription.text;
              finalizeModelTurn(serverMsg.serverContent.outputAudioTranscription.text);
            }
            if (serverMsg.serverContent?.interrupted) {
              if (playerRef.current) playerRef.current.interrupt();
              setIsModelSpeaking(false);
            }
            if (serverMsg.serverContent?.turnComplete) {
              setIsModelSpeaking(false);
              if (currentModelTurnRef.current) {
                finalizeModelTurn(currentModelTurnRef.current);
                currentModelTurnRef.current = '';
              }
            }
          },
          onerror: (err: any) => {
            console.error('Direct Live API error:', err);
            if (connectionTimeoutRef.current) {
              window.clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            setConnectionError('Gemini Live API error: ' + (err?.message || 'Check your API key.'));
            setIsConnecting(false);
            setIsConnected(false);
            isConnectingRef.current = false;
          },
          onclose: () => {
            setIsConnected(false);
            sessionReadyRef.current = false;
          },
        },
      });

      liveSessionRef.current = session;
    } catch (directErr: any) {
      console.error('Failed to establish direct Live connection:', directErr);
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setConnectionError(
        directErr?.message ||
          'Connection to Live voice server failed. Please check your GEMINI_API_KEY.'
      );
      setIsConnecting(false);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, [scenario, selectedVoice]);

  const startSession = useCallback(async () => {
    // Avoid duplicate initialization requests
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    // Reset UI state
    setIsConnecting(true);
    setIsConnected(false);
    setConnectionError(null);
    sessionReadyRef.current = false;
    isMicReadyRef.current = false;

    // Clear any previous connection timeout
    if (connectionTimeoutRef.current) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Clean up previous connections
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
      } catch {
        // Ignore
      }
      liveSessionRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }

    // 12-second handshake timeout with auto-recovery and Retry
    connectionTimeoutRef.current = window.setTimeout(() => {
      if (!sessionReadyRef.current) {
        console.warn('Live voice connection timed out');
        cleanupAll();
        setIsConnecting(false);
        setIsConnected(false);
        isConnectingRef.current = false;
        setConnectionError('Connection timed out while establishing live voice session. Please check your network and retry.');
      }
    }, 12000);

    // 1. Pre-warm Audio Output Context (Instant zero-delay response playback)
    if (!playerRef.current) playerRef.current = new LiveAudioPlayer();
    try {
      playerRef.current.initContext();
    } catch (e) {
      console.warn('AudioContext pre-warm deferred:', e);
    }

    // 2. Concurrently initialize Microphone in parallel with network connection
    if (!recorderRef.current) recorderRef.current = new LiveAudioRecorder();
    recorderRef.current
      .start((base64Pcm) => {
        // Only stream chunks when session handshake is verified and mic is not muted
        if (sessionReadyRef.current && !isMutedRef.current) {
          if (liveSessionRef.current) {
            liveSessionRef.current.sendRealtimeInput({
              audio: {
                data: base64Pcm,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'audio',
                data: base64Pcm,
              })
            );
          }
        }
      })
      .then(() => {
        isMicReadyRef.current = true;

        // Start volume metering once mic is ready
        if (meterIntervalRef.current) window.clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = window.setInterval(() => {
          if (recorderRef.current) {
            const vol = recorderRef.current.getVolume();
            setUserVolume(vol);
            setIsUserSpeaking(vol > 0.08);
          }
          if (playerRef.current) {
            const mVol = playerRef.current.getVolume();
            setModelVolume(mVol);
            if (mVol > 0.05) {
              setIsModelSpeaking(true);
            }
          }
        }, 50);

        // If session was already marked ready, complete transition
        if (sessionReadyRef.current) {
          setIsConnecting(false);
          isConnectingRef.current = false;
        }
      })
      .catch((micErr) => {
        console.error('Microphone access denied or error:', micErr);
        setConnectionError(
          micErr?.message ||
            'Could not access your microphone. Please grant microphone permissions in your browser.'
        );
        setIsConnecting(false);
        isConnectingRef.current = false;
      });

    // 3. Establish Live Voice Connection
    // Detect environment: Vercel serverless has no persistent WebSocket server.
    const isVercel = window.location.hostname.endsWith('.vercel.app');
    const configuredBackend =
      (typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL) ||
      import.meta.env.VITE_BACKEND_URL ||
      '';

    // If running on Vercel and no external WebSocket backend is configured, connect directly via client Live API!
    if (isVercel && !configuredBackend) {
      await connectDirectLiveAPI();
      return;
    }

    // Otherwise (AI Studio, local dev, Docker, or external backend): attempt backend WebSocket proxy
    try {
      const wsUrl = configuredBackend
        ? `${configuredBackend.replace(/^http/, 'ws')}/live`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/live`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: 'init',
            targetLanguage: scenario.language,
            learnerLevel: scenario.level,
            scenario: `${scenario.title} (${scenario.partnerRole})`,
            voiceName: selectedVoice,
            scenarioDetails: `${scenario.description}. Starter context: ${scenario.starterGreeting}`,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'session_ready') {
            if (connectionTimeoutRef.current) {
              window.clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            sessionReadyRef.current = true;
            setIsConnected(true);

            // Only transition off "Connecting" when mic is also verified ready
            if (isMicReadyRef.current) {
              setIsConnecting(false);
              isConnectingRef.current = false;
            }
          } else if (msg.type === 'audio') {
            if (playerRef.current) {
              playerRef.current.playChunk(msg.audio);
              setIsModelSpeaking(true);
            }
          } else if (msg.type === 'model_text_chunk') {
            currentModelTurnRef.current += msg.text;
            updateStreamingModelTurn(currentModelTurnRef.current);
          } else if (msg.type === 'model_transcription') {
            currentModelTurnRef.current = msg.text;
            finalizeModelTurn(msg.text);
          } else if (msg.type === 'user_transcription') {
            appendUserTurn(msg.text);
          } else if (msg.type === 'interrupted') {
            if (playerRef.current) {
              playerRef.current.interrupt();
            }
            setIsModelSpeaking(false);
          } else if (msg.type === 'turn_complete') {
            setIsModelSpeaking(false);
            if (currentModelTurnRef.current) {
              finalizeModelTurn(currentModelTurnRef.current);
              currentModelTurnRef.current = '';
            }
          } else if (msg.type === 'error') {
            if (connectionTimeoutRef.current) {
              window.clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            setConnectionError(msg.message);
            setIsConnecting(false);
            isConnectingRef.current = false;
          }
        } catch (err) {
          console.error('Error parsing live WS message:', err);
        }
      };

      socket.onerror = async (err) => {
        console.warn('Backend WebSocket unavailable, attempting direct Live API fallback...', err);
        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch {
            // Ignore
          }
          wsRef.current = null;
        }
        // Seamless fallback to direct Live API!
        await connectDirectLiveAPI();
      };

      socket.onclose = () => {
        setIsConnected(false);
        sessionReadyRef.current = false;
      };
    } catch (wsErr: any) {
      console.warn('Failed to open live WebSocket, falling back to direct connection:', wsErr);
      await connectDirectLiveAPI();
    }
  }, [scenario, selectedVoice, connectDirectLiveAPI]);

  // Consolidated lifecycle controller (single mount and scenario/voice switch)
  useEffect(() => {
    startSession();
    return () => {
      cleanupAll();
    };
  }, [scenario.id, selectedVoice]);

  const updateStreamingModelTurn = (accumulatedText: string) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'model' && last.isStreaming) {
        return [...prev.slice(0, -1), { ...last, text: accumulatedText }];
      } else {
        return [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            text: accumulatedText,
            timestamp: Date.now(),
            isStreaming: true,
          },
        ];
      }
    });
  };

  const finalizeModelTurn = (finalText: string) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'model') {
        return [...prev.slice(0, -1), { ...last, text: finalText, isStreaming: false }];
      } else {
        return [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            text: finalText,
            timestamp: Date.now(),
            isStreaming: false,
          },
        ];
      }
    });
  };

  const appendUserTurn = (userText: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: userText,
        timestamp: Date.now(),
      },
    ]);
    checkObjectives(userText);
  };

  const checkObjectives = (spokenText: string) => {
    const lower = spokenText.toLowerCase();
    setObjectives((prev) =>
      prev.map((obj) => {
        if (obj.completed) return obj;
        const words = obj.title.toLowerCase().split(' ');
        const matches = words.some((w) => w.length > 3 && lower.includes(w));
        return matches ? { ...obj, completed: true } : obj;
      })
    );
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (playerRef.current) {
      playerRef.current.setMuted(nextMuted);
    }
    if (nextMuted) {
      if (liveSessionRef.current) {
        liveSessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
      }
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');
    appendUserTurn(msg);

    if (liveSessionRef.current) {
      liveSessionRef.current.sendRealtimeInput({ text: msg });
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: msg }));
    }
  };

  const handleEndSession = () => {
    cleanupAll();
    const completedIds = objectives.filter((o) => o.completed).map((o) => o.title);
    onEndSession(transcript, completedIds);
  };

  const completedCount = objectives.filter((o) => o.completed).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto p-3 sm:p-5 gap-4">
      {/* Top Scenario Banner & Session Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <span className="text-3xl p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
            {scenario.icon}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white text-base sm:text-lg">{scenario.title}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 uppercase">
                {scenario.level}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Partner: <span className="text-slate-200 font-medium">{scenario.partnerRole}</span> • You: <span className="text-slate-200 font-medium">{scenario.userRole}</span>
            </p>
          </div>
        </div>

        {/* Live Controls & Voice Persona */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {/* Voice Persona Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-500">Voice:</span>
            <select
              value={selectedVoice}
              onChange={(e) => onVoiceChange(e.target.value as LiveVoiceName)}
              className="bg-transparent text-indigo-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="Zephyr" className="bg-slate-900">Zephyr (Warm & Natural)</option>
              <option value="Puck" className="bg-slate-900">Puck (Lively & Friendly)</option>
              <option value="Charon" className="bg-slate-900">Charon (Deep & Polished)</option>
              <option value="Kore" className="bg-slate-900">Kore (Clear & Gentle)</option>
              <option value="Fenrir" className="bg-slate-900">Fenrir (Bold & Energetic)</option>
            </select>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-semibold text-[11px]">Live Voice Connected</span>
              </>
            ) : isConnecting ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-300 text-[11px]">Connecting...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="text-rose-400 text-[11px]">Disconnected</span>
              </>
            )}
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEndSession}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition shadow-lg shadow-rose-950/40 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">End Practice</span>
          </button>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3.5 flex flex-col gap-2 text-xs text-rose-200 animate-fadeIn">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{connectionError}</span>
            </div>
            <button
              onClick={() => {
                isConnectingRef.current = false;
                startSession();
              }}
              className="px-3.5 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-lg font-bold transition shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>

          {/* Inline Key Prompt if missing on Vercel */}
          {showApiKeyPrompt && (
            <div className="pt-2 border-t border-rose-800/60 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center space-x-1.5 text-slate-300 text-[11px] shrink-0">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Enter Gemini API Key:</span>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full"
              />
              <button
                onClick={() => {
                  if (customKeyInput.trim()) {
                    localStorage.setItem('lingualive_gemini_key', customKeyInput.trim());
                    setShowApiKeyPrompt(false);
                    isConnectingRef.current = false;
                    startSession();
                  }
                }}
                disabled={!customKeyInput.trim()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition shrink-0 cursor-pointer"
              >
                Save & Connect
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Left Visualizer & Mission Objectives, Right Live Transcript */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Visualizer, Objectives, Useful Phrases (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Audio Visualizer Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md shadow-lg">
            <AudioVisualizer
              isUserSpeaking={isUserSpeaking}
              isModelSpeaking={isModelSpeaking}
              isConnecting={isConnecting}
              isMuted={isMuted}
              userVolume={userVolume}
              modelVolume={modelVolume}
            />

            {/* Mic Action Bar */}
            <div className="flex items-center space-x-3 mt-4">
              <button
                onClick={handleToggleMute}
                className={`p-3.5 rounded-full font-bold transition-all shadow-xl flex items-center justify-center cursor-pointer ${
                  isMuted
                    ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-4 ring-indigo-500/20 shadow-indigo-600/30'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {scenario.starterGreeting && (
                <button
                  onClick={() => onPlayTTS(scenario.starterGreeting)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition cursor-pointer"
                  title="Replay starter greeting"
                >
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>Replay Greeting</span>
                </button>
              )}
            </div>
          </div>

          {/* Practice Missions Checklist */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Mission Objectives ({completedCount}/{objectives.length})
                </h3>
              </div>
              <span className="text-[10px] text-slate-500">Auto-detected as you speak</span>
            </div>

            <div className="space-y-2">
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    obj.completed
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    {obj.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-xs font-semibold">{obj.title}</h4>
                      <p className="text-[11px] text-slate-400">{obj.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Useful Quick Phrases */}
          {scenario.usefulPhrases && scenario.usefulPhrases.length > 0 && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md space-y-2.5 shadow-lg">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quick Phrase Bank</span>
              </div>
              <div className="space-y-1.5">
                {scenario.usefulPhrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-indigo-500/40 flex items-center justify-between text-xs transition group"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{phrase.text}</p>
                      <p className="text-[10px] text-slate-400">{phrase.translation}</p>
                    </div>
                    <button
                      onClick={() => onPlayTTS(phrase.text)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                      title="Listen"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Interactive Transcript (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-lg min-h-0">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Live Dialogue Transcript
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">
              Tap any phrase for instant grammar & vocabulary breakdown
            </span>
          </div>

          {/* Transcript Content */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <TranscriptView
              items={transcript}
              targetLanguage={scenario.language}
              onInspect={onInspectPhrase}
              onPlayTTS={onPlayTTS}
              onSavePhrase={(text, translation) => {
                onSaveToVault({
                  word: text,
                  translation: translation || text,
                  pronunciation: '',
                  exampleSentence: text,
                  exampleTranslation: translation || '',
                  language: scenario.language,
                });
              }}
            />
          </div>

          {/* Text message fallback bar */}
          <form
            onSubmit={handleSendText}
            className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center space-x-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type in target language..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
