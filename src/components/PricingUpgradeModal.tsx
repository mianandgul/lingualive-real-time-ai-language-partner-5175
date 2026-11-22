import React from 'react';
import { Crown, Lock, CheckCircle2, PhoneCall, MessageSquare, Sparkles, X, ShieldCheck } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { VoiceQuotaStatus } from '../services/billingService';

interface PricingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotaStatus: VoiceQuotaStatus;
  limitTriggered?: boolean;
  onContinueFreeChat: () => void;
}

export const PricingUpgradeModal: React.FC<PricingUpgradeModalProps> = ({
  isOpen,
  onClose,
  quotaStatus,
  limitTriggered = false,
  onContinueFreeChat,
}) => {
  const { t, formatPrice, countryCode, currency } = useI18n();

  if (!isOpen) return null;

  const monthlyPrice = formatPrice(9.99);
  const annualPrice = formatPrice(79.99);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-800 via-purple-800 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-purple-500/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                {limitTriggered ? t('limitReachedTitle') : t('upgradeBannerTitle')}
              </h2>
              <p className="text-xs text-indigo-100/80 truncate">
                {countryCode} · {currency} · {t('freeCallsStatus', { remaining: quotaStatus.remainingToday, limit: quotaStatus.limit })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 text-white/80 hover:text-white transition cursor-pointer shrink-0"
            aria-label={t('closeBtn')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {limitTriggered && (
            <div className="p-3.5 rounded-2xl bg-amber-950/45 border border-amber-600/50 text-xs text-amber-100 leading-relaxed">
              {t('limitReachedBody')}
            </div>
          )}

          {/* Plan Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Plan */}
            <div className="p-5 rounded-2xl bg-slate-950/75 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {t('freePlanTitle')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-2xl font-black text-white tabular-nums">
                  {formatPrice(0)} <span className="text-xs font-medium text-slate-400">/ month</span>
                </p>

                {/* Daily Call Meter */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <PhoneCall className="w-3.5 h-3.5 text-indigo-400" />
                      Today&apos;s Voice Calls
                    </span>
                    <span className="font-bold text-white tabular-nums">
                      {quotaStatus.usedToday} / {quotaStatus.limit}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        quotaStatus.isLimitReached ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (quotaStatus.usedToday / quotaStatus.limit) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>3 Free real-time AI voice calls every day</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Unlimited AI Text Chat & smart grammar coaching</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>All 15 worldwide languages & feedback reports</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onContinueFreeChat();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('continueFreeChat')}</span>
              </button>
            </div>

            {/* Premium Plan (Locked Preview) */}
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-indigo-950/75 via-purple-950/50 to-slate-950 border border-purple-500/40 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    LinguaLive Pro
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    Locked Preview
                  </span>
                </div>

                <div>
                  <p className="text-2xl font-black text-white tabular-nums">
                    {monthlyPrice} <span className="text-xs font-medium text-slate-300">/ month</span>
                  </p>
                  <p className="text-[11px] text-purple-200/80 tabular-nums">
                    or {annualPrice} / year · local {currency} pricing
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-200">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
                    <span>Unlimited AI real-time voice calls daily</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
                    <span>Priority ultra-low-latency voice servers globally</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
                    <span>Unlimited custom roleplay scenarios & CEFR tracking</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600/60 to-purple-600/60 border border-purple-400/30 text-white/80 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t('premiumLockedBadge')}</span>
                </button>
                <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  <span>Stripe (Web) &amp; RevenueCat (iOS/Android) billing ready for launch</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
