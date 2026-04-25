import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { UserProgress } from '@/lib/types';

const FILE = path.join(process.cwd(), 'data', 'progress.json');

export async function GET() {
  try {
    const raw = await readFile(FILE, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const progress = (await req.json()) as UserProgress;
    await writeFile(FILE, JSON.stringify(progress, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
