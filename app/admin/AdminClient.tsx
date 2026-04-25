'use client';
import { useState } from 'react';
import type { Lesson } from '@/lib/types';

interface Props { initialLessons: Lesson[]; }

export default function AdminClient({ initialLessons }: Props) {
  const [lessons, setLessons] = useState(initialLessons);
  const [status, setStatus] = useState<Record<string, string>>({});

  const act = async (lessonId: string, action: 'approve' | 'reject') => {
    setStatus((s) => ({ ...s, [lessonId]: 'loading' }));
    try {
      const res = await fetch('/api/admin/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, action }),
      });
      if (!res.ok) throw new Error(await res.text());
      setLessons((l) => l.filter((ll) => ll.id !== lessonId));
      setStatus((s) => ({ ...s, [lessonId]: action }));
    } catch (e) {
      setStatus((s) => ({ ...s, [lessonId]: `error: ${e}` }));
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1.5rem' }}>⚙️ Admin — Leçons en attente</h1>
      {lessons.length === 0 && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Aucune leçon en attente d'approbation.</p>
        </div>
      )}
      {lessons.map((lesson) => (
        <div key={lesson.id} className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{lesson.title}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {lesson.topic} · {lesson.exercises.length} exercices · Niv. {lesson.difficulty_level}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => act(lesson.id, 'approve')}
                className="btn-primary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                disabled={status[lesson.id] === 'loading'}
              >
                ✅ Approuver
              </button>
              <button
                onClick={() => act(lesson.id, 'reject')}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', color: 'var(--accent-red)' }}
                disabled={status[lesson.id] === 'loading'}
              >
                ❌ Rejeter
              </button>
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {lesson.rules.explanation_fr.slice(0, 120)}...
          </div>
        </div>
      ))}
    </div>
  );
}
