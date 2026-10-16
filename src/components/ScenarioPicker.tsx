import React, { useState } from 'react';
import { Scenario, LearnerLevel } from '../types';
import { PRESET_SCENARIOS, SUPPORTED_LANGUAGES } from '../data/scenarios';
import {
  Sparkles,
  Search,
  PlusCircle,
  Play,
  X,
  Target,
} from 'lucide-react';

interface ScenarioPickerProps {
  onSelectScenario: (scenario: Scenario) => void;
  selectedLanguage: string;
  onLanguageChange: (langName: string) => void;
}

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  onSelectScenario,
  selectedLanguage,
  onLanguageChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // Custom Scenario form state
  const [customTitle, setCustomTitle] = useState('');
  const [customLanguage, setCustomLanguage] = useState(selectedLanguage === 'All' ? 'Spanish' : selectedLanguage);
  const [customLevel, setCustomLevel] = useState<LearnerLevel>('Beginner');
  const [customCategory, setCustomCategory] = useState<'Dining' | 'Travel' | 'Social' | 'Work' | 'Everyday'>('Dining');
  const [customPartnerRole, setCustomPartnerRole] = useState('');
  const [customUserRole, setCustomUserRole] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customGreeting, setCustomGreeting] = useState('');

  const categories = ['All', 'Dining', 'Travel', 'Work', 'Everyday'];
  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  // Filtered scenarios
  const filteredScenarios = PRESET_SCENARIOS.filter((s) => {
    const matchLang = selectedLanguage === 'All' || s.language.toLowerCase() === selectedLanguage.toLowerCase();
    const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchLevel = selectedLevel === 'All' || s.level === selectedLevel;
    const matchQuery =
      searchQuery === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.language.toLowerCase().includes(searchQuery.toLowerCase());
    return matchLang && matchCat && matchLevel && matchQuery;
  });

  const handleCreateCustomScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customPartnerRole) return;

    const newScenario: Scenario = {
      id: `custom-${Date.now()}`,
      title: customTitle,
      description: customDescription || `A custom conversation scenario in ${customLanguage}.`,
      category: customCategory,
      language: customLanguage,
      level: customLevel,
      cefr: customLevel === 'Beginner' ? 'A1' : customLevel === 'Intermediate' ? 'B1' : 'C1',
      icon: '✨',
      partnerRole: customPartnerRole,
      userRole: customUserRole || 'Learner practicing conversation',
      register: 'Standard Polite',
      culturalEtiquetteNote: 'Speak clearly and observe polite conversational turn-taking.',
      starterPrompt: `Roleplay as ${customPartnerRole} in ${customLanguage}. The user is ${customUserRole}.`,
      starterGreeting: customGreeting || '¡Hola! ¿Cómo estás?',
      starterTranslation: 'Hello! How are you?',
      objectives: [
        { id: 'custom-1', title: 'Start the conversation', description: 'Introduce yourself politely', completed: false },
        { id: 'custom-2', title: 'Engage with the scenario', description: 'Ask a relevant question', completed: false },
        { id: 'custom-3', title: 'Conclude naturally', description: 'Wrap up your exchange politely', completed: false },
      ],
      usefulPhrases: [],
    };

    setShowCustomModal(false);
    onSelectScenario(newScenario);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero Welcome Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-700/40 p-6 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-Time Interactive Voice Practice</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Conversational Fluency, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300">
              One Natural Voice Dialogue at a Time.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Practice realistic conversations with an encouraging AI native speaker. Interrupt anytime, get instant phonetic tips, explore word breakdowns, and achieve scenario missions.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setShowCustomModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Custom Roleplay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Language Quick Selector Pills */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Target Language
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => onLanguageChange('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedLanguage === 'All'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            🌍 All Languages
          </button>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => onLanguageChange(lang.name)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedLanguage === lang.name
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              <span className="text-[10px] opacity-70">({lang.nativeName})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scenarios or roles..."
            className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Level and Category Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Level Filter */}
          <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-700/60 rounded-xl p-1 text-xs">
            {levels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedLevel === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-700/60 rounded-xl p-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-indigo-950/30 backdrop-blur-sm"
          >
            <div className="space-y-3">
              {/* Top Row: Icon, Badges */}
              <div className="flex items-start justify-between">
                <span className="text-3xl p-2.5 rounded-xl bg-slate-800 border border-slate-700/70 group-hover:scale-105 transition">
                  {scenario.icon}
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {scenario.language}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      scenario.level === 'Beginner'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                        : scenario.level === 'Intermediate'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        : 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                    }`}
                  >
                    {scenario.level}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {scenario.description}
                </p>
              </div>

              {/* Role details */}
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>AI Partner:</span>
                  <span className="font-semibold text-slate-200">{scenario.partnerRole}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Your Role:</span>
                  <span className="font-semibold text-slate-200">{scenario.userRole}</span>
                </div>
              </div>

              {/* Scenario Objectives Count */}
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>{scenario.objectives.length} interactive practice missions</span>
              </div>
            </div>

            {/* Launch Call Action */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-medium text-indigo-400">Real-Time Voice</span>
              <button
                onClick={() => onSelectScenario(scenario)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md group-hover:translate-x-0.5"
              >
                <span>Start Call</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredScenarios.length === 0 && (
        <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <p className="text-slate-400 text-sm">No scenarios match your current filter.</p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedLevel('All');
              setSearchQuery('');
            }}
            className="text-xs text-indigo-400 underline hover:text-indigo-300"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Custom Scenario Builder Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Create Custom Roleplay Scenario</h3>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomScenario} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Scenario Title</label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Ordering Street Tacos in Mexico City"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
                  <select
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.flag} {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Level</label>
                  <select
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value as LearnerLevel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Beginner">Beginner (A1-A2)</option>
                    <option value="Intermediate">Intermediate (B1-B2)</option>
                    <option value="Advanced">Advanced (C1-C2)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Partner Role</label>
                  <input
                    type="text"
                    required
                    value={customPartnerRole}
                    onChange={(e) => setCustomPartnerRole(e.target.value)}
                    placeholder="e.g., Taco Vendor (Carlos)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Role</label>
                  <input
                    type="text"
                    value={customUserRole}
                    onChange={(e) => setCustomUserRole(e.target.value)}
                    placeholder="e.g., Hungry Traveler"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Starter Greeting (in target language)
                </label>
                <input
                  type="text"
                  value={customGreeting}
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  placeholder="e.g., ¡Hola! ¿Cuántos tacos te preparo hoy?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Context / Description</label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe the setting and situation..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg"
                >
                  Start Roleplay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
