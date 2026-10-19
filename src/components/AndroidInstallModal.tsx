import React from 'react';
import {
  Smartphone,
  Download,
  X,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-base">Android Installation & APK</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Android Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">Install directly on Android</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Direct Android 1-Tap Install (WebAPK) Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Direct Android 1-Tap Install (WebAPK)
              </span>
              <h4 className="text-sm font-bold text-white">Install Directly to Your Android Home Screen & Drawer</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Android Chrome and Samsung Internet compile and install a verified native <strong>WebAPK</strong> directly to your Android device with full-screen standalone mode and native microphone access.
              </p>
            </div>

            {isInstalled ? (
              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>LinguaLive is already running as an installed standalone app!</span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={async () => {
                  await install();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install LinguaLive on Android</span>
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    await install();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install LinguaLive on Android</span>
                </button>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-emerald-300">How to install via Android Chrome / Samsung Internet:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>Open this app in <strong>Chrome</strong> on your Android phone.</li>
                    <li>Tap the <strong>three dots (⋮)</strong> menu in the top right.</li>
                    <li>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</li>
                    <li>Confirm installation — Android will register the WebAPK and add it to your launcher.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
