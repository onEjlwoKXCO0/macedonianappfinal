import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { Lesson } from '@/lib/types';

const APPROVED_DIR = path.join(process.cwd(), 'data', 'approved');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  try {
    const file = path.join(APPROVED_DIR, `${lessonId}.json`);
    const content = await readFile(file, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: 'Leçon introuvable' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  try {
    const lesson = (await req.json()) as Lesson;
    const file = path.join(APPROVED_DIR, `${lessonId}.json`);
    await writeFile(file, JSON.stringify(lesson, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
