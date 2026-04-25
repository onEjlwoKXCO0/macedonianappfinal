import { readdir, readFile } from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import type { Lesson } from '@/lib/types';

async function getTopics() {
  try {
    const dir = path.join(process.cwd(), 'data', 'approved');
    const files = await readdir(dir);
    const map = new Map<string, { label: string; category: string; count: number }>();
    for (const f of files.filter((f) => f.endsWith('.json'))) {
      const l: Lesson = JSON.parse(await readFile(path.join(dir, f), 'utf-8'));
      const existing = map.get(l.topic);
      if (existing) existing.count++;
      else map.set(l.topic, { label: l.topic, category: l.category, count: 1 });
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }));
  } catch {
    return [];
  }
}

export default async function TopicsPage() {
  const topics = await getTopics();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1.5rem' }}>📂 Sujets</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {topics.map((t) => (
          <Link key={t.id} href={`/topics/${t.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.count} leçon{t.count > 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge ${t.category === 'grammar' ? 'badge-green' : 'badge-orange'}`}>{t.category === 'grammar' ? 'Grammaire' : 'Thématique'}</span>
                <span style={{ color: 'var(--text-muted)' }}>›</span>
              </div>
            </div>
          </Link>
        ))}
        {topics.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucun sujet disponible.</p>}
      </div>
    </div>
  );
}
