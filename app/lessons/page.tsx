import { readdir, readFile } from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import type { Lesson } from '@/lib/types';

async function getLessons(): Promise<Lesson[]> {
  try {
    const dir = path.join(process.cwd(), 'data', 'approved');
    const files = await readdir(dir);
    const lessons: Lesson[] = [];
    for (const f of files.filter((f) => f.endsWith('.json'))) {
      const raw = await readFile(path.join(dir, f), 'utf-8');
      lessons.push(JSON.parse(raw));
    }
    return lessons.sort((a, b) => a.difficulty_level - b.difficulty_level);
  } catch {
    return [];
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  grammar: 'Grammaire',
  thematic: 'Thématique',
};

const CATEGORY_COLORS: Record<string, string> = {
  grammar: 'badge-green',
  thematic: 'badge-orange',
};

export default async function LessonsPage() {
  const lessons = await getLessons();

  const byCategory = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    const cat = l.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(l);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1.5rem' }}>📘 Toutes les leçons</h1>

      {lessons.length === 0 && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <p style={{ color: 'var(--text-muted)' }}>Aucune leçon disponible. Lancez le seeder pour générer du contenu.</p>
          <Link href="/seed" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ marginTop: '1rem' }}>Aller au Seeder</button>
          </Link>
        </div>
      )}

      {Object.entries(byCategory).map(([cat, catLessons]) => (
        <div key={cat} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {catLessons.map((lesson) => (
              <Link key={lesson.id} href={`/lessons/${lesson.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{lesson.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.subtopic}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                    <span className={`badge ${CATEGORY_COLORS[lesson.category]}`}>{CATEGORY_LABELS[lesson.category]}</span>
                    <span className="badge badge-blue">Niv. {lesson.difficulty_level}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
