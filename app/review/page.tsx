'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgress } from '@/lib/progress-tracker';
import { getDueItems } from '@/lib/spaced-repetition';
import type { WeakItem, Lesson } from '@/lib/types';
import LessonFlow from '@/components/LessonFlow';

export default function ReviewPage() {
  const router = useRouter();
  const [dueItems, setDueItems] = useState<WeakItem[]>([]);
  const [reviewLesson, setReviewLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const progress = getProgress();
    const due = getDueItems(progress.weak_items, today);
    setDueItems(due);

    if (due.length === 0) { setLoading(false); return; }

    // Build a synthetic review lesson from due exercises
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((lessons: Lesson[]) => {
        const dueIds = new Set(due.map((d) => d.item_id));
        const exercises = lessons
          .flatMap((l) => l.exercises.map((ex) => ({ ex, lesson: l })))
          .filter(({ ex }) => dueIds.has(ex.id))
          .slice(0, 10)
          .map(({ ex }) => ex);

        if (exercises.length === 0) { setLoading(false); return; }

        const synthetic: Lesson = {
          id: 'review_session',
          topic: 'review',
          category: 'grammar',
          title: 'Session de révision',
          difficulty_level: 3,
          created_at: today,
          status: 'approved',
          subtopic: `${due.length} item${due.length > 1 ? 's' : ''} à réviser`,
          rules: {
            explanation_fr: 'Ces exercices ont été identifiés comme points faibles. Révisez-les soigneusement.',
            table: [],
            notes_fr: [],
          },
          exercises,
        };
        setReviewLesson(synthetic);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '4rem auto', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Chargement des révisions...
    </div>
  );

  if (dueItems.length === 0) return (
    <div style={{ maxWidth: 680, margin: '4rem auto', padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
      <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Aucune révision en attente !</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Vous êtes à jour. Revenez demain.</p>
      <button className="btn-primary" onClick={() => router.push('/')}>Retour à l'accueil</button>
    </div>
  );

  if (!reviewLesson) return (
    <div style={{ maxWidth: 680, margin: '4rem auto', padding: '1rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>{dueItems.length} révision(s) en attente mais les leçons sont introuvables.</p>
    </div>
  );

  return (
    <div>
      <div style={{ background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', padding: '0.75rem 1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
        🔄 Session de révision — {dueItems.length} item{dueItems.length > 1 ? 's' : ''} à revoir
      </div>
      <LessonFlow
        lesson={reviewLesson}
        onFinish={() => {}}
        onHome={() => router.push('/')}
        onNextLesson={() => router.push('/lessons')}
      />
    </div>
  );
}
