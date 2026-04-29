'use client';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function AuthPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error } = await signIn(email.trim());
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div className="max-w-[400px] mx-auto mt-16 px-4 text-center">
      <div className="text-5xl mb-4">📬</div>
      <h1 className="font-extrabold text-2xl mb-2">Vérifiez vos emails</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Un lien de connexion a été envoyé à <strong>{email}</strong>.
        Cliquez dessus pour vous connecter — aucun mot de passe requis.
      </p>
    </div>
  );

  return (
    <div className="max-w-[400px] mx-auto mt-16 px-4">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔄</div>
        <h1 className="font-extrabold text-2xl mb-2">Synchroniser vos progrès</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Connectez-vous pour retrouver vos cartes FSRS et votre historique sur tous vos appareils.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="input-mk"
          style={{ fontSize: '1rem' }}
          autoFocus
          required
        />
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? '⏳ Envoi...' : '📧 Recevoir le lien de connexion'}
        </button>
      </form>

      {error && <p className="text-sm text-[var(--accent-red)] mt-3 text-center">{error}</p>}

      <p className="text-xs text-[var(--text-muted)] text-center mt-6">
        L'app fonctionne hors ligne même sans compte — la connexion active uniquement la sync multi-appareils.
      </p>
    </div>
  );
}
