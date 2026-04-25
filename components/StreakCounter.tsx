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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span
        className={pulse ? 'streak-pulse' : ''}
        style={{ fontSize: '1.5rem', display: 'inline-block' }}
      >
        🔥
      </span>
      <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{streak}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {streak === 1 ? 'jour' : 'jours'}
      </span>
    </div>
  );
}
