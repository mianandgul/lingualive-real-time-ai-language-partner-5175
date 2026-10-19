import React from 'react';

interface LinguaLiveLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showLivePulse?: boolean;
  className?: string;
}

export const LinguaLiveLogo: React.FC<LinguaLiveLogoProps> = ({
  size = 'md',
  showText = true,
  showLivePulse = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: { container: 'w-7 h-7', icon: 18 },
    md: { container: 'w-9 h-9 sm:w-10 sm:h-10', icon: 24 },
    lg: { container: 'w-12 h-12', icon: 30 },
  }[size];

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
  }[size];

  const subtextSizeClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  }[size];

  return (
    <div className={`flex items-center space-x-2.5 sm:space-x-3 select-none ${className}`}>
      {/* Visual Logo Mark */}
      <div
        className={`relative ${iconDimensions.container} rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-[1.5px] shadow-lg shadow-indigo-900/40 group-hover:shadow-indigo-600/30 group-hover:scale-105 transition-all duration-300`}
      >
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden backdrop-blur-xl">
          {/* Internal atmospheric glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 via-purple-500/20 to-pink-500/30 opacity-80" />

          {/* Bespoke LinguaLive Professional Vector Mark: Dynamic Equalizer + Speech Crest */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[76%] h-[76%] relative z-10 drop-shadow-md"
          >
            <defs>
              <linearGradient id="ll-bubble-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="0.4" stopColor="#818cf8" />
                <stop offset="0.75" stopColor="#c084fc" />
                <stop offset="1" stopColor="#f472b6" />
              </linearGradient>

              <linearGradient id="ll-inner-fill" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" stopOpacity="0.16" />
                <stop offset="1" stopColor="#ec4899" stopOpacity="0.06" />
              </linearGradient>

              <linearGradient id="ll-bar-1" x1="9.5" y1="13.5" x2="11.5" y2="18.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="1" stopColor="#0284c7" />
              </linearGradient>

              <linearGradient id="ll-bar-2" x1="12.5" y1="10.5" x2="14.5" y2="21.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>

              <linearGradient id="ll-bar-3" x1="15.5" y1="7.5" x2="17.5" y2="24.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a855f7" />
                <stop offset="0.5" stopColor="#c084fc" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>

              <linearGradient id="ll-bar-4" x1="18.5" y1="10.5" x2="20.5" y2="21.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e879f9" />
                <stop offset="1" stopColor="#c026d3" />
              </linearGradient>

              <linearGradient id="ll-bar-5" x1="21.5" y1="13.5" x2="23.5" y2="18.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fb7185" />
                <stop offset="1" stopColor="#e11d48" />
              </linearGradient>
            </defs>

            {/* Acoustic dialogue bubble outline & subtle glass fill */}
            <path
              d="M5.5 15.5C5.5 10 9.8 5.5 15.5 5.5C21.2 5.5 25.5 10 25.5 15.5C25.5 21 21.2 25.5 15.5 25.5C13.8 25.5 12.3 25.1 11 24.3L5.5 26L7 21.2C6 19.6 5.5 17.6 5.5 15.5Z"
              fill="url(#ll-inner-fill)"
              stroke="url(#ll-bubble-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Harmonic 5-bar Audio Equalizer Spectrum */}
            <rect x="9.5" y="13.5" width="2" height="5" rx="1" fill="url(#ll-bar-1)" />
            <rect x="12.5" y="10.5" width="2" height="11" rx="1" fill="url(#ll-bar-2)" />
            <rect x="15.5" y="8" width="2" height="15" rx="1" fill="url(#ll-bar-3)" />
            <rect x="18.5" y="10.5" width="2" height="11" rx="1" fill="url(#ll-bar-4)" />
            <rect x="21.5" y="13.5" width="2" height="5" rx="1" fill="url(#ll-bar-5)" />

            {/* Subtle AI Intelligence Sparkle on Upper-Right */}
            <path
              d="M26.5 3.5L27.1 4.8L28.5 5.5L27.1 6.2L26.5 7.5L25.9 6.2L24.5 5.5L25.9 4.8L26.5 3.5Z"
              fill="#38bdf8"
              opacity="0.9"
            />
          </svg>

          {/* Glowing Live Signal Dot on upper-right crest */}
          {showLivePulse && (
            <div className="absolute top-1 right-1 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </div>
          )}
        </div>
      </div>

      {/* Brand Typography & Tagline */}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center space-x-1.5 leading-none">
            <span className={`font-black tracking-tight text-white group-hover:text-indigo-200 transition ${textSizeClasses}`}>
              Lingua<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Live</span>
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI
            </span>
          </div>
          <span className={`text-slate-400 font-medium tracking-normal mt-0.5 hidden md:block ${subtextSizeClasses}`}>
            Real-Time AI Voice Partner
          </span>
        </div>
      )}
    </div>
  );
};
