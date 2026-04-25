import { NextRequest, NextResponse } from 'next/server';
import { scrapeAll } from '@/lib/web-scraper';
import { readFile } from 'fs/promises';
import path from 'path';

const DEFAULT_URLS = [
  'https://polyglotclub.com/wiki/Language/Macedonian/Vocabulary/Basic-Greetings',
  'https://macedonianlanguage.org/',
  'https://www.lingohut.com/en/l123/learn-macedonian',
  'https://macedonianlanguagecorner.com/learnmacedonian/',
  'https://ilanguages.org/macedonian.php',
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const urls: string[] = body.urls ?? DEFAULT_URLS;

  const results = await scrapeAll(urls);
  return NextResponse.json({ results });
}

export async function GET() {
  // Return list of already-scraped files
  const dir = path.join(process.cwd(), 'data', 'source-material', 'websites');
  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(dir);
    return NextResponse.json({ files: files.filter((f) => f.endsWith('.txt')) });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
