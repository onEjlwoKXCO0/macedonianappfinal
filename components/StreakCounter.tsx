'use client';
import { useState, useEffect } from 'react';

interface Props {
  streak: number;
  animate?: boolean;
}

export default function StreakCounter({ streak, animate = false }: Props) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (animate && streak > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [animate, streak]);

  return (
    <div className="flex items-center gap-[0.4rem]">
      <span className={`text-2xl inline-block${pulse ? ' streak-pulse' : ''}`}>🔥</span>
      <span className="font-bold text-xl">{streak}</span>
      <span className="text-sm text-[var(--text-muted)]">
        {streak === 1 ? 'jour' : 'jours'}
      </span>
    </div>
  );
}
