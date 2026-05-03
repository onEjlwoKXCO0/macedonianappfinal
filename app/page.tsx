'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProgress, getGlobalMastery } from '@/lib/progress-tracker';
import { getTopConfusions } from '@/lib/distractor-engine';
import { LEVEL_NAMES } from '@/lib/difficulty-engine';
import { getDueCount, getNewCount } from '@/lib/spaced-repetition';
import { getTopicLabel } from '@/lib/topic-labels';
import StreakCounter from '@/components/StreakCounter';
import ProgressBar from '@/components/ProgressBar';
import type { UserProgress } from '@/lib/types';
import type { Confusion } from '@/lib/types';

const MASTERY_COLOR = (pct: number) =>
  pct >= 80 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent-yellow)' : pct >= 30 ? 'var(--accent-orange)' : 'var(--accent-red)';

export default function Dashboard() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [confusions, setConfusions] = useState<Confusion[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setProgress(getProgress());
    setConfusions(getTopConfusions(5));
    setDueCount(getDueCount(today));
    setNewCount(getNewCount());
  }, []);

  if (!progress) return null;

  const mastery = getGlobalMastery(progress);
  const topicsWithProgress = Object.entries(progress.topics);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-[680px] mx-auto px-4 py-6">
      {/* Top row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-extrabold text-2xl mb-1">Bonjour 👋</h1>
          <div className="text-[var(--text-muted)] text-[0.9rem]">
            Maîtrise globale : <strong className="text-[var(--text)]">{mastery}%</strong>
          </div>
        </div>
        <StreakCounter streak={progress.user.streak_current} />
      </div>

      {/* FSRS review alert */}
      {(dueCount > 0 || newCount > 0) && (
        <div
          className="card p-4 mb-5 flex items-center justify-between cursor-pointer"
          style={{
            background: dueCount > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(74,158,255,0.07)',
            borderColor: dueCount > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(74,158,255,0.3)',
          }}
          onClick={() => router.push('/review')}
        >
          <div>
            <div className="font-bold text-[0.95rem] mb-[0.2rem]">
              {dueCount > 0 ? '🔄 Révisions en attente' : '🆕 Nouvelles cartes disponibles'}
            </div>
            <div className="text-[0.8rem] text-[var(--text-muted)]">
              {dueCount > 0 && <span className="font-semibold text-[var(--accent-red)]">{dueCount} carte{dueCount > 1 ? 's' : ''} à réviser</span>}
              {dueCount > 0 && newCount > 0 && <span className="mx-[0.4rem]">·</span>}
              {newCount > 0 && <span>{newCount} nouvelle{newCount > 1 ? 's' : ''}</span>}
            </div>
          </div>
          <span className="text-[1.1rem] text-[var(--text-muted)]">›</span>
        </div>
      )}

      {/* Session card */}
      <div className="card p-6 mb-5" style={{ background: 'rgba(74,158,255,0.08)', borderColor: 'rgba(74,158,255,0.3)' }}>
        <div className="font-bold mb-2">
          📅 Session du jour — ~{progress.user.daily_goal_minutes} min
        </div>
        <div className="text-sm text-[var(--text-muted)] mb-4">
          {progress.user.last_session_date === todayStr
            ? "✅ Session complétée aujourd'hui"
            : "Aucune session aujourd'hui — commencez !"}
        </div>
        <Link href="/daily">
          <button className="btn-primary w-full">Démarrer la session →</button>
        </Link>
      </div>

      {/* Topics progress */}
      {topicsWithProgress.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-bold mb-4 text-base">Progression par sujet</h2>
          <div className="flex flex-col gap-3">
            {topicsWithProgress.map(([topicId, tp]) => (
              <Link key={topicId} href={`/topics/${topicId}`} className="no-underline text-inherit">
                <div>
                  <div className="flex justify-between mb-[0.3rem] text-sm">
                    <span>{getTopicLabel(topicId)}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-[var(--text-muted)]">
                        Niv. {tp.current_level} — {LEVEL_NAMES[tp.current_level]}
                      </span>
                      <span className="font-semibold" style={{ color: MASTERY_COLOR(tp.mastery_percent) }}>
                        {tp.mastery_percent}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={tp.mastery_percent} color={MASTERY_COLOR(tp.mastery_percent)} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Start a topic if none started */}
      {topicsWithProgress.length === 0 && (
        <div className="card p-5 mb-5 text-center">
          <div className="text-[2rem] mb-2">📚</div>
          <p className="text-[var(--text-muted)] mb-4">Aucune leçon commencée. Parcourez le catalogue !</p>
          <Link href="/lessons">
            <button className="btn-primary">Voir les leçons</button>
          </Link>
        </div>
      )}

      {/* Weak areas */}
      {confusions.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-bold mb-3 text-base">⚠️ Points faibles</h2>
          <div className="flex flex-col gap-2">
            {confusions.map((c) => (
              <div
                key={`${c.correct}_${c.chosen_instead}`}
                className="flex items-center justify-between text-sm p-2 rounded-lg bg-[var(--bg-input)]"
              >
                <span>
                  <span className="mk-text text-[0.9rem]">{c.correct}</span>
                  <span className="text-[var(--text-muted)] mx-2">confondu avec</span>
                  <span className="mk-text text-[0.9rem] text-[var(--accent-orange)]">{c.chosen_instead}</span>
                </span>
                <span className="badge badge-red">{c.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/lessons" className="no-underline">
          <div className="card p-4 text-center cursor-pointer">
            <div className="text-2xl">📘</div>
            <div className="font-semibold mt-[0.4rem] text-[0.9rem]">Toutes les leçons</div>
          </div>
        </Link>
        <Link href="/review" className="no-underline">
          <div className="card p-4 text-center cursor-pointer">
            <div className="text-2xl">🔄</div>
            <div className="font-semibold mt-[0.4rem] text-[0.9rem]">Révision</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
