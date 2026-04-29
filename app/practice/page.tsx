'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllCards, getDueCount, getNewCount } from '@/lib/spaced-repetition';
import { getDistractorMemory } from '@/lib/distractor-engine';
import type { Lesson } from '@/lib/types';
import type { Confusion } from '@/lib/types';
import LessonFlow from '@/components/LessonFlow';
import { TOPIC_LABELS } from '@/lib/topic-labels';

type View = 'dashboard' | 'drill';

export default function PracticePage() {
  const router = useRouter();
  const [view, setView] = useState<View>('dashboard');
  const [drill, setDrill] = useState<Lesson | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [stats, setStats] = useState({
    dueCount: 0,
    newCount: 0,
    lapseTopics: [] as Array<{ topic: string; lapses: number }>,
    confusions: [] as Confusion[],
    weakExerciseIds: [] as string[],
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cards = Object.values(getAllCards());
    const mem = getDistractorMemory();

    const lapseMap: Record<string, number> = {};
    for (const card of cards) {
      if (card.lapses > 0) {
        lapseMap[card.topic] = (lapseMap[card.topic] ?? 0) + card.lapses;
      }
    }
    const lapseTopics = Object.entries(lapseMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([topic, lapses]) => ({ topic, lapses }));

    const weakExerciseIds = cards
      .filter((c) => c.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses)
      .slice(0, 30)
      .map((c) => c.exercise_id);

    const confusions = [...mem.confusions]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    setStats({
      dueCount: getDueCount(today),
      newCount: getNewCount(),
      lapseTopics,
      confusions,
      weakExerciseIds,
    });
  }, []);

  const generateDrill = async (options: { topic?: string; useErrors?: boolean; hardOnly?: boolean }) => {
    setGenerating(true);
    setError('');
    try {
      const body: Record<string, unknown> = { count: 10 };
      if (options.hardOnly) body.hardOnly = true;
      if (options.topic) body.topic = options.topic;
      if (options.useErrors) {
        body.wrongExerciseIds = stats.weakExerciseIds;
        body.confusions = stats.confusions.map((c) => ({ correct: c.correct, wrong: c.chosen_instead }));
      }

      const res = await fetch('/api/generate-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const lessonRes = await fetch(`/api/lesson/${data.drillId}`);
      const lesson = await lessonRes.json();
      setDrill(lesson);
      setView('drill');
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  if (view === 'drill' && drill) {
    return (
      <LessonFlow
        lesson={drill}
        onFinish={() => setView('dashboard')}
        onHome={() => router.push('/')}
        onNextLesson={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className="max-w-[680px] mx-auto px-4 py-6">
      <h1 className="font-extrabold text-2xl mb-1">⚡ Exercices ciblés</h1>
      <p className="text-[var(--text-muted)] mb-6 text-[0.9rem]">
        Drills générés d'après votre historique d'erreurs — pour maximiser la rétention.
      </p>

      {/* Hard drill */}
      <div className="card p-5 mb-5" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.25)' }}>
        <h2 className="font-bold text-base mb-1">🔥 Défi ultime</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          10 exercices phase 3 tirés au hasard dans tous les topics — production libre, aucune aide.
        </p>
        <button
          className="btn-primary w-full"
          onClick={() => generateDrill({ hardOnly: true })}
          disabled={generating}
        >
          {generating ? '⏳ Génération...' : '🔥 Générer 10 exercices difficiles'}
        </button>
      </div>

      {/* SM-2 overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          className="card p-5 text-center cursor-pointer"
          style={{ border: stats.dueCount > 0 ? '1px solid rgba(239,68,68,0.4)' : undefined }}
          onClick={() => router.push('/review')}
        >
          <div
            className="text-[2rem] font-extrabold"
            style={{ color: stats.dueCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}
          >
            {stats.dueCount}
          </div>
          <div className="text-[0.8rem] text-[var(--text-muted)]">cartes à réviser maintenant</div>
          {stats.dueCount > 0 && <div className="mt-2"><span className="badge badge-red">Urgent</span></div>}
        </div>
        <div className="card p-5 text-center cursor-pointer" onClick={() => router.push('/review')}>
          <div className="text-[2rem] font-extrabold text-[var(--accent-blue)]">{stats.newCount}</div>
          <div className="text-[0.8rem] text-[var(--text-muted)]">nouvelles cartes disponibles</div>
        </div>
      </div>

      {/* Error-based drill */}
      {stats.weakExerciseIds.length > 0 && (
        <div
          className="card p-6 mb-5"
          style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.3)' }}
        >
          <h2 className="font-bold mb-2 text-base">
            🎯 Drill personnalisé — vos points faibles
          </h2>
          <p className="text-[var(--text-muted)] text-[0.85rem] mb-4">
            {stats.weakExerciseIds.length} exercice{stats.weakExerciseIds.length > 1 ? 's' : ''} avec des erreurs répétées détectés.
            Un drill de 10 exercices sera généré en ciblant exactement ces points.
          </p>

          {stats.confusions.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-[0.4rem]">
              {stats.confusions.slice(0, 5).map((c) => (
                <span
                  key={`${c.correct}_${c.chosen_instead}`}
                  className="text-xs px-2 py-[0.2rem] rounded-full bg-[var(--bg-input)] text-[var(--text-muted)]"
                >
                  <span className="text-[var(--accent-green)]">{c.correct}</span>
                  {' → '}
                  <span className="text-[var(--accent-red)]">{c.chosen_instead}</span>
                  {' ×'}{c.count}
                </span>
              ))}
            </div>
          )}

          <button
            className="btn-primary w-full"
            onClick={() => generateDrill({ useErrors: true })}
            disabled={generating}
          >
            {generating ? '⏳ Génération...' : '⚡ Générer le drill personnalisé'}
          </button>
        </div>
      )}

      {stats.weakExerciseIds.length === 0 && (
        <div className="card p-5 mb-5 text-center">
          <div className="text-[2rem] mb-2">🌱</div>
          <p className="text-[var(--text-muted)] text-[0.9rem]">
            Pas encore d'erreurs enregistrées. Faites des leçons pour que l'analyse d'erreurs se remplisse.
          </p>
        </div>
      )}

      {/* Topics with most lapses */}
      {stats.lapseTopics.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-bold mb-3 text-base">📊 Points faibles par topic</h2>
          <div className="flex flex-col gap-2">
            {stats.lapseTopics.map(({ topic, lapses }) => (
              <div key={topic} className="flex items-center justify-between py-2 px-3 bg-[var(--bg-input)] rounded-lg">
                <span className="text-sm">{TOPIC_LABELS[topic] ?? topic}</span>
                <div className="flex gap-2 items-center">
                  <span className="badge badge-red">{lapses} lapse{lapses > 1 ? 's' : ''}</span>
                  <button
                    className="btn-ghost text-xs"
                    style={{ padding: '0.2rem 0.5rem' }}
                    onClick={() => generateDrill({ topic })}
                    disabled={generating}
                  >
                    Drill →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drill by topic */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold mb-3 text-base">📚 Drill par topic</h2>
        <div className="flex flex-wrap gap-[0.4rem]">
          {Object.entries(TOPIC_LABELS).map(([id, label]) => (
            <button
              key={id}
              onClick={() => generateDrill({ topic: id })}
              disabled={generating}
              className="px-[0.65rem] py-[0.3rem] rounded-full text-[0.8rem] cursor-pointer border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-sm text-[var(--accent-red)] mb-4"
          style={{ background: 'rgba(239,68,68,0.1)' }}
        >
          {error}
        </div>
      )}

      <button className="btn-secondary w-full" onClick={() => router.push('/review')}>
        🔄 Aller à la révision Anki →
      </button>
    </div>
  );
}
