import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Cpu,
  FolderCode,
  Info,
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
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Use the shared preview app URL as the canonical packaging URL
  const sharedAppUrl = 'https://ais-pre-e6puqsrxw5ib2vo6fkfuxu-946257500224.asia-east1.run.app';
  const currentOrigin = window.location.origin;
  const targetUrl = currentOrigin.includes('localhost') ? sharedAppUrl : currentOrigin;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
    targetUrl
  )}`;

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
              <p className="text-xs text-slate-400">Install directly on Android or compile a signed APK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Transparent Notice */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start space-x-2.5 text-xs text-slate-300">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong className="text-slate-100">Genuine Android Binaries:</strong> A valid Android APK cannot be produced as a simple mock zip file. Below are the verified ways to install this app on your Android phone or generate a signed package.
            </div>
          </div>

          {/* Option 1: Direct 1-Tap Android WebAPK Install */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Method 1: Direct Android 1-Tap Install (WebAPK)
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
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-emerald-300">How to install via Android Chrome / Samsung Internet:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Open this app in <strong>Chrome</strong> on your Android phone.</li>
                  <li>Tap the <strong>three dots (⋮)</strong> menu in the top right.</li>
                  <li>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</li>
                  <li>Confirm installation — Android will register the WebAPK and add it to your launcher.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Option 2: Generate Standalone Signed APK via PWABuilder */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/40 space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                Method 2: Generate Signed APK / AAB (for Sideloading or Google Play)
              </span>
              <h4 className="text-sm font-bold text-white">Cloud Package via PWABuilder (Official Tool)</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Use Microsoft & Google's official <strong>PWABuilder</strong> to compile a signed <code>.apk</code> (for sideloading) or <code>.aab</code> (for the Google Play Store):
              </p>
            </div>

            {/* App URL Copy Box */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="truncate pr-2">
                <span className="text-[10px] text-slate-500 block">App Packaging URL:</span>
                <span className="font-mono text-indigo-300 select-all truncate">{targetUrl}</span>
              </div>
              <button
                onClick={handleCopyUrl}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <a
              href={pwabuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-950/40 cursor-pointer"
            >
              <span>Package on PWABuilder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <p className="text-[10px] text-slate-400 leading-normal">
              PWABuilder validates this app’s Web App Manifest and Service Worker, packages it using Google’s Bubblewrap, and provides a signed APK/AAB download.
            </p>
          </div>

          {/* Option 3: Android Studio Source Code */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-slate-300">
              <FolderCode className="w-4 h-4 text-purple-400 shrink-0" />
              <h4 className="text-xs font-bold text-white">Method 3: Native Android Studio Project</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              The project's <code className="text-purple-300">/android</code> directory contains the complete native Android source code (<code className="text-slate-300">MainActivity.java</code>, <code className="text-slate-300">AndroidManifest.xml</code>, Gradle files). You can open it in <strong>Android Studio</strong> and run <code className="text-slate-300">Build &gt; Build APK(s)</code> or execute <code className="text-slate-300">./gradlew assembleRelease</code>.
            </p>
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
