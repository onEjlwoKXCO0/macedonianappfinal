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
    <div className="flex items-center gap-2">
      <div className="progress-bar flex-1" style={{ height }}>
        <div className="progress-bar-fill" style={{ width: `${clamped}%`, background: color }} />
      </div>
      {showLabel && (
        <span className="text-xs text-right min-w-[36px] text-[var(--text-muted)]">
          {clamped}%
        </span>
      )}
    </div>
  );
}
