import React from 'react';
import { SUPPORTED_LANGUAGES } from '../data/scenarios';
import { APP_LANGUAGES, AppLangCode, useI18n } from '../services/i18n';
import { VoiceQuotaStatus } from '../services/billingService';
import {
  Mic,
  MessageSquare,
  BookOpen,
  LayoutGrid,
  Smartphone,
  Trophy,
  Globe,
  Crown,
  Share2,
  Settings,
} from 'lucide-react';

import { LinguaLiveLogo } from './LinguaLiveLogo';

export type AppTab = 'scenarios' | 'live' | 'chat' | 'vault' | 'dashboard';

interface NavbarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  activeScenarioTitle?: string;
  vaultCount: number;
  xp: number;
  streakDays: number;
  quotaStatus: VoiceQuotaStatus;
  onOpenAndroidModal: () => void;
  onOpenUpgradeModal: () => void;
  onOpenShareModal: () => void;
  onOpenLegalModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  selectedLanguage,
  onLanguageChange,
  vaultCount,
  xp,
  quotaStatus,
  onOpenAndroidModal,
  onOpenUpgradeModal,
  onOpenShareModal,
  onOpenLegalModal,
}) => {
  const { appLang, setAppLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-2.5 sm:px-6 py-2 sm:py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 md:gap-3">
        {/* Brand Logo */}
        <div
          onClick={() => onSelectTab('scenarios')}
          className="cursor-pointer select-none group shrink-0"
        >
          <LinguaLiveLogo size="md" />
        </div>

        {/* Navigation Tabs */}
        <nav className="order-3 w-full xl:order-none xl:w-auto grid grid-cols-5 xl:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => onSelectTab('scenarios')}
            className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-1.5 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              currentTab === 'scenarios'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{t('navRolesShort')}</span>
            <span className="hidden sm:inline">{t('navRoles')}</span>
          </button>

          <button
            onClick={() => onSelectTab('live')}
            className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-1.5 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition relative whitespace-nowrap cursor-pointer ${
              currentTab === 'live'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{t('navVoiceShort')}</span>
            <span className="hidden sm:inline">{t('navVoice')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1 sm:-top-0.5 sm:-right-0.5" />
          </button>

          <button
            onClick={() => onSelectTab('chat')}
            className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-1.5 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              currentTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>{t('navChat')}</span>
          </button>

          <button
            onClick={() => onSelectTab('vault')}
            className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-1.5 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition relative whitespace-nowrap cursor-pointer ${
              currentTab === 'vault'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{t('navVocabShort')}</span>
            <span className="hidden sm:inline">{t('navVocab')}</span>
            {vaultCount > 0 && (
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums bg-indigo-500/30 text-indigo-300">
                {vaultCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col sm:flex-row items-center justify-center sm:space-x-1.5 px-1.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{xp > 0 ? `${xp}XP` : t('navProgress')}</span>
            <span className="hidden sm:inline">{t('navProgress')}</span>
            {xp > 0 && (
              <span className="hidden md:inline text-[10px] font-mono tabular-nums text-amber-300">
                {xp} XP
              </span>
            )}
          </button>
        </nav>

        {/* Right Section: Plan, Share, App Language Switcher, Target Filter & Settings */}
        <div className="flex items-center flex-wrap gap-1.5 shrink-0">
          {/* Free Plan / Upgrade trigger */}
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className={`flex items-center space-x-1 px-2 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer whitespace-nowrap ${
              quotaStatus.isLimitReached
                ? 'bg-amber-600/25 border-amber-500/50 text-amber-200'
                : 'bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/35 text-purple-200'
            }`}
            title={t('upgradeBannerTitle')}
            aria-label={t('upgradeBannerTitle')}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">
              {t('freePlanPill', {
                remaining: quotaStatus.remainingToday,
                limit: quotaStatus.limit,
              })}
            </span>
            <span className="sm:hidden tabular-nums">
              {quotaStatus.remainingToday}/{quotaStatus.limit}
            </span>
          </button>

          {/* Share & +100 XP */}
          <button
            type="button"
            onClick={onOpenShareModal}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-indigo-300 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
            title={t('shareTitle')}
            aria-label={t('shareTitle')}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t('shareBtn')}</span>
          </button>

          {/* App UI / Native Language Switcher */}
          <div
            className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-1.5 py-1 text-xs text-slate-200"
            title={t('appLanguageLabel')}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0 mr-1" />
            <select
              value={appLang}
              onChange={(e) => setAppLang(e.target.value as AppLangCode)}
              aria-label={t('appLanguageLabel')}
              className="bg-transparent text-[11px] font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[78px] sm:max-w-[110px]"
            >
              {APP_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                  {lang.flag} {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Target Learning Language Filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label={t('allLanguages')}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-[11px] font-medium text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[100px] sm:max-w-[135px]"
          >
            <option value="All">{t('allLanguages')}</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.name}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>

          {/* Android App / Install Button */}
          <button
            type="button"
            onClick={onOpenAndroidModal}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
            title={t('installAndroid')}
            aria-label={t('installAndroid')}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">{t('installAndroid')}</span>
          </button>

          {/* Settings & Privacy */}
          <button
            type="button"
            onClick={onOpenLegalModal}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition cursor-pointer"
            title={t('legalPrivacyBtn')}
            aria-label={t('legalPrivacyBtn')}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
