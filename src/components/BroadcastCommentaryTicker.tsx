import React, { useEffect, useState } from 'react';
import { commentaryEngine, CommentaryMessage } from '../engine/commentaryEngine';
import { Mic, Sparkles } from 'lucide-react';

interface BroadcastCommentaryTickerProps {
  className?: string;
}

export function BroadcastCommentaryTicker({ className = '' }: BroadcastCommentaryTickerProps) {
  const [message, setMessage] = useState<CommentaryMessage | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  useEffect(() => {
    setIsEnabled(commentaryEngine.getIsEnabled());
    const unsubscribe = commentaryEngine.subscribe(msg => {
      setMessage(msg);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!isEnabled || !message) {
    return null;
  }

  return (
    <div className={`pointer-events-none transition-all duration-300 ease-out transform ${className}`}>
      <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/50 shadow-2xl shadow-cyan-950/70 max-w-xl mx-auto transition-transform duration-300 scale-100">
        {/* Pulsating Microphone & Equalizer */}
        <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-red-600/95 text-white shadow-sm shadow-red-500/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <Mic className="w-3.5 h-3.5 text-white" />
          <span className="text-[11px] font-black uppercase tracking-wider font-mono">
            {message.speakerName}
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-amber-300 font-mono font-bold">
            {message.lang === 'en' ? 'EN 🇬🇧' : 'VI 🇻🇳'}
          </span>
        </div>

        {/* Equalizer Sound Waves */}
        <div className="flex items-center gap-0.5 shrink-0 h-4">
          <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce h-3"></span>
          <span className="w-0.5 bg-cyan-400 rounded-full animate-pulse h-4 delay-75"></span>
          <span className="w-0.5 bg-cyan-400 rounded-full animate-bounce h-2 delay-150"></span>
          <span className="w-0.5 bg-cyan-400 rounded-full animate-pulse h-3.5 delay-100"></span>
        </div>

        {/* Speech Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-tight tracking-wide drop-shadow-md truncate sm:whitespace-normal">
            "{message.text}"
          </p>
        </div>

        {/* Category Indicator Icon */}
        <div className="shrink-0 text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
