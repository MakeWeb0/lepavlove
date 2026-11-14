import { head } from '@vercel/blob';

const ALLOWED = /^assets\/(img|video)\/uploads\/[a-z0-9-]+\.(webp|png|jpg|mp4|webm|mov)$/;

export async function GET(request) {
  const path = new URL(request.url).searchParams.get('p') || '';
  if (!ALLOWED.test(path)) return new Response('', { status: 404 });
  try {
    const blob = await head(path);
    return new Response(null, { status: 302, headers: { location: blob.url, 'cache-control': 'public, max-age=3600' } });
  } catch {
    return new Response('', { status: 404 });
  }
}
