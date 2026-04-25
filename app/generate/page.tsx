export default function GeneratePage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem' }}>⚡ Générer une leçon</h1>
      <div className="card" style={{ padding: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          La génération de leçons s'effectue directement depuis le terminal Claude Code.
        </p>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.75rem' }}>
          Exemple : <code style={{ background: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.875rem' }}>
            "génère une leçon sur les verbes au présent, topic regular_verbs_present"
          </code>
        </p>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.75rem' }}>
          Les fichiers JSON seront déposés dans <code style={{ background: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.875rem' }}>/data/approved/</code> directement.
        </p>
      </div>
    </div>
  );
}
