'use client';

interface Props {
  value: number; // 0–100
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ value, color = 'var(--accent-blue)', height = 8, showLabel = false }: Props) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className="progress-bar" style={{ flex: 1, height }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
          {clamped}%
        </span>
      )}
    </div>
  );
}
