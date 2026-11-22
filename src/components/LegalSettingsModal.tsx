import React, { useState } from 'react';
import {
  Shield,
  FileText,
  Mail,
  Settings,
  Trash2,
  X,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { APP_LANGUAGES, AppLangCode, useI18n } from '../services/i18n';

export type LegalTab = 'settings' | 'privacy' | 'terms' | 'contact';

interface LegalSettingsModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  onDeleteAllUserData: () => void;
}

const CONTACT_EMAIL = 'abdulmoizgul2@gmail.com';

export const LegalSettingsModal: React.FC<LegalSettingsModalProps> = ({
  isOpen,
  initialTab = 'settings',
  onClose,
  onDeleteAllUserData,
}) => {
  const {
    appLang,
    setAppLang,
    t,
    countryCode,
    countryName,
    currency,
    formatDateTime,
  } = useI18n();

  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setConfirmDeleteStep(false);
      setDeletedSuccess(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      // Ignore
    }
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleConfirmDelete = () => {
    onDeleteAllUserData();
    setConfirmDeleteStep(false);
    setDeletedSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              LinguaLive · {t('legalPrivacyBtn')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            aria-label={t('closeBtn')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Pills */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t('settingsPrivacyTitle')}</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'privacy'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t('privacyPolicyTitle')}</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'terms'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('termsTitle')}</span>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'contact'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{t('contactTitle')}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* Language & Region */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Globe className="w-4 h-4" />
                  <span>{t('appLanguageLabel')} &amp; Region</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {t('appLanguageLabel')}
                    </label>
                    <select
                      value={appLang}
                      onChange={(e) => setAppLang(e.target.value as AppLangCode)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {APP_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-0.5 text-[11px]">
                    <p className="text-slate-400">
                      Detected Region:{' '}
                      <strong className="text-slate-100">
                        {countryName || countryCode} ({currency})
                      </strong>
                    </p>
                    <p className="text-slate-400 tabular-nums">
                      Local Time: <strong className="text-slate-200">{formatDateTime(Date.now())}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Voice Privacy Pledge */}
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-800/40 flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-200">{t('voicePrivacyNotice')}</p>
                  <p className="text-[11px] text-emerald-100/75 mt-1">
                    Live microphone audio streams solely for real-time AI dialogue and pronunciation feedback. No voice recordings are persisted to permanent servers without explicit consent.
                  </p>
                </div>
              </div>

              {/* GDPR Right to Erasure */}
              <div className="p-4 rounded-2xl bg-rose-950/25 border border-rose-800/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-rose-200 text-sm">GDPR · Data Control</h3>
                    <p className="text-[11px] text-rose-100/75 mt-0.5">
                      Permanently clear your XP, streak, saved vocabulary, custom scenarios, daily quota counter, and local language preferences from this device.
                    </p>
                  </div>
                </div>

                {deletedSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t('dataDeletedBanner')}</span>
                  </div>
                )}

                {!confirmDeleteStep ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStep(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('deleteMyDataBtn')}</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-rose-600/60 space-y-2.5">
                    <p className="flex items-center gap-2 text-rose-200 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      Are you sure? This action removes all local learning progress permanently.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                      >
                        {t('confirmDeleteDataBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStep(false)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        {t('cancelBtn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">{t('privacyPolicyTitle')}</h3>
              <p>
                LinguaLive respects your privacy globally (GDPR, CCPA, and international privacy standards).
              </p>
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <p>
                  <strong className="text-white">1. Voice Audio Processing:</strong>{' '}
                  {t('voicePrivacyNotice')}. Microphone audio is streamed ephemerally during an active voice session solely to generate live AI speech responses and optional live feedback.
                </p>
                <p>
                  <strong className="text-white">2. Local-First Learning Storage:</strong> Your XP, daily streaks, vocabulary memory, conversation reports, and custom scenarios are stored locally in your browser&apos;s storage.
                </p>
                <p>
                  <strong className="text-white">3. Right to Erasure:</strong> You may permanently wipe all locally stored personal learning data anytime using the <strong>{t('deleteMyDataBtn')}</strong> control in Settings.
                </p>
                <p>
                  <strong className="text-white">4. Privacy Inquiries:</strong> Contact{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 underline">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">{t('termsTitle')}</h3>
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <p>
                  <strong className="text-white">1. Educational Practice:</strong> LinguaLive provides AI-assisted spoken and written language practice across 15 languages. AI feedback is designed to support learning and should not replace certified legal, medical, or official translation services.
                </p>
                <p>
                  <strong className="text-white">2. Free Plan &amp; Future Subscriptions:</strong> Free accounts include 3 real-time AI voice calls per calendar day and unlimited text practice. Future paid tiers (via Stripe / RevenueCat) will be strictly opt-in.
                </p>
                <p>
                  <strong className="text-white">3. Fair Usage:</strong> Users agree not to abuse automated endpoints, bypass session limits, or submit unlawful content.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">{t('contactTitle')}</h3>
              <p className="text-slate-300">
                Questions about LinguaLive, worldwide language requests, partnerships, or privacy/GDPR requests? Reach our team directly:
              </p>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Direct Support &amp; Privacy Email</p>
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="text-sm font-bold text-indigo-300 hover:text-indigo-200 underline"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  {emailCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{emailCopied ? 'Copied!' : 'Copy Email'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end shrink-0">
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
