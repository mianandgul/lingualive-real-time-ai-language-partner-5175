import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Scenario,
  TranscriptItem,
  LiveVoiceName,
  VocabularyItem,
  MistakeCorrection,
} from '../types';
import { LiveAudioPlayer, LiveAudioRecorder } from '../services/audioUtils';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptView } from './TranscriptView';
import {
  MicrophonePermissionGuard,
  MicrophoneErrorState,
} from './MicrophonePermissionGuard';
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
  MessageSquare,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../services/i18n';

export interface EndSessionPayload {
  sessionId: string;
  items: TranscriptItem[];
  completedObjectives: string[];
  durationSeconds: number;
  hasVoiceEvidence: boolean;
  voicedSeconds: number;
}

interface LiveVoiceRoomProps {
  scenario: Scenario;
  selectedVoice: LiveVoiceName;
  onVoiceChange: (voice: LiveVoiceName) => void;
  onVoiceCallStarted?: (sessionId: string) => void;
  onEndSession: (payload: EndSessionPayload) => void;
  onInspectPhrase: (phrase: string) => void;
  onSaveToVault: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onSaveCorrection: (correction: MistakeCorrection) => void;
  onPlayTTS: (text: string) => void;
  onSwitchToChat: (reason?: string) => void;
}

export const LiveVoiceRoom: React.FC<LiveVoiceRoomProps> = ({
  scenario,
  selectedVoice,
  onVoiceChange,
  onVoiceCallStarted,
  onEndSession,
  onInspectPhrase,
  onSaveToVault,
  onSaveCorrection,
  onPlayTTS,
  onSwitchToChat,
}) => {
  const { t, nativeLanguageName } = useI18n();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [userVolume, setUserVolume] = useState<number>(0);
  const [modelVolume, setModelVolume] = useState<number>(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [micError, setMicError] = useState<MicrophoneErrorState | null>(null);
  const [isRetryingMic, setIsRetryingMic] = useState<boolean>(false);
  const [isMicReady, setIsMicReady] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Transcript items
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const currentModelTurnRef = useRef<string>('');
  const currentUserTurnIdRef = useRef<string | null>(null);
  const currentUserTurnTextRef = useRef<string>('');
  const userTurnCheckTimerRef = useRef<number | null>(null);
  const checkedUserTurnsRef = useRef<Record<string, string>>({});
  const transcriptRef = useRef<TranscriptItem[]>([]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Objectives tracking
  const [objectives, setObjectives] = useState(scenario.objectives);
  const objectivesRef = useRef(scenario.objectives);
  useEffect(() => {
    objectivesRef.current = objectives;
  }, [objectives]);

  // Fallback text input
  const [textInput, setTextInput] = useState<string>('');

  // Audio utility instances & performance state tracking refs
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveAudioRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const liveSessionRef = useRef<any>(null);
  const meterIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const autoFallbackTimerRef = useRef<number | null>(null);
  const greetingSentRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isConnectingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(isMuted);
  const isConnectedRef = useRef<boolean>(false);
  const sessionReadyRef = useRef<boolean>(false);
  const isMicReadyRef = useRef<boolean>(false);
  const isMicSettledRef = useRef<boolean>(false);
  const voicedDurationMsRef = useRef<number>(0);
  const hasVoiceTurnRef = useRef<boolean>(false);
  const sessionIdRef = useRef<string>(`voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Instantiate audio utilities once on mount
  useEffect(() => {
    isMountedRef.current = true;
    if (!playerRef.current) playerRef.current = new LiveAudioPlayer();
    if (!recorderRef.current) recorderRef.current = new LiveAudioRecorder();

    return () => {
      isMountedRef.current = false;
      cleanupAll();
    };
  }, []);

  // Sync starter greeting to transcript when scenario changes
  useEffect(() => {
    sessionIdRef.current = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    voicedDurationMsRef.current = 0;
    hasVoiceTurnRef.current = false;
    currentModelTurnRef.current = '';
    currentUserTurnIdRef.current = null;
    currentUserTurnTextRef.current = '';
    checkedUserTurnsRef.current = {};
    setElapsedSeconds(0);

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
    } else {
      setTranscript([]);
    }
    setObjectives(scenario.objectives);
  }, [scenario.id, scenario.starterGreeting, scenario.starterTranslation, scenario.starterPhonetics, scenario.objectives]);

  // Session duration clock (runs only while connected)
  useEffect(() => {
    if (isConnected) {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isConnected]);

  const cleanupAll = useCallback(() => {
    if (userTurnCheckTimerRef.current) {
      window.clearTimeout(userTurnCheckTimerRef.current);
      userTurnCheckTimerRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (autoFallbackTimerRef.current) {
      window.clearTimeout(autoFallbackTimerRef.current);
      autoFallbackTimerRef.current = null;
    }
    if (meterIntervalRef.current) {
      window.clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    if (playerRef.current) {
      playerRef.current.close();
    }
    if (liveSessionRef.current) {
      const activeLive = liveSessionRef.current;
      liveSessionRef.current = null;
      try {
        activeLive.close();
      } catch {
        // Ignore
      }
    }
    if (wsRef.current) {
      const activeWs = wsRef.current;
      wsRef.current = null;
      try {
        activeWs.close();
      } catch {
        // Ignore
      }
    }
    sessionReadyRef.current = false;
    isMicReadyRef.current = false;
    isConnectingRef.current = false;
    greetingSentRef.current = false;
  }, []);

  // Quiet background smart mistake + multilingual objective detection (never interrupts live audio)
  const checkUtteranceMistakesQuietly = useCallback(
    async (turnId: string, text: string) => {
      const trimmed = text.trim();
      if (trimmed.split(/\s+/).length < 2) return;
      if (checkedUserTurnsRef.current[turnId] === trimmed) return;
      checkedUserTurnsRef.current[turnId] = trimmed;

      try {
        const res = await fetch('/api/check-mistakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utterance: trimmed,
            targetLanguage: scenario.language,
            nativeLanguage: nativeLanguageName,
            learnerLevel: scenario.level,
            context: scenario.title,
            objectives: objectivesRef.current,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.hasMistake && data?.correction) {
          setTranscript((prev) =>
            prev.map((item) =>
              item.id === turnId
                ? {
                    ...item,
                    correction: {
                      ...data.correction,
                      targetLanguage: scenario.language,
                    },
                  }
                : item
            )
          );
        }
        if (Array.isArray(data?.completedObjectives) && data.completedObjectives.length > 0) {
          const completedLower = data.completedObjectives.map((t: string) => t.toLowerCase());
          setObjectives((prev) =>
            prev.map((obj) =>
              obj.completed || completedLower.includes(obj.title.toLowerCase())
                ? { ...obj, completed: true }
                : obj
            )
          );
        }
      } catch {
        // Silent non-blocking check
      }
    },
    [scenario.language, scenario.level, scenario.title, nativeLanguageName]
  );

  const scheduleAutoFallbackToChat = useCallback(
    (reason: string) => {
      if (autoFallbackTimerRef.current) {
        window.clearTimeout(autoFallbackTimerRef.current);
      }
      autoFallbackTimerRef.current = window.setTimeout(() => {
        autoFallbackTimerRef.current = null;
        if (isMountedRef.current && !sessionReadyRef.current) {
          cleanupAll();
          onSwitchToChat(reason);
        }
      }, 1100);
    },
    [cleanupAll, onSwitchToChat]
  );

  const sendOpeningGreetingIfReady = useCallback(
    (sessionObj?: any, socketObj?: WebSocket) => {
      if (greetingSentRef.current) return;
      greetingSentRef.current = true;
      const kickoffPrompt = `[System: The learner just connected to the "${scenario.title}" voice call. Greet the learner immediately with one warm, natural opening line in ${scenario.language} in character as ${scenario.partnerRole} (${scenario.level} level).]`;

      try {
        if (sessionObj) {
          sessionObj.sendRealtimeInput({ text: kickoffPrompt });
        } else if (socketObj && socketObj.readyState === WebSocket.OPEN) {
          socketObj.send(JSON.stringify({ type: 'text', text: kickoffPrompt }));
        }
      } catch {
        // Ignore if session not ready for kickoff
      }
    },
    [scenario.language, scenario.level, scenario.partnerRole, scenario.title]
  );

  // Helper to establish direct client-side Gemini Live connection via ephemeral token
  const connectDirectLiveAPI = useCallback(async () => {
    let activeToken = '';
    let tokenErrorMessage = '';
    let isMissingKey = false;

    const requestTokenFromEndpoint = async (endpoint: string) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    };

    try {
      let { res, data } = await requestTokenFromEndpoint('/api/token');
      if (res.status === 404) {
        ({ res, data } = await requestTokenFromEndpoint('/api/live-token'));
      }

      if (res.ok && data?.token) {
        activeToken = data.token;
      } else {
        const rawErr = String(data?.error || data?.details || '');
        const lowerErr = rawErr.toLowerCase();
        isMissingKey =
          data?.errorCode === 'MISSING_API_KEY' ||
          res.status === 503 ||
          lowerErr.includes('api key') ||
          lowerErr.includes('api_key') ||
          lowerErr.includes('not configured') ||
          lowerErr.includes('unauthorized') ||
          lowerErr.includes('401') ||
          lowerErr.includes('403');

        tokenErrorMessage = isMissingKey
          ? 'Voice service not configured. Please check API Key in Vercel Settings'
          : rawErr || 'Could not establish a live voice token from the server.';
      }
    } catch (e: any) {
      console.warn('Could not fetch ephemeral token from /api/token:', e);
      tokenErrorMessage =
        e?.message || 'Unable to reach live voice token endpoint.';
    }

    if (!activeToken) {
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      const displayMessage = isMissingKey
        ? 'Voice service not configured. Please check API Key in Vercel Settings'
        : `${tokenErrorMessage} Switched automatically to Text Chat so you can continue practicing.`;
      setIsConnecting(false);
      setIsConnected(false);
      isConnectingRef.current = false;
      setConnectionError(displayMessage);
      scheduleAutoFallbackToChat(displayMessage);
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: activeToken,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const systemInstruction = `You are an authentic, engaging native language speaking partner for real-time conversation practice.
Target Language: ${scenario.language}
Learner Native Language: ${nativeLanguageName}
Learner Level: ${scenario.level}
Roleplay Scenario: ${scenario.title} (${scenario.partnerRole})
${scenario.aiPersonality ? `AI Character Personality: ${scenario.aiPersonality}` : ''}
${scenario.userRole ? `Learner's Role: ${scenario.userRole}` : ''}
Scenario Context: ${scenario.description}. Starter context: ${scenario.starterGreeting}

Key guidelines for voice conversation:
1. Speak in ${scenario.language}. Speak clearly and at an appropriate pace for ${scenario.level} level.
2. Keep turns short and conversational (1-2 sentences at a time) so the learner has ample space to speak and practice.
3. If the learner hesitates, stumbles, or uses ${nativeLanguageName}, be warm and patient. Encourage them and prompt them with easy vocabulary.
4. Do not interrupt or lecture the learner on every grammar mistake; if they make minor errors, rephrase naturally in your response so conversation flows naturally.
5. Embody your character, personality, and situation authentically and make it engaging.`;

      let sessionRefLocal: any = null;
      let setupReadyTimeout: number | null = null;
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
            if (autoFallbackTimerRef.current) {
              window.clearTimeout(autoFallbackTimerRef.current);
              autoFallbackTimerRef.current = null;
            }
            sessionReadyRef.current = true;
            setIsConnected(true);
            setConnectionError(null);
            onVoiceCallStarted?.(sessionIdRef.current);
            if (isMicSettledRef.current) {
              setIsConnecting(false);
              isConnectingRef.current = false;
            }
            setupReadyTimeout = window.setTimeout(() => {
              if (sessionRefLocal) {
                sendOpeningGreetingIfReady(sessionRefLocal);
              }
            }, 600);
          },
          onmessage: (serverMsg: any) => {
            if (serverMsg.setupComplete) {
              if (setupReadyTimeout) {
                window.clearTimeout(setupReadyTimeout);
                setupReadyTimeout = null;
              }
              if (sessionRefLocal || liveSessionRef.current) {
                sendOpeningGreetingIfReady(sessionRefLocal || liveSessionRef.current);
              }
            }
            const parts = serverMsg.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              finalizeActiveUserTurn();
              for (const part of parts) {
                if (part.inlineData?.data && playerRef.current) {
                  playerRef.current.playChunk(part.inlineData.data);
                  setIsModelSpeaking(true);
                }
                if (part.text) {
                  currentModelTurnRef.current = mergeTranscriptChunk(
                    currentModelTurnRef.current,
                    part.text
                  );
                  updateStreamingModelTurn(currentModelTurnRef.current);
                }
              }
            }
            const inputTranscriptText =
              serverMsg.serverContent?.inputTranscription?.text ||
              serverMsg.serverContent?.inputAudioTranscription?.text;
            if (inputTranscriptText) {
              hasVoiceTurnRef.current = true;
              appendStreamingUserChunk(inputTranscriptText);
            }
            const outputTranscriptText =
              serverMsg.serverContent?.outputTranscription?.text ||
              serverMsg.serverContent?.outputAudioTranscription?.text;
            if (outputTranscriptText) {
              finalizeActiveUserTurn();
              currentModelTurnRef.current = mergeTranscriptChunk(
                currentModelTurnRef.current,
                outputTranscriptText
              );
              updateStreamingModelTurn(currentModelTurnRef.current);
            }
            if (serverMsg.serverContent?.interrupted) {
              if (playerRef.current) playerRef.current.interrupt();
              setIsModelSpeaking(false);
            }
            if (serverMsg.serverContent?.turnComplete) {
              finalizeActiveUserTurn();
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
            const errMsg = String(err?.message || '');
            const lowerErr = errMsg.toLowerCase();
            const isKeyErr =
              lowerErr.includes('api key') ||
              lowerErr.includes('api_key') ||
              lowerErr.includes('unauthorized') ||
              lowerErr.includes('401') ||
              lowerErr.includes('403');
            const friendlyErr = isKeyErr
              ? 'Voice service not configured. Please check API Key in Vercel Settings'
              : `Live voice connection interrupted: ${errMsg || 'Switched to Text Chat mode.'}`;
            setConnectionError(friendlyErr);
            setIsConnecting(false);
            setIsConnected(false);
            sessionReadyRef.current = false;
            isConnectingRef.current = false;
            scheduleAutoFallbackToChat(friendlyErr);
          },
          onclose: () => {
            setIsConnected(false);
            sessionReadyRef.current = false;
          },
        },
      });

      sessionRefLocal = session;
      liveSessionRef.current = session;
      if (sessionReadyRef.current) {
        sendOpeningGreetingIfReady(session);
      }
    } catch (directErr: any) {
      console.error('Failed to establish direct Live connection:', directErr);
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      const errMsg = String(directErr?.message || '');
      const lowerErr = errMsg.toLowerCase();
      const isKeyErr =
        lowerErr.includes('api key') ||
        lowerErr.includes('api_key') ||
        lowerErr.includes('unauthorized') ||
        lowerErr.includes('401') ||
        lowerErr.includes('403');
      const friendlyErr = isKeyErr
        ? 'Voice service not configured. Please check API Key in Vercel Settings'
        : errMsg || 'Connection to Live voice server failed. Switched automatically to Text Chat.';
      setConnectionError(friendlyErr);
      setIsConnecting(false);
      setIsConnected(false);
      isConnectingRef.current = false;
      scheduleAutoFallbackToChat(friendlyErr);
    }
  }, [scenario, selectedVoice, scheduleAutoFallbackToChat, sendOpeningGreetingIfReady]);

  const requestMicrophoneCapture = useCallback(async (forcePrompt: boolean = false) => {
    if (!recorderRef.current) recorderRef.current = new LiveAudioRecorder();
    setIsRetryingMic(true);
    let acquiredStream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const unsupportedErr: any = new Error(
          'Microphone capture is not supported in this browser context.'
        );
        unsupportedErr.name = 'NotSupportedError';
        throw unsupportedErr;
      }

      if (!forcePrompt && navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (perm.state === 'denied') {
            isMicReadyRef.current = false;
            isMicSettledRef.current = true;
            setIsMicReady(false);
            setMicError({
              code: 'NotAllowedError',
              title: 'Microphone Permission Blocked (NotAllowedError)',
              detail:
                'Microphone access was denied or blocked in site settings. Update your browser/OS permission to Allow, then click "Reset Permission" or "Retry".',
              browserSteps:
                'Site Settings: Click the lock / tune icon in your browser address bar → Permissions → set Microphone to Allow (or Reset permission).',
              osSteps:
                'OS Settings: Windows (Privacy & Security → Microphone), macOS (System Settings → Privacy & Security → Microphone), or Android/iOS (App Settings → Browser → Microphone) → Allow.',
              permissionStatus: perm.state,
            });
            if (sessionReadyRef.current) {
              setIsConnecting(false);
              isConnectingRef.current = false;
            }
            return;
          }
          const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
          if (perm.state === 'prompt' && isEmbedded) {
            // In embedded frames without user gesture, defer getUserMedia to explicit mic button click
            isMicReadyRef.current = false;
            isMicSettledRef.current = true;
            setIsMicReady(false);
            if (sessionReadyRef.current) {
              setIsConnecting(false);
              isConnectingRef.current = false;
            }
            return;
          }
        } catch {
          // Proceed normally if Permissions API does not support 'microphone'
        }
      }

      if (!recorderRef.current.isReady()) {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      await recorderRef.current.start((base64Pcm) => {
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
      }, acquiredStream || undefined);

      isMicReadyRef.current = true;
      isMicSettledRef.current = true;
      setIsMicReady(true);
      setMicError(null);
      setIsMuted(false);

      if (meterIntervalRef.current) window.clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = window.setInterval(() => {
        if (recorderRef.current) {
          const vol = recorderRef.current.getVolume();
          setUserVolume(vol);
          const speaking = vol > 0.08;
          setIsUserSpeaking(speaking);
          if (isConnectedRef.current && !isMutedRef.current && vol > 0.06) {
            voicedDurationMsRef.current += 50;
          }
        }
        if (playerRef.current) {
          const mVol = playerRef.current.getVolume();
          setModelVolume(mVol);
          if (mVol > 0.05) {
            setIsModelSpeaking(true);
          }
        }
      }, 50);

      if (sessionReadyRef.current) {
        setIsConnecting(false);
        isConnectingRef.current = false;
      }
    } catch (micErr: any) {
      if (acquiredStream && !recorderRef.current.isReady()) {
        acquiredStream.getTracks().forEach((track) => track.stop());
      }

      isMicReadyRef.current = false;
      isMicSettledRef.current = true;
      setIsMicReady(false);

      const rawMsg = String(micErr?.message || '');
      const rawName = String(micErr?.name || '');
      const lower = `${rawName} ${rawMsg}`.toLowerCase();

      let permState: PermissionState | null = null;
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          permState = status.state;
        }
      } catch {
        // Ignore on browsers that do not support querying 'microphone' permission
      }

      const isNotAllowed =
        rawName === 'NotAllowedError' ||
        rawName === 'PermissionDeniedError' ||
        permState === 'denied' ||
        lower.includes('permission') ||
        lower.includes('notallowed') ||
        lower.includes('denied');

      const isNotFound =
        rawName === 'NotFoundError' ||
        rawName === 'DevicesNotFoundError' ||
        lower.includes('notfound') ||
        lower.includes('requested device not found');

      if (isNotAllowed) {
        setMicError({
          code: 'NotAllowedError',
          title: 'Microphone Permission Blocked (NotAllowedError)',
          detail:
            'Microphone access was denied or blocked in site settings. Update your browser/OS permission to Allow, then click "Reset Permission" or "Retry".',
          browserSteps:
            'Site Settings: Click the lock / tune icon in your browser address bar → Permissions → set Microphone to Allow (or Reset permission).',
          osSteps:
            'OS Settings: Windows (Privacy & Security → Microphone), macOS (System Settings → Privacy & Security → Microphone), or Android/iOS (App Settings → Browser → Microphone) → Allow.',
          permissionStatus: permState,
        });
      } else if (isNotFound) {
        setMicError({
          code: 'NotFoundError',
          title: 'No Microphone Detected (NotFoundError)',
          detail: 'No working audio input device was found on your device.',
          browserSteps:
            'Site Settings: Connect a headset or microphone, select it under browser audio input settings, then click Retry.',
          osSteps:
            'OS Settings: Confirm your microphone is connected and enabled under System Sound → Input.',
          permissionStatus: permState,
        });
      } else if (lower.includes('notreadable') || lower.includes('in use') || lower.includes('trackstart')) {
        setMicError({
          code: 'NotReadableError',
          title: 'Microphone Currently In Use',
          detail: 'Another application or browser tab is actively holding your microphone.',
          browserSteps: 'Close any other call tabs using the microphone, then click Retry.',
          osSteps: 'Ensure hardware or system mic mute switches are turned off.',
          permissionStatus: permState,
        });
      } else if (lower.includes('notsupported')) {
        setMicError({
          code: 'NotSupportedError',
          title: 'Microphone Restricted in Embedded Context',
          detail: 'This browser frame does not allow direct microphone capture.',
          browserSteps: 'Click "Open Direct Tab" to run over HTTPS directly, or switch to Chat Practice.',
          osSteps: 'You can also type directly in the live text input below to continue practicing.',
          permissionStatus: permState,
        });
      } else {
        setMicError({
          code: 'UnknownError',
          title: 'Microphone Unavailable',
          detail: rawMsg || 'Could not initialize microphone audio capture.',
          browserSteps:
            'Site Settings: Verify Microphone is set to Allow in browser site settings, then click Reset Permission or Retry.',
          osSteps:
            'OS Settings: Confirm your operating system permits microphone access for this browser.',
          permissionStatus: permState,
        });
      }

      if (sessionReadyRef.current) {
        setIsConnecting(false);
        isConnectingRef.current = false;
      }
    } finally {
      setIsRetryingMic(false);
    }
  }, []);

  const handleResetMicPermission = useCallback(async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    if (meterIntervalRef.current) {
      window.clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    isMicReadyRef.current = false;
    isMicSettledRef.current = false;
    setIsMicReady(false);
    setMicError(null);
    setIsMuted(false);
    await requestMicrophoneCapture(true);
  }, [requestMicrophoneCapture]);

  const startSession = useCallback(async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    setIsConnecting(true);
    setIsConnected(false);
    setConnectionError(null);
    setMicError(null);
    setIsMicReady(false);
    sessionReadyRef.current = false;
    isMicReadyRef.current = false;
    isMicSettledRef.current = false;
    greetingSentRef.current = false;

    if (connectionTimeoutRef.current) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (autoFallbackTimerRef.current) {
      window.clearTimeout(autoFallbackTimerRef.current);
      autoFallbackTimerRef.current = null;
    }

    if (liveSessionRef.current) {
      const prevLive = liveSessionRef.current;
      liveSessionRef.current = null;
      try {
        prevLive.close();
      } catch {
        // Ignore
      }
    }
    if (wsRef.current) {
      const prevWs = wsRef.current;
      wsRef.current = null;
      try {
        prevWs.close();
      } catch {
        // Ignore
      }
    }

    connectionTimeoutRef.current = window.setTimeout(() => {
      if (!sessionReadyRef.current) {
        console.warn('Live voice connection timed out');
        const timeoutMsg =
          'Voice connection timed out. Switched automatically to Text Chat mode so you can keep practicing.';
        cleanupAll();
        setIsConnecting(false);
        setIsConnected(false);
        isConnectingRef.current = false;
        setConnectionError(timeoutMsg);
        scheduleAutoFallbackToChat(timeoutMsg);
      }
    }, 15000);

    // 1. Pre-warm Audio Output Context
    if (!playerRef.current) playerRef.current = new LiveAudioPlayer();
    try {
      playerRef.current.initContext();
    } catch (e) {
      console.warn('AudioContext pre-warm deferred:', e);
    }

    // 2. Initialize Microphone in parallel (direct user-gesture retry also uses this exact helper)
    void requestMicrophoneCapture();

    // 3. Establish Live Voice Connection
    const isVercel = window.location.hostname.endsWith('.vercel.app');
    const configuredBackend =
      (typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL) ||
      import.meta.env.VITE_BACKEND_URL ||
      '';

    if (isVercel && !configuredBackend) {
      await connectDirectLiveAPI();
      return;
    }

    try {
      const wsUrl = configuredBackend
        ? `${configuredBackend.replace(/^http/, 'ws')}/live`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/live`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (wsRef.current !== socket) return;
        socket.send(
          JSON.stringify({
            type: 'init',
            targetLanguage: scenario.language,
            nativeLanguage: nativeLanguageName,
            learnerLevel: scenario.level,
            scenario: `${scenario.title} (${scenario.partnerRole})`,
            voiceName: selectedVoice,
            aiPersonality: scenario.aiPersonality || '',
            userRole: scenario.userRole || '',
            scenarioDetails: `${scenario.description}. Starter context: ${scenario.starterGreeting}`,
          })
        );
      };

      socket.onmessage = (event) => {
        if (wsRef.current !== socket) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'session_ready') {
            if (connectionTimeoutRef.current) {
              window.clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (autoFallbackTimerRef.current) {
              window.clearTimeout(autoFallbackTimerRef.current);
              autoFallbackTimerRef.current = null;
            }
            sessionReadyRef.current = true;
            setIsConnected(true);
            setConnectionError(null);
            onVoiceCallStarted?.(sessionIdRef.current);

            if (isMicSettledRef.current) {
              setIsConnecting(false);
              isConnectingRef.current = false;
            }
            sendOpeningGreetingIfReady(undefined, socket);
          } else if (msg.type === 'audio') {
            finalizeActiveUserTurn();
            if (playerRef.current) {
              playerRef.current.playChunk(msg.audio);
              setIsModelSpeaking(true);
            }
          } else if (msg.type === 'model_text_chunk') {
            finalizeActiveUserTurn();
            currentModelTurnRef.current = mergeTranscriptChunk(
              currentModelTurnRef.current,
              msg.text
            );
            updateStreamingModelTurn(currentModelTurnRef.current);
          } else if (msg.type === 'model_transcription') {
            finalizeActiveUserTurn();
            currentModelTurnRef.current = mergeTranscriptChunk(
              currentModelTurnRef.current,
              msg.text
            );
            updateStreamingModelTurn(currentModelTurnRef.current);
          } else if (msg.type === 'user_transcription') {
            hasVoiceTurnRef.current = true;
            appendStreamingUserChunk(msg.text);
          } else if (msg.type === 'interrupted') {
            if (playerRef.current) {
              playerRef.current.interrupt();
            }
            setIsModelSpeaking(false);
          } else if (msg.type === 'turn_complete') {
            finalizeActiveUserTurn();
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
            const errMsg =
              msg.errorCode === 'MISSING_API_KEY'
                ? 'Voice service not configured. Please check API Key in Vercel Settings'
                : msg.message || 'Voice connection error occurred.';
            setConnectionError(errMsg);
            setIsConnecting(false);
            setIsConnected(false);
            sessionReadyRef.current = false;
            isConnectingRef.current = false;
            scheduleAutoFallbackToChat(errMsg);
          }
        } catch (err) {
          console.error('Error parsing live WS message:', err);
        }
      };

      socket.onerror = async (err) => {
        if (wsRef.current !== socket) return;
        console.warn('Backend WebSocket unavailable, attempting direct Live API fallback...', err);
        wsRef.current = null;
        try {
          socket.close();
        } catch {
          // Ignore
        }
        await connectDirectLiveAPI();
      };

      socket.onclose = () => {
        if (wsRef.current !== socket) return;
        wsRef.current = null;
        setIsConnected(false);
        sessionReadyRef.current = false;
      };
    } catch (wsErr: any) {
      console.warn('Failed to open live WebSocket, falling back to direct connection:', wsErr);
      await connectDirectLiveAPI();
    }
  }, [
    scenario,
    selectedVoice,
    connectDirectLiveAPI,
    cleanupAll,
    requestMicrophoneCapture,
    scheduleAutoFallbackToChat,
    sendOpeningGreetingIfReady,
  ]);

  useEffect(() => {
    startSession();
    return () => {
      cleanupAll();
    };
  }, [scenario.id, selectedVoice]);

  const mergeTranscriptChunk = (existing: string, incoming: string): string => {
    const cleanIncoming = incoming;
    if (!existing) return cleanIncoming.trimStart();
    if (cleanIncoming.startsWith(existing)) return cleanIncoming;
    const needsSpace =
      !/\s$/.test(existing) &&
      !/^[\s.,!?;:'")\]}]/.test(cleanIncoming) &&
      !/^['’]/.test(cleanIncoming);
    return `${existing}${needsSpace ? ' ' : ''}${cleanIncoming}`.trimStart();
  };

  const finalizeActiveUserTurn = () => {
    if (userTurnCheckTimerRef.current) {
      window.clearTimeout(userTurnCheckTimerRef.current);
      userTurnCheckTimerRef.current = null;
    }
    const turnId = currentUserTurnIdRef.current;
    const finalText = currentUserTurnTextRef.current.trim();
    if (!turnId || !finalText) return;

    currentUserTurnIdRef.current = null;
    currentUserTurnTextRef.current = '';

    setTranscript((prev) =>
      prev.map((item) => (item.id === turnId ? { ...item, text: finalText, isStreaming: false } : item))
    );
    checkObjectives(finalText);
    checkUtteranceMistakesQuietly(turnId, finalText);
  };

  const appendStreamingUserChunk = (chunk: string) => {
    if (!chunk || !chunk.trim()) return;
    if (!currentUserTurnIdRef.current) {
      const turnId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      currentUserTurnIdRef.current = turnId;
      currentUserTurnTextRef.current = chunk.trimStart();
      setTranscript((prev) => [
        ...prev,
        {
          id: turnId,
          role: 'user',
          text: currentUserTurnTextRef.current,
          timestamp: Date.now(),
          isStreaming: true,
        },
      ]);
    } else {
      const turnId = currentUserTurnIdRef.current;
      const merged = mergeTranscriptChunk(currentUserTurnTextRef.current, chunk);
      currentUserTurnTextRef.current = merged;
      setTranscript((prev) =>
        prev.map((item) => (item.id === turnId ? { ...item, text: merged, isStreaming: true } : item))
      );
    }

    if (userTurnCheckTimerRef.current) {
      window.clearTimeout(userTurnCheckTimerRef.current);
    }
    userTurnCheckTimerRef.current = window.setTimeout(() => {
      finalizeActiveUserTurn();
    }, 1200);
  };

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

  const appendUserTurn = (userText: string, checkMistakes: boolean) => {
    finalizeActiveUserTurn();
    const turnId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setTranscript((prev) => [
      ...prev,
      {
        id: turnId,
        role: 'user',
        text: userText,
        timestamp: Date.now(),
      },
    ]);
    checkObjectives(userText);
    if (checkMistakes) {
      checkUtteranceMistakesQuietly(turnId, userText);
    }
  };

  const checkObjectives = (spokenText: string) => {
    const lower = spokenText.toLowerCase();
    setObjectives((prev) =>
      prev.map((obj) => {
        if (obj.completed) return obj;
        const words = `${obj.title} ${obj.description}`.toLowerCase().split(/\W+/);
        const matches = words.some((w) => w.length > 3 && lower.includes(w));
        return matches ? { ...obj, completed: true } : obj;
      })
    );
  };

  const handleToggleMute = async () => {
    if (!isMicReady) {
      await requestMicrophoneCapture(true);
      return;
    }
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
    appendUserTurn(msg, true);

    if (liveSessionRef.current) {
      liveSessionRef.current.sendRealtimeInput({ text: msg });
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: msg }));
    }
  };

  const handleEndSession = () => {
    const finalTranscript = transcriptRef.current;
    const completedIds = objectives.filter((o) => o.completed).map((o) => o.title);
    const voicedSeconds = Math.round(voicedDurationMsRef.current / 1000);
    const hasVoiceEvidence =
      hasVoiceTurnRef.current && isMicReadyRef.current && voicedSeconds >= 3;

    cleanupAll();
    onEndSession({
      sessionId: sessionIdRef.current,
      items: finalTranscript,
      completedObjectives: completedIds,
      durationSeconds: elapsedSeconds,
      hasVoiceEvidence,
      voicedSeconds,
    });
  };

  const completedCount = objectives.filter((o) => o.completed).length;
  const formattedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(
    elapsedSeconds % 60
  ).padStart(2, '0')}`;

  return (
    <div className="flex flex-col min-h-[calc(100vh-5.5rem)] lg:h-[calc(100vh-4.5rem)] max-w-7xl w-full mx-auto p-2.5 sm:p-5 gap-3 sm:gap-4">
      {/* Top Scenario Banner & Session Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center space-x-3 w-full md:w-auto min-w-0">
          <span className="text-2xl sm:text-3xl p-2 sm:p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner shrink-0">
            {scenario.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <h2 className="font-bold text-white text-sm sm:text-lg truncate max-w-full">
                {scenario.title}
              </h2>
              <span className="text-xs font-semibold text-indigo-300">
                · {scenario.language} · {scenario.level}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Partner: <span className="text-slate-200 font-medium">{scenario.partnerRole}</span>
              {scenario.aiPersonality ? ` (${scenario.aiPersonality})` : ''} · You:{' '}
              <span className="text-slate-200 font-medium">{scenario.userRole}</span>
            </p>
          </div>
        </div>

        {/* Live Controls & Voice Persona */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-between sm:justify-end">
          {/* Live Duration Timer */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono tabular-nums text-slate-300 shrink-0"
            title="Active session duration"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formattedTime}</span>
          </div>

          {/* Voice Persona Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs text-slate-300 max-w-full">
            <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-500 hidden sm:inline">Voice:</span>
            <select
              value={selectedVoice}
              onChange={(e) => onVoiceChange(e.target.value as LiveVoiceName)}
              aria-label="Select AI voice persona"
              className="bg-transparent text-indigo-300 font-semibold focus:outline-none cursor-pointer max-w-[140px] sm:max-w-none truncate"
            >
              <option value="Zephyr" className="bg-slate-900">Zephyr (Warm & Natural)</option>
              <option value="Puck" className="bg-slate-900">Puck (Lively & Friendly)</option>
              <option value="Charon" className="bg-slate-900">Charon (Deep & Polished)</option>
              <option value="Kore" className="bg-slate-900">Kore (Clear & Gentle)</option>
              <option value="Fenrir" className="bg-slate-900">Fenrir (Bold & Energetic)</option>
            </select>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs shrink-0">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-semibold text-[11px]">{t('voiceConnected')}</span>
              </>
            ) : isConnecting ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-300 text-[11px]">{t('voiceConnecting')}</span>
              </>
            ) : (
              <button
                onClick={() => {
                  isConnectingRef.current = false;
                  startSession();
                }}
                className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 font-semibold text-[11px] cursor-pointer"
                title={t('voiceDisconnectedReconnect')}
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('voiceDisconnectedReconnect')}</span>
              </button>
            )}
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEndSession}
            className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition shadow-lg shadow-rose-950/40 cursor-pointer whitespace-nowrap shrink-0"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{t('endAndReport')}</span>
          </button>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div
          role="alert"
          className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200 animate-fadeIn"
        >
          <div className="flex items-start space-x-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="break-words">{connectionError}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onSwitchToChat(connectionError)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('useTextChat')}</span>
            </button>
            <button
              onClick={() => {
                isConnectingRef.current = false;
                startSession();
              }}
              className="px-3.5 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-lg font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('retryBtn')}</span>
            </button>
          </div>
        </div>
      )}

      {/* MicrophonePermissionGuard wrapping the Start Call / Live Voice UI */}
      <MicrophonePermissionGuard
        micError={micError}
        isRetrying={isRetryingMic}
        onRetry={() => requestMicrophoneCapture(true)}
        onResetPermissionState={handleResetMicPermission}
        onSwitchToChat={() => onSwitchToChat()}
      >
        {/* Main Grid: Left Visualizer & Mission Objectives, Right Live Transcript */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Visualizer, Objectives, Useful Phrases (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 lg:overflow-y-auto lg:pr-1">
          {/* Audio Visualizer Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md shadow-lg">
            <AudioVisualizer
              isUserSpeaking={isUserSpeaking}
              isModelSpeaking={isModelSpeaking}
              isConnecting={isConnecting}
              isMuted={isMuted || !isMicReady}
              userVolume={userVolume}
              modelVolume={modelVolume}
            />

            {/* Mic Action Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              <button
                onClick={handleToggleMute}
                className={`px-4 py-3 rounded-full font-bold transition-all shadow-xl flex items-center justify-center gap-2 text-xs cursor-pointer ${
                  !isMicReady
                    ? 'bg-amber-600 hover:bg-amber-500 text-white ring-4 ring-amber-500/20'
                    : isMuted
                    ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-4 ring-indigo-500/20 shadow-indigo-600/30'
                }`}
                title={!isMicReady ? t('enableMic') : isMuted ? t('unmuteMic') : t('muteMic')}
              >
                {!isMicReady || isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {!isMicReady && <span>{t('enableMic')}</span>}
              </button>

              {scenario.starterGreeting && (
                <button
                  onClick={() => onPlayTTS(scenario.starterGreeting)}
                  className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition cursor-pointer"
                  title={t('replayGreeting')}
                >
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>{t('replayGreeting')}</span>
                </button>
              )}
            </div>

            {/* Voice Privacy Notice */}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-emerald-300/90 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t('voicePrivacyNotice')}</span>
            </p>
          </div>

          {/* Practice Missions Checklist */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 tabular-nums">
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
        <div className="lg:col-span-7 flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-lg min-h-[380px] lg:min-h-0">
          <div className="p-3 sm:p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 truncate">
                {t('liveTranscriptHeader')}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {t('tapToInspect')}
            </span>
          </div>

          {/* Transcript Content */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 min-h-0">
            <TranscriptView
              items={transcript}
              targetLanguage={scenario.language}
              onInspect={onInspectPhrase}
              onPlayTTS={onPlayTTS}
              onSaveCorrection={onSaveCorrection}
              onSavePhrase={(text, translation) => {
                onSaveToVault({
                  word: text,
                  translation: translation || text,
                  pronunciation: '',
                  exampleSentence: text,
                  exampleTranslation: translation || '',
                  language: scenario.language,
                  type: text.trim().split(/\s+/).length > 2 ? 'phrase' : 'word',
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
              placeholder={t('typePlaceholder', { lang: scenario.language })}
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
      </MicrophonePermissionGuard>
    </div>
  );
};
