import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isUserSpeaking: boolean;
  isModelSpeaking: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  userVolume: number;
  modelVolume: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isUserSpeaking,
  isModelSpeaking,
  isConnecting,
  isMuted,
  userVolume,
  modelVolume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      phase += 0.08;

      const activeVolume = isModelSpeaking
        ? Math.max(0.2, modelVolume * 3)
        : isUserSpeaking && !isMuted
        ? Math.max(0.2, userVolume * 3)
        : isConnecting
        ? 0.15
        : 0.05;

      const color = isModelSpeaking
        ? 'rgba(168, 85, 247, ' // purple/violet for AI
        : isUserSpeaking && !isMuted
        ? 'rgba(14, 165, 233, ' // cyan for user
        : 'rgba(100, 116, 139, '; // slate for idle

      // Draw 3 layered harmonic sine waves
      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        const wavePhase = phase + wave * 1.5;
        const amplitude = (height * 0.35 * activeVolume) / (wave + 1);
        const wavelength = 30 + wave * 15;

        for (let x = 0; x < width; x += 2) {
          const windowMultiplier = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x / wavelength + wavePhase) * amplitude * windowMultiplier;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = `${color}${0.7 - wave * 0.2})`;
        ctx.lineWidth = 3 - wave * 0.7;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isUserSpeaking, isModelSpeaking, isConnecting, isMuted, userVolume, modelVolume]);

  return (
    <div className="relative flex flex-col items-center justify-center py-6">
      {/* Central Pulsing Audio Orb */}
      <div className="relative flex items-center justify-center w-36 h-36">
        {/* Outer Glow Halo */}
        <div
          className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 pointer-events-none ${
            isModelSpeaking
              ? 'bg-purple-500/35 scale-125'
              : isUserSpeaking && !isMuted
              ? 'bg-cyan-500/35 scale-125'
              : isConnecting
              ? 'bg-amber-500/20 animate-pulse'
              : 'bg-indigo-500/10 scale-95'
          }`}
          style={{
            transform: `scale(${
              1 +
              (isModelSpeaking
                ? modelVolume * 1.5
                : isUserSpeaking && !isMuted
                ? userVolume * 1.5
                : 0.05)
            })`,
          }}
        />

        {/* Ambient Orbit Ring */}
        <div
          className={`absolute inset-1 rounded-full border border-dashed transition-all duration-700 ${
            isModelSpeaking
              ? 'border-purple-400/40 animate-spin [animation-duration:8s]'
              : isUserSpeaking && !isMuted
              ? 'border-cyan-400/40 animate-spin [animation-duration:12s]'
              : 'border-slate-700/50'
          }`}
        />

        {/* Core Sphere */}
        <div
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 border ${
            isModelSpeaking
              ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-pink-500 border-purple-300/40 shadow-purple-500/30'
              : isUserSpeaking && !isMuted
              ? 'bg-gradient-to-tr from-cyan-600 via-teal-600 to-blue-500 border-cyan-300/40 shadow-cyan-500/30'
              : isConnecting
              ? 'bg-gradient-to-tr from-amber-600 to-orange-700 border-amber-300/30'
              : 'bg-gradient-to-tr from-slate-800 to-slate-900 border-slate-700/60 shadow-slate-900/50'
          }`}
          style={{
            transform: `scale(${
              1 +
              (isModelSpeaking
                ? Math.min(modelVolume * 0.4, 0.3)
                : isUserSpeaking && !isMuted
                ? Math.min(userVolume * 0.4, 0.3)
                : 0)
            })`,
          }}
        >
          {isConnecting ? (
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 border-2 border-white/80 border-t-transparent rounded-full animate-spin mb-1" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-200">Connecting</span>
            </div>
          ) : isModelSpeaking ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center space-x-1 mb-1">
                <span className="w-1.5 h-4 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-6 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-3 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-white/95">Speaking</span>
            </div>
          ) : isUserSpeaking && !isMuted ? (
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-white animate-ping mb-1" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-white">Listening</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <svg className="w-6 h-6 mb-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-[10px] font-medium tracking-wide uppercase text-slate-400">Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Sound Waveform Canvas */}
      <div className="w-full max-w-md h-14 mt-3">
        <canvas
          ref={canvasRef}
          width={400}
          height={56}
          className="w-full h-full block"
        />
      </div>

      {/* Status Bar */}
      <div className="text-center">
        <p className="text-xs font-medium text-slate-400 tracking-wide">
          {isConnecting ? (
            <span className="text-amber-300 font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Connecting to voice partner... preparing audio
            </span>
          ) : isModelSpeaking ? (
            <span className="text-purple-300 font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Partner is speaking (Speak anytime to interrupt)
            </span>
          ) : isUserSpeaking && !isMuted ? (
            <span className="text-cyan-300 font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Streaming your voice in real time
            </span>
          ) : isMuted ? (
            <span className="text-rose-400 font-medium">Microphone is muted</span>
          ) : (
            <span>Speak naturally in target language — your partner is listening</span>
          )}
        </p>
      </div>
    </div>
  );
};
