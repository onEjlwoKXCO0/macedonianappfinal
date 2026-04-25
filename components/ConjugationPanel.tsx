'use client';
import { useState, useEffect } from 'react';
import type { ConjugationTable } from '@/lib/types';
import { loadConjugationTables, findHighlightedRow } from '@/lib/conjugation-lookup';

const PERSON_LABELS: Record<string, string> = {
  jas: 'Jas (je)',
  ti: 'Ti (tu)',
  toj_taa: 'Toj/Taa (il/elle)',
  nie: 'Nie (nous)',
  vie: 'Vie (vous)',
  tie: 'Tie (ils/elles)',
};

const TENSE_LABELS: Record<string, string> = {
  present: 'Présent',
  past_imperfect: 'Passé imparfait',
  future: 'Futur',
  past_perfect: 'Passé parfait',
  imperative: 'Impératif',
};

interface Props {
  open: boolean;
  onClose: () => void;
  verbs: string[];
  currentSentence?: string;
}

export default function ConjugationPanel({ open, onClose, verbs, currentSentence = '' }: Props) {
  const [tables, setTables] = useState<Record<string, ConjugationTable>>({});
  const [selectedVerb, setSelectedVerb] = useState<string>('');
  const [selectedTense, setSelectedTense] = useState<string>('present');

  useEffect(() => {
    if (verbs.length === 0) return;
    loadConjugationTables(verbs).then((loaded) => {
      setTables(loaded);
      if (!selectedVerb || !loaded[selectedVerb]) {
        setSelectedVerb(verbs[0]);
      }
    });
  }, [verbs.join(',')]);

  const table = selectedVerb ? tables[selectedVerb] : null;
  const tenses = table ? Object.keys(table.tables) : [];
  const currentTense = tenses.includes(selectedTense) ? selectedTense : tenses[0] ?? 'present';
  const tenseData = table?.tables[currentTense] ?? {};
  const highlighted = table ? findHighlightedRow(table, currentTense, currentSentence) : null;

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99,
          }}
        />
      )}
      <div className={`conj-panel${open ? ' open' : ''}`}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>📋 Tables de conjugaison</span>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>✕</button>
        </div>

        {verbs.length === 0 && (
          <div style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Aucun verbe dans cet exercice.
          </div>
        )}

        {verbs.length > 1 && (
          <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
            {verbs.map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVerb(v)}
                className={selectedVerb === v ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.875rem' }}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {table && (
          <>
            <div style={{ padding: '0.75rem 1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{table.infinitive}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{table.meaning_fr}</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                <span className="badge badge-blue">{table.aspect === 'imperfective' ? 'Imperfectif' : 'Perfectif'}</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto', padding: '0 1rem' }}>
              <table className="conj-table">
                <thead>
                  <tr>
                    <th>Pronom</th>
                    <th>{TENSE_LABELS[currentTense] ?? currentTense}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(tenseData).map(([person, form]) => (
                    <tr key={person} className={highlighted === person ? 'highlighted' : ''}>
                      <td style={{ color: 'var(--text-muted)' }}>{PERSON_LABELS[person] ?? person}</td>
                      <td className="mk-text" style={{ fontSize: '1rem' }}>{form}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.notes_fr.length > 0 && (
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {table.notes_fr.map((n, i) => <div key={i}>{n}</div>)}
              </div>
            )}

            <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
              {tenses.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTense(t)}
                  style={{
                    padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', border: '1px solid var(--border)',
                    background: t === currentTense ? 'var(--accent-blue)' : 'var(--bg-input)',
                    color: t === currentTense ? 'white' : 'var(--text)',
                  }}
                >
                  {TENSE_LABELS[t] ?? t}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
