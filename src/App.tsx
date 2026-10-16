import React, { useState, useEffect, useRef } from 'react';
import {
  Scenario,
  TranscriptItem,
  LiveVoiceName,
  VocabularyItem,
} from './types';
import { PRESET_SCENARIOS } from './data/scenarios';
import { Navbar } from './components/Navbar';
import { ScenarioPicker } from './components/ScenarioPicker';
import { LiveVoiceRoom } from './components/LiveVoiceRoom';
import { ChatPracticeView } from './components/ChatPracticeView';
import { VocabularyVault } from './components/VocabularyVault';
import { WordInspectorModal } from './components/WordInspectorModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';

const DEFAULT_VOCABULARY: VocabularyItem[] = [
  {
    id: 'init-pt-1',
    word: 'Uma bica e um pastel de nata',
    translation: 'An espresso and a custard tart',
    pronunciation: 'oom-ah BEE-kah ee oom pahzh-TEL deh NAH-tah',
    exampleSentence: 'Bom dia, queria uma bica e um pastel de nata, se faz favor.',
    exampleTranslation: 'Good morning, I would like an espresso and a custard tart, please.',
    language: 'Portuguese',
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
    learnedAt: Date.now() - 86400000,
    mastered: true,
  },
  {
    id: 'init-ja-1',
    word: 'おすすめは何ですか？',
    translation: 'What do you recommend?',
    pronunciation: 'Osusume wa nan desu ka?',
    exampleSentence: 'すみません、今日のおすすめは何ですか？',
    exampleTranslation: 'Excuse me, what is today\'s recommendation?',
    language: 'Japanese',
    learnedAt: Date.now() - 28800000,
    mastered: false,
  },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'scenarios' | 'live' | 'chat' | 'vault'>('scenarios');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [activeScenario, setActiveScenario] = useState<Scenario>(PRESET_SCENARIOS[0]);
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>('Zephyr');

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

  // Session summary modal state
  const [summaryData, setSummaryData] = useState<{
    isOpen: boolean;
    scenario: Scenario;
    transcript: TranscriptItem[];
    completedObjectives: string[];
  } | null>(null);

  // Android APK / Install modal state
  const [showAndroidModal, setShowAndroidModal] = useState<boolean>(false);

  // Vocabulary Vault state (persisted in localStorage)
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

  // Chat message sending with gemini-3.8-flash
  const handleSendChatMessage = async (userText: string) => {
    setIsSendingChat(true);

    const userItem: TranscriptItem = {
      id: `user-${Date.now()}`,
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
          history: updatedHistory.slice(-8),
          objectives: activeScenario.objectives,
        }),
      });

      if (!res.ok) throw new Error('Chat partner failed to reply');
      const data = await res.json();

      const modelItem: TranscriptItem = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || '¡Muy bien!',
        translation: data.translation,
        phonetics: data.phonetics,
        grammarFeedback: data.grammarFeedback,
        timestamp: Date.now(),
      };

      setChatTranscript((prev) => [...prev, modelItem]);
      if (data.suggestedReplies && data.suggestedReplies.length > 0) {
        setSuggestedReplies(data.suggestedReplies);
      }

      // Auto play partner's response
      if (data.reply) {
        handlePlayTTS(data.reply);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Vocabulary handlers
  const handleAddToVault = (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => {
    const newItem: VocabularyItem = {
      ...item,
      id: `vocab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      learnedAt: Date.now(),
      mastered: false,
    };
    setVaultItems((prev) => [newItem, ...prev.filter((v) => v.word.toLowerCase() !== item.word.toLowerCase())]);
  };

  const handleToggleMastered = (id: string) => {
    setVaultItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, mastered: !item.mastered } : item))
    );
  };

  const handleDeleteVaultItem = (id: string) => {
    setVaultItems((prev) => prev.filter((item) => item.id !== id));
  };

  // End Live Voice Session handler
  const handleEndLiveSession = (items: TranscriptItem[], completedObjectives: string[]) => {
    setSummaryData({
      isOpen: true,
      scenario: activeScenario,
      transcript: items,
      completedObjectives,
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
        onOpenAndroidModal={() => setShowAndroidModal(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentTab === 'scenarios' && (
          <ScenarioPicker
            onSelectScenario={handleSelectScenario}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        )}

        {currentTab === 'live' && (
          <LiveVoiceRoom
            scenario={activeScenario}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            onEndSession={handleEndLiveSession}
            onInspectPhrase={(phrase) => setInspectPhrase(phrase)}
            onSaveToVault={handleAddToVault}
            onPlayTTS={handlePlayTTS}
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
            onSwitchToLiveVoice={() => setCurrentTab('live')}
            suggestedReplies={suggestedReplies}
          />
        )}

        {currentTab === 'vault' && (
          <VocabularyVault
            items={vaultItems}
            onToggleMastered={handleToggleMastered}
            onDeleteItem={handleDeleteVaultItem}
            onAddItem={handleAddToVault}
            onPlayTTS={handlePlayTTS}
            selectedLanguage={selectedLanguage}
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

      {/* Session Summary Modal */}
      {summaryData && (
        <SessionSummaryModal
          isOpen={summaryData.isOpen}
          scenario={summaryData.scenario}
          transcript={summaryData.transcript}
          completedObjectives={summaryData.completedObjectives}
          onClose={() => setSummaryData(null)}
          onOpenVault={() => {
            setSummaryData(null);
            setCurrentTab('vault');
          }}
          onNewScenario={() => {
            setSummaryData(null);
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
