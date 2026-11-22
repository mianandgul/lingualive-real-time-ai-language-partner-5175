import { getLocalDateKey } from './learningStorage';

export const FREE_DAILY_VOICE_LIMIT = 3;
export const REFERRAL_XP_REWARD = 100;

const DAILY_CALLS_STORAGE_KEY = 'lingualive_daily_calls';
const REFERRAL_STORAGE_KEY = 'lingualive_referral_state';

export interface VoiceQuotaStatus {
  date: string;
  usedToday: number;
  remainingToday: number;
  limit: number;
  isLimitReached: boolean;
  countedSessionIds: string[];
}

export interface ReferralState {
  myCode: string;
  invitedCount: number;
  referralBonusClaimed: boolean;
  referredByCode: string | null;
}

export function getVoiceQuotaStatus(): VoiceQuotaStatus {
  const today = getLocalDateKey();
  try {
    const raw = localStorage.getItem(DAILY_CALLS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.date === today) {
        const used = Number(parsed.count) || 0;
        const ids = Array.isArray(parsed.countedSessionIds) ? parsed.countedSessionIds : [];
        return {
          date: today,
          usedToday: used,
          remainingToday: Math.max(0, FREE_DAILY_VOICE_LIMIT - used),
          limit: FREE_DAILY_VOICE_LIMIT,
          isLimitReached: used >= FREE_DAILY_VOICE_LIMIT,
          countedSessionIds: ids,
        };
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return {
    date: today,
    usedToday: 0,
    remainingToday: FREE_DAILY_VOICE_LIMIT,
    limit: FREE_DAILY_VOICE_LIMIT,
    isLimitReached: false,
    countedSessionIds: [],
  };
}

export function consumeFreeVoiceCall(sessionId: string): VoiceQuotaStatus {
  const current = getVoiceQuotaStatus();
  if (sessionId && current.countedSessionIds.includes(sessionId)) {
    return current;
  }

  const nextUsed = current.usedToday + 1;
  const nextIds = sessionId
    ? [...current.countedSessionIds, sessionId].slice(-20)
    : current.countedSessionIds;

  const updated = {
    date: current.date,
    count: nextUsed,
    countedSessionIds: nextIds,
  };

  try {
    localStorage.setItem(DAILY_CALLS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage write errors
  }

  return {
    date: current.date,
    usedToday: nextUsed,
    remainingToday: Math.max(0, FREE_DAILY_VOICE_LIMIT - nextUsed),
    limit: FREE_DAILY_VOICE_LIMIT,
    isLimitReached: nextUsed >= FREE_DAILY_VOICE_LIMIT,
    countedSessionIds: nextIds,
  };
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'LL-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function loadReferralState(): ReferralState {
  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.myCode === 'string') {
        return {
          myCode: parsed.myCode,
          invitedCount: Number(parsed.invitedCount) || 0,
          referralBonusClaimed: Boolean(parsed.referralBonusClaimed),
          referredByCode: parsed.referredByCode || null,
        };
      }
    }
  } catch {
    // Ignore
  }

  const initial: ReferralState = {
    myCode: generateReferralCode(),
    invitedCount: 0,
    referralBonusClaimed: false,
    referredByCode: null,
  };
  saveReferralState(initial);
  return initial;
}

export function saveReferralState(state: ReferralState): void {
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function getShareReferralUrl(code: string): string {
  if (typeof window === 'undefined') return `https://lingualive.app/?ref=${encodeURIComponent(code)}`;
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}

/**
 * GDPR Right-to-Erasure helper: removes every LinguaLive key stored on this device.
 */
export function wipeAllLinguaLiveData(): void {
  const keysToClear = [
    'lingualive_vocab',
    'lingualive_custom_scenarios',
    'lingualive_progress',
    'lingualive_daily_calls',
    'lingualive_referral_state',
    'lingualive_app_lang',
  ];
  try {
    for (const key of keysToClear) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage removal errors
  }
}
