import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import type { Lesson } from '@/lib/types';
import LessonPlayerClient from './LessonPlayerClient';

async function getLesson(id: string): Promise<Lesson | null> {
  try {
    const file = path.join(process.cwd(), 'data', 'approved', `${id}.json`);
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (!lesson) notFound();
  return <LessonPlayerClient lesson={lesson} />;
}
