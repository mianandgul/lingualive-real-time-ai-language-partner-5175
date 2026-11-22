import React from 'react';
import { ConversationReport, UserProgressState, VocabularyItem } from '../types';
import {
  ACHIEVEMENT_BADGES,
  getDailyMissionsStatus,
  getUserLevelInfo,
} from '../services/learningStorage';
import { useI18n } from '../services/i18n';
import {
  Trophy,
  Flame,
  Clock,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Award,
  FileBarChart2,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface LearningDashboardProps {
  progress: UserProgressState;
  vocabItems: VocabularyItem[];
  onViewReport: (report: ConversationReport) => void;
  onStartScenarios: () => void;
  onOpenVault: () => void;
}

function formatMissionMetric(value: number, target: number, unit: string): string {
  if (unit === 'sec') {
    const curMin = Math.floor(value / 60);
    const curSec = value % 60;
    const tgtMin = Math.round(target / 60);
    return `${curMin}m ${String(curSec).padStart(2, '0')}s / ${tgtMin}m`;
  }
  return `${value} / ${target} ${unit}`;
}

export const LearningDashboard: React.FC<LearningDashboardProps> = ({
  progress,
  vocabItems,
  onViewReport,
  onStartScenarios,
  onOpenVault,
}) => {
  const { t, formatDate } = useI18n();
  const levelInfo = getUserLevelInfo(progress.xp);
  const dailyMissions = getDailyMissionsStatus(progress);
  const masteredCount = vocabItems.filter((v) => v.mastered).length;
  const totalMinutes = Math.round(progress.totalSpeakingSeconds / 60);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Level & XP Hero Card */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950/90 via-purple-950/60 to-slate-900 border border-indigo-700/40 p-6 sm:p-7 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Level {levelInfo.level} · {levelInfo.title}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Your Language Learning Progress
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Complete live voice roleplays, review smart mistake corrections, and grow your personal vocabulary memory to earn XP and build your speaking streak.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 w-full md:w-80 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Experience Points</span>
              <span className="text-lg font-black text-amber-400 tabular-nums">
                {progress.xp} XP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
              <span>Lv. {levelInfo.level}</span>
              <span>
                {Math.max(0, levelInfo.nextLevelXp - progress.xp)} XP to Level{' '}
                {levelInfo.level + 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Key Progress Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/75 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Speaking Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white tabular-nums">
            {progress.streakDays} <span className="text-xs font-semibold text-slate-400">days</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {progress.lastActiveDate ? `Last active: ${progress.lastActiveDate}` : 'Start a call today'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/75 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Speaking Practice</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white tabular-nums">
            {totalMinutes} <span className="text-xs font-semibold text-slate-400">min</span>
          </p>
          <p className="text-[11px] text-slate-500 tabular-nums">
            {progress.sessionsCompleted} completed sessions
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/75 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Vocabulary Memory</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white tabular-nums">
            {masteredCount}{' '}
            <span className="text-xs font-semibold text-slate-400">/ {vocabItems.length} learned</span>
          </p>
          <button
            onClick={onOpenVault}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            {t('myVocabulary')} &rarr;
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/75 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Mistakes Corrected</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white tabular-nums">
            {progress.mistakesCorrectedCount}
          </p>
          <p className="text-[11px] text-slate-500 tabular-nums">
            {progress.languagesPracticed.length} languages practiced
          </p>
        </div>
      </div>

      {/* Daily Missions & Achievement Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily Missions */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Daily Missions</h2>
              <p className="text-xs text-slate-400">
                Complete real practice activities to claim each daily XP bonus.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">
              {dailyMissions.filter((m) => m.completed).length} / {dailyMissions.length} Complete
            </span>
          </div>

          <div className="space-y-3">
            {dailyMissions.map((mission) => {
              const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
              return (
                <div
                  key={mission.id}
                  className={`p-3.5 rounded-xl border transition ${
                    mission.completed
                      ? 'bg-emerald-950/20 border-emerald-800/50'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          mission.completed ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{mission.title}</p>
                        <p className="text-[11px] text-slate-400">{mission.description}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-extrabold shrink-0 tabular-nums ${
                        mission.xpAwarded ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {mission.xpAwarded ? `✓ +${mission.xpReward} XP` : `+${mission.xpReward} XP`}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          mission.completed ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums shrink-0">
                      {formatMissionMetric(mission.progress, mission.target, mission.unit)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white">Achievement Badges</h2>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {Object.keys(progress.unlockedBadgeIds).length} / {ACHIEVEMENT_BADGES.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            {ACHIEVEMENT_BADGES.map((badge) => {
              const unlockedAt = progress.unlockedBadgeIds[badge.id];
              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    unlockedAt
                      ? 'bg-indigo-950/30 border-indigo-600/40'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-65'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{badge.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{badge.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{badge.description}</p>
                    </div>
                  </div>
                  {unlockedAt ? (
                    <span className="text-[10px] font-bold text-emerald-300 shrink-0 tabular-nums">
                      Unlocked
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Conversation Reports & Completed Mission History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Reports */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Recent Conversation Reports</h2>
            </div>
            <button
              onClick={onStartScenarios}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              {t('startCall')} &rarr;
            </button>
          </div>

          {progress.recentReports.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-2">
              <p>Complete a voice or chat conversation to view your AI feedback reports here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {progress.recentReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{rep.scenarioTitle}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      {rep.language} · {rep.level} · {formatDate(rep.createdAt)} ·{' '}
                      {rep.userTurnCount} turns
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right tabular-nums">
                      <p className="text-xs font-extrabold text-indigo-300">
                        {rep.overallScore !== null ? `${rep.overallScore}/100` : 'No Score'}
                      </p>
                      <p className="text-[10px] text-amber-400">+{rep.xpEarned} XP</p>
                    </div>
                    <button
                      onClick={() => onViewReport(rep)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-xs font-semibold text-slate-200 hover:text-white transition cursor-pointer"
                    >
                      <span>{t('inspectBtn')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Mission History */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white">Completed Mission History</h2>

          {progress.completedMissionHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/80">
              Completed daily missions and their XP awards will appear here.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {progress.completedMissionHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">{item.date}</p>
                  </div>
                  <span className="font-bold text-emerald-400 shrink-0 tabular-nums">
                    +{item.xpAwarded} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
