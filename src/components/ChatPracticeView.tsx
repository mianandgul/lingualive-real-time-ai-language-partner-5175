import React, { useState } from 'react';
import { Scenario, TranscriptItem, VocabularyItem } from '../types';
import { TranscriptView } from './TranscriptView';
import { Send, Sparkles } from 'lucide-react';

interface ChatPracticeViewProps {
  scenario: Scenario;
  transcript: TranscriptItem[];
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  onPlayTTS: (text: string) => void;
  onInspectPhrase: (phrase: string) => void;
  onSaveToVault: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onSwitchToLiveVoice: () => void;
  suggestedReplies?: { text: string; translation: string }[];
}

export const ChatPracticeView: React.FC<ChatPracticeViewProps> = ({
  scenario,
  transcript,
  onSendMessage,
  isSending,
  onPlayTTS,
  onInspectPhrase,
  onSaveToVault,
  onSwitchToLiveVoice,
  suggestedReplies = [],
}) => {
  const [inputText, setInputText] = useState('');

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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto p-3 sm:p-5 gap-4">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <span className="text-3xl p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            {scenario.icon}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white text-base">{scenario.title}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/30 text-indigo-300 uppercase">
                {scenario.level}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Practice with <span className="text-slate-200">{scenario.partnerRole}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onSwitchToLiveVoice}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Switch to Live Voice Call</span>
        </button>
      </div>

      {/* Main Transcript Body */}
      <div className="flex-1 min-h-0">
        <TranscriptView
          items={transcript}
          targetLanguage={scenario.language}
          onPlayTTS={onPlayTTS}
          onInspect={onInspectPhrase}
          onSavePhrase={(text, translation) =>
            onSaveToVault({
              word: text,
              translation: translation || '',
              exampleSentence: text,
              exampleTranslation: translation,
              language: scenario.language,
            })
          }
        />
      </div>

      {/* Suggested Next Turns / Helper Pills */}
      {suggestedReplies.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] shrink-0 font-medium">Suggestions:</span>
          {suggestedReplies.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(sug.text)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600/40 border border-slate-700/60 text-slate-200 hover:text-white transition shrink-0 text-left"
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
          placeholder={`Type your reply in ${scenario.language}...`}
          disabled={isSending}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-md"
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
