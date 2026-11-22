import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import {
  Scenario,
  TranscriptItem,
  LiveVoiceName,
  VocabularyItem,
  MistakeCorrection,
  ConversationReport,
  UserProgressState,
} from './types';
import { PRESET_SCENARIOS } from './data/scenarios';
import { Navbar, AppTab } from './components/Navbar';
import { ScenarioPicker } from './components/ScenarioPicker';
import type { EndSessionPayload } from './components/LiveVoiceRoom';
import type { LegalTab } from './components/LegalSettingsModal';
import { useI18n } from './services/i18n';
import {
  getVoiceQuotaStatus,
  consumeFreeVoiceCall,
  loadReferralState,
  saveReferralState,
  wipeAllLinguaLiveData,
  REFERRAL_XP_REWARD,
  VoiceQuotaStatus,
  ReferralState,
} from './services/billingService';
import {
  loadCustomScenarios,
  saveCustomScenarios,
  loadUserProgress,
  saveUserProgress,
  createInitialProgress,
  recordCompletedSession,
  recordVocabLearned,
  recordMistakeCorrected,
  mergeVocabItem,
} from './services/learningStorage';

const LiveVoiceRoom = lazy(() =>
  import('./components/LiveVoiceRoom').then((m) => ({ default: m.LiveVoiceRoom }))
);
const ChatPracticeView = lazy(() =>
  import('./components/ChatPracticeView').then((m) => ({ default: m.ChatPracticeView }))
);
const VocabularyVault = lazy(() =>
  import('./components/VocabularyVault').then((m) => ({ default: m.VocabularyVault }))
);
const LearningDashboard = lazy(() =>
  import('./components/LearningDashboard').then((m) => ({ default: m.LearningDashboard }))
);
const WordInspectorModal = lazy(() =>
  import('./components/WordInspectorModal').then((m) => ({ default: m.WordInspectorModal }))
);
const SessionSummaryModal = lazy(() =>
  import('./components/SessionSummaryModal').then((m) => ({ default: m.SessionSummaryModal }))
);
const AndroidInstallModal = lazy(() =>
  import('./components/AndroidInstallModal').then((m) => ({ default: m.AndroidInstallModal }))
);
const PricingUpgradeModal = lazy(() =>
  import('./components/PricingUpgradeModal').then((m) => ({ default: m.PricingUpgradeModal }))
);
const ShareInviteModal = lazy(() =>
  import('./components/ShareInviteModal').then((m) => ({ default: m.ShareInviteModal }))
);
const LegalSettingsModal = lazy(() =>
  import('./components/LegalSettingsModal').then((m) => ({ default: m.LegalSettingsModal }))
);

const LazyFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center p-10">
    <div className="flex items-center gap-2.5 text-xs font-semibold text-indigo-300 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <span>Loading...</span>
    </div>
  </div>
);

const DEFAULT_VOCABULARY: VocabularyItem[] = [
  {
    id: 'init-pt-1',
    word: 'Uma bica e um pastel de nata',
    translation: 'An espresso and a custard tart',
    pronunciation: 'oom-ah BEE-kah ee oom pahzh-TEL deh NAH-tah',
    exampleSentence: 'Bom dia, queria uma bica e um pastel de nata, se faz favor.',
    exampleTranslation: 'Good morning, I would like an espresso and a custard tart, please.',
    language: 'Portuguese',
    type: 'phrase',
    learnedAt: Date.now() - 3600000,
    mastered: false,
  },
  {
    id: 'init-ko-1',
    word: '삼겹살 2인분 주세요',
    translation: 'Two servings of pork belly, please',
    pronunciation: 'Samgyeopsal i-inbun juseyo',
    exampleSentence: '여기요, 삼겹살 2인분하고 공기밥 주세요!',
    exampleTranslation: 'Excuse me, two servings of pork belly and a bowl of rice please!',
    language: 'Korean',
    type: 'phrase',
    learnedAt: Date.now() - 7200000,
    mastered: false,
  },
  {
    id: 'init-en-1',
    word: 'Could you give me a quick walkthrough?',
    translation: 'Could you give me a brief explanation/overview?',
    pronunciation: 'Kood yoo giv mee uh kwik wawk-throo?',
    exampleSentence: 'I loved the proposal, could you give me a quick walkthrough?',
    exampleTranslation: 'I loved the proposal, could you give me a brief overview?',
    language: 'English',
    type: 'phrase',
    learnedAt: Date.now() - 14400000,
    mastered: true,
  },
  {
    id: 'init-es-1',
    word: 'Quisiera un café con leche',
    translation: 'I would like a coffee with milk',
    pronunciation: 'kee-SYEH-rah oon kah-FEH kohn LEH-cheh',
    exampleSentence: 'Buenos días, quisiera un café con leche y una tostada.',
    exampleTranslation: 'Good morning, I would like a coffee with milk and toast.',
    language: 'Spanish',
    type: 'phrase',
    learnedAt: Date.now() - 86400000,
    mastered: true,
  },
  {
    id: 'init-ja-1',
    word: 'おすすめは何ですか？',
    translation: 'What do you recommend?',
    pronunciation: 'Osusume wa nan desu ka?',
    exampleSentence: 'すみません、今日のおすすめは何ですか？',
    exampleTranslation: "Excuse me, what is today's recommendation?",
    language: 'Japanese',
    type: 'phrase',
    learnedAt: Date.now() - 28800000,
    mastered: false,
  },
];

export default function App() {
  const { nativeLanguageName, setAppLang, t } = useI18n();
  const [currentTab, setCurrentTab] = useState<AppTab>('scenarios');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [activeScenario, setActiveScenario] = useState<Scenario>(PRESET_SCENARIOS[0]);
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>('Zephyr');

  // Custom scenarios (persisted in localStorage)
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>(() => loadCustomScenarios());
  useEffect(() => {
    saveCustomScenarios(customScenarios);
  }, [customScenarios]);

  // Gamification & Progress state (persisted in localStorage)
  const [userProgress, setUserProgress] = useState<UserProgressState>(() => loadUserProgress());
  useEffect(() => {
    saveUserProgress(userProgress);
  }, [userProgress]);

  // Worldwide Free Plan Quota (3 calls/day), Referral +100 XP & Legal/Pricing Modals
  const [quotaStatus, setQuotaStatus] = useState<VoiceQuotaStatus>(() => getVoiceQuotaStatus());
  const [referralState, setReferralState] = useState<ReferralState>(() => loadReferralState());
  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    limitTriggered: boolean;
  }>({ isOpen: false, limitTriggered: false });
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [legalModalState, setLegalModalState] = useState<{
    isOpen: boolean;
    tab: LegalTab;
  }>({ isOpen: false, tab: 'settings' });

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && ref !== referralState.myCode && !referralState.referredByCode) {
        const nextRef: ReferralState = { ...referralState, referredByCode: ref };
        setReferralState(nextRef);
        saveReferralState(nextRef);
      }
    } catch {
      // Ignore query parse failures
    }
  }, []);

  // Transcripts & Chat state
  const [chatTranscript, setChatTranscript] = useState<TranscriptItem[]>([
    {
      id: 'starter-1',
      role: 'model',
      text: PRESET_SCENARIOS[0].starterGreeting,
      translation: PRESET_SCENARIOS[0].starterTranslation,
      phonetics: PRESET_SCENARIOS[0].starterPhonetics,
      timestamp: Date.now(),
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatFallbackNotice, setChatFallbackNotice] = useState<string | null>(null);
  const [chatCompletedObjectives, setChatCompletedObjectives] = useState<string[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<
    { text: string; translation: string }[]
  >(PRESET_SCENARIOS[0].usefulPhrases || []);

  // Word inspector modal state
  const [inspectPhrase, setInspectPhrase] = useState<string | null>(null);

  // Session Feedback Report modal state
  const [summaryState, setSummaryState] = useState<{
    isOpen: boolean;
    scenario: Scenario;
    sessionPayload: EndSessionPayload | null;
    existingReport: ConversationReport | null;
  } | null>(null);

  // Android APK / Install modal state
  const [showAndroidModal, setShowAndroidModal] = useState<boolean>(false);

  // Vocabulary Memory state (persisted in localStorage)
  const [vaultItems, setVaultItems] = useState<VocabularyItem[]>(() => {
    try {
      const saved = localStorage.getItem('lingualive_vocab');
      return saved ? JSON.parse(saved) : DEFAULT_VOCABULARY;
    } catch {
      return DEFAULT_VOCABULARY;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lingualive_vocab', JSON.stringify(vaultItems));
    } catch (err) {
      console.error('Failed to save vocabulary:', err);
    }
  }, [vaultItems]);

  // Audio player ref for TTS
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play Native TTS audio using /api/tts
  const handlePlayTTS = async (text: string) => {
    if (!text) return;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });
      if (!res.ok) throw new Error('TTS request failed');
      const data = await res.json();
      if (data.audioDataUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = data.audioDataUrl;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('TTS playback error:', err);
    }
  };

  // Custom Scenario CRUD
  const handleSaveCustomScenario = (scenario: Scenario) => {
    setCustomScenarios((prev) => [scenario, ...prev.filter((s) => s.id !== scenario.id)]);
  };

  const handleDeleteCustomScenario = (id: string) => {
    setCustomScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  // Scenario Selection (respects 3/day free voice call limit)
  const handleSelectScenario = (scenario: Scenario) => {
    const latestQuota = getVoiceQuotaStatus();
    setQuotaStatus(latestQuota);
    setActiveScenario(scenario);
    setChatError(null);
    setChatTranscript([
      {
        id: `starter-${Date.now()}`,
        role: 'model',
        text: scenario.starterGreeting,
        translation: scenario.starterTranslation,
        phonetics: scenario.starterPhonetics,
        timestamp: Date.now(),
      },
    ]);
    setSuggestedReplies(scenario.usefulPhrases || []);
    setChatCompletedObjectives([]);

    if (latestQuota.isLimitReached) {
      setChatFallbackNotice(t('limitReachedBody'));
      setUpgradeModalState({ isOpen: true, limitTriggered: true });
      setCurrentTab('chat');
      return;
    }

    setChatFallbackNotice(null);
    setCurrentTab('live');
  };

  const handleSelectTab = useCallback(
    (tab: AppTab) => {
      if (tab === 'live') {
        const latestQuota = getVoiceQuotaStatus();
        setQuotaStatus(latestQuota);
        if (latestQuota.isLimitReached) {
          setUpgradeModalState({ isOpen: true, limitTriggered: true });
          return;
        }
      }
      setCurrentTab(tab);
    },
    []
  );

  const handleVoiceCallStarted = useCallback((sessionId: string) => {
    const updated = consumeFreeVoiceCall(sessionId);
    setQuotaStatus(updated);
  }, []);

  const handleInviteShared = useCallback(() => {
    setReferralState((prev) => {
      const awardNow = !prev.referralBonusClaimed;
      const next: ReferralState = {
        ...prev,
        invitedCount: prev.invitedCount + 1,
        referralBonusClaimed: true,
      };
      saveReferralState(next);
      if (awardNow) {
        setUserProgress((prog) => ({
          ...prog,
          xp: prog.xp + REFERRAL_XP_REWARD,
        }));
      }
      return next;
    });
  }, []);

  const handleDeleteAllUserData = useCallback(() => {
    wipeAllLinguaLiveData();
    setCustomScenarios([]);
    setUserProgress(createInitialProgress());
    setVaultItems([]);
    setQuotaStatus(getVoiceQuotaStatus());
    setReferralState(loadReferralState());
    setAppLang('en');
  }, [setAppLang]);

  const handleSwitchToChat = useCallback((reason?: string) => {
    setChatFallbackNotice(
      reason ||
        'Switched to Text Chat mode so you can continue practicing seamlessly.'
    );
    setCurrentTab('chat');
  }, []);

  // Chat message sending with gemini-3.8-flash + Smart Mistake Correction
  const handleSendChatMessage = async (userText: string) => {
    setIsSendingChat(true);
    setChatError(null);

    const userItemId = `user-${Date.now()}`;
    const userItem: TranscriptItem = {
      id: userItemId,
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    };
    const updatedHistory = [...chatTranscript, userItem];
    setChatTranscript(updatedHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          targetLanguage: activeScenario.language,
          nativeLanguage: nativeLanguageName,
          learnerLevel: activeScenario.level,
          scenario: `${activeScenario.title} (${activeScenario.partnerRole})`,
          aiPersonality: activeScenario.aiPersonality || '',
          situation: activeScenario.description,
          history: updatedHistory.slice(-8),
          objectives: activeScenario.objectives,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg =
          errData?.errorCode === 'MISSING_API_KEY' || res.status === 503
            ? 'Voice service not configured. Please check API Key in Vercel Settings'
            : errData?.error || 'Chat partner failed to reply. Please check your connection and try again.';
        throw new Error(msg);
      }
      const data = await res.json();

      const rawCorrection = data.mistakeCorrection;
      const correctionObj: MistakeCorrection | null =
        rawCorrection && rawCorrection.corrected
          ? {
              id: `chat-fix-${userItemId}`,
              original: rawCorrection.original || userText,
              intendedMeaning: rawCorrection.intendedMeaning || '',
              corrected: rawCorrection.corrected,
              errorType: rawCorrection.errorType || 'Grammar',
              explanation: rawCorrection.explanation || '',
              additionalExample: rawCorrection.additionalExample || '',
              targetLanguage: activeScenario.language,
            }
          : null;

      const modelItem: TranscriptItem = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || '¡Muy bien!',
        translation: data.translation,
        phonetics: data.phonetics,
        grammarFeedback: data.grammarFeedback,
        timestamp: Date.now(),
      };

      setChatTranscript((prev) => [
        ...prev.map((item) =>
          item.id === userItemId && correctionObj ? { ...item, correction: correctionObj } : item
        ),
        modelItem,
      ]);

      if (data.suggestedReplies && data.suggestedReplies.length > 0) {
        setSuggestedReplies(data.suggestedReplies);
      }

      if (Array.isArray(data.completedObjectives) && data.completedObjectives.length > 0) {
        setChatCompletedObjectives((prev) =>
          Array.from(new Set([...prev, ...data.completedObjectives]))
        );
      }

      if (data.reply) {
        handlePlayTTS(data.reply);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatError(
        err?.message ||
          'Network or AI service error while replying. Please try again.'
      );
    } finally {
      setIsSendingChat(false);
    }
  };

  // Vocabulary Memory handlers (only explicit user-triggered saves)
  const handleAddToVault = useCallback(
    (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => {
      const normalizedItem: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'> = {
        ...item,
        type: item.type || (item.word.trim().split(/\s+/).length >= 3 ? 'phrase' : 'word'),
      };
      setVaultItems((prev) => {
        const nextVault = mergeVocabItem(prev, normalizedItem);
        setUserProgress((prog) => {
          const { nextState } = recordVocabLearned(prog, normalizedItem.word, nextVault.length);
          return nextState;
        });
        return nextVault;
      });
    },
    []
  );

  const handleSaveCorrection = useCallback(
    (correction: MistakeCorrection) => {
      const lang = correction.targetLanguage || activeScenario.language;
      setVaultItems((prev) => {
        const nextVault = mergeVocabItem(prev, {
          word: correction.corrected,
          translation: correction.intendedMeaning || `Correction for: ${correction.original}`,
          exampleSentence: correction.additionalExample || undefined,
          language: lang,
          type: 'correction',
          notes: correction.explanation,
        });

        setUserProgress((prog) => {
          const mistakeKey = `${correction.original}::${correction.corrected}`;
          const step1 = recordMistakeCorrected(prog, mistakeKey, nextVault.length);
          const step2 = recordVocabLearned(step1.nextState, correction.corrected, nextVault.length);
          return step2.nextState;
        });

        return nextVault;
      });
    },
    [activeScenario.language]
  );

  const handleToggleMastered = (id: string) => {
    setVaultItems((prev) => {
      const target = prev.find((item) => item.id === id);
      const next = prev.map((item) =>
        item.id === id ? { ...item, mastered: !item.mastered } : item
      );
      if (target && !target.mastered) {
        setUserProgress((prog) => recordVocabLearned(prog, target.word, next.length).nextState);
      }
      return next;
    });
  };

  const handleMarkPracticed = (id: string) => {
    setVaultItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              practiceCount: (item.practiceCount || 0) + 1,
              lastPracticedAt: Date.now(),
            }
          : item
      )
    );
  };

  const handleDeleteVaultItem = (id: string) => {
    setVaultItems((prev) => prev.filter((item) => item.id !== id));
  };

  // End Live Voice or Chat Session handler -> Opens AI Conversation Feedback Report
  const handleEndSession = useCallback(
    (payload: EndSessionPayload) => {
      setSummaryState({
        isOpen: true,
        scenario: activeScenario,
        sessionPayload: payload,
        existingReport: null,
      });
    },
    [activeScenario]
  );

  const handleReportReady = useCallback(
    (report: ConversationReport) => {
      setUserProgress((prev) => {
        const { nextState, totalSessionXp } = recordCompletedSession(prev, {
          sessionId: report.sessionId,
          language: report.language,
          level: report.level,
          durationSeconds: report.durationSeconds,
          userTurnCount: report.userTurnCount,
          completedObjectivesCount: report.completedObjectives.length,
          report,
          vocabCount: vaultItems.length,
        });

        setSummaryState((cur) =>
          cur && cur.sessionPayload?.sessionId === report.sessionId
            ? {
                ...cur,
                existingReport: { ...report, xpEarned: totalSessionXp },
              }
            : cur
        );

        return nextState;
      });
    },
    [vaultItems.length]
  );

  const handleViewSavedReport = (report: ConversationReport) => {
    const matchedScenario =
      [...customScenarios, ...PRESET_SCENARIOS].find((s) => s.title === report.scenarioTitle) || {
        ...activeScenario,
        title: report.scenarioTitle,
        language: report.language,
        level: report.level,
      };
    setSummaryState({
      isOpen: true,
      scenario: matchedScenario,
      sessionPayload: null,
      existingReport: report,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        activeScenarioTitle={activeScenario.title}
        vaultCount={vaultItems.length}
        xp={userProgress.xp}
        streakDays={userProgress.streakDays}
        quotaStatus={quotaStatus}
        onOpenAndroidModal={() => setShowAndroidModal(true)}
        onOpenUpgradeModal={() => setUpgradeModalState({ isOpen: true, limitTriggered: false })}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenLegalModal={() => setLegalModalState({ isOpen: true, tab: 'settings' })}
      />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentTab === 'scenarios' && (
          <ScenarioPicker
            onSelectScenario={handleSelectScenario}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            customScenarios={customScenarios}
            onSaveCustomScenario={handleSaveCustomScenario}
            onDeleteCustomScenario={handleDeleteCustomScenario}
            userProgress={userProgress}
            quotaStatus={quotaStatus}
            onOpenDashboard={() => setCurrentTab('dashboard')}
            onOpenUpgrade={() => setUpgradeModalState({ isOpen: true, limitTriggered: false })}
            onOpenShare={() => setShowShareModal(true)}
            onOpenAndroidInstall={() => setShowAndroidModal(true)}
            onOpenLegalTab={(tab) => setLegalModalState({ isOpen: true, tab })}
          />
        )}

        <Suspense fallback={currentTab !== 'scenarios' ? <LazyFallback /> : null}>
          {currentTab === 'live' && (
            <LiveVoiceRoom
              scenario={activeScenario}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
              onVoiceCallStarted={handleVoiceCallStarted}
              onEndSession={handleEndSession}
              onInspectPhrase={(phrase) => setInspectPhrase(phrase)}
              onSaveToVault={handleAddToVault}
              onSaveCorrection={handleSaveCorrection}
              onPlayTTS={handlePlayTTS}
              onSwitchToChat={handleSwitchToChat}
            />
          )}

          {currentTab === 'chat' && (
            <ChatPracticeView
              scenario={activeScenario}
              transcript={chatTranscript}
              onSendMessage={handleSendChatMessage}
              isSending={isSendingChat}
              chatError={chatError}
              onDismissChatError={() => setChatError(null)}
              fallbackNotice={chatFallbackNotice}
              onDismissFallbackNotice={() => setChatFallbackNotice(null)}
              onPlayTTS={handlePlayTTS}
              onInspectPhrase={(phrase) => setInspectPhrase(phrase)}
              onSaveToVault={handleAddToVault}
              onSaveCorrection={handleSaveCorrection}
              onSwitchToLiveVoice={() => {
                const latestQuota = getVoiceQuotaStatus();
                setQuotaStatus(latestQuota);
                if (latestQuota.isLimitReached) {
                  setUpgradeModalState({ isOpen: true, limitTriggered: true });
                  return;
                }
                setChatFallbackNotice(null);
                setCurrentTab('live');
              }}
              onEndChatSession={handleEndSession}
              completedObjectives={chatCompletedObjectives}
              suggestedReplies={suggestedReplies}
            />
          )}

          {currentTab === 'vault' && (
            <VocabularyVault
              items={vaultItems}
              onToggleMastered={handleToggleMastered}
              onDeleteItem={handleDeleteVaultItem}
              onAddItem={handleAddToVault}
              onMarkPracticed={handleMarkPracticed}
              onPlayTTS={handlePlayTTS}
              selectedLanguage={selectedLanguage}
            />
          )}

          {currentTab === 'dashboard' && (
            <LearningDashboard
              progress={userProgress}
              vocabItems={vaultItems}
              onViewReport={handleViewSavedReport}
              onStartScenarios={() => setCurrentTab('scenarios')}
              onOpenVault={() => setCurrentTab('vault')}
            />
          )}
        </Suspense>
      </main>

      {/* Lazy-Loaded Modals */}
      <Suspense fallback={null}>
        {/* Deep Word & Grammar Inspector Modal */}
        {inspectPhrase && (
          <WordInspectorModal
            phrase={inspectPhrase}
            targetLanguage={activeScenario.language}
            isOpen={Boolean(inspectPhrase)}
            onClose={() => setInspectPhrase(null)}
            onSaveToVault={handleAddToVault}
            onPlayTTS={handlePlayTTS}
          />
        )}

        {/* AI Conversation Feedback Report Modal */}
        {summaryState && (
          <SessionSummaryModal
            isOpen={summaryState.isOpen}
            scenario={summaryState.scenario}
            sessionPayload={summaryState.sessionPayload}
            existingReport={summaryState.existingReport}
            onClose={() => setSummaryState(null)}
            onReportReady={handleReportReady}
            onSaveCorrection={handleSaveCorrection}
            onSaveVocab={handleAddToVault}
            onPlayTTS={handlePlayTTS}
            onOpenVault={() => {
              setSummaryState(null);
              setCurrentTab('vault');
            }}
            onOpenDashboard={() => {
              setSummaryState(null);
              setCurrentTab('dashboard');
            }}
            onNewScenario={() => {
              setSummaryState(null);
              setCurrentTab('scenarios');
            }}
          />
        )}

        {/* Android App & APK Installation Guide Modal */}
        {showAndroidModal && (
          <AndroidInstallModal
            isOpen={showAndroidModal}
            onClose={() => setShowAndroidModal(false)}
          />
        )}

        {/* Free Plan & Locked Premium Upgrade Preview Modal */}
        {upgradeModalState.isOpen && (
          <PricingUpgradeModal
            isOpen={upgradeModalState.isOpen}
            onClose={() => setUpgradeModalState({ isOpen: false, limitTriggered: false })}
            quotaStatus={quotaStatus}
            limitTriggered={upgradeModalState.limitTriggered}
            onContinueFreeChat={() => {
              setUpgradeModalState({ isOpen: false, limitTriggered: false });
              setCurrentTab('chat');
            }}
          />
        )}

        {/* Share & Invite Friend (+100 XP) Modal */}
        {showShareModal && (
          <ShareInviteModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            referralState={referralState}
            onInviteShared={handleInviteShared}
          />
        )}

        {/* Settings, GDPR Deletion & Legal (Privacy, Terms, Contact) Modal */}
        {legalModalState.isOpen && (
          <LegalSettingsModal
            isOpen={legalModalState.isOpen}
            initialTab={legalModalState.tab}
            onClose={() => setLegalModalState((prev) => ({ ...prev, isOpen: false }))}
            onDeleteAllUserData={handleDeleteAllUserData}
          />
        )}
      </Suspense>
    </div>
  );
}
