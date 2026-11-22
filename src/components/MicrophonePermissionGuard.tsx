import React from 'react';
import {
  MicOff,
  RefreshCw,
  RotateCcw,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { useI18n } from '../services/i18n';

export interface MicrophoneErrorState {
  code:
    | 'NotAllowedError'
    | 'NotFoundError'
    | 'NotReadableError'
    | 'NotSupportedError'
    | 'UnknownError';
  title: string;
  detail: string;
  browserSteps: string;
  osSteps: string;
  permissionStatus?: PermissionState | null;
}

interface MicrophonePermissionGuardProps {
  micError: MicrophoneErrorState | null;
  isRetrying?: boolean;
  onRetry: () => void | Promise<void>;
  onResetPermissionState: () => void | Promise<void>;
  onSwitchToChat: () => void;
  children: React.ReactNode;
}

export const MicrophonePermissionGuard: React.FC<MicrophonePermissionGuardProps> = ({
  micError,
  isRetrying = false,
  onRetry,
  onResetPermissionState,
  onSwitchToChat,
  children,
}) => {
  const { t } = useI18n();
  const isEmbeddedFrame =
    typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {micError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-amber-950/50 border border-amber-600/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 animate-fadeIn shrink-0"
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                {micError.code === 'NotAllowedError' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center flex-wrap gap-2">
                  <h3 className="font-bold text-amber-200 text-sm">
                    {micError.title}
                  </h3>
                  {micError.permissionStatus && (
                    <span className="text-[11px] font-mono text-amber-300/90">
                      (permission: {micError.permissionStatus})
                    </span>
                  )}
                </div>

                <p className="text-amber-100/90 leading-relaxed">
                  {micError.detail}
                </p>

                <div className="pt-1 space-y-1 text-[11px] text-amber-200/85">
                  <p className="flex items-start gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{micError.browserSteps}</span>
                  </p>
                  <p className="pl-5 text-amber-200/75">{micError.osSteps}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isEmbeddedFrame && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-indigo-600/85 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('openDirectTab')}</span>
                </a>
              )}

              <button
                type="button"
                onClick={onSwitchToChat}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('chatPractice')}</span>
              </button>

              <button
                type="button"
                disabled={isRetrying}
                onClick={onResetPermissionState}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title={t('resetPermission')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('resetPermission')}</span>
              </button>

              <button
                type="button"
                disabled={isRetrying}
                onClick={onRetry}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`}
                />
                <span>{isRetrying ? '...' : t('retryBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
