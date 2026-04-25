'use client';
import { useState } from 'react';
import type { Exercise, Lesson } from '@/lib/types';

interface Props {
  lesson: Lesson;
  exerciseId?: string;
  onClose: () => void;
  onSaved: (updated: Lesson) => void;
}

export default function InlineEditor({ lesson, exerciseId, onClose, onSaved }: Props) {
  const [data, setData] = useState<Lesson>(structuredClone(lesson));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'rules' | 'exercises'>('exercises');

  const updateExercise = (idx: number, field: string, value: unknown) => {
    const exs = [...data.exercises];
    exs[idx] = { ...exs[idx], [field]: value };
    setData({ ...data, exercises: exs });
  };

  const updateAlt = (exIdx: number, altIdx: number, value: string) => {
    const alts = [...data.exercises[exIdx].accept_alternatives];
    alts[altIdx] = value;
    updateExercise(exIdx, 'accept_alternatives', alts);
  };

  const addAlt = (exIdx: number) => {
    const alts = [...data.exercises[exIdx].accept_alternatives, ''];
    updateExercise(exIdx, 'accept_alternatives', alts);
  };

  const removeAlt = (exIdx: number, altIdx: number) => {
    const alts = data.exercises[exIdx].accept_alternatives.filter((_, i) => i !== altIdx);
    updateExercise(exIdx, 'accept_alternatives', alts);
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const exs = [...data.exercises];
    const target = idx + dir;
    if (target < 0 || target >= exs.length) return;
    [exs[idx], exs[target]] = [exs[target], exs[idx]];
    setData({ ...data, exercises: exs });
  };

  const deleteExercise = (idx: number) => {
    setData({ ...data, exercises: data.exercises.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/lesson/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const focusedExIdx = exerciseId
    ? data.exercises.findIndex((e) => e.id === exerciseId)
    : -1;

  const exercisesToShow = focusedExIdx >= 0
    ? [{ ex: data.exercises[focusedExIdx], idx: focusedExIdx }]
    : data.exercises.map((ex, idx) => ({ ex, idx }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '2rem 1rem'
    }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 700, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700 }}>✏️ Éditeur — {lesson.title}</h2>
          <button onClick={onClose} className="btn-ghost">✕ Fermer</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['exercises', 'rules'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                border: '1px solid var(--border)', fontSize: '0.875rem',
                background: activeTab === tab ? 'var(--accent-blue)' : 'var(--bg-input)',
                color: activeTab === tab ? 'white' : 'var(--text)',
              }}
            >
              {tab === 'exercises' ? 'Exercices' : 'Règles'}
            </button>
          ))}
        </div>

        {activeTab === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Explication (FR)</label>
            <textarea
              className="editor-field"
              rows={5}
              value={data.rules.explanation_fr}
              onChange={(e) => setData({ ...data, rules: { ...data.rules, explanation_fr: e.target.value } })}
            />
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notes (une par ligne)</label>
            <textarea
              className="editor-field"
              rows={4}
              value={data.rules.notes_fr.join('\n')}
              onChange={(e) => setData({ ...data, rules: { ...data.rules, notes_fr: e.target.value.split('\n') } })}
            />
          </div>
        )}

        {activeTab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {exercisesToShow.map(({ ex, idx }) => (
              <div key={ex.id} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {ex.id} <span className="badge badge-blue">{ex.type}</span> <span className={`badge phase-${ex.phase}`}>Phase {ex.phase}</span>
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => moveExercise(idx, -1)} className="btn-ghost" style={{ padding: '0.2rem 0.4rem' }}>↑</button>
                    <button onClick={() => moveExercise(idx, 1)} className="btn-ghost" style={{ padding: '0.2rem 0.4rem' }}>↓</button>
                    <button onClick={() => deleteExercise(idx)} className="btn-ghost" style={{ padding: '0.2rem 0.4rem', color: 'var(--accent-red)' }}>🗑</button>
                  </div>
                </div>

                <Field label="Instruction (FR)" value={ex.instruction_fr} onChange={(v) => updateExercise(idx, 'instruction_fr', v)} />
                {ex.question && <Field label="Question" value={ex.question} onChange={(v) => updateExercise(idx, 'question', v)} />}
                {ex.sentence && <Field label="Phrase" value={ex.sentence} onChange={(v) => updateExercise(idx, 'sentence', v)} />}
                {ex.sentence_fr && <Field label="Phrase (FR)" value={ex.sentence_fr} onChange={(v) => updateExercise(idx, 'sentence_fr', v)} />}
                {ex.sentence_mk && <Field label="Phrase (MK)" value={ex.sentence_mk} onChange={(v) => updateExercise(idx, 'sentence_mk', v)} />}
                <Field label="Réponse correcte" value={ex.correct_answer} onChange={(v) => updateExercise(idx, 'correct_answer', v)} />

                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variantes acceptées</label>
                  {ex.accept_alternatives.map((alt, ai) => (
                    <div key={ai} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                      <input
                        className="editor-field"
                        value={alt}
                        onChange={(e) => updateAlt(idx, ai, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button onClick={() => removeAlt(idx, ai)} className="btn-ghost" style={{ padding: '0.2rem 0.4rem', color: 'var(--accent-red)' }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => addAlt(idx)} className="btn-ghost" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>+ Ajouter variante</button>
                </div>

                <Field label="Explication (FR)" value={ex.explanation_fr} onChange={(v) => updateExercise(idx, 'explanation_fr', v)} multiline />
                <Field
                  label="Erreurs fréquentes (une par ligne)"
                  value={ex.common_mistakes_fr.join('\n')}
                  onChange={(v) => updateExercise(idx, 'common_mistakes_fr', v.split('\n'))}
                  multiline
                />
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.875rem', marginTop: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</label>
      {multiline ? (
        <textarea
          className="editor-field"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ marginTop: '0.2rem', display: 'block' }}
        />
      ) : (
        <input
          className="editor-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ marginTop: '0.2rem' }}
        />
      )}
    </div>
  );
}
