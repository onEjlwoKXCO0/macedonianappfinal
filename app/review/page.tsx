'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Exercise, Lesson } from '@/lib/types';
import type { CardState, Rating } from '@/lib/spaced-repetition';
import {
  getDueCards, getNewCards, getDueCount, getNewCount,
  applyRating, upsertCard, ensureCardsForLesson, getIntervalLabel,
} from '@/lib/spaced-repetition';
import { evaluateExercise } from '@/lib/exercise-evaluator';
import ExerciseRenderer from '@/components/ExerciseRenderer';

const RATING_CONFIG = [
  { rating: 0 as Rating, label: 'Encore', emoji: '🔴', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.5)', color: 'var(--accent-red)' },
  { rating: 1 as Rating, label: 'Difficile', emoji: '🟠', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.5)', color: 'var(--accent-orange)' },
  { rating: 2 as Rating, label: 'Bien', emoji: '🟢', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.5)', color: 'var(--accent-green)' },
  { rating: 3 as Rating, label: 'Facile', emoji: '🔵', bg: 'rgba(74,158,255,0.15)', border: 'rgba(74,158,255,0.4)', color: 'var(--accent-blue)' },
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
        // Register all lesson exercises as cards
        for (const lesson of lessons) {
          ensureCardsForLesson(lesson.id, lesson.topic, lesson.exercises.map((e) => e.id), today);
        }
        // Build queue: due cards first, then new cards
        const due = getDueCards(today, 50);
        const newCards = getNewCards(20);
        const all = [...due, ...newCards].slice(0, 30);

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
    const updated = applyRating(item.card, rating, today);
    upsertCard(updated);

    setSessionStats((s) => ({
      ...s,
      total: s.total + 1,
      again: rating === 0 ? s.again + 1 : s.again,
      hard: rating === 1 ? s.hard + 1 : s.hard,
      good: rating === 2 ? s.good + 1 : s.good,
      easy: rating === 3 ? s.easy + 1 : s.easy,
    }));

    // If "Again", re-insert at end of queue
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

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '4rem auto', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
      Chargement des cartes...
    </div>
  );

  if (done) return <SessionSummary stats={sessionStats} onRestart={() => router.push('/review')} onHome={() => router.push('/')} />;

  if (queue.length === 0) return (
    <div style={{ maxWidth: 680, margin: '4rem auto', padding: '1.5rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
      <h2 style={{ fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>Tout est à jour !</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Aucune carte à réviser. Revenez demain ou faites de nouvelles leçons.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-red">{dueCount} à réviser</span>
            <span className="badge badge-blue">{newCount} nouvelles</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {current + 1} / {remaining + current}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${(current / (queue.length || 1)) * 100}%`, background: 'var(--accent-blue)' }} />
          </div>
        </div>
      </div>

      {/* Card type indicator */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {item.card.new && <span className="badge badge-blue">🆕 Nouvelle carte</span>}
        {!item.card.new && <span className="badge badge-orange">🔄 Révision</span>}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.lesson.title}</span>
        {item.card.lapses > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginLeft: 'auto' }}>
            ⚠️ {item.card.lapses} lapse{item.card.lapses > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Exercise card */}
      <div className={`card ${answered ? (evaluation?.correct ? 'animate-flash-green' : 'animate-flash-red') : ''}`} style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <ExerciseRenderer
          exercise={item.exercise}
          onAnswer={handleAnswer}
          disabled={answered}
        />
      </div>

      {/* Feedback + rating */}
      {answered && evaluation && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${evaluation.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: evaluation.correct ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {evaluation.correct ? '✅ Correct !' : '❌ Incorrect'}
          </div>
          {!evaluation.correct && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Réponse : </span>
              <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{evaluation.correctAnswer}</span>
            </div>
          )}
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            {evaluation.explanation_fr}
          </p>
          {evaluation.common_mistakes_fr.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {evaluation.common_mistakes_fr.map((m, i) => <li key={i}>• {m}</li>)}
            </ul>
          )}

          {/* SM-2 Rating buttons */}
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textAlign: 'center' }}>
              Comment était ce rappel ?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {RATING_CONFIG.map(({ rating, label, emoji, bg, border, color }) => (
                <button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  style={{
                    padding: '0.6rem 0.4rem',
                    borderRadius: 8,
                    border: `1px solid ${border}`,
                    background: bg,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.15rem',
                    transition: 'transform 0.1s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{label}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {getIntervalLabel(rating, item.card)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Session progress */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-red)' }}>🔴 {sessionStats.again}</span>
        <span style={{ color: 'var(--accent-orange)' }}>🟠 {sessionStats.hard}</span>
        <span style={{ color: 'var(--accent-green)' }}>🟢 {sessionStats.good}</span>
        <span style={{ color: 'var(--accent-blue)' }}>🔵 {sessionStats.easy}</span>
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
    <div style={{ maxWidth: 480, margin: '4rem auto', padding: '1.5rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
        {pct >= 80 ? '🏆' : pct >= 60 ? '📈' : '💪'}
      </div>
      <h2 style={{ fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>Session terminée !</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {total} cartes révisées · {pct}% de rétention
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {RATING_CONFIG.map(({ label, emoji, color, rating }) => (
          <div key={rating} className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem' }}>{emoji}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{stats[(['again', 'hard', 'good', 'easy'] as const)[rating]]}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={onRestart}>🔄 Nouvelle session</button>
        <button className="btn-secondary" onClick={onHome}>🏠 Accueil</button>
      </div>
    </div>
  );
}

