import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';
import type { Lesson } from '@/lib/types';

const PENDING = path.join(process.cwd(), 'data', 'pending');
const APPROVED = path.join(process.cwd(), 'data', 'approved');

export async function POST(req: NextRequest) {
  const { lessonId, action } = (await req.json()) as { lessonId: string; action: 'approve' | 'reject' };
  const src = path.join(PENDING, `${lessonId}.json`);
  try {
    if (action === 'approve') {
      const raw = await readFile(src, 'utf-8');
      const lesson: Lesson = JSON.parse(raw);
      lesson.status = 'approved';
      await writeFile(path.join(APPROVED, `${lessonId}.json`), JSON.stringify(lesson, null, 2));
      await unlink(src);
    } else {
      await unlink(src);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
