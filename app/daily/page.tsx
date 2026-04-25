'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgress } from '@/lib/progress-tracker';
import { getDueItems } from '@/lib/spaced-repetition';
import { getTopConfusions } from '@/lib/distractor-engine';
import type { Lesson } from '@/lib/types';
import LessonFlow from '@/components/LessonFlow';

export default function DailyPage() {
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [microAlert, setMicroAlert] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const progress = getProgress();
    const due = getDueItems(progress.weak_items, today);
    const confusions = getTopConfusions(3);

    if (confusions.length > 0 && confusions[0].count >= 3) {
      setMicroAlert(`Tu confonds souvent « ${confusions[0].correct} » et « ${confusions[0].chosen_instead} ».`);
    }

    // Pick the first available lesson
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((lessons: Lesson[]) => {
        if (lessons.length === 0) { setLoading(false); return; }
        // Prioritize lessons from topics with due review items
        const dueTopics = new Set(due.map((d) => d.topic));
        const sorted = [...lessons].sort((a, b) => {
          const aScore = dueTopics.has(a.topic) ? -1 : 0;
          const bScore = dueTopics.has(b.topic) ? -1 : 0;
          return aScore - bScore;
        });
        setLesson(sorted[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '4rem auto', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Préparation de la session...
    </div>
  );

  if (!lesson) return (
    <div style={{ maxWidth: 680, margin: '4rem auto', padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Aucune leçon disponible pour aujourd'hui.</p>
      <button className="btn-primary" onClick={() => router.push('/lessons')}>Voir les leçons</button>
    </div>
  );

  return (
    <div>
      {microAlert && (
        <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', padding: '0.75rem 1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
          ⚠️ Point faible détecté — {microAlert} Voici des exercices ciblés.
        </div>
      )}
      <LessonFlow
        lesson={lesson}
        onFinish={() => {}}
        onHome={() => router.push('/')}
        onNextLesson={() => router.push('/lessons')}
      />
    </div>
  );
}
