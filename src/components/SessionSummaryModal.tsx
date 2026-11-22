import React, { useEffect, useState, useRef } from 'react';
import {
  ConversationReport,
  MistakeCorrection,
  Scenario,
  VocabularyItem,
} from '../types';
import { EndSessionPayload } from './LiveVoiceRoom';
import { useI18n } from '../services/i18n';
import {
  Trophy,
  CheckCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Volume2,
  BookmarkCheck,
  BookmarkPlus,
  RefreshCw,
  MicOff,
  Clock,
  BarChart3,
  X,
} from 'lucide-react';

interface SessionSummaryModalProps {
  isOpen: boolean;
  scenario: Scenario;
  sessionPayload: EndSessionPayload | null;
  existingReport?: ConversationReport | null;
  onClose: () => void;
  onReportReady: (report: ConversationReport) => void;
  onSaveCorrection: (correction: MistakeCorrection) => void;
  onSaveVocab: (item: Omit<VocabularyItem, 'id' | 'learnedAt' | 'mastered'>) => void;
  onPlayTTS: (text: string) => void;
  onOpenVault: () => void;
  onOpenDashboard: () => void;
  onNewScenario: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.round(seconds % 60));
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  scenario,
  sessionPayload,
  existingReport = null,
  onClose,
  onReportReady,
  onSaveCorrection,
  onSaveVocab,
  onPlayTTS,
  onOpenVault,
  onOpenDashboard,
  onNewScenario,
}) => {
  const { nativeLanguageName, t } = useI18n();
  const [report, setReport] = useState<ConversationReport | null>(existingReport);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMistakeIds, setSavedMistakeIds] = useState<Record<string, boolean>>({});
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const fetchedSessionRef = useRef<string | null>(null);

  const runAssessment = async (payload: EndSessionPayload) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assess-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTitle: scenario.title,
          language: scenario.language,
          nativeLanguage: nativeLanguageName,
          level: scenario.level,
          durationSeconds: payload.durationSeconds,
          transcript: payload.items,
          completedObjectives: payload.completedObjectives,
          hasVoiceEvidence: payload.hasVoiceEvidence,
          voicedSeconds: payload.voicedSeconds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg =
          errData?.errorCode === 'MISSING_API_KEY' || res.status === 503
            ? 'Voice service not configured. Please check API Key in Vercel Settings'
            : errData.error || 'Failed to generate conversation report';
        throw new Error(msg);
      }

      const data = await res.json();
      const userTurnCount = payload.items.filter(
        (t) => t.role === 'user' && t.text?.trim()
      ).length;

      const mistakes: MistakeCorrection[] = Array.isArray(data.mistakes)
        ? data.mistakes.map((m: any, idx: number) => ({
            id: m.id || `rep-mistake-${payload.sessionId}-${idx}`,
            original: m.original || '',
            intendedMeaning: m.intendedMeaning || '',
            corrected: m.corrected || '',
            errorType: m.errorType || 'Grammar',
            explanation: m.explanation || '',
            additionalExample: m.additionalExample || '',
            targetLanguage: scenario.language,
          }))
        : [];

      const builtReport: ConversationReport = {
        id: `report-${payload.sessionId}`,
        sessionId: payload.sessionId,
        createdAt: Date.now(),
        scenarioTitle: scenario.title,
        language: scenario.language,
        level: scenario.level,
        durationSeconds: payload.durationSeconds,
        userTurnCount,
        completedObjectives: payload.completedObjectives,
        totalObjectives: scenario.objectives.length,
        insufficientData: Boolean(data.insufficientData),
        overallScore: typeof data.overallScore === 'number' ? data.overallScore : null,
        grammarAccuracy: typeof data.grammarAccuracy === 'number' ? data.grammarAccuracy : null,
        pronunciationAvailable: Boolean(data.pronunciationAvailable),
        pronunciationScore:
          data.pronunciationAvailable && typeof data.pronunciationScore === 'number'
            ? data.pronunciationScore
            : null,
        pronunciationNote:
          data.pronunciationNote ||
          'Pronunciation is only scored when sufficient microphone speech is recorded.',
        vocabularyUsage: typeof data.vocabularyUsage === 'number' ? data.vocabularyUsage : null,
        speakingFluency: typeof data.speakingFluency === 'number' ? data.speakingFluency : null,
        sentenceStructure:
          typeof data.sentenceStructure === 'number' ? data.sentenceStructure : null,
        cefrEstimate:
          data.cefrEstimate ||
          scenario.cefr ||
          (scenario.level === 'Beginner' ? 'A1' : scenario.level === 'Intermediate' ? 'B1' : 'C1'),
        mistakes,
        betterAlternatives: Array.isArray(data.betterAlternatives)
          ? data.betterAlternatives
          : [],
        wordsToPractice: Array.isArray(data.wordsToPractice) ? data.wordsToPractice : [],
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        summaryFeedback:
          data.summaryFeedback ||
          'Conversation analyzed based on your actual dialogue turns.',
        xpEarned: 0,
      };

      setReport(builtReport);
      onReportReady(builtReport);
    } catch (err: any) {
      setError(err?.message || 'Could not assess this conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (existingReport) {
      setReport(existingReport);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (sessionPayload && fetchedSessionRef.current !== sessionPayload.sessionId) {
      fetchedSessionRef.current = sessionPayload.sessionId;
      setReport(null);
      setSavedMistakeIds({});
      setSavedWords({});
      runAssessment(sessionPayload);
    }
  }, [isOpen, sessionPayload?.sessionId, existingReport?.id]);

  // Keep local report XP synchronized when App attaches xpEarned
  useEffect(() => {
    if (existingReport) {
      setReport(existingReport);
    }
  }, [existingReport?.xpEarned]);

  if (!isOpen) return null;

  const displayReport = existingReport || report;

  const metricRows = displayReport
    ? [
        { label: 'Grammar Accuracy', value: displayReport.grammarAccuracy, color: 'from-indigo-500 to-blue-500' },
        { label: 'Vocabulary Usage', value: displayReport.vocabularyUsage, color: 'from-purple-500 to-indigo-500' },
        { label: 'Speaking Fluency', value: displayReport.speakingFluency, color: 'from-emerald-500 to-teal-500' },
        { label: 'Sentence Structure', value: displayReport.sentenceStructure, color: 'from-cyan-500 to-sky-500' },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 text-white flex items-center justify-between gap-4 border-b border-indigo-500/30 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black tracking-tight truncate">
                AI Conversation Feedback Report
              </h2>
              <p className="text-xs text-indigo-100/85 truncate">
                {displayReport?.scenarioTitle || scenario.title} ·{' '}
                {displayReport?.language || scenario.language} (
                {displayReport?.level || scenario.level})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {displayReport && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/50 border border-white/15 text-xs font-semibold tabular-nums">
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                {formatDuration(displayReport.durationSeconds)}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 text-white/80 hover:text-white transition cursor-pointer"
              aria-label="Close report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {isLoading && (
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-9 h-9 text-indigo-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Analyzing Your {scenario.language} Conversation...
                </p>
                <p className="text-xs text-slate-400 max-w-md">
                  Evaluating grammar accuracy, sentence structure, vocabulary range, and checking for smart corrections.
                </p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm font-semibold text-rose-200">{error}</p>
              {sessionPayload && (
                <button
                  onClick={() => runAssessment(sessionPayload)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('retryBtn')}</span>
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && displayReport && displayReport.insufficientData && (
            <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 text-center">
              <MicOff className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  Not Enough Conversation Data to Score
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  {displayReport.summaryFeedback}
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  {displayReport.pronunciationNote}
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 tabular-nums pt-1">
                <span>Turns recorded: {displayReport.userTurnCount}</span>
                <span>·</span>
                <span>Duration: {formatDuration(displayReport.durationSeconds)}</span>
              </div>
            </div>
          )}

          {!isLoading && !error && displayReport && !displayReport.insufficientData && (
            <>
              {/* Top Score & XP Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-slate-950 border border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      Overall Score
                    </p>
                    <p className="text-3xl font-black text-white tabular-nums mt-0.5">
                      {displayReport.overallScore ?? '—'}
                      <span className="text-sm text-slate-400 font-semibold">/100</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-xs font-extrabold">
                    CEFR {displayReport.cefrEstimate}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Speaking Turns
                    </p>
                    <p className="text-2xl font-extrabold text-cyan-300 tabular-nums mt-0.5">
                      {displayReport.userTurnCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Duration</p>
                    <p className="text-sm font-bold text-slate-200 tabular-nums">
                      {formatDuration(displayReport.durationSeconds)}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      XP Earned
                    </p>
                    <p className="text-2xl font-extrabold text-amber-400 tabular-nums mt-0.5">
                      +{displayReport.xpEarned} XP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Missions</p>
                    <p className="text-sm font-bold text-emerald-300 tabular-nums">
                      {displayReport.completedObjectives.length}/{displayReport.totalObjectives}
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Metric Breakdown */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Skill Breakdown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {metricRows.map((metric) => {
                    const score = metric.value ?? 0;
                    return (
                      <div
                        key={metric.label}
                        className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{metric.label}</span>
                          <span className="font-bold text-white tabular-nums">
                            {metric.value !== null ? `${metric.value}%` : '—'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${metric.color}`}
                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pronunciation Assessment Card (Honest Evidence-Based) */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    displayReport.pronunciationAvailable
                      ? 'bg-emerald-950/20 border-emerald-800/50'
                      : 'bg-slate-900/80 border-slate-700/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      Pronunciation Assessment
                    </span>
                    {displayReport.pronunciationAvailable &&
                    displayReport.pronunciationScore !== null ? (
                      <span className="text-sm font-extrabold text-emerald-400 tabular-nums">
                        {displayReport.pronunciationScore}/100
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-300">
                        Not Assessed (Insufficient Audio Evidence)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {displayReport.pronunciationNote}
                  </p>
                </div>
              </div>

              {/* Summary & Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Coach Summary</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {displayReport.summaryFeedback}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle className="w-4 h-4" />
                    <span>Key Strengths</span>
                  </div>
                  {displayReport.strengths.length > 0 ? (
                    <ul className="space-y-1 text-xs text-slate-200">
                      {displayReport.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">Keep speaking longer to highlight strengths.</p>
                  )}
                </div>
              </div>

              {/* Smart Mistake Corrections */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Smart Mistake Corrections ({displayReport.mistakes.length})
                  </h3>
                </div>

                {displayReport.mistakes.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                    No clear grammar or vocabulary mistakes were detected in your spoken turns.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayReport.mistakes.map((m) => {
                      const isSaved = Boolean(savedMistakeIds[m.id]);
                      return (
                        <div
                          key={m.id}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              {m.errorType} Mistake
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onPlayTTS(m.corrected)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                                title={t('listenBtn')}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  onSaveCorrection({
                                    ...m,
                                    targetLanguage: displayReport.language,
                                  });
                                  setSavedMistakeIds((prev) => ({ ...prev, [m.id]: true }));
                                }}
                                disabled={isSaved}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                  isSaved
                                    ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {isSaved ? (
                                  <>
                                    <BookmarkCheck className="w-3.5 h-3.5" />
                                    <span>{t('savedBtn')}</span>
                                  </>
                                ) : (
                                  <>
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    <span>{t('saveBtn')}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-rose-950/25 border border-rose-900/40">
                              <span className="block text-[10px] font-semibold text-rose-400 uppercase">
                                You Said
                              </span>
                              <p className="text-rose-200 line-through mt-0.5">{m.original}</p>
                              {m.intendedMeaning && (
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Intended: &ldquo;{m.intendedMeaning}&rdquo;
                                </p>
                              )}
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-900/40">
                              <span className="block text-[10px] font-semibold text-emerald-400 uppercase">
                                Natural Correction
                              </span>
                              <p className="text-emerald-200 font-semibold mt-0.5">{m.corrected}</p>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">{m.explanation}</p>
                          {m.additionalExample && (
                            <p className="text-[11px] text-cyan-300 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
                              Example: &ldquo;{m.additionalExample}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Better Alternative Sentences */}
              {displayReport.betterAlternatives.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Better Alternative Sentences
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {displayReport.betterAlternatives.map((alt, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-indigo-300">{alt.improved}</p>
                          <button
                            onClick={() => onPlayTTS(alt.improved)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                            title="Listen"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400">Instead of: &ldquo;{alt.original}&rdquo;</p>
                        <p className="text-[11px] text-slate-300">{alt.contextNote}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Words You Should Practice */}
              {displayReport.wordsToPractice.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Words You Should Practice
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {displayReport.wordsToPractice.map((w, idx) => {
                      const isSaved = Boolean(savedWords[w.word]);
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-white">{w.word}</p>
                              <p className="text-xs text-emerald-400 font-medium">{w.translation}</p>
                              {w.phonetics && (
                                <p className="text-[11px] font-mono text-cyan-400">/{w.phonetics}/</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => onPlayTTS(w.word)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white cursor-pointer"
                                  title={t('listenBtn')}
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    onSaveVocab({
                                      word: w.word,
                                      translation: w.translation,
                                      pronunciation: w.phonetics,
                                      exampleSentence: w.exampleSentence,
                                      language: displayReport.language,
                                      type: 'word',
                                      notes: w.reason,
                                    });
                                    setSavedWords((prev) => ({ ...prev, [w.word]: true }));
                                  }}
                                  disabled={isSaved}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                                    isSaved
                                      ? 'bg-emerald-900/50 text-emerald-300'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                  }`}
                                >
                                  {isSaved ? t('savedBtn') : t('saveBtn')}
                                </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400">{w.reason}</p>
                          {w.exampleSentence && (
                            <p className="text-[11px] italic text-slate-300">&ldquo;{w.exampleSentence}&rdquo;</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenVault}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('myVocabulary')}</span>
            </button>
            <button
              onClick={onOpenDashboard}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('navProgress')}</span>
            </button>
          </div>

          <button
            onClick={onNewScenario}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
          >
            <span>{t('navRoles')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
