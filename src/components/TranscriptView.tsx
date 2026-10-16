import React, { useEffect, useRef, useState } from 'react';
import { TranscriptItem } from '../types';
import { Volume2, Sparkles, Languages, Lightbulb, Bookmark } from 'lucide-react';

interface TranscriptViewProps {
  items: TranscriptItem[];
  targetLanguage: string;
  onPlayTTS: (text: string) => void;
  onInspect: (phrase: string) => void;
  onSavePhrase?: (text: string, translation?: string) => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  items,
  targetLanguage,
  onPlayTTS,
  onInspect,
  onSavePhrase,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [showPhonetics, setShowPhonetics] = useState<boolean>(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Transcript Toolbar */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300">Live Transcript & Dialogue</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
            {targetLanguage}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              showTranslations
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Translations</span>
          </button>
          <button
            onClick={() => setShowPhonetics(!showPhonetics)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              showPhonetics
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Phonetics</span>
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
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[88%] sm:max-w-[78%] rounded-2xl p-3.5 transition-all shadow-md ${
                    isUser
                      ? 'bg-gradient-to-br from-cyan-950/70 to-blue-900/60 border border-cyan-700/50 text-cyan-50'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100'
                  }`}
                >
                  {/* Target Language Speech */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm sm:text-base font-medium leading-relaxed tracking-wide">
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
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-700/40 text-xs">
                    <button
                      onClick={() => onPlayTTS(item.text)}
                      title="Listen to native audio"
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/60 hover:bg-indigo-600 text-slate-300 hover:text-white transition text-[11px]"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>

                    <button
                      onClick={() => onInspect(item.text)}
                      title="Inspect grammar, tokens & meaning"
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/60 hover:bg-cyan-600 text-slate-300 hover:text-white transition text-[11px]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>

                    {onSavePhrase && (
                      <button
                        onClick={() => onSavePhrase(item.text, item.translation)}
                        title="Save to flashcards"
                        className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/60 hover:bg-emerald-600 text-slate-300 hover:text-white transition text-[11px]"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    )}
                  </div>
                </div>

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
