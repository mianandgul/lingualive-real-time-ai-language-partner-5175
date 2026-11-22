import React, { useEffect, useRef, useState } from 'react';
import { MistakeCorrection, TranscriptItem } from '../types';
import {
  Volume2,
  Sparkles,
  Languages,
  Lightbulb,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react';
import { useI18n } from '../services/i18n';

interface TranscriptViewProps {
  items: TranscriptItem[];
  targetLanguage: string;
  onPlayTTS: (text: string) => void;
  onInspect: (phrase: string) => void;
  onSavePhrase?: (text: string, translation?: string) => void;
  onSaveCorrection?: (correction: MistakeCorrection) => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  items,
  targetLanguage,
  onPlayTTS,
  onInspect,
  onSavePhrase,
  onSaveCorrection,
}) => {
  const { t, formatTime } = useI18n();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [showPhonetics, setShowPhonetics] = useState<boolean>(true);
  const [expandedCorrections, setExpandedCorrections] = useState<Record<string, boolean>>({});
  const [savedCorrectionIds, setSavedCorrectionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  const toggleCorrection = (itemId: string) => {
    setExpandedCorrections((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Transcript Toolbar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-slate-300 truncate">{t('liveTranscriptHeader')}</span>
          <span className="text-[11px] text-indigo-300 font-medium shrink-0">
            · {targetLanguage}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              showTranslations
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{t('translationsBtn')}</span>
          </button>
          <button
            onClick={() => setShowPhonetics(!showPhonetics)}
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              showPhonetics
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t('phoneticsBtn')}</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Languages className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">The dialogue has not started yet.</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Speak into your microphone or send a message to start conversing with your AI partner in {targetLanguage}.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isUser = item.role === 'user';
            const isExpanded = Boolean(expandedCorrections[item.id]);
            const corr = item.correction;

            return (
              <div
                key={item.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                {/* Speaker Label */}
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 px-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isUser ? 'bg-cyan-400' : 'bg-purple-400'}`} />
                  <span className="font-semibold text-slate-300">
                    {isUser ? 'You' : 'AI Partner (Live)'}
                  </span>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[92%] sm:max-w-[78%] rounded-2xl p-3 sm:p-3.5 transition-all shadow-md break-words ${
                    isUser
                      ? 'bg-gradient-to-br from-cyan-950/70 to-blue-900/60 border border-cyan-700/50 text-cyan-50'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100'
                  }`}
                >
                  {/* Target Language Speech */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm sm:text-base font-medium leading-relaxed tracking-wide break-words">
                      {item.text}
                      {item.isStreaming && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-purple-400 animate-pulse align-middle" />
                      )}
                    </p>
                  </div>

                  {/* Phonetics Pronunciation hint */}
                  {showPhonetics && item.phonetics && (
                    <p className="text-xs font-mono text-cyan-400/90 mt-1">
                      /{item.phonetics}/
                    </p>
                  )}

                  {/* English Translation */}
                  {showTranslations && item.translation && (
                    <p className="text-xs text-slate-300/80 mt-1.5 pt-1.5 border-t border-slate-700/50 italic">
                      "{item.translation}"
                    </p>
                  )}

                  {/* Interactive Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-700/40 text-xs">
                    <button
                      onClick={() => onPlayTTS(item.text)}
                      title={t('listenBtn')}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/60 hover:bg-indigo-600 text-slate-300 hover:text-white transition text-[11px] cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{t('listenBtn')}</span>
                    </button>

                    <button
                      onClick={() => onInspect(item.text)}
                      title={t('inspectBtn')}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/60 hover:bg-cyan-600 text-slate-300 hover:text-white transition text-[11px] cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('inspectBtn')}</span>
                    </button>

                    {onSavePhrase && (
                      <button
                        onClick={() => onSavePhrase(item.text, item.translation)}
                        title={t('saveBtn')}
                        className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/60 hover:bg-emerald-600 text-slate-300 hover:text-white transition text-[11px] cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{t('saveBtn')}</span>
                      </button>
                    )}

                    {corr && (
                      <button
                        onClick={() => toggleCorrection(item.id)}
                        className="flex items-center space-x-1 px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition text-[11px] cursor-pointer ml-auto"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>{t('suggestionBtn')}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Smart Mistake Correction (non-intrusive during live speech) */}
                {corr && isExpanded && (
                  <div className="max-w-[88%] sm:max-w-[78%] p-3.5 rounded-xl bg-slate-900/95 border border-amber-700/50 text-xs space-y-2 shadow-lg animate-fadeIn">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-amber-300">
                        {corr.errorType} Tip · Natural Suggestion
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onPlayTTS(corr.corrected)}
                          className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Listen to corrected sentence"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        {onSaveCorrection && (
                          <button
                            onClick={() => {
                              onSaveCorrection({ ...corr, targetLanguage });
                              setSavedCorrectionIds((prev) => ({ ...prev, [corr.id]: true }));
                            }}
                            disabled={savedCorrectionIds[corr.id]}
                            className="flex items-center space-x-1 px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 disabled:bg-emerald-700 text-white font-semibold text-[11px] transition cursor-pointer"
                          >
                            {savedCorrectionIds[corr.id] ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3 h-3" />
                                <span>Save Fix</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-emerald-300 font-semibold">{corr.corrected}</p>
                      {corr.intendedMeaning && (
                        <p className="text-slate-400 italic">Intended: "{corr.intendedMeaning}"</p>
                      )}
                      <p className="text-slate-300 leading-relaxed">{corr.explanation}</p>
                      {corr.additionalExample && (
                        <p className="text-indigo-300/90 pt-1 border-t border-slate-800">
                          Example: "{corr.additionalExample}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Grammar Feedback Callout */}
                {item.grammarFeedback && (
                  <div className="max-w-[88%] sm:max-w-[78%] p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-amber-300">Coaching Note:</span>
                      <p className="leading-relaxed text-amber-100/90">{item.grammarFeedback}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
