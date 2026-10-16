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
  register?: PolitenessRegister;
  culturalEtiquetteNote?: string;
  starterPrompt: string;
  starterGreeting: string;
  starterTranslation: string;
  starterPhonetics?: string;
  objectives: ScenarioObjective[];
  usefulPhrases: { text: string; translation: string; register?: string }[];
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
  learnedAt: number;
  mastered: boolean;
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
