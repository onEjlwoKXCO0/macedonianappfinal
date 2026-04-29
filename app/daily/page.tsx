'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgress } from '@/lib/progress-tracker';
import { getDueItems } from '@/lib/spaced-repetition';
import { getDistractorMemory, saveDistractorMemory } from '@/lib/distractor-engine';
import type { Lesson, Exercise } from '@/lib/types';
import LessonFlow from '@/components/LessonFlow';
import StreakCounter from '@/components/StreakCounter';

interface MixInfo {
  srCount: number;
  lessonCount: number;
  challengeCount: number;
  microAlert?: string;
  microLessonId?: string;
}

export default function DailyPage() {
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [mixInfo, setMixInfo] = useState<MixInfo | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [finalScore, setFinalScore] = useState({ score: 0, total: 0 });

  useEffect(() => {
    buildDailyMix();
  }, []);

  async function buildDailyMix() {
    const today = new Date().toISOString().slice(0, 10);
    const progress = getProgress();
    const mem = getDistractorMemory();

    const pendingConfusion = mem.confusions.find((c) => {
      const microId = `micro_${c.correct}_vs_${c.chosen_instead}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
      return c.count >= 3 && !mem.micro_lessons_injected.includes(microId);
    });

    if (pendingConfusion) {
      const res = await fetch('/api/micro-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confusion: pendingConfusion, distractorMemory: mem }),
      });
      const data = await res.json();
      if (data.generated) {
        const microId = `micro_${pendingConfusion.correct}_vs_${pendingConfusion.chosen_instead}`
          .replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
        mem.micro_lessons_injected.push(microId);
        saveDistractorMemory(mem);

        const lessonRes = await fetch(`/api/lesson/${microId}`);
        if (lessonRes.ok) {
          const micro = await lessonRes.json();
          setMixInfo({
            srCount: 0, lessonCount: 0, challengeCount: 0,
            microAlert: `Tu confonds souvent « ${pendingConfusion.correct} » et « ${pendingConfusion.chosen_instead} » — ${pendingConfusion.count} fois détecté.`,
            microLessonId: microId,
          });
          setLesson(micro);
          setLoading(false);
          return;
        }
      }
    }

    const res = await fetch('/api/lessons');
    const allLessons: Lesson[] = await res.json();
    if (allLessons.length === 0) { setLoading(false); return; }

    const due = getDueItems(progress.weak_items, today);
    const dueIds = new Set(due.map((d) => d.item_id));
    const goalMinutes = progress.user.daily_goal_minutes;

    const srExercises: Exercise[] = allLessons
      .flatMap((l) => l.exercises.map((ex) => ({ ex, lesson: l })))
      .filter(({ ex }) => dueIds.has(ex.id))
      .slice(0, Math.max(1, Math.round((goalMinutes / 15) * 4)))
      .map(({ ex }) => ex);

    const practicedTopics = Object.keys(progress.topics);
    const completedLessonIds = new Set(
      progress.session_history.flatMap((s) => s.lessons_completed)
    );
    const nextLesson = allLessons.find(
      (l) => practicedTopics.includes(l.topic) && !completedLessonIds.has(l.id) && !l.id.startsWith('micro_')
    ) ?? allLessons.find((l) => !l.id.startsWith('micro_'));

    const masteredTopics = Object.entries(progress.topics)
      .filter(([, tp]) => tp.mastery_percent > 70)
      .map(([id]) => id);
    const challengeExercises: Exercise[] = allLessons
      .filter((l) => masteredTopics.includes(l.topic) && l.difficulty_level >= 3 && !l.id.startsWith('micro_'))
      .flatMap((l) => l.exercises.filter((ex) => ex.phase === 3))
      .slice(0, 2);

    if ((srExercises.length > 0 || challengeExercises.length > 0) && nextLesson) {
      const combinedExercises = [
        ...srExercises,
        ...(nextLesson?.exercises ?? []),
        ...challengeExercises,
      ].slice(0, Math.max(6, Math.round(goalMinutes * 0.8)));

      const synthetic: Lesson = {
        id: 'daily_mix',
        topic: nextLesson?.topic ?? 'mixed',
        category: 'grammar',
        title: `Session du ${today}`,
        difficulty_level: 2,
        created_at: today,
        status: 'approved',
        subtopic: `${srExercises.length} révisions + ${nextLesson?.exercises.length ?? 0} leçon + ${challengeExercises.length} défis`,
        rules: nextLesson?.rules ?? { explanation_fr: 'Session quotidienne mixte.', table: [], notes_fr: [] },
        exercises: combinedExercises,
      };

      setMixInfo({ srCount: srExercises.length, lessonCount: nextLesson?.exercises.length ?? 0, challengeCount: challengeExercises.length });
      setLesson(synthetic);
    } else if (nextLesson) {
      setMixInfo({ srCount: 0, lessonCount: nextLesson.exercises.length, challengeCount: 0 });
      setLesson(nextLesson);
    }

    setLoading(false);
  }

  const progress = getProgress();

  if (loading) return (
    <div className="max-w-[680px] mx-auto mt-16 px-4 text-center text-[var(--text-muted)]">
      <div className="text-[2rem] mb-3">⏳</div>
      Préparation de votre session...
    </div>
  );

  if (sessionDone) return (
    <div className="max-w-[680px] mx-auto mt-16 px-4 py-6 text-center">
      <div className="text-5xl mb-3">🎉</div>
      <h2 className="font-extrabold text-[1.75rem] mb-2">Session terminée !</h2>
      <p className="text-[var(--text-muted)] mb-4">
        Score : {finalScore.score}/{finalScore.total}
      </p>
      <div className="mb-6">
        <StreakCounter streak={getProgress().user.streak_current} animate />
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <button className="btn-primary" onClick={() => { setSessionDone(false); setLoading(true); buildDailyMix(); }}>
          🔄 Nouvelle session
        </button>
        <button className="btn-secondary" onClick={() => router.push('/')}>🏠 Accueil</button>
        <button className="btn-secondary" onClick={() => router.push('/review')}>🔄 Révisions</button>
      </div>
    </div>
  );

  if (!lesson) return (
    <div className="max-w-[680px] mx-auto mt-16 px-4 text-center">
      <div className="text-[2rem] mb-3">📭</div>
      <p className="text-[var(--text-muted)] mb-4">Aucune leçon disponible.</p>
      <button className="btn-primary" onClick={() => router.push('/lessons')}>Voir les leçons</button>
    </div>
  );

  return (
    <div>
      {mixInfo?.microAlert && (
        <div
          className="px-6 py-3 text-sm border-b"
          style={{ background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)' }}
        >
          ⚠️ <strong>Point faible détecté</strong> — {mixInfo.microAlert} Voici 3 exercices ciblés.
        </div>
      )}

      {mixInfo && !mixInfo.microAlert && (
        <div
          className="px-6 py-[0.6rem] text-[0.8rem] text-[var(--text-muted)] border-b flex gap-4 flex-wrap"
          style={{ background: 'rgba(74,158,255,0.08)', borderColor: 'rgba(74,158,255,0.2)' }}
        >
          <span>📅 Session du jour — ~{progress.user.daily_goal_minutes} min</span>
          {mixInfo.srCount > 0 && <span>🔄 {mixInfo.srCount} révision{mixInfo.srCount > 1 ? 's' : ''}</span>}
          {mixInfo.lessonCount > 0 && <span>📘 {mixInfo.lessonCount} exercice{mixInfo.lessonCount > 1 ? 's' : ''} leçon</span>}
          {mixInfo.challengeCount > 0 && <span>⚡ {mixInfo.challengeCount} défi{mixInfo.challengeCount > 1 ? 's' : ''}</span>}
        </div>
      )}

      <LessonFlow
        lesson={lesson}
        onFinish={(score, total) => { setFinalScore({ score, total }); setSessionDone(true); }}
        onHome={() => router.push('/')}
        onNextLesson={() => router.push('/lessons')}
      />
    </div>
  );
}
