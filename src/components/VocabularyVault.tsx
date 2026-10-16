import React, { useState } from 'react';
import { VocabularyItem } from '../types';
import {
  Bookmark,
  Volume2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Plus,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

interface VocabularyVaultProps {
  items: VocabularyItem[];
  onToggleMastered: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onPlayTTS: (text: string) => void;
  selectedLanguage: string;
}

export const VocabularyVault: React.FC<VocabularyVaultProps> = ({
  items,
  onToggleMastered,
  onDeleteItem,
  onAddItem,
  onPlayTTS,
  selectedLanguage,
}) => {
  const [filter, setFilter] = useState<'All' | 'Learning' | 'Mastered'>('All');
  const [isStudyMode, setIsStudyMode] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // Add manual word form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newPronunciation, setNewPronunciation] = useState('');
  const [newExample, setNewExample] = useState('');

  const filteredItems = items.filter((item) => {
    const matchLang = selectedLanguage === 'All' || item.language.toLowerCase() === selectedLanguage.toLowerCase();
    if (!matchLang) return false;
    if (filter === 'Learning') return !item.mastered;
    if (filter === 'Mastered') return item.mastered;
    return true;
  });

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord || !newTranslation) return;
    onAddItem({
      word: newWord,
      translation: newTranslation,
      pronunciation: newPronunciation,
      exampleSentence: newExample,
      language: selectedLanguage === 'All' ? 'Spanish' : selectedLanguage,
    });
    setNewWord('');
    setNewTranslation('');
    setNewPronunciation('');
    setNewExample('');
    setShowAddForm(false);
  };

  const currentStudyCard = filteredItems[currentCardIndex];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Vault Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <span className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Bookmark className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">Vocabulary Vault & Flashcards</h2>
            <p className="text-xs text-slate-400">
              {filteredItems.length} phrases saved • {items.filter((i) => i.mastered).length} mastered
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {filteredItems.length > 0 && (
            <button
              onClick={() => {
                setIsStudyMode(!isStudyMode);
                setCurrentCardIndex(0);
                setIsCardFlipped(false);
              }}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                isStudyMode
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isStudyMode ? 'Exit Flashcard Mode' : 'Practice Flashcards'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Word</span>
          </button>
        </div>
      </div>

      {/* Manual Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleManualAdd}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 backdrop-blur-md animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Save New Vocabulary Item
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Word or Phrase (Target Language)
              </label>
              <input
                type="text"
                required
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="e.g., La cuenta, por favor"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                English Translation
              </label>
              <input
                type="text"
                required
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                placeholder="e.g., The bill, please"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Pronunciation / Phonetics (Optional)
              </label>
              <input
                type="text"
                value={newPronunciation}
                onChange={(e) => setNewPronunciation(e.target.value)}
                placeholder="e.g., lah KWEHN-tah..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Example Sentence (Optional)
              </label>
              <input
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder="e.g., Camarero, ¿nos trae la cuenta, por favor?"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md"
            >
              Add to Deck
            </button>
          </div>
        </form>
      )}

      {/* Interactive Flashcard Study Mode */}
      {isStudyMode && currentStudyCard ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center space-y-6 shadow-2xl backdrop-blur-md">
          {/* Card counter */}
          <div className="flex items-center justify-between w-full max-w-lg text-xs text-slate-400">
            <span>
              Card {currentCardIndex + 1} of {filteredItems.length}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold uppercase text-[10px]">
              {currentStudyCard.language}
            </span>
          </div>

          {/* Flip Card Container */}
          <div
            onClick={() => setIsCardFlipped(!isCardFlipped)}
            className="w-full max-w-lg min-h-[260px] p-8 rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900/90 border border-slate-700/80 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:border-indigo-500/50 shadow-2xl relative select-none group"
          >
            <span className="absolute top-4 right-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {isCardFlipped ? 'Back (Translation)' : 'Front (Click to Flip)'}
            </span>

            {!isCardFlipped ? (
              <div className="space-y-3">
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide">
                  {currentStudyCard.word}
                </p>
                {currentStudyCard.pronunciation && (
                  <p className="text-xs font-mono text-cyan-400">/{currentStudyCard.pronunciation}/</p>
                )}
                <span className="inline-block mt-2 text-xs text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full">
                  Tap to see English & examples
                </span>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <span className="text-xs font-semibold text-slate-400 uppercase">Meaning</span>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-400">
                  {currentStudyCard.translation}
                </p>
                {currentStudyCard.exampleSentence && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-700/50 text-xs text-left space-y-1">
                    <p className="font-semibold text-slate-200">"{currentStudyCard.exampleSentence}"</p>
                    {currentStudyCard.exampleTranslation && (
                      <p className="text-slate-400 italic">"{currentStudyCard.exampleTranslation}"</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flashcard Action Toolbar */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onPlayTTS(currentStudyCard.word)}
              className="p-3 rounded-full bg-slate-800 hover:bg-indigo-600 text-slate-200 transition shadow-md"
              title="Listen to native audio"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                onToggleMastered(currentStudyCard.id);
                if (currentCardIndex < filteredItems.length - 1) {
                  setCurrentCardIndex(currentCardIndex + 1);
                  setIsCardFlipped(false);
                }
              }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition shadow-lg ${
                currentStudyCard.mastered
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{currentStudyCard.mastered ? 'Mastered' : 'Mark as Mastered'}</span>
            </button>

            <button
              onClick={() => {
                const next = (currentCardIndex + 1) % filteredItems.length;
                setCurrentCardIndex(next);
                setIsCardFlipped(false);
              }}
              className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Next card"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Standard Vocabulary List */
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            {(['All', 'Learning', 'Mastered'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Your vocabulary vault is empty.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                During your real-time voice conversations, tap the "Save" or "Inspect" button on any message to add words to your vault!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 flex items-start justify-between transition group shadow-sm"
                >
                  <div className="space-y-1 overflow-hidden pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-base">{item.word}</span>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10">
                        {item.language}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-emerald-400">{item.translation}</p>
                    {item.pronunciation && (
                      <p className="text-xs font-mono text-cyan-400">/{item.pronunciation}/</p>
                    )}
                    {item.exampleSentence && (
                      <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">
                        "{item.exampleSentence}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => onPlayTTS(item.word)}
                      title="Listen"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onToggleMastered(item.id)}
                      title={item.mastered ? 'Mastered' : 'Mark mastered'}
                      className={`p-2 rounded-lg transition ${
                        item.mastered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      title="Delete"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
