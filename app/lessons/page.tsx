'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProgress } from '@/lib/progress-tracker';
import { getAllCards } from '@/lib/spaced-repetition';
import type { Lesson } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  grammar: 'Grammaire',
  thematic: 'Thématique',
};

const CATEGORY_COLORS: Record<string, string> = {
  grammar: 'badge-green',
  thematic: 'badge-orange',
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [registeredExIds, setRegisteredExIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((data: Lesson[]) => {
        const sorted = data
          .filter((l) => !l.id.startsWith('drill_') && !l.id.startsWith('micro_'))
          .sort((a, b) => a.difficulty_level - b.difficulty_level);
        setLessons(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const progress = getProgress();
    const done = new Set(progress.session_history.flatMap((s) => s.lessons_completed));
    setCompletedIds(done);

    // Which exercise IDs already have FSRS cards
    const cards = getAllCards();
    setRegisteredExIds(new Set(Object.keys(cards)));
  }, []);

  const byCategory = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category].push(l);
    return acc;
  }, {});

  if (loading) return (
    <div className="max-w-[680px] mx-auto mt-16 px-4 text-center text-[var(--text-muted)]">
      <div className="text-[2rem] mb-3">⏳</div>
      Chargement des leçons...
    </div>
  );

  return (
    <div className="max-w-[680px] mx-auto px-4 py-6">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-extrabold text-2xl">📘 Toutes les leçons</h1>
        {lessons.length > 0 && (
          <span className="text-[0.8rem] text-[var(--text-muted)]">
            {completedIds.size} / {lessons.length} terminées
          </span>
        )}
      </div>

      {lessons.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-[2rem] mb-2">📭</div>
          <p className="text-[var(--text-muted)]">Aucune leçon disponible. Lancez le seeder pour générer du contenu.</p>
          <Link href="/seed" className="no-underline">
            <button className="btn-primary mt-4">Aller au Seeder</button>
          </Link>
        </div>
      )}

      {Object.entries(byCategory).map(([cat, catLessons]) => (
        <div key={cat} className="mb-8">
          <h2 className="font-bold text-base mb-3 text-[var(--text-muted)] uppercase tracking-[0.05em]">
            {CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <div className="flex flex-col gap-[0.6rem]">
            {catLessons.map((lesson) => {
              const done = completedIds.has(lesson.id);
              const cardsRegistered = lesson.exercises.filter(e => registeredExIds.has(e.id)).length;
              const totalCards = lesson.exercises.length;
              return (
                <Link key={lesson.id} href={`/lessons/${lesson.id}`} className="no-underline">
                  <div
                    className="card p-4 flex items-center gap-4 cursor-pointer transition-all duration-[150ms]"
                    style={{ opacity: done ? 0.75 : 1 }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {done && <span className="text-[0.8rem] text-[var(--accent-green)]">✅</span>}
                        <span className="font-semibold">{lesson.title}</span>
                      </div>
                      <div className="text-[0.8rem] text-[var(--text-muted)] mb-1">{lesson.subtopic}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {cardsRegistered > 0
                          ? <span style={{ color: 'var(--accent-green)' }}>🃏 {cardsRegistered}/{totalCards} cartes en révision</span>
                          : <span>🃏 {totalCards} cartes à débloquer</span>
                        }
                      </div>
                    </div>
                    <div className="flex gap-[0.4rem] items-center shrink-0">
                      <span className={`badge ${CATEGORY_COLORS[lesson.category]}`}>{CATEGORY_LABELS[lesson.category]}</span>
                      <span className="badge badge-blue">Niv. {lesson.difficulty_level}</span>
                      <span className="text-xl text-[var(--text-muted)]">›</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
