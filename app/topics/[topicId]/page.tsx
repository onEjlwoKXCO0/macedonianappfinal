import { readdir, readFile } from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import type { Lesson } from '@/lib/types';

async function getLessonsForTopic(topicId: string): Promise<Lesson[]> {
  try {
    const dir = path.join(process.cwd(), 'data', 'approved');
    const files = await readdir(dir);
    const lessons: Lesson[] = [];
    for (const f of files.filter((f) => f.endsWith('.json'))) {
      const l: Lesson = JSON.parse(await readFile(path.join(dir, f), 'utf-8'));
      if (l.topic === topicId) lessons.push(l);
    }
    return lessons.sort((a, b) => a.difficulty_level - b.difficulty_level);
  } catch {
    return [];
  }
}

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const lessons = await getLessonsForTopic(topicId);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/topics" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>← Tous les sujets</Link>
        <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginTop: '0.5rem' }}>{topicId}</h1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {lessons.map((l) => (
          <Link key={l.id} href={`/lessons/${l.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{l.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{l.subtopic} • {l.exercises.length} exercices</div>
              </div>
              <span className="badge badge-blue">Niv. {l.difficulty_level}</span>
            </div>
          </Link>
        ))}
        {lessons.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucune leçon pour ce sujet.</p>}
      </div>
    </div>
  );
}
