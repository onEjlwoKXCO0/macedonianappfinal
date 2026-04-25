'use client';
import { useEffect, useState } from 'react';
import { getProgress, getGlobalMastery } from '@/lib/progress-tracker';
import { getTopConfusions } from '@/lib/distractor-engine';
import { LEVEL_NAMES } from '@/lib/difficulty-engine';
import ProgressBar from '@/components/ProgressBar';
import StreakCounter from '@/components/StreakCounter';
import type { UserProgress } from '@/lib/types';
import type { Confusion } from '@/lib/types';

const MASTERY_COLOR = (pct: number) =>
  pct >= 80 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent-yellow)' : pct >= 30 ? 'var(--accent-orange)' : 'var(--accent-red)';

export default function StatsPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [confusions, setConfusions] = useState<Confusion[]>([]);

  useEffect(() => {
    setProgress(getProgress());
    setConfusions(getTopConfusions(10));
  }, []);

  if (!progress) return null;

  const mastery = getGlobalMastery(progress);
  const last30 = progress.session_history.slice(-30);

  // Build heatmap for last 90 days
  const today = new Date();
  const heatmap: { date: string; count: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const session = progress.session_history.find((s) => s.date === dateStr);
    heatmap.push({ date: dateStr, count: session ? session.exercises_done : 0 });
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1.5rem' }}>📊 Statistiques</h1>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <StreakCounter streak={progress.user.streak_current} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Série actuelle</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Record : {progress.user.streak_best} j.</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: MASTERY_COLOR(mastery) }}>{mastery}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Maîtrise globale</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{progress.user.total_exercises_done}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Exercices complétés</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{progress.user.total_lessons_completed}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Leçons terminées</div>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Activité (90 jours)</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {heatmap.map((day) => {
            const intensity = day.count === 0 ? 0 : day.count < 5 ? 0.3 : day.count < 10 ? 0.6 : 1;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} exercices`}
                style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: intensity === 0 ? 'var(--bg-input)' : `rgba(74,158,255,${intensity})`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Per-topic bars */}
      {Object.keys(progress.topics).length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Par sujet</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(progress.topics).map(([topicId, tp]) => (
              <div key={topicId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.875rem' }}>
                  <span>{topicId}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{LEVEL_NAMES[tp.current_level]}</span>
                    <span style={{ fontWeight: 600, color: MASTERY_COLOR(tp.mastery_percent) }}>{tp.mastery_percent}%</span>
                  </div>
                </div>
                <ProgressBar value={tp.mastery_percent} color={MASTERY_COLOR(tp.mastery_percent)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confusion pairs */}
      {confusions.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Confusions fréquentes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {confusions.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '0.4rem', background: 'var(--bg-input)', borderRadius: 6 }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{c.correct}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>→</span>
                  <span style={{ color: 'var(--accent-orange)' }}>{c.chosen_instead}</span>
                </span>
                <span className="badge badge-red">{c.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
