/* =========================================================
   Panel de administración · Le Pavlove
   Edita data/content.json con formularios, enseña una vista previa
   en vivo (la propia web en modo ?lp-preview) y publica el cambio
   con la API de GitHub (un commit → GitHub Pages actualiza la web).
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const rich = (s) => esc(s).replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } },
  };

  const REPO = 'MakeWeb0/lepavlove';
  const BRANCH = 'main';
  const LIB = ['pavlova', 'bites', 'bites-caja', 'pavlova-caja', 'grande', 'pavlova-cumple', 'pavlova-corte', 'cuplova', 'parfait', 'fresita', 'heladova', 'cafe', 'matcha', 'proc-batir', 'proc-final', 'fresas', 'fachada', 'mesa', 'brand-antojo', 'brand-bolsa', 'brand-cajas', 'brand-caja-larga', 'brand-vasos']
    .map((n) => `assets/img/${n}.webp`);
  const ICONS = [['fresa', 'Fresa'], ['frambuesa', 'Frambuesa'], ['arandano', 'Arándano'], ['hoja', 'Hoja'], ['flor', 'Flor']];

  /* ---------- Secciones ---------- */
  const SECTIONS = [
    { id: 'inicio', label: 'Inicio', icon: 'flor', desc: 'Lo primero que ve el cliente al entrar.', page: 'index.html', hash: '' },
    { id: 'nosotros', label: 'Sobre nosotros', icon: 'fresa', desc: 'Tu historia, las fotos del local y las frases de las cajas.', page: 'index.html', hash: '#nosotros' },
    { id: 'carta', label: 'La carta', icon: 'frambuesa', desc: 'Productos, precios y fotos de la carta.', page: 'index.html', hash: '#carta' },
    { id: 'tienda', label: 'Tienda online', icon: 'hoja', desc: 'Lo que se puede encargar por WhatsApp y recoger.', page: 'tienda.html', hash: '' },
    { id: 'galeria', label: 'Galería', icon: 'arandano', desc: 'Las fotos que giran en el carrusel.', page: 'index.html', hash: '#galeria' },
    { id: 'proceso', label: 'Cómo trabajamos', icon: 'flor', desc: 'Los pasos de “Así nace una pavlova”.', page: 'index.html', hash: '#como-trabajamos' },
    { id: 'opiniones', label: 'Opiniones', icon: 'fresa', desc: 'Las reseñas que se muestran en las servilletas.', page: 'index.html', hash: '#resenas' },
    { id: 'horario', label: 'Horario y contacto', icon: 'hoja', desc: 'Cuándo abres y cómo te encuentran.', page: 'index.html', hash: '#visitanos' },
    { id: 'aviso', label: 'Aviso especial', icon: 'arandano', desc: 'Un mensaje destacado para todos los clientes.', page: 'index.html', hash: '' },
  ];

  /* ---------- Estado ---------- */
  let D = null;                 // contenido que se está editando
  let PUB = '';                 // contenido publicado (JSON normalizado)
  let current = store.get('lp-admin-sec') || 'inicio';
  if (!SECTIONS.some((s) => s.id === current)) current = 'inicio';
  let cartaCat = 0;
  const openSet = new Set();
  const pending = (window.__lpPending = {}); // fotos nuevas aún sin publicar { ruta: dataURL }
  try { Object.assign(pending, JSON.parse(store.get('lp-pending') || '{}')); } catch (e) { /* nada */ }

  const norm = (o) => JSON.stringify(o);
  const isDirty = () => norm(D) !== PUB;
  const get = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), D);
  const setv = (p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], D)[last] = v; };

  /* ---------- Plantillas de elementos nuevos ---------- */
  const TPL = {
    cardItem: () => ({ name: 'Nuevo producto', size: '', desc: '', price: '0,00 €', chips: [], ill: 'assets/img/pavlova.webp', photo: '', photoOnly: false, star: false }),
    menuItem: () => ({ name: 'Nuevo producto', note: '', price: '0 €' }),
    group: () => ({ col: 1, title: 'Nuevo grupo', icon: 'flor', note: '', style: 'items', beans: null, items: [] }),
    catCards: () => ({ id: 'c' + Date.now().toString(36), name: 'Nueva categoría', icon: 'flor', layout: 'cards', intro: '', items: [TPL.cardItem()] }),
    catMenu: () => ({ id: 'c' + Date.now().toString(36), name: 'Nueva categoría', icon: 'flor', layout: 'menu', intro: '', feature: null, groups: [TPL.group()] }),
    feature: () => ({ img: 'assets/img/cafe.webp', title: 'Título destacado', text: 'Una frase sobre este grupo de productos.' }),
    beans: () => ({ title: 'Llévate algo a casa', chips: ['250 g · 12 €'] }),
    review: () => ({ name: 'Nombre', text: 'Escribe aquí la opinión.', big: false }),
    galImg: () => ({ img: 'assets/img/pavlova.webp', alt: '' }),
    step: () => ({ img: 'assets/img/pavlova-corte.webp', alt: '', icon: 'flor', title: 'Nuevo paso', text: '' }),
    product: () => ({ id: 'p-' + Date.now().toString(36), cat: 'pavlovas', name: 'Nuevo producto', size: '', img: 'assets/img/pavlova.webp', art: false, hidden: false, desc: '', allergens: [], variants: [{ label: '1 ud', price: 0 }], extra: null }),
    variant: () => ({ label: 'Formato', price: 0 }),
    extra: () => ({ label: 'Con extra', price: 1 }),
  };

  /* ---------- Constructores de campos (devuelven HTML) ---------- */
  const T = (path, label, o = {}) => {
    const v = get(path);
    const ctl = o.area
      ? `<textarea data-path="${path}" rows="${o.rows || 3}">${esc(v)}</textarea>`
      : `<input type="text" data-path="${path}" value="${esc(v)}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''}>`;
    const em = o.em ? `<button type="button" class="em-btn" data-act="em" aria-label="Poner en cursiva el texto seleccionado" title="Selecciona unas palabras y pulsa para ponerlas en cursiva">Cursiva</button>` : '';
    return `<label class="fld${o.wide ? ' wide' : ''}${o.em ? ' fld--em' : ''}"><span>${label}</span><div class="fld__row">${ctl}${em}</div>${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
  };
  const N = (path, label, o = {}) => `<label class="fld${o.wide ? ' wide' : ''}"><span>${label}</span><input type="number" step="${o.step || '0.05'}" min="0" data-path="${path}" data-kind="num" value="${esc(get(path))}"></label>`;
  const TM = (path, label) => `<label class="fld"><span>${label}</span><input type="time" data-path="${path}" value="${esc(get(path))}"></label>`;
  const LN = (path, label, o = {}) => `<label class="fld${o.wide ? ' wide' : ''}"><span>${label}</span><textarea data-path="${path}" data-kind="${o.paras ? 'paras' : 'lines'}" rows="${o.rows || 3}">${esc((get(path) || []).join(o.paras ? '\n\n' : '\n'))}</textarea>${o.hint ? `<small>${o.hint}</small>` : ''}</label>`;
  const SEL = (path, label, opts, o = {}) => `<label class="fld${o.wide ? ' wide' : ''}"><span>${label}</span><select data-path="${path}"${o.num ? ' data-kind="num"' : ''}>${opts.map(([v, l]) => `<option value="${esc(v)}"${String(get(path)) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const CK = (path, label, sub, o = {}) => `<label class="sw${o.wide ? ' wide' : ''}"><input type="checkbox" data-path="${path}"${o.inv ? ' data-inv' : ''}${(o.inv ? !get(path) : get(path)) ? ' checked' : ''}><i></i><span>${label}${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  const OBJ = (path, label, tpl, sub) => `<label class="sw"><input type="checkbox" data-obj="${path}" data-tpl="${tpl}"${get(path) ? ' checked' : ''}><i></i><span>${label}${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  const src = (p) => esc(pending[p] || p || '');
  const IM = (path, label, o = {}) => {
    const v = get(path);
    return `<div class="fld${o.wide ? ' wide' : ''}"><span class="fld__l">${label}</span><div class="img"><div class="img__t${v ? '' : ' is-empty'}"><img src="${src(v)}" alt=""></div><div class="img__b"><button type="button" class="btn btn--line btn--sm" data-act="pick" data-path="${path}">${v ? 'Cambiar foto' : 'Elegir foto'}</button>${o.optional && v ? `<button type="button" class="btn btn--ghost btn--sm" data-act="clearimg" data-path="${path}">Quitar foto</button>` : ''}</div></div></div>`;
  };
  const ibtn = (act, path, i, icon, title, extra = '') => `<button type="button" class="ib${act === 'del' ? ' ib--del' : ''}" data-act="${act}" data-path="${path}" data-i="${i}" title="${title}" aria-label="${title}"${extra}><svg aria-hidden="true"><use href="#${icon}"/></svg></button>`;
  const tools = (path, i, n, o = {}) => `<span class="it__tools">${ibtn('up', path, i, 'i-up', 'Subir', i === 0 ? ' disabled' : '')}${ibtn('down', path, i, 'i-down', 'Bajar', i === n - 1 ? ' disabled' : '')}${o.fixed ? '' : ibtn('del', path, i, 'i-trash', 'Quitar')}</span>`;
  const addBtn = (path, tpl, label) => `<button type="button" class="btn btn--line btn--sm" data-act="add" data-path="${path}" data-tpl="${tpl}"><svg aria-hidden="true"><use href="#i-plus"/></svg>${label}</button>`;
  // Elemento de lista desplegable
  const IT = (path, i, n, o) => {
    const key = `${path}.${i}`;
    return `<details class="it" data-key="${key}"${openSet.has(key) ? ' open' : ''}><summary>${o.thumb ? `<img class="it__thumb" src="${src(o.thumb)}" alt="">` : ''}<span class="it__title" data-live="${o.live || ''}">${esc(o.title)}</span>${o.small ? `<small class="it__small">${esc(o.small)}</small>` : ''}${tools(path, i, n, o)}</summary><div class="it__body">${o.body}</div></details>`;
  };
  const card = (title, help, body) => `<section class="card">${title ? `<h2>${title}</h2>` : ''}${help ? `<p class="help">${help}</p>` : ''}${body}</section>`;
  const priceHint = 'Escríbelo como quieras que se vea: 3,30 €';

  /* ---------- Contenido de cada sección ---------- */
  const VIEWS = {
    inicio() {
      return `${firstTip()}
      ${card('Portada', 'El titular grande y los botones de la primera pantalla. Para poner palabras en <em>cursiva</em> selecciónalas y pulsa «Cursiva».', `
        <div class="grid">
          ${T('hero.kicker', 'Frase pequeña de arriba', { wide: true })}
          ${T('hero.line1', 'Titular · línea 1', { em: true })}${T('hero.line2', 'Titular · línea 2', { em: true })}${T('hero.line3', 'Titular · línea 3', { em: true })}
          ${T('hero.more', 'Texto de «desliza»', { wide: true })}
          ${T('hero.cta1', 'Botón principal')}${T('hero.cta2', 'Botón de pedido online')}
          ${T('hero.tag', 'Etiqueta sobre el vídeo', { em: true, wide: true })}
        </div>`)}
      ${card('Frases de marca', 'Aparecen en el menú desplegable y al final de la web.', `
        <div class="grid">${T('site.quote', 'Frase del menú desplegable', { em: true, wide: true })}${T('site.footerTitle', 'Frase final de la web', { em: true, wide: true })}</div>`)}`;
    },
    nosotros() {
      const A = D.about;
      return card('Historia', 'El texto que acompaña a las fotos del local.', `
        <div class="grid">
          ${T('about.title', 'Título', { em: true, wide: true })}
          ${LN('about.paragraphs', 'Párrafos', { paras: true, rows: 10, wide: true, hint: 'Deja una línea en blanco entre un párrafo y otro.' })}
          ${T('about.link', 'Texto del enlace final')}
        </div>`)
        + card('Fotos del local', '', `
        <div class="grid">
          ${IM('about.photoMain', 'Foto grande')}${T('about.photoMainAlt', 'Descripción de la foto', { hint: 'Para personas que no pueden verla y para Google.' })}
          ${IM('about.photoInset', 'Foto pequeña')}${T('about.photoInsetAlt', 'Descripción de la foto')}
          ${T('about.photoInsetCaption', 'Pie de la foto pequeña', { wide: true })}
        </div>`)
        + card('Lo que dicen nuestras cajas', 'Tres fotos de tu packaging con su frase.', `
        ${T('about.notesLabel', 'Título de este bloque')}
        <div class="list" style="margin-top:14px">${A.notes.map((n, i) => IT('about.notes', i, A.notes.length, {
    fixed: true, thumb: n.img, title: n.text, live: `about.notes.${i}.text`,
    body: `<div class="grid">${IM(`about.notes.${i}.img`, 'Foto')}${T(`about.notes.${i}.alt`, 'Descripción de la foto')}${T(`about.notes.${i}.text`, 'Frase', { area: true, wide: true, rows: 2 })}</div>`,
  })).join('')}</div>`);
    },
    carta() {
      const C = D.carta;
      const cats = C.categories;
      if (cartaCat >= cats.length) cartaCat = Math.max(0, cats.length - 1);
      const c = cats[cartaCat];
      const base = `carta.categories.${cartaCat}`;
      const head = card('Encabezado y pie', '', `<div class="grid">
        ${T('carta.title', 'Título', { em: true })}${T('carta.intro', 'Frase de introducción')}
        ${T('carta.tip', 'Consejo del final', { em: true, wide: true })}
        ${T('carta.ctaOrder', 'Botón de pedido online')}${T('carta.ctaWhats', 'Botón de WhatsApp')}
        ${T('carta.allergens', 'Aviso de alérgenos', { area: true, wide: true, rows: 3 })}
      </div>`);
      const pills = `<div class="cats" role="group" aria-label="Categorías de la carta">${cats.map((x, i) => `<button type="button" data-act="cat" data-i="${i}" aria-pressed="${i === cartaCat}"><svg aria-hidden="true"><use href="#${esc(x.icon)}"/></svg>${esc(x.name)}</button>`).join('')}<button type="button" class="add" data-act="addcat" data-tpl="catCards">+ Categoría con fotos</button><button type="button" class="add" data-act="addcat" data-tpl="catMenu">+ Categoría en lista</button></div>`;
      if (!c) return head + pills;
      let body;
      if (c.layout === 'cards') {
        body = `<div class="list">${c.items.map((p, i) => IT(`${base}.items`, i, c.items.length, {
          thumb: p.ill, title: p.name, small: p.price, live: `${base}.items.${i}.name`,
          body: `<div class="grid">
            ${T(`${base}.items.${i}.name`, 'Nombre')}${T(`${base}.items.${i}.size`, 'Tamaño o detalle', { ph: 'Ej. 8 cm' })}
            ${T(`${base}.items.${i}.price`, 'Precio principal', { hint: priceHint })}
            ${T(`${base}.items.${i}.desc`, 'Descripción', { area: true, rows: 2, wide: true })}
            ${LN(`${base}.items.${i}.chips`, 'Otros formatos y precios', { wide: true, rows: 3, hint: 'Uno por línea. Ej.: x4 · 12,50 €' })}
            ${IM(`${base}.items.${i}.ill`, 'Foto o dibujo')}${IM(`${base}.items.${i}.photo`, 'Foto real al pasar el cursor', { optional: true })}
            ${CK(`${base}.items.${i}.photoOnly`, 'La imagen principal es una foto', 'Se ve a tarjeta completa, sin fondo de ilustración.')}
            ${CK(`${base}.items.${i}.star`, 'Producto destacado', 'Se resalta con un fondo de color.')}
          </div>`,
        })).join('')}</div>${addBtn(`${base}.items`, 'cardItem', 'Añadir producto')}`;
      } else {
        const f = c.feature;
        body = OBJ(`${base}.feature`, 'Mostrar una foto destacada a la izquierda', 'feature', 'Foto grande con título y texto junto a las listas.')
          + (f ? `<div class="grid" style="margin:14px 0">${IM(`${base}.feature.img`, 'Foto destacada')}${T(`${base}.feature.title`, 'Título')}${T(`${base}.feature.text`, 'Texto', { area: true, wide: true, rows: 2 })}</div>` : '')
          + `<div class="sub"><span class="fld__l">Grupos de productos</span></div><div class="list">${c.groups.map((g, gi) => IT(`${base}.groups`, gi, c.groups.length, {
            title: g.title, small: `${g.items.length} productos`, live: `${base}.groups.${gi}.title`,
            body: `<div class="grid">
              ${T(`${base}.groups.${gi}.title`, 'Título del grupo')}${SEL(`${base}.groups.${gi}.icon`, 'Dibujo', ICONS)}
              ${SEL(`${base}.groups.${gi}.col`, 'Columna', [[1, 'Izquierda'], [2, 'Derecha']], { num: true })}${SEL(`${base}.groups.${gi}.style`, 'Estilo', [['items', 'Lista con puntos y precio'], ['toppings', 'Lista de toppings']])}
              ${T(`${base}.groups.${gi}.note`, 'Frase bajo el título (opcional)', { wide: true })}
            </div>
            <div class="sub"><span class="fld__l">Productos · ${priceHint}</span>${g.items.map((it, k) => menuRow(`${base}.groups.${gi}.items`, k, g.items.length, it)).join('')}${addBtn(`${base}.groups.${gi}.items`, 'menuItem', 'Añadir producto')}</div>
            <div class="sub">${OBJ(`${base}.groups.${gi}.beans`, 'Añadir caja de oferta bajo la lista', 'beans', 'Ej. «Llévate el café a casa» con varios formatos.')}${g.beans ? `<div class="grid" style="margin-top:12px">${T(`${base}.groups.${gi}.beans.title`, 'Título')}${LN(`${base}.groups.${gi}.beans.chips`, 'Formatos y precios', { rows: 3, hint: 'Uno por línea' })}</div>` : ''}</div>`,
          })).join('')}</div>${addBtn(`${base}.groups`, 'group', 'Añadir grupo')}`;
      }
      const catCard = card(esc(c.name), '', `
        <div class="grid">${T(`${base}.name`, 'Nombre de la categoría')}${SEL(`${base}.icon`, 'Dibujo', ICONS)}
        ${T(`${base}.intro`, 'Frase de introducción (opcional)', { em: true, wide: true, area: true, rows: 2 })}</div>
        <div class="actions" style="margin:12px 0 18px">
          <button type="button" class="btn btn--line btn--sm" data-act="catleft"${cartaCat === 0 ? ' disabled' : ''}>← Mover antes</button>
          <button type="button" class="btn btn--line btn--sm" data-act="catright"${cartaCat === cats.length - 1 ? ' disabled' : ''}>Mover después →</button>
          <button type="button" class="btn btn--ghost btn--sm" data-act="delcat">Quitar esta categoría</button>
        </div>${body}`);
      return head + pills + catCard;
    },
    tienda() {
      const S = D.shop;
      return card('Textos de la tienda', 'Los precios de la tienda son independientes de los de la carta: si cambias uno, recuerda cambiar el otro.', `<div class="grid">
        ${T('shop.eyebrow', 'Frase pequeña')}${T('shop.title', 'Título', { em: true })}
        ${T('shop.lead', 'Texto de introducción', { area: true, rows: 2, wide: true, hint: '<b>{street}</b> se sustituye por tu dirección.' })}</div>`)
        + card('Productos', 'Despliega un producto para cambiar su precio, formatos o alérgenos. Los productos ocultos no salen en la tienda.', `<div class="list">${S.products.map((p, i) => IT('shop.products', i, S.products.length, {
          thumb: p.img, title: p.name, small: p.hidden ? 'oculto' : money(p.variants[0] && p.variants[0].price), live: `shop.products.${i}.name`,
          body: `<div class="grid">
            ${CK(`shop.products.${i}.hidden`, 'Mostrar en la tienda', 'Desactívalo si se ha agotado o no lo ofreces ahora.', { inv: true, wide: true })}
            ${T(`shop.products.${i}.name`, 'Nombre')}${T(`shop.products.${i}.size`, 'Tamaño o detalle', { ph: 'Ej. 8 cm' })}
            ${SEL(`shop.products.${i}.cat`, 'Categoría', [['pavlovas', 'Pavlovas'], ['cuplovas', 'CupLovas'], ['helado', 'Helado'], ['cafe', 'Café en grano']])}
            ${IM(`shop.products.${i}.img`, 'Foto o dibujo')}
            ${CK(`shop.products.${i}.art`, 'La imagen es un dibujo sin fondo', 'Desactívalo si es una foto normal.', { wide: true })}
            ${T(`shop.products.${i}.desc`, 'Descripción', { area: true, rows: 2, wide: true })}
            ${LN(`shop.products.${i}.allergens`, 'Alérgenos', { wide: true, rows: 3, hint: 'Uno por línea. Ej.: Huevo' })}
          </div>
          <div class="sub"><span class="fld__l">Formatos y precios (€)</span>${p.variants.map((v, k) => `<div class="mini"><input class="in" type="text" data-path="shop.products.${i}.variants.${k}.label" value="${esc(v.label)}" aria-label="Formato"><input class="in" type="number" step="0.05" min="0" data-kind="num" data-path="shop.products.${i}.variants.${k}.price" value="${esc(v.price)}" aria-label="Precio en euros"><span class="it__tools">${ibtn('up', `shop.products.${i}.variants`, k, 'i-up', 'Subir', k === 0 ? ' disabled' : '')}${ibtn('down', `shop.products.${i}.variants`, k, 'i-down', 'Bajar', k === p.variants.length - 1 ? ' disabled' : '')}${ibtn('del', `shop.products.${i}.variants`, k, 'i-trash', 'Quitar', p.variants.length < 2 ? ' disabled' : '')}</span></div>`).join('')}${addBtn(`shop.products.${i}.variants`, 'variant', 'Añadir formato')}</div>
          <div class="sub">${OBJ(`shop.products.${i}.extra`, 'Ofrece un extra opcional', 'extra', 'Ej. «Con helado Le Pavlove» por +1 €.')}${p.extra ? `<div class="grid" style="margin-top:12px">${T(`shop.products.${i}.extra.label`, 'Nombre del extra')}${N(`shop.products.${i}.extra.price`, 'Precio extra (€)')}</div>` : ''}</div>
          <div class="actions" style="margin-top:16px"><button type="button" class="btn btn--ghost btn--sm" data-act="del" data-path="shop.products" data-i="${i}">Quitar este producto de la tienda</button></div>`,
        })).join('')}</div>${addBtn('shop.products', 'product', 'Añadir producto')}`);
    },
    galeria() {
      const G = D.gallery;
      return card('Carrusel', 'Las fotos giran en 3D al bajar por la web. Lo ideal son entre 8 y 14.', `<div class="grid">${T('gallery.title', 'Título', { em: true })}${T('gallery.hint', 'Texto de ayuda')}</div>`)
        + card('Fotos', 'Pulsa una foto para cambiarla. Las flechas cambian el orden.', `<div class="list">${G.images.map((g, i) => `<div class="gi"><button type="button" class="img__t" data-act="pick" data-path="gallery.images.${i}.img" aria-label="Cambiar esta foto"><img src="${src(g.img)}" alt=""></button><input class="in" type="text" data-path="gallery.images.${i}.alt" value="${esc(g.alt)}" placeholder="Descripción de la foto" aria-label="Descripción de la foto">${tools('gallery.images', i, G.images.length)}</div>`).join('')}</div>${addBtn('gallery.images', 'galImg', 'Añadir foto')}`);
    },
    proceso() {
      const P = D.process;
      return card('Introducción', '', `<div class="grid">${T('process.title', 'Título', { em: true })}${T('process.hint', 'Texto de «desliza»')}${T('process.intro', 'Texto', { area: true, rows: 3, wide: true })}</div>`)
        + card('Pasos', 'Se numeran solos (01, 02, 03…).', `<div class="list">${P.steps.map((s, i) => IT('process.steps', i, P.steps.length, {
          thumb: s.img, title: s.title, live: `process.steps.${i}.title`,
          body: `<div class="grid">${T(`process.steps.${i}.title`, 'Título')}${SEL(`process.steps.${i}.icon`, 'Dibujo', ICONS)}${T(`process.steps.${i}.text`, 'Texto', { area: true, rows: 3, wide: true })}${IM(`process.steps.${i}.img`, 'Foto')}${T(`process.steps.${i}.alt`, 'Descripción de la foto')}</div>`,
        })).join('')}</div>${addBtn('process.steps', 'step', 'Añadir paso')}`)
        + card('Bloque final (Instagram)', '', `<div class="grid">${T('process.ctaTitle', 'Título', { em: true, wide: true })}${T('process.ctaText', 'Texto', { area: true, rows: 2, wide: true })}${T('process.ctaFollow', 'Botón de Instagram')}${T('process.ctaWrite', 'Botón de WhatsApp')}</div>`);
    },
    opiniones() {
      const R = D.reviews;
      return card('Puntuación', '', `<div class="grid">${T('reviews.title', 'Título', { em: true, wide: true })}${T('reviews.sub', 'Frase bajo el título', { wide: true })}${T('reviews.score', 'Nota', { hint: 'Ej. 5,0' })}${T('reviews.scoreText', 'Texto bajo la nota', { hint: 'Ej. 52 opiniones en Google' })}${T('reviews.button', 'Texto del botón')}${T('site.reviewsUrl', 'Enlace a tus opiniones de Google')}</div>`)
        + card('Opiniones', 'Una tarjeta «destacada» empieza una columna nueva y se ve más grande.', `<div class="list">${R.items.map((r, i) => IT('reviews.items', i, R.items.length, {
          title: r.name, small: r.big ? 'destacada' : '', live: `reviews.items.${i}.name`,
          body: `<div class="grid">${T(`reviews.items.${i}.name`, 'Nombre')}${CK(`reviews.items.${i}.big`, 'Tarjeta destacada', '')}${T(`reviews.items.${i}.text`, 'Opinión', { area: true, rows: 3, wide: true })}</div>`,
        })).join('')}</div>${addBtn('reviews.items', 'review', 'Añadir opinión')}`);
    },
    horario() {
      return card('Horario', 'Los días cerrados se muestran como «Cerrado». El texto del pie de página, el menú y la tienda se actualizan solos.', `
        ${D.hours.map((h, i) => `<div class="row${h.open ? '' : ' is-closed'}"><b>${esc(h.day)}</b>${CK(`hours.${i}.open`, 'Abierto', '')}<input class="in" type="time" data-path="hours.${i}.from" value="${esc(h.from)}" aria-label="Abre a las"><input class="in" type="time" data-path="hours.${i}.to" value="${esc(h.to)}" aria-label="Cierra a las"></div>`).join('')}
        <div class="actions" style="margin-top:14px"><button type="button" class="btn btn--line btn--sm" data-act="copyhours">Copiar el horario del primer día abierto a los demás</button></div>`)
        + card('Contacto y enlaces', '', `<div class="grid">
          ${T('site.phone', 'Teléfono que se muestra', { hint: 'Ej. 642 882 027' })}
          ${T('site.whatsapp', 'WhatsApp (para el enlace)', { mode: 'numeric', hint: 'Con prefijo y sin espacios: 34642882027' })}
          ${T('site.email', 'Correo electrónico')}${T('site.instagram', 'Usuario de Instagram', { hint: 'Sin la @' })}
          ${T('site.street', 'Dirección')}${T('site.city', 'Código postal y ciudad')}
          ${T('site.mapsUrl', 'Enlace de Google Maps', { wide: true })}
          ${T('site.waMessage', 'Mensaje que se escribe al pulsar WhatsApp', { wide: true })}
        </div>`)
        + card('Bloque «Visítanos»', '', `<div class="grid">${T('visit.title', 'Título', { em: true, wide: true })}</div>`);
    },
    aviso() {
      return card('Aviso para todos los clientes', 'Sale como una cápsula azul en la parte superior de la web (inicio y tienda). El cliente puede cerrarla. Úsalo para vacaciones, cambios de horario o novedades.', `
        ${CK('notice.on', 'Mostrar el aviso en la web', '')}
        <div class="grid" style="margin-top:14px">${T('notice.text', 'Mensaje', { area: true, rows: 3, wide: true, em: true, hint: 'Cuanto más corto, mejor.' })}</div>
        <div class="pills" aria-label="Ejemplos"><button type="button" class="pill" data-act="notice-tpl" data-t="Cerramos por vacaciones del *1 al 15 de agosto*. ¡Os esperamos a la vuelta!">Vacaciones</button><button type="button" class="pill" data-act="notice-tpl" data-t="Hoy cerramos *a las 20:00*.">Cierre antes</button><button type="button" class="pill" data-act="notice-tpl" data-t="Nueva pavlova de temporada: *pregunta en el mostrador.*">Novedad</button></div>
        <div class="demo-notice"><svg aria-hidden="true"><use href="#flor"/></svg><span id="noticeDemo">${rich(D.notice.text) || 'Así se verá tu aviso'}</span></div>`);
    },
  };

  function menuRow(path, k, n, it) {
    return `<div class="mini4"><input class="in" type="text" data-path="${path}.${k}.name" value="${esc(it.name)}" aria-label="Producto" placeholder="Producto"><input class="in" type="text" data-path="${path}.${k}.note" value="${esc(it.note)}" aria-label="Detalle" placeholder="Detalle (opcional)"><input class="in" type="text" data-path="${path}.${k}.price" value="${esc(it.price)}" aria-label="Precio" placeholder="Precio"><span class="it__tools">${ibtn('up', path, k, 'i-up', 'Subir', k === 0 ? ' disabled' : '')}${ibtn('down', path, k, 'i-down', 'Bajar', k === n - 1 ? ' disabled' : '')}${ibtn('pickitem', path, k, 'i-eye', it.img ? 'Cambiar foto al pasar el cursor' : 'Añadir foto al pasar el cursor')}${ibtn('del', path, k, 'i-trash', 'Quitar')}</span></div>`;
  }
  const money = (n) => (typeof n === 'number' ? n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '');
  function firstTip() {
    if (store.get('lp-tip') === '1') return '';
    return `<div class="tip" id="tip"><svg aria-hidden="true"><use href="#flor"/></svg><p><b>Cómo funciona:</b> cambia lo que quieras aquí y mira cómo queda en la vista previa. Cuando estés conforme, pulsa <b>Publicar cambios</b> arriba a la derecha. Hasta entonces nadie más ve nada.</p><button type="button" data-act="tip-x" aria-label="Cerrar">×</button></div>`;
  }

  /* ---------- Pintar el panel ---------- */
  const editor = $('#editor');
  const nav = $('#nav');
  function renderNav() {
    nav.innerHTML = SECTIONS.map((s) => `<button type="button" data-sec="${s.id}"${s.id === current ? ' aria-current="page"' : ''}><svg aria-hidden="true"><use href="#${s.icon}"/></svg>${s.label}${s.id === 'aviso' && D.notice.on ? '<span class="nav__dot" title="Aviso activo"></span>' : ''}</button>`).join('');
  }
  function renderEditor(keepScroll) {
    const top = keepScroll ? editor.scrollTop : 0;
    const s = SECTIONS.find((x) => x.id === current);
    $('#secTitle').textContent = s.label;
    $('#secDesc').textContent = s.desc;
    editor.innerHTML = VIEWS[current]();
    editor.scrollTop = top;
  }
  function refreshStatus() {
    const d = isDirty();
    const chip = $('#status');
    chip.textContent = d ? 'Cambios sin publicar' : 'Todo publicado';
    chip.classList.toggle('is-dirty', d);
    $('#btnDiscard').disabled = !d;
    $('#btnPublish').disabled = !d;
    const c = getCfg();
    const b = $('#btnConn');
    b.textContent = c ? 'GitHub conectado' : 'Conectar con GitHub';
    b.classList.toggle('is-on', !!c);
  }

  /* ---------- Cambios: borrador + vista previa ---------- */
  let saveT = 0;
  let prevT = 0;
  function changed(quick) {
    clearTimeout(saveT);
    saveT = setTimeout(() => store.set('lp-draft', JSON.stringify(D)), 200);
    refreshStatus();
    clearTimeout(prevT);
    prevT = setTimeout(reloadPreview, quick ? 150 : 1100);
  }
  const persistPending = () => { if (!store.set('lp-pending', JSON.stringify(pending))) { /* demasiado grande: se queda en memoria */ } };

  /* ---------- Vista previa ---------- */
  const pv = $('#pv');
  const frame = $('#frame');
  const stage = $('#stage');
  let device = 'desktop';
  const section = () => SECTIONS.find((x) => x.id === current);
  const pvUrl = () => `${section().page}?lp-preview${section().hash}`;
  function loadPreview() {
    store.set('lp-draft', JSON.stringify(D));
    $('#pvLoad').classList.remove('is-off');
    pv.src = pvUrl();
  }
  function reloadPreview() {
    store.set('lp-draft', JSON.stringify(D));
    $('#pvLoad').classList.remove('is-off');
    try { pv.contentWindow.location.reload(); } catch (e) { pv.src = pvUrl(); }
  }
  pv.addEventListener('load', () => setTimeout(() => $('#pvLoad').classList.add('is-off'), 700));
  function fit() {
    const W = stage.clientWidth - 32;
    const H = stage.clientHeight - 20;
    if (W < 50 || H < 50) return;
    let s; let fw; let fh; let iw; let ih;
    const dev = innerWidth <= 860 ? 'mobile' : device; // en el móvil solo tiene sentido la vista de móvil
    if (dev === 'mobile') {
      s = Math.min(1, (H - 16) / 844, (W - 16) / 390);
      iw = 390; ih = 844; fw = iw * s + 16; fh = ih * s + 16;
    } else {
      s = Math.min(1, W / 1280);
      fw = W; fh = H; iw = W / s; ih = H / s;
    }
    frame.classList.toggle('is-mobile', dev === 'mobile');
    frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
    pv.style.width = iw + 'px'; pv.style.height = ih + 'px'; pv.style.transform = `scale(${s})`;
  }
  new ResizeObserver(fit).observe(stage);
  $$('[data-dev]').forEach((b) => b.addEventListener('click', () => {
    device = b.dataset.dev;
    $$('[data-dev]').forEach((o) => o.setAttribute('aria-pressed', o === b));
    fit();
    reloadPreview();
  }));
  $('#btnReload').addEventListener('click', reloadPreview);
  $('#btnPreview').addEventListener('click', () => { $('#preview').classList.add('is-open'); fit(); reloadPreview(); });
  $('#btnClosePreview').addEventListener('click', () => $('#preview').classList.remove('is-open'));

  /* ---------- Navegación ---------- */
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]');
    if (!b) return;
    current = b.dataset.sec;
    store.set('lp-admin-sec', current);
    renderNav(); renderEditor();
    loadPreview();
  });

  /* ---------- Edición de campos (delegación) ---------- */
  function readValue(el) {
    const kind = el.dataset.kind;
    if (el.type === 'checkbox') return el.hasAttribute('data-inv') ? !el.checked : el.checked;
    if (kind === 'num' || (el.tagName === 'SELECT' && kind === 'num')) { const n = parseFloat(String(el.value).replace(',', '.')); return Number.isFinite(n) ? n : 0; }
    if (kind === 'lines') return el.value.split('\n').map((x) => x.trim()).filter(Boolean);
    if (kind === 'paras') return el.value.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    return el.value;
  }
  editor.addEventListener('input', (e) => {
    const el = e.target.closest('[data-path]');
    if (!el || el.type === 'checkbox') return;
    const v = readValue(el);
    setv(el.dataset.path, v);
    $$(`[data-live="${el.dataset.path}"]`, editor).forEach((t) => (t.textContent = v));
    if (el.dataset.path === 'notice.text') $('#noticeDemo').innerHTML = rich(v) || 'Así se verá tu aviso';
    changed();
  });
  editor.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('[data-path]')) {
      if (el.dataset.path === 'site.whatsapp') {
        let d = el.value.replace(/\D/g, '');
        if (/^[679]\d{8}$/.test(d)) d = '34' + d;
        el.value = d; setv('site.whatsapp', d);
      }
      if (el.type === 'checkbox' || el.tagName === 'SELECT') {
        setv(el.dataset.path, readValue(el));
        // Estos cambios modifican otras partes del formulario (nombres, filas apagadas…)
        if (/^hours\.\d+\.open$/.test(el.dataset.path) || /\.(icon|cat|hidden|col)$/.test(el.dataset.path) || el.dataset.path === 'notice.on') { renderNav(); renderEditor(true); }
      }
      changed(true);
    } else if (el.matches('[data-obj]')) {
      setv(el.dataset.obj, el.checked ? TPL[el.dataset.tpl]() : null);
      renderEditor(true); changed(true);
    }
  });
  editor.addEventListener('toggle', (e) => {
    const k = e.target.dataset && e.target.dataset.key;
    if (!k) return;
    if (e.target.open) openSet.add(k); else openSet.delete(k);
  }, true);

  /* ---------- Acciones (botones) ---------- */
  const swap = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; };
  editor.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const path = b.dataset.path;
    const i = +b.dataset.i;
    if (b.closest('summary')) e.preventDefault();
    const redo = () => { renderNav(); renderEditor(true); changed(true); };

    if (act === 'tip-x') { store.set('lp-tip', '1'); $('#tip').remove(); return; }
    if (act === 'em') {
      const inp = b.closest('label').querySelector('[data-path]');
      const { selectionStart: a, selectionEnd: z, value: v } = inp;
      if (a === z) { toast('Selecciona primero las palabras que quieres poner en cursiva.'); inp.focus(); return; }
      const sel = v.slice(a, z);
      inp.value = v.slice(0, a) + (/^\*[^*]+\*$/.test(sel) ? sel.slice(1, -1) : `*${sel}*`) + v.slice(z);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (act === 'notice-tpl') { setv('notice.text', b.dataset.t); setv('notice.on', true); redo(); return; }
    if (act === 'copyhours') {
      const f = D.hours.find((h) => h.open);
      if (!f) { toast('Marca primero algún día como abierto.'); return; }
      D.hours.forEach((h) => { h.from = f.from; h.to = f.to; });
      redo(); return;
    }
    if (act === 'cat') { cartaCat = i; renderEditor(); return; }
    if (act === 'addcat') {
      D.carta.categories.push(TPL[b.dataset.tpl]());
      cartaCat = D.carta.categories.length - 1;
      redo(); return;
    }
    if (act === 'delcat') {
      if (!(await ask('¿Quitar esta categoría?', `Se borrará «${D.carta.categories[cartaCat].name}» con todos sus productos.`, 'Quitar'))) return;
      D.carta.categories.splice(cartaCat, 1);
      cartaCat = Math.max(0, cartaCat - 1);
      redo(); return;
    }
    if (act === 'catleft' || act === 'catright') {
      const j = act === 'catleft' ? cartaCat - 1 : cartaCat + 1;
      swap(D.carta.categories, cartaCat, j); cartaCat = j;
      redo(); return;
    }
    if (act === 'pick' || act === 'pickitem') {
      if (act === 'pickitem') { const it = get(path)[i]; const p = await pickImage(it.img, true); if (p === undefined) return; if (p === null) { delete it.img; delete it.png; } else it.img = p; redo(); return; }
      const p = await pickImage(get(path));
      if (p) { setv(path, p); redo(); }
      return;
    }
    if (act === 'clearimg') { setv(path, ''); redo(); return; }
    const arr = path && get(path);
    if (act === 'add') { arr.push(TPL[b.dataset.tpl]()); openSet.add(`${path}.${arr.length - 1}`); redo(); return; }
    if (act === 'up' || act === 'down') {
      const j = act === 'up' ? i - 1 : i + 1;
      swap(arr, i, j);
      const k1 = `${path}.${i}`; const k2 = `${path}.${j}`;
      const a = openSet.has(k1); const c = openSet.has(k2);
      openSet.delete(k1); openSet.delete(k2);
      if (a) openSet.add(k2);
      if (c) openSet.add(k1);
      redo(); return;
    }
    if (act === 'del') {
      const label = arr[i] && (arr[i].name || arr[i].title || arr[i].label || arr[i].alt || 'este elemento');
      if (!(await ask('¿Quitar?', `Se quitará «${label}».`, 'Quitar'))) return;
      arr.splice(i, 1); openSet.clear(); redo();
    }
  });

  /* ---------- Fotos ---------- */
  const lib = () => [...new Set([...LIB, ...(D.uploads || [])])];
  function pickImage(current, allowNone) {
    return new Promise((resolve) => {
      const draw = (sel) => `<div class="gal">${lib().map((p) => `<button type="button" data-p="${esc(p)}" aria-pressed="${p === sel}" title="${esc(p.split('/').pop())}"><img src="${src(p)}" alt="${esc(p.split('/').pop())}" loading="lazy"></button>`).join('')}</div>`;
      openModal(`<h2>Elige una foto</h2><p>Pulsa una de las fotos de la web o sube una nueva (se ajusta sola para que cargue rápido).</p>
        <div id="galWrap">${draw(current)}</div>
        <input type="file" id="upl" accept="image/*" hidden>
        <div class="modal__foot">${allowNone && current ? '<button type="button" class="btn btn--ghost" data-x="none">Sin foto</button>' : ''}<button type="button" class="btn btn--line" data-x="up"><svg aria-hidden="true"><use href="#i-plus"/></svg>Subir foto nueva</button><button type="button" class="btn btn--royal" data-x="cancel">Cancelar</button></div>`, { wide: true, onClose: () => resolve(undefined) });
      const m = $('#modal');
      m.onclick = async (e) => {
        const g = e.target.closest('[data-p]');
        if (g) { closeModal(true); resolve(g.dataset.p); return; }
        const x = e.target.closest('[data-x]');
        if (!x) return;
        if (x.dataset.x === 'cancel') { closeModal(); return; }
        if (x.dataset.x === 'none') { closeModal(true); resolve(null); return; }
        if (x.dataset.x === 'up') $('#upl').click();
      };
      $('#upl').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const path = await addUpload(f);
          closeModal(true); resolve(path);
        } catch (err) { toast('No se pudo leer esa imagen. Prueba con un JPG o PNG.', 'err'); }
      });
    });
  }
  async function addUpload(file) {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    let url = cv.toDataURL('image/webp', 0.86);
    const ext = url.startsWith('data:image/webp') ? 'webp' : 'png';
    if (ext === 'png') url = cv.toDataURL('image/png');
    const slug = file.name.replace(/\.[^.]+$/, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'foto';
    const path = `assets/img/uploads/${slug}-${Date.now().toString(36)}.${ext}`;
    pending[path] = url;
    D.uploads = D.uploads || [];
    D.uploads.push(path);
    persistPending();
    return path;
  }

  /* ---------- Modales y avisos ---------- */
  const modal = $('#modal');
  let modalClose = null;
  function openModal(html, o = {}) {
    modal.innerHTML = `<div class="modal__box${o.wide ? ' modal__box--wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    modal.hidden = false;
    modal.onclick = null;
    modalClose = o.onClose || null;
    setTimeout(() => { const f = $('input, button', modal); f && f.focus(); }, 30);
  }
  function closeModal(silent) {
    modal.hidden = true; modal.innerHTML = '';
    const cb = modalClose; modalClose = null;
    if (!silent && cb) cb();
  }
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  function ask(title, msg, yes = 'Aceptar') {
    return new Promise((resolve) => {
      openModal(`<h2>${esc(title)}</h2><p>${esc(msg)}</p><div class="modal__foot"><button type="button" class="btn btn--line" data-r="0">Cancelar</button><button type="button" class="btn btn--royal" data-r="1">${esc(yes)}</button></div>`, { onClose: () => resolve(false) });
      modal.onclick = (e) => { const r = e.target.closest('[data-r]'); if (r) { closeModal(true); resolve(r.dataset.r === '1'); } };
    });
  }
  let toastT = 0;
  function toast(msg, kind) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast is-on${kind ? ' is-' + kind : ''}`;
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-on'), kind === 'err' ? 7000 : 4000);
  }

  /* ---------- GitHub ---------- */
  const getCfg = () => { try { const c = JSON.parse(store.get('lp-gh')); return c && c.token ? c : null; } catch (e) { return null; } };
  const api = (cfg, path, init = {}) => fetch(`https://api.github.com/repos/${cfg.repo.replace(/^\/+|\/+$/g, '')}${path ? '/' + path : ''}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${cfg.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(init.headers || {}) },
  });
  const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
  async function ghError(res) {
    if (res.status === 401) return 'GitHub no reconoce la clave (token). Puede haber caducado: vuelve a conectarla.';
    if (res.status === 403 || res.status === 404) return 'Esa clave no tiene permiso para modificar el repositorio. Debe tener permiso «Contents: Read and write».';
    let m = ''; try { m = (await res.json()).message; } catch (e) { /* nada */ }
    return `GitHub respondió ${res.status}${m ? ': ' + m : ''}`;
  }
  async function putFile(cfg, path, b64, message) {
    let sha;
    const r = await api(cfg, `contents/${encPath(path)}?ref=${cfg.branch}`);
    if (r.ok) sha = (await r.json()).sha;
    else if (r.status !== 404) throw new Error(await ghError(r));
    const res = await api(cfg, `contents/${encPath(path)}`, { method: 'PUT', body: JSON.stringify({ message, content: b64, branch: cfg.branch, ...(sha ? { sha } : {}) }) });
    if (!res.ok) throw new Error(await ghError(res));
  }
  const netMsg = (e) => (e instanceof TypeError ? 'No se pudo contactar con GitHub (api.github.com). Revisa tu conexión y desactiva bloqueadores de anuncios, VPN o filtros de red; prueba en una ventana de incógnito.' : (e && e.message) || 'No se pudo publicar. Inténtalo de nuevo.');
  const b64 = (str) => btoa(unescape(encodeURIComponent(str)));

  function connectModal() {
    const c = getCfg() || { token: '', repo: REPO, branch: BRANCH };
    openModal(`<h2>Conectar con <em>GitHub</em></h2>
      <p>Para publicar, el panel necesita una clave personal (se guarda solo en este navegador). Se crea una vez:</p>
      <ol>
        <li>Entra en <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>.</li>
        <li>En «Repository access» elige solo <b>${esc(c.repo)}</b>.</li>
        <li>En «Permissions → Repository» pon <b>Contents: Read and write</b>.</li>
        <li>Pulsa «Generate token» y pega la clave aquí.</li>
      </ol>
      <label class="fld"><span>Clave (token)</span><input type="password" id="ghTok" autocomplete="off" value="${esc(c.token)}" placeholder="github_pat_…"></label>
      <div class="grid" style="grid-template-columns:1fr 1fr"><label class="fld"><span>Repositorio</span><input type="text" id="ghRepo" value="${esc(c.repo)}"></label><label class="fld"><span>Rama</span><input type="text" id="ghBr" value="${esc(c.branch)}"></label></div>
      <div class="modal__foot">
        <button type="button" class="btn btn--ghost" data-r="dl">Descargar copia (content.json)</button>
        ${getCfg() ? '<button type="button" class="btn btn--ghost" data-r="off">Desconectar</button>' : ''}
        <button type="button" class="btn btn--line" data-r="x">Cerrar</button>
        <button type="button" class="btn btn--royal" data-r="ok">Probar y guardar</button>
      </div>`);
    modal.onclick = async (e) => {
      const r = e.target.closest('[data-r]');
      if (!r) return;
      if (r.dataset.r === 'x') { closeModal(); return; }
      if (r.dataset.r === 'off') { store.del('lp-gh'); closeModal(); refreshStatus(); toast('Desconectado.'); return; }
      if (r.dataset.r === 'dl') { download(); return; }
      const cfg = { token: $('#ghTok').value.replace(/[^A-Za-z0-9_]/g, ''), repo: $('#ghRepo').value.trim(), branch: $('#ghBr').value.trim() || 'main' };
      if (!cfg.token) { toast('Pega la clave primero.', 'err'); return; }
      r.classList.add('is-busy'); r.textContent = 'Comprobando…';
      try {
        const res = await api(cfg, '');
        if (!res.ok) throw new Error(await ghError(res));
        const j = await res.json();
        if (!j.permissions || !j.permissions.push) throw new Error('La clave llega al repositorio pero no puede escribir en él (falta «Contents: Read and write»).');
        store.set('lp-gh', JSON.stringify(cfg));
        closeModal(true); refreshStatus();
        toast('Conectado. Ya puedes publicar.', 'ok');
      } catch (err) { toast(netMsg(err), 'err'); r.classList.remove('is-busy'); r.textContent = 'Probar y guardar'; }
    };
  }
  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 2) + '\n'], { type: 'application/json' }));
    a.download = 'content.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  $('#btnConn').addEventListener('click', connectModal);

  async function publish() {
    const cfg = getCfg();
    if (!cfg) { connectModal(); toast('Primero conecta el panel con GitHub.'); return; }
    if (!(await ask('¿Publicar los cambios?', 'Los clientes los verán en la web en uno o dos minutos.', 'Publicar'))) return;
    const btn = $('#btnPublish');
    btn.classList.add('is-busy'); btn.lastChild.textContent = 'Publicando…';
    try {
      const used = new Set(JSON.stringify(D).match(/assets\/img\/uploads\/[^"]+/g) || []);
      const keep = (D.uploads || []).filter((p) => used.has(p) || !pending[p]);
      D.uploads = keep;
      for (const p of Object.keys(pending)) {
        if (!used.has(p)) continue;
        await putFile(cfg, p, pending[p].split(',')[1], 'Foto nueva desde el panel');
      }
      await putFile(cfg, 'data/content.json', b64(JSON.stringify(D, null, 2) + '\n'), 'Actualización de contenido desde el panel');
      Object.keys(pending).forEach((p) => { if (used.has(p) || !keep.includes(p)) delete pending[p]; });
      persistPending();
      PUB = norm(D);
      store.set('lp-draft', JSON.stringify(D));
      refreshStatus();
      toast('¡Publicado! La web se actualizará en 1-2 minutos.', 'ok');
    } catch (err) {
      toast(netMsg(err), 'err');
    } finally {
      btn.classList.remove('is-busy'); btn.lastChild.textContent = 'Publicar cambios';
      refreshStatus();
    }
  }
  $('#btnPublish').addEventListener('click', publish);
  $('#btnDiscard').addEventListener('click', async () => {
    if (!(await ask('¿Deshacer todos los cambios?', 'Volverás a lo que hay publicado ahora mismo en la web.', 'Deshacer'))) return;
    D = JSON.parse(PUB);
    store.del('lp-draft');
    Object.keys(pending).forEach((p) => delete pending[p]); store.del('lp-pending');
    cartaCat = 0; openSet.clear();
    renderNav(); renderEditor(); refreshStatus(); reloadPreview();
    toast('Cambios descartados.');
  });
  addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Arranque ---------- */
  fetch('data/content.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((pub) => {
      PUB = norm(pub);
      let draft = null;
      try { draft = JSON.parse(store.get('lp-draft')); } catch (e) { /* sin borrador */ }
      D = draft && norm(draft) !== PUB ? draft : pub;
      if (D === draft) setTimeout(() => toast('Hemos recuperado tus cambios sin publicar.'), 600);
      renderNav(); renderEditor(); refreshStatus();
      fit(); loadPreview();
    })
    .catch(() => {
      openModal('<h2>No se pudo cargar la web</h2><p>El panel necesita leer <b>data/content.json</b>. Ábrelo desde la dirección de la web (no como archivo suelto) y recarga la página.</p>');
    });
})();
