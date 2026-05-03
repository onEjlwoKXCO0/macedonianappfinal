import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import type { Lesson } from '@/lib/types';

const APPROVED_DIR = path.join(process.cwd(), 'data', 'approved');

export async function GET() {
  try {
    const files = await readdir(APPROVED_DIR);
    const lessons: Lesson[] = [];
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      try {
        const content = await readFile(path.join(APPROVED_DIR, file), 'utf-8');
        lessons.push(JSON.parse(content) as Lesson);
      } catch {
        // Skip malformed files without crashing the whole endpoint
        console.error(`Skipping malformed lesson file: ${file}`);
      }
    }
    return NextResponse.json(lessons);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
