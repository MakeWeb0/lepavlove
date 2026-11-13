// Pinta data/content.json dentro del HTML estático (index y tienda) con el mismo js/content.js
// que usa la web. Así Google, las vistas previas de enlaces y quien no tenga JavaScript ven
// el contenido real. Lo ejecuta GitHub Actions cada vez que el panel publica.
//   node tools/prerender.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const data = JSON.parse(read('data/content.json'));
const script = read('js/content.js');

for (const page of ['index.html', 'tienda.html']) {
  const html = read(page);
  const dom = new JSDOM(html, { url: `https://www.lepavlove.es/${page}`, runScripts: 'outside-only' });
  const { window } = dom;
  window.fetch = async () => ({ ok: true, json: async () => structuredClone(data) });
  window.eval(script);
  await window.LP.ready;
  // Lo dinámico se vuelve a crear en el navegador: el aviso y la clase de espera
  window.document.querySelectorAll('.notice').forEach((n) => n.remove());
  let out = dom.serialize();
  out = out.replace(/<html lang="es"( class="")?>/, '<html lang="es">');
  if (out !== html) {
    writeFileSync(new URL(page, root), out);
    console.log('actualizado', page);
  } else console.log('sin cambios', page);
}
