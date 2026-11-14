import { readFile } from 'node:fs/promises';
import { get } from '@vercel/blob';

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' };

export async function GET() {
  try {
    const r = await get('data/content.json', { access: 'public', useCache: false });
    if (r && r.statusCode === 200) return new Response(r.stream, { headers });
  } catch {}
  const fallback = await readFile(new URL('../data/content.json', import.meta.url));
  return new Response(fallback, { headers });
}
