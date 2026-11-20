import React, { useState, useEffect, useMemo } from 'react';
import { VocabularyItem } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/scenarios';
import {
  Bookmark,
  Volume2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Plus,
  RotateCcw,
  BookOpen,
  Search,
  Brain,
  MessageSquareQuote,
  ArrowRight,
  Calendar,
} from 'lucide-react';

interface VocabularyVaultProps {
  items: VocabularyItem[];
  onToggleMastered: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onMarkPracticed: (id: string) => void;
  onPlayTTS: (text: string) => void;
  selectedLanguage: string;
}

type VaultViewMode = 'vocabulary' | 'phrases' | 'flashcards' | 'revision';

interface QuizQuestion {
  item: VocabularyItem;
  options: string[];
  correctAnswer: string;
}

function buildQuizQuestions(pool: VocabularyItem[]): QuizQuestion[] {
  if (pool.length < 2) return [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 8);
  return shuffled.map((target) => {
    const distractors = pool
      .filter((other) => other.id !== target.id && other.translation !== target.translation)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((o) => o.translation);

    const options = [target.translation, ...distractors].sort(() => Math.random() - 0.5);
    return {
      item: target,
      options,
      correctAnswer: target.translation,
    };
  });
}

export const VocabularyVault: React.FC<VocabularyVaultProps> = ({
  items,
  onToggleMastered,
  onDeleteItem,
  onAddItem,
  onMarkPracticed,
  onPlayTTS,
  selectedLanguage,
}) => {
  const [viewMode, setViewMode] = useState<VaultViewMode>('vocabulary');
  const [statusFilter, setStatusFilter] = useState<'All' | 'To Learn' | 'Learned'>('All');
  const [localLanguage, setLocalLanguage] = useState<string>(selectedLanguage);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Flashcard state
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // Revision quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Add manual word form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newPronunciation, setNewPronunciation] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newType, setNewType] = useState<'word' | 'phrase'>('word');
  const [newLanguage, setNewLanguage] = useState(
    selectedLanguage === 'All' ? 'Spanish' : selectedLanguage
  );

  useEffect(() => {
    setLocalLanguage(selectedLanguage);
  }, [selectedLanguage]);

  const baseFilteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchLang =
        localLanguage === 'All' || item.language.toLowerCase() === localLanguage.toLowerCase();
      if (!matchLang) return false;

      if (statusFilter === 'To Learn' && item.mastered) return false;
      if (statusFilter === 'Learned' && !item.mastered) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText =
          item.word.toLowerCase().includes(q) ||
          item.translation.toLowerCase().includes(q) ||
          (item.exampleSentence && item.exampleSentence.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));
        if (!matchText) return false;
      }
      return true;
    });
  }, [items, localLanguage, statusFilter, searchQuery]);

  const savedPhrasesItems = useMemo(
    () =>
      baseFilteredItems.filter(
        (item) => item.type === 'phrase' || item.type === 'correction' || item.word.trim().split(/\s+/).length >= 3
      ),
    [baseFilteredItems]
  );

  const displayedList = viewMode === 'phrases' ? savedPhrasesItems : baseFilteredItems;
  const flashcardDeck = baseFilteredItems.length > 0 ? baseFilteredItems : items;
  const currentStudyCard = flashcardDeck[Math.min(currentCardIndex, Math.max(0, flashcardDeck.length - 1))];

  const startRevisionQuiz = () => {
    const pool = baseFilteredItems.length >= 2 ? baseFilteredItems : items;
    setQuizQuestions(buildQuizQuestions(pool));
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizCompleted(false);
    setViewMode('revision');
  };

  const handlePracticeAgain = (item: VocabularyItem) => {
    onMarkPracticed(item.id);
    const idx = flashcardDeck.findIndex((x) => x.id === item.id);
    setCurrentCardIndex(idx >= 0 ? idx : 0);
    setIsCardFlipped(false);
    setViewMode('flashcards');
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;
    onAddItem({
      word: newWord.trim(),
      translation: newTranslation.trim(),
      pronunciation: newPronunciation.trim() || undefined,
      exampleSentence: newExample.trim() || undefined,
      language: newLanguage,
      type: newType,
    });
    setNewWord('');
    setNewTranslation('');
    setNewPronunciation('');
    setNewExample('');
    setShowAddForm(false);
  };

  const handleAnswerQuiz = (option: string) => {
    if (selectedOption !== null) return;
    const currentQ = quizQuestions[quizIndex];
    setSelectedOption(option);
    if (option === currentQ.correctAnswer) {
      setQuizScore((s) => s + 1);
      onMarkPracticed(currentQ.item.id);
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizCompleted(true);
    } else {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Memory Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <span className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Bookmark className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">Personal Vocabulary Memory</h2>
            <p className="text-xs text-slate-400 tabular-nums">
              {items.length} saved items · {items.filter((i) => i.mastered).length} learned ·{' '}
              {items.filter((i) => i.type === 'correction').length} saved corrections
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Word / Phrase</span>
          </button>
          <button
            onClick={startRevisionQuiz}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Brain className="w-4 h-4" />
            <span>Revision Exercise</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1 bg-slate-900/80 border border-slate-800 p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setViewMode('vocabulary')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'vocabulary'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>My Vocabulary</span>
          </button>
          <button
            onClick={() => setViewMode('phrases')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'phrases'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Saved Phrases</span>
          </button>
          <button
            onClick={() => {
              setViewMode('flashcards');
              setCurrentCardIndex(0);
              setIsCardFlipped(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'flashcards'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>
          <button
            onClick={startRevisionQuiz}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'revision'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Revision Quiz</span>
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
              className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                Native Meaning
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Language
                </label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'word' | 'phrase')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="word">Word</option>
                  <option value="phrase">Phrase</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Pronunciation Guide (Optional)
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
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
            >
              Save to Memory
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Toolbar (visible on list views) */}
      {(viewMode === 'vocabulary' || viewMode === 'phrases') && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search word, meaning, or example..."
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={localLanguage}
              onChange={(e) => setLocalLanguage(e.target.value)}
              className="bg-slate-950 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              aria-label="Filter vocabulary by language"
            >
              <option value="All">All Languages</option>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-1 bg-slate-950 border border-slate-700/60 rounded-xl p-1">
              {(['All', 'To Learn', 'Learned'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    statusFilter === f
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Flashcard Study Mode */}
      {viewMode === 'flashcards' && (
        <>
          {currentStudyCard ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center space-y-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between w-full max-w-lg text-xs text-slate-400 tabular-nums">
                <span>
                  Card {currentCardIndex + 1} of {flashcardDeck.length}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold uppercase text-[10px]">
                  {currentStudyCard.language}
                </span>
              </div>

              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className="w-full max-w-lg min-h-[260px] p-8 rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900/90 border border-slate-700/80 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:border-indigo-500/50 shadow-2xl relative select-none"
              >
                <span className="absolute top-4 right-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {isCardFlipped ? 'Back (Meaning)' : 'Front (Tap to Flip)'}
                </span>

                {!isCardFlipped ? (
                  <div className="space-y-3">
                    <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                      {currentStudyCard.word}
                    </p>
                    {currentStudyCard.pronunciation && (
                      <p className="text-xs font-mono text-cyan-400">
                        /{currentStudyCard.pronunciation}/
                      </p>
                    )}
                    <span className="inline-block mt-2 text-xs text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full">
                      Tap to see meaning & example
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fadeIn">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Meaning</span>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                      {currentStudyCard.translation}
                    </p>
                    {currentStudyCard.exampleSentence && (
                      <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-700/50 text-xs text-left space-y-1">
                        <p className="font-semibold text-slate-200">
                          &ldquo;{currentStudyCard.exampleSentence}&rdquo;
                        </p>
                        {currentStudyCard.exampleTranslation && (
                          <p className="text-slate-400 italic">
                            &ldquo;{currentStudyCard.exampleTranslation}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onPlayTTS(currentStudyCard.word)}
                  className="p-3 rounded-full bg-slate-800 hover:bg-indigo-600 text-slate-200 transition shadow-md cursor-pointer"
                  title="Listen to native audio"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    onToggleMastered(currentStudyCard.id);
                    onMarkPracticed(currentStudyCard.id);
                  }}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition shadow-lg cursor-pointer ${
                    currentStudyCard.mastered
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{currentStudyCard.mastered ? 'Learned' : 'Mark as Learned'}</span>
                </button>

                <button
                  onClick={() => {
                    onMarkPracticed(currentStudyCard.id);
                    const next = (currentCardIndex + 1) % flashcardDeck.length;
                    setCurrentCardIndex(next);
                    setIsCardFlipped(false);
                  }}
                  className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Next card"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No flashcards available yet.</p>
            </div>
          )}
        </>
      )}

      {/* Vocabulary Revision Exercise Mode */}
      {viewMode === 'revision' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-5 shadow-2xl">
          {quizQuestions.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Brain className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-200">
                Save at least 2 vocabulary items to unlock Revision Exercises.
              </p>
              <button
                onClick={() => setViewMode('vocabulary')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Back to Vocabulary
              </button>
            </div>
          ) : quizCompleted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Revision Round Complete</h3>
              <p className="text-sm text-slate-300 tabular-nums">
                You scored{' '}
                <span className="font-extrabold text-emerald-400">
                  {quizScore} / {quizQuestions.length}
                </span>
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={startRevisionQuiz}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Practice Again</span>
                </button>
                <button
                  onClick={() => setViewMode('vocabulary')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Return to List
                </button>
              </div>
            </div>
          ) : (
            (() => {
              const q = quizQuestions[quizIndex];
              return (
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs text-slate-400 tabular-nums">
                    <span>
                      Question {quizIndex + 1} of {quizQuestions.length}
                    </span>
                    <span className="font-semibold text-indigo-300">
                      Score: {quizScore} · {q.item.language}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                        Select the correct meaning
                      </span>
                      <p className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                        {q.item.word}
                      </p>
                      {q.item.pronunciation && (
                        <p className="text-xs font-mono text-cyan-400 mt-1">
                          /{q.item.pronunciation}/
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onPlayTTS(q.item.word)}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 transition shrink-0 cursor-pointer"
                      title="Listen"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isPicked = selectedOption === opt;
                      const isCorrect = opt === q.correctAnswer;
                      let style =
                        'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-200';
                      if (selectedOption !== null) {
                        if (isCorrect) {
                          style = 'bg-emerald-950/50 border-emerald-500 text-emerald-200';
                        } else if (isPicked) {
                          style = 'bg-rose-950/50 border-rose-500 text-rose-200';
                        } else {
                          style = 'bg-slate-950/40 border-slate-800/60 text-slate-500';
                        }
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={selectedOption !== null}
                          onClick={() => handleAnswerQuiz(opt)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition cursor-pointer ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption !== null && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-xs text-slate-400 italic truncate pr-2">
                        {q.item.exampleSentence ? `"${q.item.exampleSentence}"` : ''}
                      </span>
                      <button
                        onClick={handleNextQuizQuestion}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                      >
                        <span>
                          {quizIndex + 1 >= quizQuestions.length ? 'Finish Round' : 'Next'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Vocabulary & Saved Phrases Cards List */}
      {(viewMode === 'vocabulary' || viewMode === 'phrases') && (
        <div className="space-y-4">
          {displayedList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                {viewMode === 'phrases'
                  ? 'No saved phrases or corrections match your filter.'
                  : 'No vocabulary items match your current filter.'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tap &ldquo;Save&rdquo; on any conversation message or save corrections from your post-session report to grow your memory deck.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {displayedList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3 transition shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-white text-base break-words">
                          {item.word}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/15">
                          {item.language}
                        </span>
                        {item.type === 'correction' && (
                          <span className="text-[10px] font-semibold text-amber-300">
                            · Saved Correction
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-emerald-400">{item.translation}</p>
                      {(item.pronunciation || item.ipa) && (
                        <p className="text-xs font-mono text-cyan-400">
                          /{item.pronunciation || item.ipa}/
                        </p>
                      )}
                      {item.exampleSentence && (
                        <p className="text-xs text-slate-300 italic mt-1 leading-relaxed">
                          &ldquo;{item.exampleSentence}&rdquo;
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 mt-1">{item.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => onPlayTTS(item.word)}
                        title="Listen"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        title="Delete"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: Date added, Practice Again, Mark as Learned */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums">
                      <Calendar className="w-3 h-3" />
                      Added {new Date(item.learnedAt).toLocaleDateString()}
                      {item.practiceCount ? ` · Practiced ${item.practiceCount}×` : ''}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePracticeAgain(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/80 text-slate-200 font-semibold transition cursor-pointer"
                      >
                        Practice Again
                      </button>
                      <button
                        onClick={() => onToggleMastered(item.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          item.mastered
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-emerald-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{item.mastered ? 'Learned' : 'Mark Learned'}</span>
                      </button>
                    </div>
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
