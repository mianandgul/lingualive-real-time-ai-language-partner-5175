export type LearnerLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type PolitenessRegister = 'Casual (Informal)' | 'Standard Polite' | 'Formal / Business';
export type AudioMode = 'vad' | 'push_to_talk';

export interface LanguageOption {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  code: string;
  defaultVoice: string;
}

export interface ScenarioObjective {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: 'Business' | 'Work' | 'Travel' | 'Dining' | 'Social' | 'Academic' | 'Everyday' | 'Custom';
  language: string;
  level: LearnerLevel;
  cefr?: CEFRLevel;
  icon: string;
  partnerRole: string;
  userRole: string;
  aiPersonality?: string;
  isCustom?: boolean;
  createdAt?: number;
  register?: PolitenessRegister;
  culturalEtiquetteNote?: string;
  starterPrompt: string;
  starterGreeting: string;
  starterTranslation: string;
  starterPhonetics?: string;
  objectives: ScenarioObjective[];
  usefulPhrases: { text: string; translation: string; register?: string }[];
}

export interface MistakeCorrection {
  id: string;
  original: string;
  intendedMeaning: string;
  corrected: string;
  errorType: 'Grammar' | 'Vocabulary' | 'Structure' | 'Register';
  explanation: string;
  additionalExample: string;
  targetLanguage?: string;
}

export interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  translation?: string;
  phonetics?: string;
  ipa?: string;
  grammarFeedback?: string | null;
  registerFeedback?: string | null;
  pronunciationTip?: string | null;
  correction?: MistakeCorrection | null;
  audioUrl?: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface WordToken {
  word: string;
  lemma: string;
  partOfSpeech: string;
  meaning: string;
  ipa?: string;
}

export interface WordInspection {
  phrase: string;
  translation: string;
  pronunciation: string;
  ipa?: string;
  tokens: WordToken[];
  grammarNote: string;
  culturalTip: string;
  alternativeFormal?: string;
  alternativeCasual?: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  ipa?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  language: string;
  cefr?: CEFRLevel;
  type?: 'word' | 'phrase' | 'correction';
  notes?: string;
  learnedAt: number;
  mastered: boolean;
  practiceCount?: number;
  lastPracticedAt?: number;
}

export type LiveVoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface CEFRAssessment {
  overallCEFR: CEFRLevel;
  fluencyScore: number; // 0 - 100
  accuracyScore: number; // 0 - 100
  vocabularyScore: number; // 0 - 100
  taskCompletionScore: number; // 0 - 100
  keyStrengths: string[];
  areasForImprovement: string[];
  recommendedDrills: string[];
}

export interface BetterAlternative {
  original: string;
  improved: string;
  contextNote: string;
}

export interface PracticeWordSuggestion {
  word: string;
  translation: string;
  phonetics?: string;
  reason: string;
  exampleSentence: string;
}

export interface ConversationReport {
  id: string;
  sessionId: string;
  createdAt: number;
  scenarioTitle: string;
  language: string;
  level: LearnerLevel;
  durationSeconds: number;
  userTurnCount: number;
  completedObjectives: string[];
  totalObjectives: number;
  insufficientData: boolean;
  overallScore: number | null;
  grammarAccuracy: number | null;
  pronunciationAvailable: boolean;
  pronunciationScore: number | null;
  pronunciationNote: string;
  vocabularyUsage: number | null;
  speakingFluency: number | null;
  sentenceStructure: number | null;
  cefrEstimate: CEFRLevel;
  mistakes: MistakeCorrection[];
  betterAlternatives: BetterAlternative[];
  wordsToPractice: PracticeWordSuggestion[];
  strengths: string[];
  summaryFeedback: string;
  xpEarned: number;
}

export interface DailyMissionDefinition {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  unit: string;
  metric: 'longestSessionSecondsToday' | 'wordsLearnedToday' | 'beginnerScenariosToday' | 'speakingSecondsToday' | 'mistakesCorrectedToday';
}

export interface DailyMissionStatus extends DailyMissionDefinition {
  progress: number;
  completed: boolean;
  xpAwarded: boolean;
}

export interface CompletedMissionRecord {
  id: string;
  missionId: string;
  title: string;
  xpAwarded: number;
  completedAt: number;
  date: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface DailyActivityState {
  date: string;
  speakingSecondsToday: number;
  longestSessionSecondsToday: number;
  sessionsToday: number;
  wordsLearnedToday: number;
  learnedWordsListToday: string[];
  beginnerScenariosToday: number;
  mistakesCorrectedToday: number;
  correctedMistakeKeysToday: string[];
  claimedMissionIds: string[];
}

export interface UserProgressState {
  xp: number;
  streakDays: number;
  lastActiveDate: string | null;
  totalSpeakingSeconds: number;
  sessionsCompleted: number;
  beginnerScenariosCompleted: number;
  mistakesCorrectedCount: number;
  languagesPracticed: string[];
  claimedSessionIds: string[];
  dailyState: DailyActivityState;
  completedMissionHistory: CompletedMissionRecord[];
  unlockedBadgeIds: Record<string, number>;
  recentReports: ConversationReport[];
}
