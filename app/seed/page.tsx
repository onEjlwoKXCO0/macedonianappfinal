export default function SeedPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem' }}>🌱 Seeder</h1>
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Contenu disponible</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Les leçons seed ont été générées et placées dans <code style={{ background: 'var(--bg-input)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>/data/approved/</code>.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
          Pour générer du contenu supplémentaire, utilisez Claude Code directement en lui donnant le topic souhaité.
        </p>
      </div>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Sources disponibles</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <li>📄 КРАТКА-МАКЕДОНСКА-ГРАМАТИКА.pdf</li>
          <li>📄 Macedonian: A Course for Beginning and Intermediate Students</li>
          <li>📄 A grammar of the Macedonian literary language (Lunt, 1952)</li>
          <li>📄 Македонска-граматика-Круме-Кепески.pdf</li>
        </ul>
      </div>
    </div>
  );
}
