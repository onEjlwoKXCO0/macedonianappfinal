'use client';
import { useState, useEffect } from 'react';

const DEFAULT_URLS = [
  'https://polyglotclub.com/wiki/Language/Macedonian/Vocabulary/Basic-Greetings',
  'https://macedonianlanguage.org/',
  'https://www.lingohut.com/en/l123/learn-macedonian',
  'https://macedonianlanguagecorner.com/learnmacedonian/',
  'https://ilanguages.org/macedonian.php',
];

const ALL_TOPICS = [
  { id: 'pronouns_personal', label: 'Pronoms personnels', cat: 'Grammaire' },
  { id: 'pronouns_possessive', label: 'Pronoms possessifs', cat: 'Grammaire' },
  { id: 'sum_present', label: 'Être — présent', cat: 'Grammaire' },
  { id: 'sum_past_future', label: 'Être — passé/futur', cat: 'Grammaire' },
  { id: 'regular_verbs_present', label: 'Verbes réguliers — présent', cat: 'Grammaire' },
  { id: 'past_l_forms', label: 'Passé — formes en L', cat: 'Grammaire' },
  { id: 'future_kje', label: 'Futur avec kje', cat: 'Grammaire' },
  { id: 'negation', label: 'Négation', cat: 'Grammaire' },
  { id: 'question_words', label: 'Mots interrogatifs', cat: 'Grammaire' },
  { id: 'noun_gender', label: 'Genre des noms', cat: 'Grammaire' },
  { id: 'definite_articles', label: 'Articles définis', cat: 'Grammaire' },
  { id: 'adjective_agreement', label: 'Accord des adjectifs', cat: 'Grammaire' },
  { id: 'clitic_doubling', label: 'Doublement des clitiques', cat: 'Grammaire' },
  { id: 'verbal_aspect', label: 'Aspect verbal', cat: 'Grammaire' },
  { id: 'imperative', label: 'Impératif', cat: 'Grammaire' },
  { id: 'numbers_1_100', label: 'Chiffres 1–100', cat: 'Thématique' },
  { id: 'greetings', label: 'Salutations', cat: 'Thématique' },
  { id: 'food_restaurant', label: 'Nourriture & restaurant', cat: 'Thématique' },
  { id: 'family', label: 'Famille', cat: 'Thématique' },
  { id: 'colors_descriptions', label: 'Couleurs & descriptions', cat: 'Thématique' },
  { id: 'directions', label: 'Directions', cat: 'Thématique' },
  { id: 'telling_time', label: 'L\'heure', cat: 'Thématique' },
  { id: 'weather', label: 'Météo', cat: 'Thématique' },
  { id: 'daily_routine', label: 'Routine quotidienne', cat: 'Thématique' },
  { id: 'travel', label: 'Voyage', cat: 'Thématique' },
];

const PDFS = [
  'КРАТКА-МАКЕДОНСКА-ГРАМАТИКА.pdf',
  'Christina E. Kramer — Macedonian: A Course for Beginning and Intermediate Students',
  'Horace G. Lunt — A grammar of the Macedonian literary language (1952)',
  'Македонска-граматика-Круме-Кепески.pdf',
];

type ScrapeResult = { url: string; slug: string; error?: string };

export default function SeedPage() {
  const [urls, setUrls] = useState(DEFAULT_URLS.join('\n'));
  const [scraping, setScraping] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<ScrapeResult[]>([]);
  const [scrapedFiles, setScrapedFiles] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    fetch('/api/scrape').then(r => r.json()).then(d => setScrapedFiles(d.files ?? []));
    fetch('/api/lessons').then(r => r.json()).then((d: unknown[]) => setApprovedCount(d.length));
  }, []);

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeResults([]);
    const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList }),
      });
      const data = await res.json();
      setScrapeResults(data.results ?? []);
      fetch('/api/scrape').then(r => r.json()).then(d => setScrapedFiles(d.files ?? []));
    } catch (e) {
      setScrapeResults([{ url: 'error', slug: '', error: String(e) }]);
    } finally {
      setScraping(false);
    }
  };

  const cats = [...new Set(ALL_TOPICS.map(t => t.cat))];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌱 Seeder de contenu</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Scrapez les sources web, puis générez des leçons depuis le terminal Claude Code.
      </p>

      {/* Status bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{approvedCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leçons approuvées</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-green)' }}>{scrapedFiles.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sources scrapées</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-orange)' }}>{PDFS.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDFs disponibles</div>
        </div>
      </div>

      {/* Web scraper */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>🌐 Scraper les sources web</h2>
        <textarea
          value={urls}
          onChange={e => setUrls(e.target.value)}
          style={{
            width: '100%', minHeight: 120, background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text)',
            fontFamily: 'monospace', resize: 'vertical', outline: 'none', marginBottom: '0.75rem',
          }}
        />
        <button onClick={handleScrape} className="btn-primary" disabled={scraping} style={{ width: '100%' }}>
          {scraping ? '⏳ Scraping en cours...' : '🔍 Scraper les URLs'}
        </button>
        {scrapeResults.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {scrapeResults.map((r, i) => (
              <div key={i} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: 6, background: r.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: r.error ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {r.error ? `❌ ${r.url} — ${r.error}` : `✅ ${r.slug}.txt`}
              </div>
            ))}
          </div>
        )}
        {scrapedFiles.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Fichiers en cache :</div>
            {scrapedFiles.map(f => (
              <span key={f} className="badge badge-blue" style={{ marginRight: '0.3rem', marginBottom: '0.3rem', display: 'inline-block' }}>{f.replace('.txt', '')}</span>
            ))}
          </div>
        )}
      </div>

      {/* Topics checklist */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📋 Sujets à générer</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Cochez les sujets souhaités, puis demandez à Claude Code dans le terminal :<br />
          <code style={{ background: 'var(--bg-input)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
            "génère des leçons pour les topics sélectionnés dans /data/approved/"
          </code>
        </p>
        {cats.map(cat => (
          <div key={cat} style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{cat}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {ALL_TOPICS.filter(t => t.cat === cat).map(t => {
                const selected = selectedTopics.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    style={{
                      padding: '0.3rem 0.7rem', borderRadius: 99, fontSize: '0.8rem', cursor: 'pointer',
                      border: '1px solid', fontWeight: selected ? 600 : 400,
                      borderColor: selected ? 'var(--accent-blue)' : 'var(--border)',
                      background: selected ? 'rgba(74,158,255,0.15)' : 'var(--bg-input)',
                      color: selected ? 'var(--accent-blue)' : 'var(--text-muted)',
                    }}
                  >
                    {selected ? '✓ ' : ''}{t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {selectedTopics.length > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 8, fontSize: '0.8rem', fontFamily: 'monospace' }}>
            Topics sélectionnés : {selectedTopics.join(', ')}
          </div>
        )}
      </div>

      {/* PDFs */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📚 PDFs disponibles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {PDFS.map((p, i) => (
            <div key={i} style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', background: 'var(--bg-input)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📄</span>
              <span style={{ color: 'var(--text-muted)' }}>{p}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
          Ces PDFs sont dans <code style={{ background: 'var(--bg-input)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>/data/source-material/pdfs/</code>.
          Vous pouvez les partager directement avec Claude Code dans le terminal pour générer des leçons.
        </p>
      </div>
    </div>
  );
}
