'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgress, saveProgress, DEFAULT_PROGRESS } from '@/lib/progress-tracker';
import { getSettings, saveSettings, type AppSettings } from '@/lib/settings';
import { useAuth } from '@/components/AuthProvider';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    dailyGoalMinutes: 15,
    newCardsPerDay: 15,
    theme: 'dark',
  });
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = getSettings();
    const p = getProgress();
    setSettings({ ...s, dailyGoalMinutes: p.user.daily_goal_minutes });
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    const p = getProgress();
    p.user.daily_goal_minutes = settings.dailyGoalMinutes;
    saveProgress(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = {
      progress: getProgress(),
      cards: localStorage.getItem('mk_cards'),
      settings: localStorage.getItem('mk_settings'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mk-learn-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    ['mk_cards', 'mk_progress', 'mk_distractor_memory', 'mk_daily_new'].forEach((k) =>
      localStorage.removeItem(k)
    );
    saveProgress(structuredClone(DEFAULT_PROGRESS));
    setConfirmReset(false);
    setSaved(false);
  };

  return (
    <div className="max-w-[520px] mx-auto px-4 py-6">
      <h1 className="font-extrabold text-2xl mb-6">⚙️ Paramètres</h1>

      {/* Sync / account */}
      <div className="card p-5 mb-4">
        <h2 className="font-bold text-base mb-3">Synchronisation</h2>
        {user ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--accent-green)]">✅ Connecté</div>
              <div className="text-xs text-[var(--text-muted)] mt-[2px]">{user.email}</div>
            </div>
            <button className="btn-ghost text-sm" onClick={signOut}>Se déconnecter</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              Connectez-vous pour accéder à vos progrès sur tous vos appareils.
            </p>
            <button className="btn-secondary text-sm shrink-0 ml-4" onClick={() => router.push('/auth')}>
              Se connecter
            </button>
          </div>
        )}
      </div>

      {/* Study settings */}
      <div className="card p-5 mb-4">
        <h2 className="font-bold text-base mb-5">Apprentissage</h2>

        <div className="mb-5">
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-sm font-semibold">Objectif quotidien</label>
            <span className="font-bold text-[var(--accent-blue)]">{settings.dailyGoalMinutes} min</span>
          </div>
          <input
            type="range" min={5} max={60} step={5}
            value={settings.dailyGoalMinutes}
            onChange={(e) => setSettings((s) => ({ ...s, dailyGoalMinutes: +e.target.value }))}
            className="w-full accent-[var(--accent-blue)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
            <span>5 min</span><span>60 min</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-sm font-semibold">Nouvelles cartes / jour</label>
            <span className="font-bold text-[var(--accent-blue)]">{settings.newCardsPerDay}</span>
          </div>
          <input
            type="range" min={5} max={50} step={5}
            value={settings.newCardsPerDay}
            onChange={(e) => setSettings((s) => ({ ...s, newCardsPerDay: +e.target.value }))}
            className="w-full accent-[var(--accent-blue)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
            <span>5</span><span>50</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Recommandé : 10–20. Au-delà, la charge de révisions futures augmente rapidement.
          </p>
        </div>
      </div>

      {/* Theme */}
      <div className="card p-5 mb-4">
        <h2 className="font-bold text-base mb-4">Apparence</h2>
        <div className="flex gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSettings((s) => ({ ...s, theme: t }))}
              className="flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all duration-150 cursor-pointer"
              style={{
                background: settings.theme === t ? 'rgba(74,158,255,0.12)' : 'var(--bg-input)',
                borderColor: settings.theme === t ? 'var(--accent-blue)' : 'var(--border)',
                color: settings.theme === t ? 'var(--accent-blue)' : 'var(--text-muted)',
              }}
            >
              {t === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary w-full mb-3" onClick={handleSave}>
        {saved ? '✅ Enregistré !' : '💾 Enregistrer'}
      </button>

      <button className="btn-secondary w-full mb-5" onClick={handleExport}>
        📤 Exporter la progression (JSON)
      </button>

      {/* Danger zone */}
      <div className="card p-5" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <h2 className="font-bold text-base mb-1 text-[var(--accent-red)]">Zone de danger</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Supprime toutes les cartes FSRS, l'historique de sessions et les statistiques. Irréversible.
        </p>
        <button
          className="w-full py-3 rounded-lg border font-semibold text-sm cursor-pointer transition-all duration-150"
          style={{
            borderColor: 'rgba(239,68,68,0.4)',
            background: confirmReset ? 'rgba(239,68,68,0.1)' : 'transparent',
            color: 'var(--accent-red)',
          }}
          onClick={handleReset}
        >
          {confirmReset ? '⚠️ Confirmer la réinitialisation' : '🗑 Réinitialiser la progression'}
        </button>
        {confirmReset && (
          <button className="btn-ghost w-full mt-2 text-sm" onClick={() => setConfirmReset(false)}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
