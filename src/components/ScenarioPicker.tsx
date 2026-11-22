import React, { useState } from 'react';
import { Scenario, LearnerLevel, UserProgressState } from '../types';
import { PRESET_SCENARIOS, SUPPORTED_LANGUAGES } from '../data/scenarios';
import { getDailyMissionsStatus, getUserLevelInfo } from '../services/learningStorage';
import { useI18n } from '../services/i18n';
import { VoiceQuotaStatus } from '../services/billingService';
import { LegalTab } from './LegalSettingsModal';
import {
  Sparkles,
  Search,
  PlusCircle,
  Play,
  X,
  Target,
  Trash2,
  Flame,
  Trophy,
  Loader2,
  Wand2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Crown,
  Share2,
  Smartphone,
  CheckCircle2,
  Globe,
} from 'lucide-react';

interface ScenarioPickerProps {
  onSelectScenario: (scenario: Scenario) => void;
  selectedLanguage: string;
  onLanguageChange: (langName: string) => void;
  customScenarios: Scenario[];
  onSaveCustomScenario: (scenario: Scenario) => void;
  onDeleteCustomScenario: (id: string) => void;
  userProgress: UserProgressState;
  quotaStatus: VoiceQuotaStatus;
  onOpenDashboard: () => void;
  onOpenUpgrade: () => void;
  onOpenShare: () => void;
  onOpenAndroidInstall: () => void;
  onOpenLegalTab: (tab: LegalTab) => void;
}

interface ScenarioTemplate {
  label: string;
  icon: string;
  title: string;
  partnerRole: string;
  userRole: string;
  aiPersonality: string;
  situation: string;
  level: LearnerLevel;
}

const CUSTOM_SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    label: 'Job Interview',
    icon: '💼',
    title: 'Software Role Job Interview',
    partnerRole: 'Hiring Manager (Elena)',
    userRole: 'Job Candidate',
    aiPersonality: 'Professional & Formal',
    situation:
      'You are interviewing for a team role. Answer questions about your background, strengths, and why you want to join.',
    level: 'Intermediate',
  },
  {
    label: 'Airport Immigration',
    icon: '🛂',
    title: 'Airport Passport Control',
    partnerRole: 'Immigration Officer',
    userRole: 'Arriving Traveler',
    aiPersonality: 'Direct & Realistic',
    situation:
      'You just landed at an international airport. Explain the purpose of your visit, how long you are staying, and where you will lodge.',
    level: 'Beginner',
  },
  {
    label: 'Hotel Reception',
    icon: '🏨',
    title: 'Hotel Check-In & Room Request',
    partnerRole: 'Front Desk Receptionist',
    userRole: 'Hotel Guest',
    aiPersonality: 'Warm & Encouraging',
    situation:
      'You are checking in for a three-night stay and want to confirm breakfast hours and ask for a quiet room on a higher floor.',
    level: 'Beginner',
  },
  {
    label: 'Restaurant Ordering',
    icon: '🍽️',
    title: 'Ordering Dinner at a Bistro',
    partnerRole: 'Attentive Server',
    userRole: 'Diner',
    aiPersonality: 'Friendly & Casual',
    situation:
      'Order a starter, main course, and drink, ask about ingredients for an allergy, and ask for the bill politely at the end.',
    level: 'Beginner',
  },
  {
    label: 'Doctor Appointment',
    icon: '🩺',
    title: 'Clinic Consultation & Symptoms',
    partnerRole: 'General Physician',
    userRole: 'Patient',
    aiPersonality: 'Patient Coach',
    situation:
      'Describe having a sore throat and mild fever for two days, answer questions about allergies, and confirm prescription instructions.',
    level: 'Intermediate',
  },
  {
    label: 'Business Meeting',
    icon: '📊',
    title: 'Client Project Kickoff',
    partnerRole: 'Account Director',
    userRole: 'Project Lead',
    aiPersonality: 'Professional & Formal',
    situation:
      'Align with an international client on project deliverables, next week milestones, and communication cadence.',
    level: 'Advanced',
  },
  {
    label: 'Making New Friends',
    icon: '👋',
    title: 'Meeting Locals at a Meetup',
    partnerRole: 'Friendly Local Resident',
    userRole: 'Newcomer in Town',
    aiPersonality: 'Friendly & Casual',
    situation:
      'Introduce yourself at a community coffee meetup, share hobbies, and ask for neighborhood recommendations.',
    level: 'Beginner',
  },
  {
    label: 'Shopping',
    icon: '🛍️',
    title: 'Clothing Store Sizing & Exchange',
    partnerRole: 'Boutique Associate',
    userRole: 'Shopper',
    aiPersonality: 'Warm & Encouraging',
    situation:
      'Ask to try on a jacket in a different size, inquire about fabric care, and check the return policy.',
    level: 'Beginner',
  },
  {
    label: 'University Admission Interview',
    icon: '🎓',
    title: 'University Admissions Interview',
    partnerRole: 'Admissions Committee Member',
    userRole: 'Prospective Student',
    aiPersonality: 'Professional & Formal',
    situation:
      'Discuss your academic interests, research goals, and why you chose this degree program.',
    level: 'Advanced',
  },
];

const AI_PERSONALITIES = [
  'Warm & Encouraging',
  'Professional & Formal',
  'Friendly & Casual',
  'Patient Coach',
  'Direct & Realistic',
];

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  onSelectScenario,
  customScenarios,
  onSaveCustomScenario,
  onDeleteCustomScenario,
  userProgress,
  quotaStatus,
  selectedLanguage,
  onOpenDashboard,
  onOpenUpgrade,
  onOpenShare,
  onOpenAndroidInstall,
  onOpenLegalTab,
}) => {
  const { t, nativeLanguageName, formatPrice } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // Custom Scenario form state
  const [customTitle, setCustomTitle] = useState('');
  const [customLanguage, setCustomLanguage] = useState(
    selectedLanguage === 'All' ? 'Spanish' : selectedLanguage
  );
  const [customLevel, setCustomLevel] = useState<LearnerLevel>('Beginner');
  const [customPartnerRole, setCustomPartnerRole] = useState('');
  const [customPersonality, setCustomPersonality] = useState('Warm & Encouraging');
  const [customUserRole, setCustomUserRole] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customIcon, setCustomIcon] = useState('✨');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const categories = ['All', 'Custom', 'Dining', 'Travel', 'Work', 'Everyday'];
  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const allScenarios = [...customScenarios, ...PRESET_SCENARIOS];

  // Filtered scenarios
  const filteredScenarios = allScenarios.filter((s) => {
    const matchLang =
      selectedLanguage === 'All' || s.language.toLowerCase() === selectedLanguage.toLowerCase();
    const matchCat =
      selectedCategory === 'All' ||
      (selectedCategory === 'Custom' ? Boolean(s.isCustom) || s.category === 'Custom' : s.category === selectedCategory);
    const matchLevel = selectedLevel === 'All' || s.level === selectedLevel;
    const matchQuery =
      searchQuery === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.partnerRole.toLowerCase().includes(searchQuery.toLowerCase());
    return matchLang && matchCat && matchLevel && matchQuery;
  });

  const levelInfo = getUserLevelInfo(userProgress.xp);
  const dailyMissions = getDailyMissionsStatus(userProgress);
  const completedMissionsCount = dailyMissions.filter((m) => m.completed).length;

  const openModalWithDefaults = () => {
    setCustomLanguage(selectedLanguage === 'All' ? 'Spanish' : selectedLanguage);
    setGenerateError(null);
    setShowCustomModal(true);
  };

  const applyTemplate = (tpl: ScenarioTemplate) => {
    setCustomTitle(tpl.title);
    setCustomPartnerRole(tpl.partnerRole);
    setCustomUserRole(tpl.userRole);
    setCustomPersonality(tpl.aiPersonality);
    setCustomDescription(tpl.situation);
    setCustomLevel(tpl.level);
    setCustomIcon(tpl.icon);
    setGenerateError(null);
  };

  const buildAndLaunchScenario = (generated: any, usedFallback: boolean) => {
    const fallbackObjectives = [
      {
        id: 'custom-1',
        title: 'Greet and set context',
        description: 'Open the conversation naturally in character',
        completed: false,
      },
      {
        id: 'custom-2',
        title: 'Communicate your main goal',
        description: 'Ask or answer key questions clearly',
        completed: false,
      },
      {
        id: 'custom-3',
        title: 'Wrap up politely',
        description: 'Conclude the exchange naturally',
        completed: false,
      },
    ];

    const newScenario: Scenario = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: customTitle.trim(),
      description:
        customDescription.trim() ||
        `A ${customLevel.toLowerCase()} ${customLanguage} roleplay with ${customPartnerRole.trim()}.`,
      category: 'Custom',
      language: customLanguage,
      level: customLevel,
      cefr: customLevel === 'Beginner' ? 'A2' : customLevel === 'Intermediate' ? 'B1' : 'C1',
      icon: customIcon || '✨',
      partnerRole: customPartnerRole.trim(),
      userRole: customUserRole.trim() || 'Language Learner',
      aiPersonality: customPersonality,
      isCustom: true,
      createdAt: Date.now(),
      register: customPersonality.includes('Formal') ? 'Formal / Business' : 'Standard Polite',
      culturalEtiquetteNote:
        generated?.culturalEtiquetteNote ||
        `Match the tone of your partner (${customPersonality}) and speak clearly in ${customLanguage}.`,
      starterPrompt: `Roleplay as ${customPartnerRole.trim()} (${customPersonality}) speaking in ${customLanguage} at ${customLevel} level. The user is ${customUserRole.trim() || 'a language learner'}. Situation: ${customDescription.trim() || customTitle.trim()}.`,
      starterGreeting:
        generated?.starterGreeting ||
        (usedFallback ? `Hello! (${customTitle.trim()} — speak in ${customLanguage})` : 'Hello!'),
      starterTranslation:
        generated?.starterTranslation ||
        `Hello! Welcome to "${customTitle.trim()}". Let's begin.`,
      starterPhonetics: generated?.starterPhonetics || undefined,
      objectives:
        Array.isArray(generated?.objectives) && generated.objectives.length > 0
          ? generated.objectives.map((o: any, idx: number) => ({
              id: o.id || `custom-${idx + 1}`,
              title: o.title || `Objective ${idx + 1}`,
              description: o.description || 'Complete this conversational goal',
              completed: false,
            }))
          : fallbackObjectives,
      usefulPhrases: Array.isArray(generated?.usefulPhrases) ? generated.usefulPhrases : [],
    };

    onSaveCustomScenario(newScenario);
    setShowCustomModal(false);
    setCustomTitle('');
    setCustomPartnerRole('');
    setCustomUserRole('');
    setCustomDescription('');
    setCustomIcon('✨');
    onSelectScenario(newScenario);
  };

  const handleCreateCustomScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customPartnerRole.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim(),
          language: customLanguage,
          nativeLanguage: nativeLanguageName,
          level: customLevel,
          aiCharacter: customPartnerRole.trim(),
          aiPersonality: customPersonality,
          userRole: customUserRole.trim() || 'Language Learner',
          situation: customDescription.trim() || customTitle.trim(),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          errBody?.errorCode === 'MISSING_API_KEY' || res.status === 503
            ? 'Voice service not configured. Please check API Key in Vercel Settings'
            : errBody.error || 'Unable to generate custom scenario details';
        throw new Error(msg);
      }

      const generated = await res.json();
      buildAndLaunchScenario(generated, false);
    } catch (err: any) {
      setGenerateError(
        err?.message || 'AI scenario setup failed. You can retry or launch directly.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5 sm:space-y-6">
      {/* Hero Welcome Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-700/40 p-4 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('heroBadge')}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t('heroTitleA')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300">
                {t('heroTitleB')}
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {t('heroSubtitle')}
            </p>

            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={openModalWithDefaults}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('createCustomScenario')}</span>
              </button>
              <button
                onClick={onOpenDashboard}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{t('dailyMissionsCount', { done: completedMissionsCount })}</span>
              </button>
              <button
                onClick={onOpenShare}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-indigo-500/40 text-indigo-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-indigo-400" />
                <span>{t('inviteRewardTitle')}</span>
              </button>
            </div>

            {/* Voice Privacy + Daily Free Calls Notice on Start Call Screen */}
            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t('voicePrivacyNotice')}</span>
              </span>
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-semibold cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {t('freeCallsStatus', {
                    remaining: quotaStatus.remainingToday,
                    limit: quotaStatus.limit,
                  })}
                </span>
              </button>
            </div>
          </div>

          {/* Compact Progress Strip */}
          <button
            type="button"
            onClick={onOpenDashboard}
            className="text-left bg-slate-950/75 hover:bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 w-full lg:w-72 space-y-2.5 transition group cursor-pointer shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">
                Level {levelInfo.level} · {levelInfo.title}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition" />
            </div>

            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="font-bold text-white tabular-nums">
                {userProgress.xp} <span className="text-slate-400 font-medium">XP</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-300 tabular-nums">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                {userProgress.streakDays}d
              </span>
              <span className="text-emerald-300 font-semibold tabular-nums">
                {completedMissionsCount}/5
              </span>
            </div>
          </button>
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
            placeholder={t('searchPlaceholder')}
            className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Level and Category Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto sm:overflow-x-auto">
          {/* Level Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 border border-slate-700/60 rounded-xl p-1 text-xs">
            {levels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
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
          <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 border border-slate-700/60 rounded-xl p-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
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
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl p-2.5 rounded-xl bg-slate-800 border border-slate-700/70 group-hover:scale-105 transition">
                  {scenario.icon}
                </span>
                <div className="flex items-center flex-wrap justify-end gap-1.5">
                  {scenario.isCustom && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/70 text-indigo-300 border border-indigo-700/60 uppercase">
                      Custom
                    </span>
                  )}
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
                <div className="flex items-center justify-between text-slate-400 gap-2">
                  <span>{t('aiPartnerLabel')}</span>
                  <span className="font-semibold text-slate-200 truncate">
                    {scenario.partnerRole}
                    {scenario.aiPersonality ? ` (${scenario.aiPersonality})` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 gap-2">
                  <span>{t('yourRoleLabel')}</span>
                  <span className="font-semibold text-slate-200 truncate">{scenario.userRole}</span>
                </div>
              </div>

              {/* Scenario Objectives Count */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('missionsLabel', { count: scenario.objectives.length })}</span>
                </span>
                {scenario.isCustom && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomScenario(scenario.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                    title="Delete custom scenario"
                    aria-label="Delete custom scenario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Launch Call Action */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-medium text-indigo-400">{t('realtimeVoice')}</span>
              <button
                onClick={() => onSelectScenario(scenario)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md group-hover:translate-x-0.5 cursor-pointer"
              >
                <span>{t('startCall')}</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredScenarios.length === 0 && (
        <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <p className="text-slate-400 text-sm">No scenarios match your current filter.</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedLevel('All');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-400 underline hover:text-indigo-300 cursor-pointer"
            >
              Clear filters
            </button>
            <button
              onClick={openModalWithDefaults}
              className="text-xs text-purple-300 underline hover:text-purple-200 cursor-pointer"
            >
              Create custom scenario
            </button>
          </div>
        </div>
      )}

      {/* AI Custom Scenario Creator Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center space-x-2">
                <Wand2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">AI Custom Scenario Creator</h3>
              </div>
              <button
                onClick={() => !isGenerating && setShowCustomModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomScenario} className="p-5 overflow-y-auto space-y-4">
              {/* Quick-fill real-life scenario templates */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Real-Life Scenario Templates (Quick Fill)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_SCENARIO_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/60 text-xs text-slate-200 transition cursor-pointer"
                    >
                      <span>{tpl.icon}</span>
                      <span>{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scenario Title
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Airport Immigration Check or Job Interview"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Language
                  </label>
                  <select
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.flag} {l.name} ({l.nativeName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Difficulty Level
                  </label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    AI Character Role
                  </label>
                  <input
                    type="text"
                    required
                    value={customPartnerRole}
                    onChange={(e) => setCustomPartnerRole(e.target.value)}
                    placeholder="e.g., Hiring Manager, Hotel Receptionist"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    AI Character Personality
                  </label>
                  <select
                    value={customPersonality}
                    onChange={(e) => setCustomPersonality(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {AI_PERSONALITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Role</label>
                <input
                  type="text"
                  value={customUserRole}
                  onChange={(e) => setCustomUserRole(e.target.value)}
                  placeholder="e.g., Traveler, Candidate, Patient, Guest"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Describe the Situation
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe what happens in this conversation, key topics to cover, or specific goals..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {generateError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-200 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    {generateError}
                  </span>
                  <button
                    type="button"
                    onClick={() => buildAndLaunchScenario({}, true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold shrink-0 cursor-pointer"
                  >
                    Start Anyway
                  </button>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition shadow-lg cursor-pointer disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Preparing AI Roleplay...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t('startCall')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worldwide Growth, Upgrade Preview & Download Our App Landing Section (SEO) */}
      <section
        aria-label={t('downloadAppTitle')}
        className="rounded-3xl bg-slate-900/70 border border-slate-800/90 p-5 sm:p-7 space-y-5 shadow-xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
              <Globe className="w-3.5 h-3.5" />
              <span>15 Worldwide Languages · iPhone, Android &amp; Desktop</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t('downloadAppTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t('downloadAppSubtitle')}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-time AI voices in 15 languages</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>3 Free daily voice calls · Unlimited chat</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Smart mistake fixes &amp; CEFR scorecards</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Works smoothly on 4G &amp; offline vocabulary</span>
              </li>
            </ul>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={onOpenAndroidInstall}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>{t('appStoreBtn')}</span>
              </button>
              <button
                type="button"
                onClick={onOpenAndroidInstall}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{t('playStoreBtn')}</span>
              </button>
              <button
                type="button"
                onClick={onOpenShare}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-indigo-300" />
                <span>{t('shareTitle')}</span>
              </button>
            </div>
          </div>

          {/* Worldwide Free + Locked Premium Card */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-purple-950/50 to-slate-950 border border-purple-500/35 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4" />
                <span>{t('upgradeBannerTitle')}</span>
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {t('freePlanTitle')} · Pro starts at{' '}
              <strong className="text-white tabular-nums">{formatPrice(9.99)}/mo</strong> (Locked preview — Stripe &amp; RevenueCat ready).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {t('upgradeBtn')}
              </button>
              <button
                type="button"
                onClick={onOpenShare}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition cursor-pointer"
              >
                {t('inviteRewardTitle')}
              </button>
            </div>
          </div>
        </div>

        {/* Worldwide Trust & Legal Footer */}
        <footer className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-300/90">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t('voicePrivacyNotice')}</span>
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onOpenLegalTab('privacy')}
              className="hover:text-indigo-300 transition cursor-pointer"
            >
              {t('privacyPolicyTitle')}
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalTab('terms')}
              className="hover:text-indigo-300 transition cursor-pointer"
            >
              {t('termsTitle')}
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalTab('contact')}
              className="hover:text-indigo-300 transition cursor-pointer"
            >
              {t('contactTitle')}
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalTab('settings')}
              className="text-rose-300/90 hover:text-rose-200 transition cursor-pointer"
            >
              {t('deleteMyDataBtn')}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
