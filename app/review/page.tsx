'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Exercise, Lesson } from '@/lib/types';
import type { CardState, Rating } from '@/lib/spaced-repetition';
import {
  getDueCards, getNewCards, getDueCount, getNewCount,
  applyRating, upsertCard, getIntervalLabel, markCardIntroduced,
} from '@/lib/spaced-repetition';
import { evaluateExercise } from '@/lib/exercise-evaluator';
import ExerciseRenderer from '@/components/ExerciseRenderer';
import { pushCard } from '@/lib/sync';
import { getTopicLabel } from '@/lib/topic-labels';

const RATING_CONFIG = [
  { rating: 0 as Rating, label: 'Encore',   emoji: '🔴', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.5)',  color: 'var(--accent-red)' },
  { rating: 1 as Rating, label: 'Difficile', emoji: '🟠', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.5)', color: 'var(--accent-orange)' },
  { rating: 2 as Rating, label: 'Bien',      emoji: '🟢', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.5)',  color: 'var(--accent-green)' },
  { rating: 3 as Rating, label: 'Facile',    emoji: '🔵', bg: 'rgba(74,158,255,0.15)', border: 'rgba(74,158,255,0.4)', color: 'var(--accent-blue)' },
];

interface CardWithExercise {
  card: CardState;
  exercise: Exercise;
  lesson: Lesson;
}

export default function ReviewPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<CardWithExercise[]>([]);
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [_userAnswer, setUserAnswer] = useState<string | string[] | Record<string, string>>('');
  const [evaluation, setEvaluation] = useState<{ correct: boolean; correctAnswer: string; explanation_fr: string; common_mistakes_fr: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0, total: 0 });
  const [done, setDone] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((lessons: Lesson[]) => {
        // Cards are only registered on lesson completion (ensureCardsForLesson
        // is called in LessonFlow). Here we just read what exists.
        const due = getDueCards(today, 200);
        const newCards = getNewCards(today); // respects 15/day cap
        const all = [...due, ...newCards];

        const exerciseMap = new Map<string, { exercise: Exercise; lesson: Lesson }>();
        for (const lesson of lessons) {
          for (const ex of lesson.exercises) {
            exerciseMap.set(ex.id, { exercise: ex, lesson });
          }
        }

        const withExercises = all
          .map((card) => {
            const found = exerciseMap.get(card.exercise_id);
            if (!found) return null;
            return { card, exercise: found.exercise, lesson: found.lesson };
          })
          .filter(Boolean) as CardWithExercise[];

        setQueue(withExercises);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const item = queue[current];

  const handleAnswer = useCallback((answer: string | string[] | Record<string, string>) => {
    if (answered || !item) return;
    setUserAnswer(answer);
    const ev = evaluateExercise(item.exercise, answer);
    setEvaluation({ correct: ev.correct, correctAnswer: ev.correctAnswer, explanation_fr: ev.explanation_fr, common_mistakes_fr: ev.common_mistakes_fr });
    setAnswered(true);
  }, [answered, item]);

  const handleRate = (rating: Rating) => {
    if (!item) return;
    if (item.card.state === 'new') markCardIntroduced(today);
    const updated = applyRating(item.card, rating, today);
    upsertCard(updated);
    void pushCard(updated);

    setSessionStats((s) => ({
      ...s,
      total: s.total + 1,
      again: rating === 0 ? s.again + 1 : s.again,
      hard:  rating === 1 ? s.hard  + 1 : s.hard,
      good:  rating === 2 ? s.good  + 1 : s.good,
      easy:  rating === 3 ? s.easy  + 1 : s.easy,
    }));

    if (rating === 0) {
      setQueue((q) => [...q, { ...item, card: updated }]);
    }

    if (current + 1 >= queue.length - (rating === 0 ? 1 : 0)) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setAnswered(false);
      setUserAnswer('');
      setEvaluation(null);
    }
  };

  // Raccourcis clavier : 1/2/3/4 pour noter quand la réponse est affichée
  useEffect(() => {
    if (!answered) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === '1') handleRate(0);
      else if (e.key === '2') handleRate(1);
      else if (e.key === '3') handleRate(2);
      else if (e.key === '4') handleRate(3);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [answered, item, current, queue.length]); // item/current/queue captures fresh handleRate closure

  if (loading) return (
    <div className="max-w-[680px] mx-auto mt-16 px-4 text-center text-[var(--text-muted)]">
      <div className="text-[2rem] mb-3">⏳</div>
      Chargement des cartes...
    </div>
  );

  if (done) return <SessionSummary stats={sessionStats} onRestart={() => router.push('/review')} onHome={() => router.push('/')} />;

  if (queue.length === 0) return (
    <div className="max-w-[680px] mx-auto mt-16 px-4 py-6 text-center">
      <div className="text-5xl mb-3">🎉</div>
      <h2 className="font-extrabold text-[1.75rem] mb-2">Tout est à jour !</h2>
      <p className="text-[var(--text-muted)] mb-6">
        Aucune carte à réviser. Revenez demain ou faites de nouvelles leçons.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button className="btn-primary" onClick={() => router.push('/practice')}>⚡ Exercices ciblés</button>
        <button className="btn-secondary" onClick={() => router.push('/lessons')}>📘 Nouvelles leçons</button>
      </div>
    </div>
  );

  if (!item) return null;

  const dueCount = getDueCount(today);
  const newCount = getNewCount();
  const remaining = queue.length - current;

  return (
    <div className="max-w-[680px] mx-auto px-4 py-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex gap-3 mb-[0.4rem]">
            <span className="badge badge-red">{dueCount} à réviser</span>
            <span className="badge badge-blue">{newCount} nouvelles</span>
            <span className="text-[0.8rem] text-[var(--text-muted)] ml-auto">
              {current + 1} / {remaining + current}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${(current / (queue.length || 1)) * 100}%`, background: 'var(--accent-blue)' }} />
          </div>
        </div>
      </div>

      {/* Card context */}
      <div className="card p-3 mb-3" style={{ background: 'var(--bg-input)' }}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {item.card.state === 'new' && <span className="badge badge-blue">🆕 Nouvelle</span>}
          {item.card.state === 'learning' && <span className="badge badge-orange">📖 Apprentissage</span>}
          {item.card.state === 'review' && <span className="badge badge-green">🔄 Révision</span>}
          {item.card.state === 'relearning' && <span className="badge badge-red">🔁 Ré-apprentissage</span>}
          {item.card.lapses > 0 && (
            <span className="text-xs text-[var(--accent-red)]">⚠️ {item.card.lapses}×</span>
          )}
          {item.card.state === 'review' && (
            <span className="text-xs text-[var(--text-muted)] ml-auto">
              stabilité {Math.round(item.card.stability)} j
            </span>
          )}
        </div>
        <div className="text-xs font-semibold">{item.lesson.title}</div>
        <div className="text-xs text-[var(--text-muted)]">{getTopicLabel(item.lesson.topic)}</div>
      </div>

      {/* Exercise card */}
      <div className={`card p-6 mb-4 ${answered ? (evaluation?.correct ? 'animate-flash-green' : 'animate-flash-red') : ''}`}>
        <ExerciseRenderer exercise={item.exercise} onAnswer={handleAnswer} disabled={answered} />
      </div>

      {/* Feedback + rating */}
      {answered && evaluation && (
        <div
          className="card p-5 mb-4"
          style={{ border: `1px solid ${evaluation.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}
        >
          <div className="font-bold mb-2" style={{ color: evaluation.correct ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {evaluation.correct ? '✅ Correct !' : '❌ Incorrect'}
          </div>
          {!evaluation.correct && (
            <div className="mb-2 text-[0.9rem]">
              <span className="text-[var(--text-muted)]">Réponse : </span>
              <span className="font-semibold text-[var(--accent-green)]">{evaluation.correctAnswer}</span>
            </div>
          )}
          <p className="text-[0.9rem] text-[var(--text-muted)] leading-normal mb-2">
            {evaluation.explanation_fr}
          </p>
          {evaluation.common_mistakes_fr.length > 0 && (
            <ul className="list-none p-0 m-0 text-[0.82rem] text-[var(--text-muted)]">
              {evaluation.common_mistakes_fr.map((m, i) => (
                <li key={`${m}_${i}`}>• {m}</li>
              ))}
            </ul>
          )}

          {/* Rating buttons */}
          <div className="mt-5">
            <p className="text-xs text-[var(--text-muted)] mb-[0.6rem] text-center">
              Comment était ce rappel ?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {RATING_CONFIG.map(({ rating, label, emoji, bg, border, color }) => (
                <button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  className="flex flex-col items-center gap-[0.15rem] py-[0.6rem] px-[0.4rem] rounded-lg cursor-pointer transition-transform duration-100"
                  style={{ background: bg, border: `1px solid ${border}` }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-[0.8rem] font-bold" style={{ color }}>{label}</span>
                  <span className="text-[0.65rem] text-[var(--text-muted)]">
                    {getIntervalLabel(rating, item.card)}
                  </span>
                  <span className="text-[0.6rem] text-[var(--text-muted)] opacity-50">
                    [{rating + 1}]
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Session progress */}
      <div className="flex justify-center gap-6 text-[0.8rem] text-[var(--text-muted)]">
        <span className="text-[var(--accent-red)]">🔴 {sessionStats.again}</span>
        <span className="text-[var(--accent-orange)]">🟠 {sessionStats.hard}</span>
        <span className="text-[var(--accent-green)]">🟢 {sessionStats.good}</span>
        <span className="text-[var(--accent-blue)]">🔵 {sessionStats.easy}</span>
      </div>
    </div>
  );
}

type StatsShape = { again: number; hard: number; good: number; easy: number; total: number };

function SessionSummary({ stats, onRestart, onHome }: { stats: StatsShape; onRestart: () => void; onHome: () => void }) {
  const total = stats.total;
  const retained = stats.good + stats.easy;
  const pct = total > 0 ? Math.round((retained / total) * 100) : 0;

  return (
    <div className="max-w-[480px] mx-auto mt-16 px-4 py-6 text-center">
      <div className="text-5xl mb-3">
        {pct >= 80 ? '🏆' : pct >= 60 ? '📈' : '💪'}
      </div>
      <h2 className="font-extrabold text-[1.75rem] mb-2">Session terminée !</h2>
      <p className="text-[var(--text-muted)] mb-6">
        {total} cartes révisées · {pct}% de rétention
      </p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {RATING_CONFIG.map(({ label, emoji, color, rating }) => (
          <div key={rating} className="card p-3 text-center">
            <div className="text-xl">{emoji}</div>
            <div className="text-xl font-extrabold" style={{ color }}>
              {stats[(['again', 'hard', 'good', 'easy'] as const)[rating]]}
            </div>
            <div className="text-[0.7rem] text-[var(--text-muted)]">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <button className="btn-primary" onClick={onRestart}>🔄 Nouvelle session</button>
        <button className="btn-secondary" onClick={onHome}>🏠 Accueil</button>
      </div>
    </div>
  );
}
