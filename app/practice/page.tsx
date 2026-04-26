'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllCards, getDueCount, getNewCount } from '@/lib/spaced-repetition';
import { getDistractorMemory } from '@/lib/distractor-engine';
import { getProgress } from '@/lib/progress-tracker';
import type { Lesson } from '@/lib/types';
import type { Confusion } from '@/lib/types';
import LessonFlow from '@/components/LessonFlow';

const TOPIC_LABELS: Record<string, string> = {
  pronouns_personal: 'Pronoms personnels', sum_present: 'Verbe être', negation: 'Négation',
  question_words: 'Mots interrogatifs', regular_verbs_present: 'Verbes réguliers',
  definite_articles: 'Articles définis', future_kje: 'Futur avec kje', past_l_forms: 'Passé en L',
  verbal_aspect: 'Aspect verbal', imperative: 'Impératif', subordinate_clauses: 'Subordonnées',
  numbers_1_100: 'Chiffres', greetings: 'Salutations', family: 'Famille', directions: 'Directions',
  noun_gender: 'Genre des noms', adjective_agreement: 'Accord adjectifs', prepositions: 'Prépositions',
  indirect_object_pronouns: 'Objets indirects', clitic_doubling: 'Doublement clitiques',
};

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

    // Group lapses by topic
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

    // Weak exercise IDs (cards with lapses > 0, sorted by most lapses)
    const weakExerciseIds = cards
      .filter((c) => c.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses)
      .slice(0, 30)
      .map((c) => c.exercise_id);

    // Top confusions
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

  const generateDrill = async (options: { topic?: string; useErrors?: boolean }) => {
    setGenerating(true);
    setError('');
    try {
      const body: Record<string, unknown> = { count: 10 };
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

      // Fetch the generated drill
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
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.25rem' }}>⚡ Exercices ciblés</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Drills générés d'après votre historique d'erreurs — pour maximiser la rétention.
      </p>

      {/* SM-2 overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer', border: stats.dueCount > 0 ? '1px solid rgba(239,68,68,0.4)' : undefined }}
          onClick={() => router.push('/review')}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: stats.dueCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{stats.dueCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>cartes à réviser maintenant</div>
          {stats.dueCount > 0 && <div style={{ marginTop: '0.5rem' }}><span className="badge badge-red">Urgent</span></div>}
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => router.push('/review')}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{stats.newCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>nouvelles cartes disponibles</div>
        </div>
      </div>

      {/* Error-based drill */}
      {stats.weakExerciseIds.length > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem' }}>
            🎯 Drill personnalisé — vos points faibles
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {stats.weakExerciseIds.length} exercice{stats.weakExerciseIds.length > 1 ? 's' : ''} avec des erreurs répétées détectés.
            Un drill de 10 exercices sera généré en ciblant exactement ces points.
          </p>

          {/* Confusion pairs preview */}
          {stats.confusions.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {stats.confusions.slice(0, 5).map((c, i) => (
                <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 99, background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-green)' }}>{c.correct}</span>
                  {' → '}
                  <span style={{ color: 'var(--accent-red)' }}>{c.chosen_instead}</span>
                  {' ×'}{c.count}
                </span>
              ))}
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={() => generateDrill({ useErrors: true })}
            disabled={generating}
          >
            {generating ? '⏳ Génération...' : '⚡ Générer le drill personnalisé'}
          </button>
        </div>
      )}

      {stats.weakExerciseIds.length === 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌱</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Pas encore d'erreurs enregistrées. Faites des leçons pour que l'analyse d'erreurs se remplisse.
          </p>
        </div>
      )}

      {/* Topics with most lapses */}
      {stats.lapseTopics.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>📊 Points faibles par topic</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.lapseTopics.map(({ topic, lapses }) => (
              <div key={topic} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-input)', borderRadius: 8 }}>
                <span style={{ fontSize: '0.875rem' }}>{TOPIC_LABELS[topic] ?? topic}</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-red">{lapses} lapse{lapses > 1 ? 's' : ''}</span>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
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
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>📚 Drill par topic</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {Object.entries(TOPIC_LABELS).map(([id, label]) => (
            <button
              key={id}
              onClick={() => generateDrill({ topic: id })}
              disabled={generating}
              style={{
                padding: '0.3rem 0.65rem', borderRadius: 99, fontSize: '0.8rem',
                border: '1px solid var(--border)', background: 'var(--bg-input)',
                cursor: 'pointer', color: 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: 'var(--accent-red)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <button className="btn-secondary" style={{ width: '100%' }} onClick={() => router.push('/review')}>
        🔄 Aller à la révision Anki →
      </button>
    </div>
  );
}
