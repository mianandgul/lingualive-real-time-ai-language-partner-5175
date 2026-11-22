import React, { useState, useRef } from 'react';
import { MistakeCorrection, Scenario, TranscriptItem, VocabularyItem } from '../types';
import { TranscriptView } from './TranscriptView';
import { Send, Sparkles, FileBarChart2, AlertTriangle, X, Info } from 'lucide-react';
import { EndSessionPayload } from './LiveVoiceRoom';
import { useI18n } from '../services/i18n';

interface ChatPracticeViewProps {
  scenario: Scenario;
  transcript: TranscriptItem[];
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  chatError?: string | null;
  onDismissChatError?: () => void;
  fallbackNotice?: string | null;
  onDismissFallbackNotice?: () => void;
  onPlayTTS: (text: string) => void;
  onInspectPhrase: (phrase: string) => void;
  onSaveToVault: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onSaveCorrection: (correction: MistakeCorrection) => void;
  onSwitchToLiveVoice: () => void;
  onEndChatSession: (payload: EndSessionPayload) => void;
  completedObjectives?: string[];
  suggestedReplies?: { text: string; translation: string }[];
}

export const ChatPracticeView: React.FC<ChatPracticeViewProps> = ({
  scenario,
  transcript,
  onSendMessage,
  isSending,
  chatError,
  onDismissChatError,
  fallbackNotice,
  onDismissFallbackNotice,
  onPlayTTS,
  onInspectPhrase,
  onSaveToVault,
  onSaveCorrection,
  onSwitchToLiveVoice,
  onEndChatSession,
  completedObjectives = [],
  suggestedReplies = [],
}) => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const sessionStartRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(`chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const msg = inputText.trim();
    setInputText('');
    await onSendMessage(msg);
  };

  const handleSelectSuggestion = async (phrase: string) => {
    if (isSending) return;
    await onSendMessage(phrase);
  };

  const handleCompleteChatReport = () => {
    const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));
    onEndChatSession({
      sessionId: sessionIdRef.current,
      items: transcript,
      completedObjectives,
      durationSeconds,
      hasVoiceEvidence: false,
      voicedSeconds: 0,
    });
    sessionIdRef.current = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    sessionStartRef.current = Date.now();
  };

  const hasUserTurns = transcript.some((t) => t.role === 'user');

  return (
    <div className="flex flex-col min-h-[calc(100vh-5.5rem)] lg:h-[calc(100vh-4.5rem)] max-w-6xl w-full mx-auto p-2.5 sm:p-5 gap-3 sm:gap-4">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center space-x-3 min-w-0 w-full sm:w-auto">
          <span className="text-2xl sm:text-3xl p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
            {scenario.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <h2 className="font-bold text-white text-sm sm:text-base truncate max-w-full">
                {scenario.title}
              </h2>
              <span className="text-xs font-semibold text-indigo-300">
                · {scenario.language} · {scenario.level}
              </span>
              {scenario.objectives.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-300 tabular-nums">
                  · Missions {completedObjectives.length}/{scenario.objectives.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              Interactive Practice with <span className="text-slate-200">{scenario.partnerRole}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {hasUserTurns && (
            <button
              onClick={handleCompleteChatReport}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer whitespace-nowrap"
            >
              <FileBarChart2 className="w-4 h-4 text-emerald-400" />
              <span>{t('finishAndReport')}</span>
            </button>
          )}
          <button
            onClick={onSwitchToLiveVoice}
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('switchToLiveVoice')}</span>
          </button>
        </div>
      </div>

      {/* Auto-Fallback Notice */}
      {fallbackNotice && (
        <div
          role="status"
          className="bg-amber-950/45 border border-amber-700/60 rounded-xl px-3.5 py-2.5 flex items-start justify-between gap-2.5 text-xs text-amber-200 animate-fadeIn"
        >
          <div className="flex items-start gap-2 min-w-0">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="break-words">{fallbackNotice}</span>
          </div>
          {onDismissFallbackNotice && (
            <button
              type="button"
              onClick={onDismissFallbackNotice}
              className="p-1 text-amber-300 hover:text-white cursor-pointer shrink-0"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Chat Error Banner */}
      {chatError && (
        <div
          role="alert"
          className="bg-rose-950/50 border border-rose-800/70 rounded-xl px-3.5 py-2.5 flex items-start justify-between gap-2.5 text-xs text-rose-200 animate-fadeIn"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="break-words">{chatError}</span>
          </div>
          {onDismissChatError && (
            <button
              type="button"
              onClick={onDismissChatError}
              className="p-1 text-rose-300 hover:text-white cursor-pointer shrink-0"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Transcript Body */}
      <div className="flex-1 min-h-[340px] lg:min-h-0">
        <TranscriptView
          items={transcript}
          targetLanguage={scenario.language}
          onPlayTTS={onPlayTTS}
          onInspect={onInspectPhrase}
          onSaveCorrection={onSaveCorrection}
          onSavePhrase={(text, translation) =>
            onSaveToVault({
              word: text,
              translation: translation || '',
              exampleSentence: text,
              exampleTranslation: translation,
              language: scenario.language,
              type: text.trim().split(/\s+/).length > 2 ? 'phrase' : 'word',
            })
          }
        />
      </div>

      {/* Suggested Next Turns / Helper Buttons */}
      {suggestedReplies.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] shrink-0 font-medium">{t('suggestionsLabel')}</span>
          {suggestedReplies.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(sug.text)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600/40 border border-slate-700/60 text-slate-200 hover:text-white transition shrink-0 text-left cursor-pointer"
            >
              <span className="font-semibold">{sug.text}</span>
              <span className="text-[10px] text-slate-400 ml-1.5 italic">({sug.translation})</span>
            </button>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-xl"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('typePlaceholder', { lang: scenario.language })}
          disabled={isSending}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          aria-label="Send message"
          className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-md cursor-pointer shrink-0"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};
