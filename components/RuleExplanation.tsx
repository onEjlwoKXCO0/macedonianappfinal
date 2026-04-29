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
    <div className="max-w-[640px] mx-auto px-4 py-6">
      <div className="card p-6 mb-5">
        <h2 className="text-lg font-bold mb-4">📖 Règles</h2>
        <p className="text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
          {rules.explanation_fr}
        </p>
      </div>

      {rules.table.length > 0 && (
        <div className="card p-5 mb-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[0.9rem] text-[var(--text-muted)]">Tableau de référence</h3>
            {rules.cyrillic_reference && (
              <button
                onClick={() => setShowCyrillic((s) => !s)}
                className="btn-ghost text-xs"
              >
                {showCyrillic ? '🔡 Masquer Кирилица' : '[ Кирилица ]'}
              </button>
            )}
          </div>
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left p-2 font-semibold text-[var(--text-muted)]">Français</th>
                <th className="text-left p-2 font-semibold text-[var(--text-muted)]">Macédonien</th>
                <th className="text-left p-2 font-semibold text-[var(--text-muted)]">Exemple MK</th>
                <th className="text-left p-2 font-semibold text-[var(--text-muted)]">Exemple FR</th>
                {showCyrillic && (
                  <th className="text-left p-2 font-semibold text-[var(--text-muted)]">Кирилица</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rules.table.map((row, i) => (
                <tr key={`${row.french}_${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-[0.6rem] px-2 text-[var(--text-muted)]">{row.french}</td>
                  <td className="py-[0.6rem] px-2 mk-text">{row.macedonian}</td>
                  <td className="py-[0.6rem] px-2 text-base">{row.example_mk}</td>
                  <td className="py-[0.6rem] px-2 text-sm text-[var(--text-muted)]">{row.example_fr}</td>
                  {showCyrillic && rules.cyrillic_reference && (
                    <td className="py-[0.6rem] px-2 text-sm text-[var(--text-muted)]">—</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rules.notes_fr.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="font-bold text-[0.9rem] text-[var(--text-muted)] mb-3">Notes</h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {rules.notes_fr.map((note, i) => (
              <li key={`${note}_${i}`} className="text-[0.9rem] leading-normal">{note}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onStart}
        className="btn-primary w-full"
        style={{ padding: '1rem', fontSize: '1.1rem' }}
      >
        Commencer les exercices →
      </button>
    </div>
  );
}
