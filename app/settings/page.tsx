'use client';
import { useEffect, useState } from 'react';
import { getProgress, saveProgress, DEFAULT_PROGRESS } from '@/lib/progress-tracker';

export default function SettingsPage() {
  const [goalMinutes, setGoalMinutes] = useState(15);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getProgress();
    setGoalMinutes(p.user.daily_goal_minutes);
    const storedTheme = localStorage.getItem('mk_theme') as 'dark' | 'light' | null;
    setTheme(storedTheme ?? 'dark');
    document.documentElement.setAttribute('data-theme', storedTheme ?? 'dark');
  }, []);

  const handleSave = () => {
    const p = getProgress();
    p.user.daily_goal_minutes = goalMinutes;
    saveProgress(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTheme = (t: 'dark' | 'light') => {
    setTheme(t);
    localStorage.setItem('mk_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    saveProgress(structuredClone(DEFAULT_PROGRESS));
    localStorage.removeItem('mk_distractors');
    setConfirmReset(false);
    alert('Progression réinitialisée.');
  };

  const handleExport = () => {
    const p = getProgress();
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mk-learn-progress.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1.5rem' }}>⚙️ Paramètres</h1>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Objectif quotidien</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[5, 10, 15, 20, 30].map((m) => (
            <button
              key={m}
              onClick={() => setGoalMinutes(m)}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer',
                border: '2px solid', fontWeight: 600, fontSize: '0.9rem',
                borderColor: goalMinutes === m ? 'var(--accent-blue)' : 'var(--border)',
                background: goalMinutes === m ? 'rgba(74,158,255,0.1)' : 'var(--bg-input)',
                color: goalMinutes === m ? 'var(--accent-blue)' : 'var(--text)',
              }}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Thème</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTheme(t)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer',
                border: '2px solid', fontWeight: 600,
                borderColor: theme === t ? 'var(--accent-blue)' : 'var(--border)',
                background: theme === t ? 'rgba(74,158,255,0.1)' : 'var(--bg-input)',
                color: theme === t ? 'var(--accent-blue)' : 'var(--text)',
              }}
            >
              {t === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="btn-primary"
        style={{ width: '100%', marginBottom: '0.75rem' }}
      >
        {saved ? '✅ Enregistré !' : '💾 Enregistrer'}
      </button>

      <button onClick={handleExport} className="btn-secondary" style={{ width: '100%', marginBottom: '0.75rem' }}>
        📤 Exporter la progression
      </button>

      <button
        onClick={handleReset}
        style={{
          width: '100%', padding: '0.75rem', borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--accent-red)', background: confirmReset ? 'rgba(239,68,68,0.1)' : 'transparent',
          color: 'var(--accent-red)', fontWeight: 600,
        }}
      >
        {confirmReset ? '⚠️ Confirmer la réinitialisation' : '🗑 Réinitialiser la progression'}
      </button>
      {confirmReset && (
        <button onClick={() => setConfirmReset(false)} className="btn-ghost" style={{ width: '100%', marginTop: '0.4rem' }}>
          Annuler
        </button>
      )}
    </div>
  );
}
