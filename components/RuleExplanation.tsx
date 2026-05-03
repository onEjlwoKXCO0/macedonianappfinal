'use client';
import { useState } from 'react';
import type { LessonRules } from '@/lib/types';

interface Props {
  rules: LessonRules;
  onStart: () => void;
}

// ─── Explanation text parser ──────────────────────────────────────────────��────

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'section'; title: string }
  | { type: 'divider' }
  | { type: 'table'; rows: string[][] }
  | { type: 'code'; text: string }

function isSep(line: string) {
  const t = line.trim();
  return t.length > 2 && [...t].every(c => c === '━');
}

function parsePipeLine(line: string): string[] {
  const parts = line.split('|').map(s => s.trim());
  if (parts[0] === '') parts.shift();
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts.filter(Boolean);
}

function parseExplanation(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ━━━ TITLE ━━━ pattern
    if (isSep(line)) {
      const next = lines[i + 1]?.trim() ?? '';
      if (next && !next.includes('|') && !isSep(lines[i + 1]) && isSep(lines[i + 2] ?? '')) {
        blocks.push({ type: 'section', title: next });
        i += 3;
      } else {
        blocks.push({ type: 'divider' });
        i++;
      }
      continue;
    }

    // Table rows (lines with |)
    if (line.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map(parsePipeLine).filter(r => r.length > 1);
      if (rows.length > 0) blocks.push({ type: 'table', rows });
      continue;
    }

    // Indented code/example block
    if (line.startsWith('  ') && trimmed && !isSep(line)) {
      const codeLines: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if ((l.startsWith('  ') || l.trim() === '') && !l.includes('|') && !isSep(l)) {
          codeLines.push(l);
          i++;
        } else break;
      }
      const code = codeLines.join('\n').trimEnd();
      if (code.trim()) blocks.push({ type: 'code', text: code });
      continue;
    }

    // Regular paragraph
    if (trimmed) blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  return blocks;
}

function ExplanationRenderer({ text }: { text: string }) {
  const blocks = parseExplanation(text);

  return (
    <div className="flex flex-col gap-[0.3rem]">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={i} className="text-[var(--text-muted)] leading-relaxed">
                {block.text}
              </p>
            );

          case 'divider':
            return <hr key={i} style={{ borderColor: 'var(--border)', margin: '0.2rem 0' }} />;

          case 'section':
            return (
              <div
                key={i}
                className="font-bold text-[0.8rem] uppercase tracking-wider mt-3 mb-[0.15rem]"
                style={{ color: 'var(--accent-blue)' }}
              >
                {block.title}
              </div>
            );

          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-lg my-1" style={{ border: '1px solid var(--border)' }}>
                <table className="border-collapse text-sm w-full">
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '2px solid var(--border)' }}>
                      {block.rows[0].map((cell, j) => (
                        <th
                          key={j}
                          className="text-left px-3 py-[0.4rem] font-semibold text-xs text-[var(--text-muted)] whitespace-nowrap"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.slice(1).map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-[0.4rem] text-sm whitespace-nowrap mk-text">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'code':
            return (
              <pre
                key={i}
                className="text-[0.82rem] rounded-lg px-3 py-2 my-1 overflow-x-auto leading-relaxed"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-muted)',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
              >
                {block.text}
              </pre>
            );
        }
      })}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RuleExplanation({ rules, onStart }: Props) {
  const [showCyrillic, setShowCyrillic] = useState(false);

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6">
      <div className="card p-6 mb-5">
        <h2 className="text-lg font-bold mb-4">📖 Règles</h2>
        <ExplanationRenderer text={rules.explanation_fr} />
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
