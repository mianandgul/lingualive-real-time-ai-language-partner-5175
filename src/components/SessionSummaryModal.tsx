import React from 'react';
import { TranscriptItem, Scenario } from '../types';
import { Trophy, CheckCircle, Sparkles, BookOpen, ArrowRight } from 'lucide-react';

interface SessionSummaryModalProps {
  isOpen: boolean;
  scenario: Scenario;
  transcript: TranscriptItem[];
  completedObjectives: string[];
  onClose: () => void;
  onOpenVault: () => void;
  onNewScenario: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  scenario,
  transcript,
  completedObjectives,
  onClose,
  onOpenVault,
  onNewScenario,
}) => {
  if (!isOpen) return null;

  const userTurns = transcript.filter((t) => t.role === 'user');
  const userWordCount = userTurns.reduce(
    (acc, t) => acc + (t.text.trim().split(/\s+/).length || 0),
    0
  );

  const fluencyScore = Math.min(
    98,
    Math.max(70, Math.round(75 + userTurns.length * 3 + completedObjectives.length * 5))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
            <Trophy className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Practice Session Complete!</h2>
          <p className="text-xs text-white/80 mt-1">
            {scenario.title} • {scenario.language} ({scenario.level})
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xl font-extrabold text-white">{userTurns.length}</span>
              <p className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">Turns Spoken</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xl font-extrabold text-cyan-400">{userWordCount}</span>
              <p className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">Words Spoken</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xl font-extrabold text-emerald-400">{fluencyScore}%</span>
              <p className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">Fluency Score</p>
            </div>
          </div>

          {/* Missions Completed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Missions Accomplished
              </span>
              <span className="text-emerald-400 font-bold">
                {completedObjectives.length} / {scenario.objectives.length}
              </span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {scenario.objectives.map((obj) => {
                const isDone = completedObjectives.includes(obj.title);
                return (
                  <div
                    key={obj.id}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                    }`}
                  >
                    <span className="font-medium truncate">{obj.title}</span>
                    <span className={`text-[10px] font-bold ${isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isDone ? 'Done' : 'Incomplete'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Encouraging Feedback Tip */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-start space-x-2.5 text-xs text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Great job practicing in real time! Regularly doing short 3-5 minute voice sessions dramatically improves speech confidence, accent muscle memory, and listening comprehension.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
          <button
            onClick={onOpenVault}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Review Flashcards</span>
          </button>

          <button
            onClick={onNewScenario}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg"
          >
            <span>Next Roleplay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
