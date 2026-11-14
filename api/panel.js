import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { list, put } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

const DEFAULT_PASSWORD = 'lepavlove1234';
const CONTENT = 'data/content.json';
const IMAGE = /^assets\/img\/uploads\/[a-z0-9-]+\.(webp|png|jpg)$/;
const VIDEO = /^assets\/video\/uploads\/[a-z0-9-]+\.(mp4|webm|mov)$/;
const fails = new Map();

const json = (data, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
const fail = (error, status = 400) => json({ ok: false, error }, status);
const secret = () => process.env.PANEL_SECRET || process.env.BLOB_READ_WRITE_TOKEN || '';

async function loadConfig() {
  const { blobs } = await list({ prefix: 'panel/' });
  const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  if (!latest) return null;
  const res = await fetch(`${latest.url}?v=${Date.parse(latest.uploadedAt)}`, { cache: 'no-store' });
  return res.ok ? res.json() : null;
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}

function checkPassword(config, password) {
  if (!config) return password === DEFAULT_PASSWORD;
  const a = Buffer.from(scryptSync(password, config.salt, 64).toString('hex'));
  const b = Buffer.from(config.hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(config, days) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const ver = config ? config.ver : 'inicial';
  return `${exp}.${createHmac('sha256', secret()).update(`${exp}.${ver}`).digest('hex')}`;
}

function verify(config, token) {
  const [exp, mac] = String(token || '').split('.');
  if (!exp || !mac || Number(exp) < Date.now() / 1000) return false;
  const ver = config ? config.ver : 'inicial';
  const good = createHmac('sha256', secret()).update(`${exp}.${ver}`).digest('hex');
  return good.length === mac.length && timingSafeEqual(Buffer.from(good), Buffer.from(mac));
}

function throttled(ip) {
  const s = fails.get(ip);
  return s && s.count >= 5 && Date.now() - s.since < 900000;
}

function failed(ip) {
  const s = fails.get(ip);
  if (!s || Date.now() - s.since >= 900000) fails.set(ip, { count: 1, since: Date.now() });
  else s.count++;
}

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('action') !== 'status') return fail('Petición no válida.');
  if (!secret()) return fail('Falta conectar el almacenamiento (Vercel Blob) al proyecto.', 500);
  const config = await loadConfig();
  return json({ ok: true, logged: verify(config, request.headers.get('x-panel-token')), default: !config });
}

export async function POST(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const config = await loadConfig();

  if (action === 'upload') {
    const body = await request.json();
    try {
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          if (!verify(config, clientPayload) || !VIDEO.test(pathname)) throw new Error('No autorizado.');
          return {
            allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
            maximumSizeInBytes: 100 * 1024 * 1024,
            addRandomSuffix: false,
            allowOverwrite: true,
          };
        },
        onUploadCompleted: async () => {},
      });
      return json(result);
    } catch (e) {
      return fail(e.message || 'No se pudo subir el vídeo.', 401);
    }
  }

  if (request.headers.get('x-panel') !== '1') return fail('Petición no válida.');
  const form = await request.formData();
  const ip = request.headers.get('x-forwarded-for') || 'local';

  if (action === 'login') {
    if (throttled(ip)) return fail('Demasiados intentos. Espera unos minutos y vuelve a probar.', 429);
    if (!checkPassword(config, String(form.get('password') || ''))) {
      failed(ip);
      await new Promise((r) => setTimeout(r, 1000));
      return fail('Contraseña incorrecta.', 401);
    }
    fails.delete(ip);
    return json({ ok: true, token: sign(config, form.get('remember') ? 30 : 1), default: !config });
  }

  if (!verify(config, request.headers.get('x-panel-token'))) return fail('Tu sesión ha caducado. Vuelve a entrar.', 401);

  if (action === 'password') {
    if (!checkPassword(config, String(form.get('old') || ''))) return fail('La contraseña actual no es correcta.', 401);
    const next = String(form.get('new') || '');
    if (next.length < 8) return fail('La contraseña nueva debe tener al menos 8 caracteres.');
    const fresh = { ...hashPassword(next), ver: randomBytes(8).toString('hex') };
    await put('panel/config.json', JSON.stringify(fresh), { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
    return json({ ok: true, token: sign(fresh, 30) });
  }

  if (action === 'save') {
    const path = String(form.get('path') || '');
    const file = form.get('file');
    const isContent = path === CONTENT;
    if (!isContent && !IMAGE.test(path) && !VIDEO.test(path)) return fail('Ruta no permitida.');
    if (!file || typeof file === 'string') return fail('No ha llegado el archivo. Inténtalo de nuevo.');
    if (isContent) {
      try {
        const data = JSON.parse(await file.text());
        if (!data || !data.site) throw new Error();
      } catch {
        return fail('El contenido no es válido.');
      }
    }
    const types = { json: 'application/json', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
    await put(path, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: types[path.split('.').pop()],
      cacheControlMaxAge: isContent ? 60 : 31536000,
    });
    return json({ ok: true });
  }

  return fail('Acción desconocida.');
}
