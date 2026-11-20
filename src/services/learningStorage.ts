import {
  AchievementBadge,
  ConversationReport,
  DailyActivityState,
  DailyMissionDefinition,
  DailyMissionStatus,
  Scenario,
  UserProgressState,
  VocabularyItem,
} from '../types';

const CUSTOM_SCENARIOS_KEY = 'lingualive_custom_scenarios';
const PROGRESS_STORAGE_KEY = 'lingualive_progress';

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
}

export const DAILY_MISSION_DEFINITIONS: DailyMissionDefinition[] = [
  {
    id: 'daily-5min-conv',
    title: 'Complete one 5-minute conversation',
    description: 'Hold a continuous voice or practice session for at least 5 minutes.',
    xpReward: 75,
    target: 300,
    unit: 'sec',
    metric: 'longestSessionSecondsToday',
  },
  {
    id: 'daily-5-vocab',
    title: 'Learn 5 new vocabulary words',
    description: 'Save or master 5 distinct words or phrases in your Vocabulary Memory.',
    xpReward: 50,
    target: 5,
    unit: 'words',
    metric: 'wordsLearnedToday',
  },
  {
    id: 'daily-beginner-scenario',
    title: 'Complete one Beginner scenario',
    description: 'Finish a Beginner level roleplay with at least 2 spoken turns.',
    xpReward: 40,
    target: 1,
    unit: 'scenario',
    metric: 'beginnerScenariosToday',
  },
  {
    id: 'daily-10min-speak',
    title: 'Practice speaking for 10 minutes',
    description: 'Accumulate 10 total minutes of live voice practice today.',
    xpReward: 100,
    target: 600,
    unit: 'sec',
    metric: 'speakingSecondsToday',
  },
  {
    id: 'daily-3-mistakes',
    title: 'Correct 3 grammar mistakes',
    description: 'Review and save 3 smart mistake corrections from your conversations.',
    xpReward: 60,
    target: 3,
    unit: 'fixes',
    metric: 'mistakesCorrectedToday',
  },
];

export const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  {
    id: 'badge-first-call',
    title: 'First Conversation',
    description: 'Complete your first real AI conversation session.',
    icon: '🎙️',
  },
  {
    id: 'badge-polyglot',
    title: 'Polyglot Explorer',
    description: 'Complete practice sessions in 2 or more languages.',
    icon: '🌍',
  },
  {
    id: 'badge-vocab-10',
    title: 'Word Collector',
    description: 'Build a personal memory of 10 or more saved words.',
    icon: '📚',
  },
  {
    id: 'badge-grammar-5',
    title: 'Precision Speaker',
    description: 'Review and save 5 smart mistake corrections.',
    icon: '✨',
  },
  {
    id: 'badge-streak-3',
    title: '3-Day Streak',
    description: 'Practice speaking for 3 consecutive days.',
    icon: '🔥',
  },
  {
    id: 'badge-speaker-30',
    title: 'Dedicated Conversationalist',
    description: 'Accumulate 30 minutes of total speaking practice.',
    icon: '🏆',
  },
];

export function createEmptyDailyState(dateKey: string = getLocalDateKey()): DailyActivityState {
  return {
    date: dateKey,
    speakingSecondsToday: 0,
    longestSessionSecondsToday: 0,
    sessionsToday: 0,
    wordsLearnedToday: 0,
    learnedWordsListToday: [],
    beginnerScenariosToday: 0,
    mistakesCorrectedToday: 0,
    correctedMistakeKeysToday: [],
    claimedMissionIds: [],
  };
}

export function createInitialProgress(): UserProgressState {
  return {
    xp: 0,
    streakDays: 0,
    lastActiveDate: null,
    totalSpeakingSeconds: 0,
    sessionsCompleted: 0,
    beginnerScenariosCompleted: 0,
    mistakesCorrectedCount: 0,
    languagesPracticed: [],
    claimedSessionIds: [],
    dailyState: createEmptyDailyState(),
    completedMissionHistory: [],
    unlockedBadgeIds: {},
    recentReports: [],
  };
}

export function normalizeProgressForToday(state: UserProgressState): UserProgressState {
  const today = getLocalDateKey();
  const yesterday = getYesterdayDateKey();

  let updated = { ...state };

  // Reset daily counters if the calendar day has changed
  if (!updated.dailyState || updated.dailyState.date !== today) {
    updated.dailyState = createEmptyDailyState(today);
  }

  // If last active date was older than yesterday, streak resets until user practices today
  if (updated.lastActiveDate && updated.lastActiveDate !== today && updated.lastActiveDate !== yesterday) {
    updated.streakDays = 0;
  }

  return updated;
}

export function loadUserProgress(): UserProgressState {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return createInitialProgress();
    const parsed = JSON.parse(raw) as UserProgressState;
    return normalizeProgressForToday({
      ...createInitialProgress(),
      ...parsed,
      dailyState: {
        ...createEmptyDailyState(parsed?.dailyState?.date || getLocalDateKey()),
        ...(parsed?.dailyState || {}),
      },
    });
  } catch {
    return createInitialProgress();
  }
}

export function saveUserProgress(state: UserProgressState): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save learning progress:', err);
  }
}

export function getUserLevelInfo(xp: number): {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const thresholds = [0, 150, 350, 650, 1050, 1600, 2300, 3200, 4300, 5600];
  const titles = [
    'Curious Beginner',
    'Warm-Up Speaker',
    'Active Listener',
    'Confident Conversationalist',
    'Fluent Explorer',
    'Cultural Navigator',
    'Articulate Speaker',
    'Polyglot Rising',
    'Master Coach',
    'Global Diplomat',
  ];

  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) {
      level = i + 1;
    }
  }

  const currentFloor = thresholds[level - 1] ?? (level - 1) * 600;
  const nextCeiling = thresholds[level] ?? currentFloor + 1200;
  const span = Math.max(1, nextCeiling - currentFloor);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((xp - currentFloor) / span) * 100)));

  return {
    level,
    title: titles[Math.min(level - 1, titles.length - 1)],
    currentLevelXp: currentFloor,
    nextLevelXp: nextCeiling,
    progressPercent,
  };
}

export function getDailyMissionsStatus(state: UserProgressState): DailyMissionStatus[] {
  const normalized = normalizeProgressForToday(state);
  const today = normalized.dailyState.date;

  return DAILY_MISSION_DEFINITIONS.map((def) => {
    const rawProgress = normalized.dailyState[def.metric] || 0;
    const progress = Math.min(def.target, rawProgress);
    const completed = rawProgress >= def.target;
    const claimKey = `${today}:${def.id}`;
    const xpAwarded = normalized.dailyState.claimedMissionIds.includes(claimKey);

    return {
      ...def,
      progress,
      completed,
      xpAwarded,
    };
  });
}

function evaluateAndAwardMissionsAndBadges(
  state: UserProgressState,
  vocabCount: number
): { nextState: UserProgressState; newlyAwardedXp: number } {
  const normalized = normalizeProgressForToday(state);
  const today = normalized.dailyState.date;
  let xp = normalized.xp;
  let newlyAwardedXp = 0;

  const claimedMissionIds = [...normalized.dailyState.claimedMissionIds];
  const completedMissionHistory = [...normalized.completedMissionHistory];

  for (const def of DAILY_MISSION_DEFINITIONS) {
    const val = normalized.dailyState[def.metric] || 0;
    const claimKey = `${today}:${def.id}`;
    if (val >= def.target && !claimedMissionIds.includes(claimKey)) {
      claimedMissionIds.push(claimKey);
      xp += def.xpReward;
      newlyAwardedXp += def.xpReward;
      completedMissionHistory.unshift({
        id: `hist-${claimKey}-${Date.now()}`,
        missionId: def.id,
        title: def.title,
        xpAwarded: def.xpReward,
        completedAt: Date.now(),
        date: today,
      });
    }
  }

  const unlockedBadgeIds = { ...normalized.unlockedBadgeIds };
  const now = Date.now();
  if (normalized.sessionsCompleted >= 1 && !unlockedBadgeIds['badge-first-call']) {
    unlockedBadgeIds['badge-first-call'] = now;
  }
  if (normalized.languagesPracticed.length >= 2 && !unlockedBadgeIds['badge-polyglot']) {
    unlockedBadgeIds['badge-polyglot'] = now;
  }
  if (vocabCount >= 10 && !unlockedBadgeIds['badge-vocab-10']) {
    unlockedBadgeIds['badge-vocab-10'] = now;
  }
  if (normalized.mistakesCorrectedCount >= 5 && !unlockedBadgeIds['badge-grammar-5']) {
    unlockedBadgeIds['badge-grammar-5'] = now;
  }
  if (normalized.streakDays >= 3 && !unlockedBadgeIds['badge-streak-3']) {
    unlockedBadgeIds['badge-streak-3'] = now;
  }
  if (normalized.totalSpeakingSeconds >= 1800 && !unlockedBadgeIds['badge-speaker-30']) {
    unlockedBadgeIds['badge-speaker-30'] = now;
  }

  return {
    nextState: {
      ...normalized,
      xp,
      dailyState: {
        ...normalized.dailyState,
        claimedMissionIds,
      },
      completedMissionHistory: completedMissionHistory.slice(0, 50),
      unlockedBadgeIds,
    },
    newlyAwardedXp,
  };
}

function updateStreakForToday(state: UserProgressState): UserProgressState {
  const today = getLocalDateKey();
  const yesterday = getYesterdayDateKey();

  if (state.lastActiveDate === today) {
    return state;
  }

  if (state.lastActiveDate === yesterday) {
    return {
      ...state,
      streakDays: state.streakDays + 1,
      lastActiveDate: today,
    };
  }

  return {
    ...state,
    streakDays: 1,
    lastActiveDate: today,
  };
}

/**
 * Records a completed conversation session + report with strict idempotency per sessionId.
 */
export function recordCompletedSession(
  currentState: UserProgressState,
  params: {
    sessionId: string;
    language: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    durationSeconds: number;
    userTurnCount: number;
    completedObjectivesCount: number;
    report?: ConversationReport;
    vocabCount: number;
  }
): { nextState: UserProgressState; totalSessionXp: number } {
  const normalized = normalizeProgressForToday(currentState);

  // Prevent duplicate XP or double-counting for the same sessionId
  if (normalized.claimedSessionIds.includes(params.sessionId)) {
    // Still update stored report if enriched later, without awarding extra XP
    if (params.report) {
      const updatedReports = [
        params.report,
        ...normalized.recentReports.filter((r) => r.sessionId !== params.sessionId),
      ].slice(0, 15);
      return {
        nextState: { ...normalized, recentReports: updatedReports },
        totalSessionXp: 0,
      };
    }
    return { nextState: normalized, totalSessionXp: 0 };
  }

  const hasMeaningfulPractice = params.userTurnCount >= 2 || params.durationSeconds >= 30;
  if (!hasMeaningfulPractice) {
    // Do not grant fake session XP or increment streak if user didn't actually practice
    const updatedReports = params.report
      ? [params.report, ...normalized.recentReports].slice(0, 15)
      : normalized.recentReports;
    return {
      nextState: {
        ...normalized,
        recentReports: updatedReports,
      },
      totalSessionXp: 0,
    };
  }

  // Genuine session XP calculation
  const baseSessionXp = 25;
  const turnBonusXp = Math.min(30, params.userTurnCount * 4);
  const objectiveBonusXp = params.completedObjectivesCount * 10;
  const sessionXp = baseSessionXp + turnBonusXp + objectiveBonusXp;

  let next = updateStreakForToday(normalized);
  const nextSpeakingToday = next.dailyState.speakingSecondsToday + Math.max(0, Math.round(params.durationSeconds));
  const nextLongestToday = Math.max(
    next.dailyState.longestSessionSecondsToday,
    Math.max(0, Math.round(params.durationSeconds))
  );
  const isBeginner = params.level === 'Beginner' && params.userTurnCount >= 2;
  const languagesPracticed = next.languagesPracticed.includes(params.language)
    ? next.languagesPracticed
    : [...next.languagesPracticed, params.language];

  next = {
    ...next,
    xp: next.xp + sessionXp,
    totalSpeakingSeconds: next.totalSpeakingSeconds + Math.max(0, Math.round(params.durationSeconds)),
    sessionsCompleted: next.sessionsCompleted + 1,
    beginnerScenariosCompleted: next.beginnerScenariosCompleted + (isBeginner ? 1 : 0),
    languagesPracticed,
    claimedSessionIds: [...next.claimedSessionIds, params.sessionId].slice(-100),
    dailyState: {
      ...next.dailyState,
      speakingSecondsToday: nextSpeakingToday,
      longestSessionSecondsToday: nextLongestToday,
      sessionsToday: next.dailyState.sessionsToday + 1,
      beginnerScenariosToday: next.dailyState.beginnerScenariosToday + (isBeginner ? 1 : 0),
    },
    recentReports: params.report
      ? [{ ...params.report, xpEarned: sessionXp }, ...next.recentReports].slice(0, 15)
      : next.recentReports,
  };

  const { nextState, newlyAwardedXp } = evaluateAndAwardMissionsAndBadges(next, params.vocabCount);
  const totalSessionXp = sessionXp + newlyAwardedXp;

  if (params.report && nextState.recentReports.length > 0) {
    nextState.recentReports = nextState.recentReports.map((r) =>
      r.sessionId === params.sessionId ? { ...r, xpEarned: totalSessionXp } : r
    );
  }

  return { nextState, totalSessionXp };
}

/**
 * Records a genuinely saved or mastered vocabulary word today (deduplicated by lowercase word).
 */
export function recordVocabLearned(
  currentState: UserProgressState,
  word: string,
  totalVocabCount: number
): { nextState: UserProgressState; xpGained: number } {
  const normalized = normalizeProgressForToday(currentState);
  const key = word.trim().toLowerCase();
  if (!key || normalized.dailyState.learnedWordsListToday.includes(key)) {
    const { nextState, newlyAwardedXp } = evaluateAndAwardMissionsAndBadges(normalized, totalVocabCount);
    return { nextState, xpGained: newlyAwardedXp };
  }

  const next: UserProgressState = {
    ...normalized,
    dailyState: {
      ...normalized.dailyState,
      wordsLearnedToday: normalized.dailyState.wordsLearnedToday + 1,
      learnedWordsListToday: [...normalized.dailyState.learnedWordsListToday, key],
    },
  };

  const { nextState, newlyAwardedXp } = evaluateAndAwardMissionsAndBadges(next, totalVocabCount);
  return { nextState, xpGained: newlyAwardedXp };
}

/**
 * Records a reviewed/saved mistake correction (deduplicated per mistake key).
 */
export function recordMistakeCorrected(
  currentState: UserProgressState,
  mistakeKey: string,
  totalVocabCount: number
): { nextState: UserProgressState; xpGained: number } {
  const normalized = normalizeProgressForToday(currentState);
  const cleanKey = mistakeKey.trim().toLowerCase();
  if (!cleanKey || normalized.dailyState.correctedMistakeKeysToday.includes(cleanKey)) {
    return { nextState: normalized, xpGained: 0 };
  }

  const next: UserProgressState = {
    ...normalized,
    mistakesCorrectedCount: normalized.mistakesCorrectedCount + 1,
    dailyState: {
      ...normalized.dailyState,
      mistakesCorrectedToday: normalized.dailyState.mistakesCorrectedToday + 1,
      correctedMistakeKeysToday: [...normalized.dailyState.correctedMistakeKeysToday, cleanKey],
    },
  };

  const { nextState, newlyAwardedXp } = evaluateAndAwardMissionsAndBadges(next, totalVocabCount);
  return { nextState, xpGained: newlyAwardedXp };
}

// Custom Scenarios CRUD
export function loadCustomScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCENARIOS_KEY);
    return raw ? (JSON.parse(raw) as Scenario[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomScenarios(scenarios: Scenario[]): void {
  try {
    localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(scenarios));
  } catch (err) {
    console.error('Failed to save custom scenarios:', err);
  }
}

export function mergeVocabItem(
  existing: VocabularyItem[],
  item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>
): VocabularyItem[] {
  const newItem: VocabularyItem = {
    ...item,
    id: `vocab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    learnedAt: Date.now(),
    mastered: false,
    practiceCount: 0,
  };
  return [newItem, ...existing.filter((v) => v.word.toLowerCase() !== item.word.toLowerCase())];
}
