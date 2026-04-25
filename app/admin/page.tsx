import { readdir, readFile, rename, unlink } from 'fs/promises';
import path from 'path';
import type { Lesson } from '@/lib/types';
import AdminClient from './AdminClient';

async function getPendingLessons(): Promise<Lesson[]> {
  try {
    const dir = path.join(process.cwd(), 'data', 'pending');
    const files = await readdir(dir);
    const lessons: Lesson[] = [];
    for (const f of files.filter((f) => f.endsWith('.json'))) {
      const raw = await readFile(path.join(dir, f), 'utf-8');
      lessons.push(JSON.parse(raw));
    }
    return lessons;
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const lessons = await getPendingLessons();
  return <AdminClient initialLessons={lessons} />;
}
