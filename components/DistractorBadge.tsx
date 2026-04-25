'use client';

interface Props {
  label?: string;
}

export default function DistractorBadge({ label = 'souvent confondu' }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.1rem 0.5rem',
        borderRadius: 99,
        fontSize: '0.7rem',
        fontWeight: 600,
        background: 'rgba(249,115,22,0.15)',
        color: 'var(--accent-orange)',
        marginLeft: '0.5rem',
        verticalAlign: 'middle',
      }}
    >
      🎯 {label}
    </span>
  );
}
