'use client';
import { useState } from 'react';

interface Props {
  front: string;
  back: string;
  frontLabel?: string;
  backLabel?: string;
}

export default function FlashCard({ front, back, frontLabel = 'Macédonien', backLabel = 'Français' }: Props) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`flip-card w-full${flipped ? ' flipped' : ''}`}
      onClick={() => setFlipped((f) => !f)}
      style={{ minHeight: 200 }}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {frontLabel}
          </span>
          <span className="mk-text" style={{ textAlign: 'center' }}>{front}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
            Cliquez pour retourner
          </span>
        </div>
        <div className="flip-card-back">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {backLabel}
          </span>
          <span className="fr-text" style={{ textAlign: 'center', color: 'var(--text)', fontSize: '1.5rem' }}>
            {back}
          </span>
        </div>
      </div>
    </div>
  );
}
