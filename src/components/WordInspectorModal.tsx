import React, { useState, useEffect } from 'react';
import { WordInspection, VocabularyItem } from '../types';
import { Volume2, Bookmark, Check, X, Sparkles, BookOpen, Globe2, Compass } from 'lucide-react';

interface WordInspectorModalProps {
  phrase: string;
  targetLanguage: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveToVault: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onPlayTTS: (text: string) => void;
}

export const WordInspectorModal: React.FC<WordInspectorModalProps> = ({
  phrase,
  targetLanguage,
  isOpen,
  onClose,
  onSaveToVault,
  onPlayTTS,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<WordInspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTokens, setSavedTokens] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !phrase) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase, targetLanguage }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to analyze phrase');
        return res.json();
      })
      .then((resData) => {
        if (isMounted) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Inspection error');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, phrase, targetLanguage]);

  if (!isOpen) return null;

  const handleSaveWholePhrase = () => {
    if (!data) return;
    onSaveToVault({
      word: phrase,
      translation: data.translation,
      pronunciation: data.pronunciation,
      exampleSentence: phrase,
      exampleTranslation: data.translation,
      language: targetLanguage,
    });
    setSavedTokens((prev) => ({ ...prev, [phrase]: true }));
  };

  const handleSaveToken = (token: any) => {
    onSaveToVault({
      word: token.word,
      translation: token.meaning,
      pronunciation: '',
      exampleSentence: phrase,
      exampleTranslation: data?.translation || '',
      language: targetLanguage,
    });
    setSavedTokens((prev) => ({ ...prev, [token.word]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Deep Word & Grammar Inspector</h3>
              <p className="text-xs text-slate-400">Target Language: {targetLanguage}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Main Phrase Card */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Selected Phrase</span>
                <p className="text-xl font-bold text-white tracking-wide">{phrase}</p>
                {data?.pronunciation && (
                  <p className="text-xs font-mono text-cyan-300">/{data.pronunciation}/</p>
                )}
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => onPlayTTS(phrase)}
                  title="Listen to native pronunciation"
                  className="p-2 rounded-lg bg-slate-700/70 hover:bg-indigo-600 text-slate-200 transition"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveWholePhrase}
                  disabled={savedTokens[phrase]}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:bg-emerald-600"
                >
                  {savedTokens[phrase] ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Phrase</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-4 flex items-center space-x-2 text-slate-400 text-xs">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Analyzing grammar structure & vocabulary...</span>
              </div>
            ) : error ? (
              <p className="text-xs text-rose-400">{error}</p>
            ) : (
              <div className="pt-2 border-t border-slate-700/50">
                <span className="text-xs font-medium text-slate-400">English Translation:</span>
                <p className="text-sm font-medium text-emerald-300 mt-0.5">{data?.translation}</p>
              </div>
            )}
          </div>

          {/* Token Breakdown */}
          {data && data.tokens && data.tokens.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Word-by-Word Breakdown
                </span>
                <span className="text-[11px] text-slate-500">Tap + to add individual words</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.tokens.map((token, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between hover:border-slate-600 transition"
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="font-semibold text-slate-100 text-sm">{token.word}</span>
                        {token.lemma && token.lemma !== token.word && (
                          <span className="text-[10px] text-slate-400">({token.lemma})</span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-400 truncate">{token.meaning}</p>
                      <span className="inline-block mt-0.5 text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                        {token.partOfSpeech}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSaveToken(token)}
                      disabled={savedTokens[token.word]}
                      title="Save word to vocabulary vault"
                      className="p-1.5 rounded-md bg-slate-700/70 hover:bg-cyan-600 text-slate-300 hover:text-white transition disabled:bg-emerald-600 disabled:text-white shrink-0"
                    >
                      {savedTokens[token.word] ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grammar & Cultural Insights */}
          {data && (
            <div className="grid grid-cols-1 gap-3">
              {data.grammarNote && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-1">
                  <div className="flex items-center space-x-1.5 text-indigo-300 font-semibold text-xs">
                    <Compass className="w-4 h-4" />
                    <span>Grammar & Conjugation Insight</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{data.grammarNote}</p>
                </div>
              )}

              {data.culturalTip && (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-semibold text-xs">
                    <Globe2 className="w-4 h-4" />
                    <span>Cultural Context & Native Etiquette</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{data.culturalTip}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
