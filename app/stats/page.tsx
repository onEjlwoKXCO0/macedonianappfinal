'use client';
import { useEffect, useState } from 'react';
import { getProgress, getGlobalMastery } from '@/lib/progress-tracker';
import { getTopConfusions } from '@/lib/distractor-engine';
import { LEVEL_NAMES } from '@/lib/difficulty-engine';
import { getAllCards, getDueCount, getNewCount } from '@/lib/spaced-repetition';
import { getTopicLabel } from '@/lib/topic-labels';
import ProgressBar from '@/components/ProgressBar';
import StreakCounter from '@/components/StreakCounter';
import type { UserProgress } from '@/lib/types';
import type { Confusion } from '@/lib/types';

const MASTERY_COLOR = (pct: number) =>
  pct >= 80 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent-yellow)' : pct >= 30 ? 'var(--accent-orange)' : 'var(--accent-red)';

export default function StatsPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [confusions, setConfusions] = useState<Confusion[]>([]);
  const [cardStats, setCardStats] = useState({ total: 0, newCards: 0, due: 0, learning: 0, mature: 0, avgStability: 0 });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setProgress(getProgress());
    setConfusions(getTopConfusions(10));

    const cards = Object.values(getAllCards());
    const newCards = getNewCount();
    const due = getDueCount(today);
    const reviewed = cards.filter((c) => c.state !== 'new');
    // FSRS: stability < 21 days = still learning, >= 21 days = mature
    const learning = reviewed.filter((c) => c.stability < 21).length;
    const mature = reviewed.filter((c) => c.stability >= 21).length;
    const avgStability = reviewed.length > 0
      ? Math.round(reviewed.reduce((s, c) => s + c.stability, 0) / reviewed.length)
      : 0;
    setCardStats({ total: cards.length, newCards, due, learning, mature, avgStability });
  }, []);

  if (!progress) return null;

  const mastery = getGlobalMastery(progress);
  const last30 = progress.session_history.slice(-30);

  const today = new Date();
  const heatmap: { date: string; count: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const session = progress.session_history.find((s) => s.date === dateStr);
    heatmap.push({ date: dateStr, count: session ? session.exercises_done : 0 });
  }

  const totalMinutes = last30.reduce((s, sess) => s + sess.duration_minutes, 0);

  return (
    <div className="max-w-[680px] mx-auto px-4 py-6">
      <h1 className="font-extrabold text-2xl mb-6">📊 Statistiques</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-5 text-center">
          <StreakCounter streak={progress.user.streak_current} />
          <div className="text-xs text-[var(--text-muted)] mt-[0.4rem]">Série actuelle</div>
          <div className="text-xs text-[var(--text-muted)] mt-[0.2rem]">Record : {progress.user.streak_best} j.</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-[2rem] font-extrabold" style={{ color: MASTERY_COLOR(mastery) }}>{mastery}%</div>
          <div className="text-xs text-[var(--text-muted)] mt-[0.4rem]">Maîtrise globale</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-[2rem] font-extrabold">{progress.user.total_exercises_done}</div>
          <div className="text-xs text-[var(--text-muted)] mt-[0.4rem]">Exercices complétés</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-[2rem] font-extrabold">{totalMinutes}</div>
          <div className="text-xs text-[var(--text-muted)] mt-[0.4rem]">Minutes (30 derniers jours)</div>
        </div>
      </div>

      {/* SM-2 card stats */}
      {cardStats.total > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-bold text-[0.9rem] mb-3 text-[var(--text-muted)]">Cartes SM-2</h2>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Total', value: cardStats.total, color: 'var(--text)' },
              { label: 'À réviser', value: cardStats.due, color: 'var(--accent-red)' },
              { label: 'Apprentissage', value: cardStats.learning, color: 'var(--accent-orange)' },
              { label: 'Matures', value: cardStats.mature, color: 'var(--accent-green)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-[0.6rem] bg-[var(--bg-input)] rounded-lg">
                <div className="text-xl font-extrabold" style={{ color }}>{value}</div>
                <div className="text-[0.65rem] text-[var(--text-muted)] mt-[0.15rem]">{label}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-[var(--text-muted)] text-center">
            Stabilité moyenne : <strong className="text-[var(--text)]">{cardStats.avgStability} j.</strong>
            {' · '}{cardStats.newCards} nouvelle{cardStats.newCards > 1 ? 's' : ''} carte{cardStats.newCards > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Activity heatmap */}
      <div className="card p-5 mb-5">
        <h2 className="font-bold text-[0.9rem] mb-3 text-[var(--text-muted)]">Activité (90 jours)</h2>
        <div className="flex flex-wrap gap-[3px]">
          {heatmap.map((day) => {
            const intensity = day.count === 0 ? 0 : day.count < 5 ? 0.3 : day.count < 10 ? 0.6 : 1;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} exercices`}
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  background: intensity === 0 ? 'var(--bg-input)' : `rgba(74,158,255,${intensity})`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Per-topic bars */}
      {Object.keys(progress.topics).length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-bold text-[0.9rem] mb-3 text-[var(--text-muted)]">Par sujet</h2>
          <div className="flex flex-col gap-3">
            {Object.entries(progress.topics).map(([topicId, tp]) => (
              <div key={topicId}>
                <div className="flex justify-between mb-[0.3rem] text-sm">
                  <span>{getTopicLabel(topicId)}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-[var(--text-muted)]">{LEVEL_NAMES[tp.current_level]}</span>
                    <span className="font-semibold" style={{ color: MASTERY_COLOR(tp.mastery_percent) }}>{tp.mastery_percent}%</span>
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
        <div className="card p-5">
          <h2 className="font-bold text-[0.9rem] mb-3 text-[var(--text-muted)]">Confusions fréquentes</h2>
          <div className="flex flex-col gap-2">
            {confusions.map((c) => (
              <div
                key={`${c.correct}_${c.chosen_instead}`}
                className="flex justify-between items-center text-sm p-[0.4rem] bg-[var(--bg-input)] rounded"
              >
                <span>
                  <span className="font-semibold">{c.correct}</span>
                  <span className="text-[var(--text-muted)] mx-2">→</span>
                  <span className="text-[var(--accent-orange)]">{c.chosen_instead}</span>
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
