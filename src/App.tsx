import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { LiveVoiceRoom, EndSessionPayload } from './components/LiveVoiceRoom';
import { ChatPracticeView } from './components/ChatPracticeView';
import { VocabularyVault } from './components/VocabularyVault';
import { LearningDashboard } from './components/LearningDashboard';
import { WordInspectorModal } from './components/WordInspectorModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import {
  loadCustomScenarios,
  saveCustomScenarios,
  loadUserProgress,
  saveUserProgress,
  recordCompletedSession,
  recordVocabLearned,
  recordMistakeCorrected,
  mergeVocabItem,
} from './services/learningStorage';

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

  // Scenario Selection
  const handleSelectScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
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
    setCurrentTab('live');
  };

  // Chat message sending with gemini-3.8-flash + Smart Mistake Correction
  const handleSendChatMessage = async (userText: string) => {
    setIsSendingChat(true);

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
          learnerLevel: activeScenario.level,
          scenario: `${activeScenario.title} (${activeScenario.partnerRole})`,
          aiPersonality: activeScenario.aiPersonality || '',
          situation: activeScenario.description,
          history: updatedHistory.slice(-8),
          objectives: activeScenario.objectives,
        }),
      });

      if (!res.ok) throw new Error('Chat partner failed to reply');
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

      if (data.reply) {
        handlePlayTTS(data.reply);
      }
    } catch (err) {
      console.error('Chat error:', err);
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
        onSelectTab={setCurrentTab}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        activeScenarioTitle={activeScenario.title}
        vaultCount={vaultItems.length}
        xp={userProgress.xp}
        streakDays={userProgress.streakDays}
        onOpenAndroidModal={() => setShowAndroidModal(true)}
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
            onOpenDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'live' && (
          <LiveVoiceRoom
            scenario={activeScenario}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            onEndSession={handleEndSession}
            onInspectPhrase={(phrase) => setInspectPhrase(phrase)}
            onSaveToVault={handleAddToVault}
            onSaveCorrection={handleSaveCorrection}
            onPlayTTS={handlePlayTTS}
            onSwitchToChat={() => setCurrentTab('chat')}
          />
        )}

        {currentTab === 'chat' && (
          <ChatPracticeView
            scenario={activeScenario}
            transcript={chatTranscript}
            onSendMessage={handleSendChatMessage}
            isSending={isSendingChat}
            onPlayTTS={handlePlayTTS}
            onInspectPhrase={(phrase) => setInspectPhrase(phrase)}
            onSaveToVault={handleAddToVault}
            onSaveCorrection={handleSaveCorrection}
            onSwitchToLiveVoice={() => setCurrentTab('live')}
            onEndChatSession={handleEndSession}
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
      </main>

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
      <AndroidInstallModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
      />
    </div>
  );
}
