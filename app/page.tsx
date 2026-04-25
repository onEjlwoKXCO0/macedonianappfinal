'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProgress, getGlobalMastery } from '@/lib/progress-tracker';
import { getTopConfusions } from '@/lib/distractor-engine';
import { LEVEL_NAMES } from '@/lib/difficulty-engine';
import StreakCounter from '@/components/StreakCounter';
import ProgressBar from '@/components/ProgressBar';
import type { UserProgress } from '@/lib/types';
import type { Confusion } from '@/lib/types';

const TOPIC_LABELS: Record<string, string> = {
  pronouns_personal: 'Pronoms personnels',
  pronouns_possessive: 'Pronoms possessifs',
  sum_present: 'Verbe "être" — présent',
  numbers_1_100: 'Chiffres 1–100',
  negation: 'Négation',
  question_words: 'Mots interrogatifs',
};

const TOPIC_COLORS: Record<string, string> = {
  grammar: 'var(--accent-green)',
  thematic: 'var(--accent-orange)',
};

const GRAMMAR_TOPICS = ['pronouns_personal', 'sum_present', 'negation', 'question_words'];
const THEMATIC_TOPICS = ['numbers_1_100'];

function topicCategory(topic: string): string {
  return GRAMMAR_TOPICS.includes(topic) ? 'grammar' : 'thematic';
}

export default function Dashboard() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [confusions, setConfusions] = useState<Confusion[]>([]);

  useEffect(() => {
    setProgress(getProgress());
    setConfusions(getTopConfusions(5));
  }, []);

  if (!progress) return null;

  const mastery = getGlobalMastery(progress);
  const topicsWithProgress = Object.entries(progress.topics);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.25rem' }}>Bonjour 👋</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Maîtrise globale : <strong style={{ color: 'var(--text)' }}>{mastery}%</strong>
          </div>
        </div>
        <StreakCounter streak={progress.user.streak_current} />
      </div>

      {/* Session card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'rgba(74,158,255,0.08)', borderColor: 'rgba(74,158,255,0.3)' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
          📅 Session du jour — ~{progress.user.daily_goal_minutes} min
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {progress.user.last_session_date === todayStr
            ? '✅ Session complétée aujourd\'hui'
            : 'Aucune session aujourd\'hui — commencez !'}
        </div>
        <Link href="/daily">
          <button className="btn-primary" style={{ width: '100%' }}>
            Démarrer la session →
          </button>
        </Link>
      </div>

      {/* Topics progress */}
      {topicsWithProgress.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Progression par sujet</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topicsWithProgress.map(([topicId, tp]) => {
              const color = TOPIC_COLORS[topicCategory(topicId)] ?? 'var(--accent-blue)';
              return (
                <Link key={topicId} href={`/topics/${topicId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.875rem' }}>
                        <span>{TOPIC_LABELS[topicId] ?? topicId}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Niv. {tp.current_level} — {LEVEL_NAMES[tp.current_level]}
                          </span>
                          <span style={{ fontWeight: 600, color }}>{tp.mastery_percent}%</span>
                        </div>
                      </div>
                      <ProgressBar value={tp.mastery_percent} color={color} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Start a topic if none started */}
      {topicsWithProgress.length === 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Aucune leçon commencée. Parcourez le catalogue !</p>
          <Link href="/lessons">
            <button className="btn-primary">Voir les leçons</button>
          </Link>
        </div>
      )}

      {/* Weak areas */}
      {confusions.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>⚠️ Points faibles</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {confusions.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 8 }}>
                <span>
                  <span className="mk-text" style={{ fontSize: '0.9rem' }}>{c.correct}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>confondu avec</span>
                  <span className="mk-text" style={{ fontSize: '0.9rem', color: 'var(--accent-orange)' }}>{c.chosen_instead}</span>
                </span>
                <span className="badge badge-red">{c.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Link href="/lessons" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '1.5rem' }}>📘</div>
            <div style={{ fontWeight: 600, marginTop: '0.4rem', fontSize: '0.9rem' }}>Toutes les leçons</div>
          </div>
        </Link>
        <Link href="/review" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '1.5rem' }}>🔄</div>
            <div style={{ fontWeight: 600, marginTop: '0.4rem', fontSize: '0.9rem' }}>Révision SM-2</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
