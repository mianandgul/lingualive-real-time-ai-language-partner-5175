import React from 'react';
import { SUPPORTED_LANGUAGES } from '../data/scenarios';
import {
  Mic,
  MessageSquare,
  BookOpen,
  LayoutGrid,
  Smartphone,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'scenarios' | 'live' | 'chat' | 'vault';
  onSelectTab: (tab: 'scenarios' | 'live' | 'chat' | 'vault') => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  activeScenarioTitle?: string;
  vaultCount: number;
  onOpenAndroidModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  selectedLanguage,
  onLanguageChange,
  vaultCount,
  onOpenAndroidModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => onSelectTab('scenarios')}
          className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none group shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-indigo-300 transition">
                LinguaLive
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block">Real-Time AI Language Partner</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => onSelectTab('scenarios')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              currentTab === 'scenarios'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Roleplays</span>
          </button>

          <button
            onClick={() => onSelectTab('live')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition relative shrink-0 ${
              currentTab === 'live'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Voice</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          </button>

          <button
            onClick={() => onSelectTab('chat')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              currentTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          <button
            onClick={() => onSelectTab('vault')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              currentTab === 'vault'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flashcards</span>
            {vaultCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300">
                {vaultCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Section: Android APK Button & Language Dropdown */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Android App / Install Button */}
          <button
            onClick={onOpenAndroidModal}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Install on Android or Package APK"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline">Install Android</span>
          </button>

          {/* Target Language Dropdown */}
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Languages</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.name}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
