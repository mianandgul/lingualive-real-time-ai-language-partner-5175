import React, { useState } from 'react';
import { Share2, Copy, Check, Gift, MessageCircle, Instagram, X, Sparkles } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { getShareReferralUrl, ReferralState, REFERRAL_XP_REWARD } from '../services/billingService';

interface ShareInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralState: ReferralState;
  onInviteShared: () => void;
}

export const ShareInviteModal: React.FC<ShareInviteModalProps> = ({
  isOpen,
  onClose,
  referralState,
  onInviteShared,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = getShareReferralUrl(referralState.myCode);
  const shareMessage = `Practice speaking 15 languages in real-time voice conversations with LinguaLive AI! Join using my invite link: ${shareUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback textarea copy
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    onInviteShared();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    onInviteShared();
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleXShare = () => {
    onInviteShared();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleInstagramShare = async () => {
    await copyToClipboard();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LinguaLive - Practice Any Language with Real AI',
          text: shareMessage,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    setShareNote('Invite caption & link copied — paste it into your Instagram Story, Bio, or DM!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-800 via-purple-800 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-purple-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                {t('shareTitle')}
              </h2>
              <p className="text-xs text-indigo-100/80 truncate">{t('inviteRewardTitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 text-white/80 hover:text-white transition cursor-pointer"
            aria-label={t('closeBtn')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Invite Friend, Get 100 XP Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/50 to-purple-950/50 border border-amber-500/35 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                <Gift className="w-4 h-4" />
                {t('inviteRewardTitle')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 tabular-nums">
                {referralState.referralBonusClaimed ? t('claimInviteXp') : `+${REFERRAL_XP_REWARD} XP`}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{t('inviteRewardDesc')}</p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Invite code: <strong className="text-white font-mono">{referralState.myCode}</strong></span>
              <span className="tabular-nums">Shares sent: {referralState.invitedCount}</span>
            </div>
          </div>

          {/* Copy Link Field */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              aria-label="Personal referral link"
              className="flex-1 min-w-0 bg-transparent px-2 text-xs text-slate-300 font-mono focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 cursor-pointer transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('linkCopied') : t('copyLink')}</span>
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 text-xs font-semibold transition cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleInstagramShare}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-pink-950/40 hover:bg-pink-900/50 border border-pink-700/50 text-pink-200 text-xs font-semibold transition cursor-pointer"
            >
              <Instagram className="w-5 h-5 text-pink-400" />
              <span>Instagram</span>
            </button>

            <button
              onClick={handleXShare}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-sky-400" />
              <span>X / Twitter</span>
            </button>
          </div>

          {shareNote && (
            <p className="text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-700/40 rounded-xl p-2.5 text-center">
              {shareNote}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
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
