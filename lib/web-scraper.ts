import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

const WEBSITES_DIR = path.join(process.cwd(), 'data', 'source-material', 'websites');

function slugify(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

function extractText(html: string): string {
  // Remove script and style blocks
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove nav, header, footer, aside
  text = text.replace(/<(nav|header|footer|aside|advertisement)[\s\S]*?<\/\1>/gi, '');
  // Convert headings and paragraphs to readable text
  text = text.replace(/<h[1-6][^>]*>/gi, '\n\n## ');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<td[^>]*>/gi, ' | ');
  text = text.replace(/<tr[^>]*>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  return text.trim();
}

export async function scrapeUrl(url: string): Promise<{ slug: string; text: string; cached: boolean }> {
  const slug = slugify(url);
  const filePath = path.join(WEBSITES_DIR, `${slug}.txt`);

  // Return cached version if exists
  try {
    const cached = await readFile(filePath, 'utf-8');
    return { slug, text: cached, cached: true };
  } catch {
    // Not cached yet
  }

  try {
    await mkdir(WEBSITES_DIR, { recursive: true });
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MKLearnBot/1.0; educational use)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en,mk;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const text = extractText(html);
    const output = `SOURCE: ${url}\nSCRAPED: ${new Date().toISOString()}\n\n${text}`;
    await writeFile(filePath, output, 'utf-8');
    return { slug, text: output, cached: false };
  } catch (e) {
    throw new Error(`Scrape failed for ${url}: ${e}`);
  }
}

export async function scrapeAll(urls: string[], onProgress?: (url: string, done: number, total: number) => void) {
  const results: { url: string; slug: string; error?: string }[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const r = await scrapeUrl(url);
      results.push({ url, slug: r.slug });
      onProgress?.(url, i + 1, urls.length);
    } catch (e) {
      results.push({ url, slug: slugify(url), error: String(e) });
      onProgress?.(url, i + 1, urls.length);
    }
  }
  return results;
}
