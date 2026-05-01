'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgress } from '@/lib/progress-tracker';
import { getDueCount, getNewCount, getRemainingNewToday } from '@/lib/spaced-repetition';
import type { Lesson } from '@/lib/types';
import LessonFlow from '@/components/LessonFlow';

interface DayPlan {
  dueCount: number;
  newCount: number;
  remainingNew: number;
  nextLesson: Lesson | null;
  lessonsCompletedToday: number;
}

export default function DailyPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { buildPlan(); }, []);

  async function buildPlan() {
    setLoading(true);
    const progress = getProgress();
    const completedIds = new Set(progress.session_history.flatMap((s) => s.lessons_completed));
    const todaySessions = progress.session_history.filter((s) => s.date === today);
    const lessonsCompletedToday = todaySessions.reduce((sum, s) => sum + s.lessons_completed.length, 0);

    let nextLesson: Lesson | null = null;
    try {
      const res = await fetch('/api/lessons');
      const lessons: Lesson[] = await res.json();
      const available = lessons.filter(
        (l) => !l.id.startsWith('drill_') && !l.id.startsWith('micro_') && !completedIds.has(l.id)
      );
      // Prefer lessons in topics already started, then any lesson
      const practicedTopics = new Set(Object.keys(progress.topics));
      nextLesson = available.find((l) => practicedTopics.has(l.topic)) ?? available[0] ?? null;
    } catch { /* offline */ }

    setPlan({
      dueCount: getDueCount(today),
      newCount: getNewCount(),
      remainingNew: getRemainingNewToday(today),
      nextLesson,
      lessonsCompletedToday,
    });
    setLoading(false);
  }

  if (loading) return (
    <div className="max-w-[680px] mx-auto mt-16 px-4 text-center text-[var(--text-muted)]">
      <div className="text-[2rem] mb-3">⏳</div>
      Préparation du plan du jour...
    </div>
  );

  // Lesson in progress
  if (activeLesson) return (
    <LessonFlow
      lesson={activeLesson}
      onFinish={() => { setActiveLesson(null); buildPlan(); }}
      onHome={() => { setActiveLesson(null); router.push('/'); }}
      onNextLesson={() => { setActiveLesson(null); buildPlan(); }}
    />
  );

  const { dueCount, newCount, remainingNew, nextLesson, lessonsCompletedToday } = plan!;
  const totalWork = dueCount + Math.min(newCount, remainingNew);
  const allDone = totalWork === 0 && lessonsCompletedToday > 0;

  return (
    <div className="max-w-[680px] mx-auto px-4 py-6">
      <h1 className="font-extrabold text-2xl mb-1">📅 Aujourd'hui</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6">
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {allDone && (
        <div className="card p-6 mb-5 text-center" style={{ background: 'rgba(34,197,94,0.07)', borderColor: 'rgba(34,197,94,0.3)' }}>
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="font-bold text-base mb-1">Tout est fait pour aujourd'hui !</h2>
          <p className="text-sm text-[var(--text-muted)]">Revenez demain pour de nouvelles révisions.</p>
        </div>
      )}

      {/* FSRS reviews */}
      <div
        className="card p-5 mb-4 cursor-pointer transition-all duration-150"
        style={{
          background: dueCount > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.05)',
          borderColor: dueCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)',
        }}
        onClick={() => router.push('/review')}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base mb-1">🔄 Révisions FSRS</h2>
            <div className="flex gap-3 text-sm">
              {dueCount > 0
                ? <span className="text-[var(--accent-red)] font-semibold">{dueCount} carte{dueCount > 1 ? 's' : ''} à réviser</span>
                : <span className="text-[var(--accent-green)]">✓ Aucune révision en attente</span>
              }
              {remainingNew > 0 && (
                <span className="text-[var(--text-muted)]">+ {remainingNew} nouvelle{remainingNew > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <span className="text-xl text-[var(--text-muted)]">›</span>
        </div>
        {dueCount > 0 && (
          <button className="btn-primary w-full mt-3" onClick={(e) => { e.stopPropagation(); router.push('/review'); }}>
            Commencer les révisions →
          </button>
        )}
      </div>

      {/* Next lesson */}
      {nextLesson && (
        <div className="card p-5 mb-4" style={{ background: 'rgba(74,158,255,0.06)', borderColor: 'rgba(74,158,255,0.25)' }}>
          <h2 className="font-bold text-base mb-1">📘 Prochaine leçon</h2>
          <p className="text-sm text-[var(--text-muted)] mb-1">{nextLesson.title}</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">{nextLesson.subtopic}</p>
          <div className="flex gap-2">
            <span className="badge badge-blue">Niv. {nextLesson.difficulty_level}</span>
            <span className="badge badge-green">{nextLesson.exercises.length} exercices</span>
          </div>
          <button
            className="btn-primary w-full mt-3"
            onClick={() => setActiveLesson(nextLesson)}
          >
            Commencer la leçon →
          </button>
        </div>
      )}

      {!nextLesson && (
        <div className="card p-5 mb-4 text-center">
          <div className="text-[2rem] mb-2">🎓</div>
          <p className="text-sm text-[var(--text-muted)]">Toutes les leçons disponibles sont complétées.</p>
        </div>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-xl font-extrabold" style={{ color: dueCount === 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {dueCount}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">cartes dues</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-extrabold text-[var(--accent-blue)]">{newCount}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">cartes nouvelles</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-extrabold text-[var(--accent-green)]">{lessonsCompletedToday}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">leçon{lessonsCompletedToday !== 1 ? 's' : ''} aujourd'hui</div>
        </div>
      </div>
    </div>
  );
}
