'use client';
import { useState } from 'react';
import type { LessonRules } from '@/lib/types';

interface Props {
  rules: LessonRules;
  onStart: () => void;
}

export default function RuleExplanation({ rules, onStart }: Props) {
  const [showCyrillic, setShowCyrillic] = useState(false);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
          📖 Règles
        </h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {rules.explanation_fr}
        </p>
      </div>

      {rules.table.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tableau de référence</h3>
            {rules.cyrillic_reference && (
              <button
                onClick={() => setShowCyrillic((s) => !s)}
                className="btn-ghost"
                style={{ fontSize: '0.75rem' }}
              >
                {showCyrillic ? '🔡 Masquer Кирилица' : '[ Кирилица ]'}
              </button>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Français</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Macédonien</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Exemple MK</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Exemple FR</th>
                {showCyrillic && (
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Кирилица</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rules.table.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>{row.french}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }} className="mk-text">{row.macedonian}</td>
                  <td style={{ padding: '0.6rem 0.5rem', fontSize: '1rem' }}>{row.example_mk}</td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{row.example_fr}</td>
                  {showCyrillic && rules.cyrillic_reference && (
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rules.notes_fr.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Notes</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rules.notes_fr.map((note, i) => (
              <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onStart} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
        Commencer les exercices →
      </button>
    </div>
  );
}
