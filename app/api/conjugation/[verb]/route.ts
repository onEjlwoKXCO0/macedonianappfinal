import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const CONJ_DIR = path.join(process.cwd(), 'data', 'conjugation-tables');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ verb: string }> }) {
  const { verb } = await params;
  try {
    const file = path.join(CONJ_DIR, `${verb}.json`);
    const content = await readFile(file, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: 'Table introuvable' }, { status: 404 });
  }
}
