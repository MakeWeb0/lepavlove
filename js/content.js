/* =========================================================
   Le Pavlove — contenido editable
   Lee data/content.json (el que edita el panel /admin.html) y lo
   pinta sobre el HTML. Si el JSON no carga, la web se queda con el
   texto que ya trae el HTML. main.js y shop.js esperan a LP.ready.
   ========================================================= */
(() => {
  const q = (s, c = document) => c.querySelector(s);
  const qa = (s, c = document) => [...c.querySelectorAll(s)];
  const PREVIEW = /[?&]lp-preview\b/.test(location.search);

  /* ---------- Utilidades de texto ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // *texto* → cursiva (el remate de los titulares); salto de línea → <br>
  const rich = (s) => esc(s).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  const icon = (n) => `<svg aria-hidden="true"><use href="#${esc(n || 'flor')}"/></svg>`;
  const set = (sel, html, ctx) => { const el = q(sel, ctx); if (el) el.innerHTML = html; return el; };
  const text = (sel, t, ctx) => { const el = q(sel, ctx); if (el) el.textContent = t; return el; };

  /* ---------- Horario: textos derivados ---------- */
  const SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const hoursRuns = (hours) => {
    const runs = [];
    (hours || []).forEach((h, i) => {
      if (!h.open) return;
      const last = runs[runs.length - 1];
      if (last && last.end === i - 1 && last.from === h.from && last.to === h.to) last.end = i;
      else runs.push({ start: i, end: i, from: h.from, to: h.to });
    });
    return runs;
  };
  const runLabel = (r, hours, short) => {
    const nm = (i) => (short ? SHORT[i] : hours[i].day);
    const lower = (s, first) => (first ? s : s.toLowerCase());
    return (first) => {
      const a = lower(nm(r.start), first);
      if (r.start === r.end) return a;
      const b = nm(r.end).toLowerCase();
      return r.end === r.start + 1 ? `${a} y ${b}` : `${a} a ${b}`;
    };
  };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const joinY = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`);
  const hoursInfo = (hours, short) => {
    const runs = hoursRuns(hours);
    if (!runs.length) return { closed: true, days: 'Cerrado temporalmente', time: '', parts: [] };
    const same = runs.every((r) => r.from === runs[0].from && r.to === runs[0].to);
    const labels = runs.map((r, i) => runLabel(r, hours, short)(i === 0));
    return { closed: false, same, days: joinY(labels), time: same ? `${runs[0].from} – ${runs[0].to}` : '', parts: runs.map((r, i) => ({ label: labels[i], from: r.from, to: r.to })) };
  };
  const townOf = (city) => String(city || '').replace(/^\d+\s*/, '').split(',')[0].trim();

  const LP = (window.LP = { data: null, preview: PREVIEW, esc, rich, hoursInfo, townOf });

  /* ---------- Pintar ---------- */
  function applyAll(D) {
    const S = D.site || {};
    const H = D.hours || [];
    const full = hoursInfo(H, false);
    const short = hoursInfo(H, true);

    /* Aviso */
    qa('.notice').forEach((n) => n.remove());
    if (D.notice && D.notice.on && D.notice.text) {
      let dismissed = false;
      try { dismissed = sessionStorage.getItem('lp-notice') === D.notice.text; } catch (e) { /* sin storage */ }
      if (!dismissed || PREVIEW) {
        const n = document.createElement('div');
        n.className = 'notice';
        n.setAttribute('role', 'status');
        n.innerHTML = `<svg class="notice__flor" aria-hidden="true"><use href="#flor"/></svg><p>${rich(D.notice.text)}</p><button type="button" class="notice__x" aria-label="Cerrar aviso">×</button>`;
        n.querySelector('.notice__x').addEventListener('click', () => {
          try { sessionStorage.setItem('lp-notice', D.notice.text); } catch (e) { /* sin storage */ }
          n.classList.add('is-out');
          setTimeout(() => n.remove(), 400);
        });
        document.body.appendChild(n);
      }
    }

    /* Menú (hamburguesa) */
    set('.menu__quote', rich(S.quote));
    const hoursShort = short.closed ? short.days : short.same ? `${short.days} · ${short.time.replace(/ – /, '–')}` : short.parts.map((p) => `${cap(p.label)} ${p.from}–${p.to}`).join(' · ');
    const town = townOf(S.city);
    set('.menu__foot', `
        <p><span class="eyebrow">Visítanos</span><a href="${esc(S.mapsUrl)}" target="_blank" rel="noopener">${esc(S.street)} · ${esc(town)}</a></p>
        <p><span class="eyebrow">Horario</span>${esc(hoursShort)}</p>
        <p><span class="eyebrow">Pedidos</span><a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener">WhatsApp ${esc(S.phone)}</a></p>
        <p><span class="eyebrow">Síguenos</span><a href="https://www.instagram.com/${esc(S.instagram)}" target="_blank" rel="noopener">@${esc(S.instagram)}</a></p>`);

    /* Inicio */
    const HE = D.hero;
    if (HE && q('.hero')) {
      set('.hero__kicker', esc(HE.kicker));
      const ln = qa('.hero__title .line > span');
      [HE.line1, HE.line2, HE.line3].forEach((t, i) => ln[i] && (ln[i].innerHTML = rich(t)));
      set('.hero__more', `${esc(HE.more)} <span aria-hidden="true">›</span>`);
      const hb = qa('.hero__ctas .btn__label');
      hb[0] && (hb[0].textContent = HE.cta1);
      hb[1] && (hb[1].textContent = HE.cta2);
      set('.hero__tag', rich(HE.tag));
    }

    /* Sobre nosotros */
    const A = D.about;
    if (A && q('.about')) {
      set('.about__text .eyebrow', esc(A.eyebrow));
      set('.about__text h2', rich(A.title));
      qa('.about__text p.reveal').forEach((p) => p.remove());
      const more = q('.about__text .more');
      (A.paragraphs || []).forEach((t) => more.insertAdjacentHTML('beforebegin', `<p class="reveal">${rich(t)}</p>`));
      more.innerHTML = `${esc(A.link)} <span aria-hidden="true">›</span>`;
      const im = q('.about__main img'); if (im) { im.src = A.photoMain; im.alt = A.photoMainAlt || ''; }
      const ii = q('.about__inset img'); if (ii) { ii.src = A.photoInset; ii.alt = A.photoInsetAlt || ''; }
      text('.about__inset figcaption', A.photoInsetCaption || '');
      text('.notes__label', A.notesLabel || '');
      set('.notes__row', (A.notes || []).map((n) => `<figure class="note"><div class="note__img"><img src="${esc(n.img)}" alt="${esc(n.alt)}" loading="lazy" decoding="async"></div><figcaption>${rich(n.text)}</figcaption></figure>`).join(''));
    }

    /* La carta */
    const C = D.carta;
    if (C && q('#carta')) {
      set('.carta__head .eyebrow', esc(C.eyebrow));
      set('.carta__head .title', rich(C.title));
      const hints = qa('.carta__intro > span').map((s) => s.outerHTML).join('');
      set('.carta__intro', `${esc(C.intro)} ${hints}`);
      const cats = C.categories || [];
      set('.tabs', `<span class="tabs__pill" aria-hidden="true"></span>` + cats.map((c, i) =>
        `<button class="tab${i ? '' : ' is-active'}" role="tab" id="t-${esc(c.id)}" aria-selected="${i === 0}" aria-controls="p-${esc(c.id)}"${i ? ' tabindex="-1"' : ''} type="button">${icon(c.icon)}${esc(c.name)}</button>`).join(''));
      set('.panels', cats.map((c, i) => panelHtml(c, i)).join(''));
      set('.carta__tip', rich(C.tip));
      const cb = qa('.carta__ctas .btn__label');
      cb[0] && (cb[0].textContent = C.ctaOrder);
      cb[1] && (cb[1].textContent = C.ctaWhats);
      text('.allergens', C.allergens || '');
    }

    /* Galería */
    const G = D.gallery;
    if (G && q('#ring')) {
      set('.gallery h2', rich(G.title));
      set('.gallery__hint', `<span></span>${esc(G.hint)}<span></span>`);
      set('#ring', (G.images || []).map((g) => `<figure class="card"><img src="${esc(g.img)}" alt="${esc(g.alt)}" draggable="false" loading="lazy" decoding="async"></figure>`).join(''));
    }

    /* Cómo trabajamos */
    const P = D.process;
    if (P && q('.process')) {
      set('.process__top .eyebrow', esc(P.eyebrow));
      set('.step--intro h2', rich(P.title));
      set('.step--intro p:not(.more)', esc(P.intro));
      set('.step--intro .more', `${esc(P.hint)} <span aria-hidden="true">›</span>`);
      qa('.step:not(.step--intro):not(.step--cta)').forEach((s) => s.remove());
      const cta = q('.step--cta');
      (P.steps || []).forEach((s, i) => cta.insertAdjacentHTML('beforebegin',
        `<article class="step"><div class="step__img"><img src="${esc(s.img)}" alt="${esc(s.alt)}" loading="lazy" decoding="async"></div><div class="step__meta"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><svg class="step__icon" aria-hidden="true"><use href="#${esc(s.icon || 'flor')}"/></svg></div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`));
      text('.step--cta .eyebrow', `Instagram · @${S.instagram}`);
      set('.step--cta h3', rich(P.ctaTitle));
      text('.step--cta > p:not(.eyebrow)', P.ctaText);
      const sb = qa('.step__ctas .btn__label');
      sb[0] && (sb[0].textContent = P.ctaFollow);
      sb[1] && (sb[1].textContent = P.ctaWrite);
    }

    /* Reseñas */
    const R = D.reviews;
    if (R && q('.reviews')) {
      set('.reviews .eyebrow', `<svg class="eyebrow__flor" aria-hidden="true"><use href="#flor"/></svg> ${esc(R.eyebrow)}`);
      set('.reviews .title', rich(R.title));
      text('.reviews__sub', R.sub);
      const cnt = q('.score__n .count');
      if (cnt) {
        const num = parseFloat(String(R.score).replace(',', '.')) || 0;
        const dec = (String(R.score).split(/[,.]/)[1] || '').length;
        cnt.dataset.to = num; cnt.dataset.dec = dec; cnt.textContent = R.score;
      }
      text('.score__l', R.scoreText);
      text('.score .btn__label', R.button);
      const flor5 = Array(5).fill('<svg aria-hidden="true"><use href="#flor"/></svg>').join('');
      const ROT = [-2.2, 1.6, 1.8, -2, 1.1, -1.6, -1.4, 2.2, -2.4];
      const items = R.items || [];
      const cols = [[], [], []];
      const anyBig = items.some((r) => r.big);
      let c = -1;
      items.forEach((r, i) => {
        if (anyBig) { if (r.big) c = Math.min(c + 1, 2); cols[Math.max(c, 0)].push([r, i]); } else cols[i % 3].push([r, i]);
      });
      const speeds = [-6, 6, -3];
      set('.table', cols.map((col, ci) => (col.length ? `<div class="table__col" data-speed="${speeds[ci]}">${col.map(([r, i]) =>
        `<figure class="napkin${r.big ? ' napkin--big' : ''}" style="--r:${ROT[i % ROT.length]}deg"><span class="napkin__stars" role="img" aria-label="5 de 5">${flor5}</span><blockquote>“${esc(r.text)}”</blockquote><figcaption><b>${esc(r.name)}</b><span>Opinión en Google</span></figcaption><img class="napkin__logo" src="assets/img/logo-royal.png" alt="" loading="lazy" decoding="async"></figure>`).join('')}</div>` : '')).join(''));
    }

    /* Visítanos + horario */
    if (q('#visit-title')) set('#visit-title', rich(D.visit && D.visit.title));
    const dl = q('.hours');
    if (dl) set('.hours', H.map((h) => `<div data-open="${h.open ? esc(h.from) : ''}" data-close="${h.open ? esc(h.to) : ''}"><dt>${esc(h.day)}</dt><dd>${h.open ? `${esc(h.from)} – ${esc(h.to)}` : 'Cerrado'}</dd></div>`).join(''));
    set('.visit__addr', `<a href="${esc(S.mapsUrl)}" target="_blank" rel="noopener" class="ulink">${esc(S.street)} · ${esc(S.city)}</a><br><a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener" class="ulink">WhatsApp ${esc(S.phone)}</a> · <a href="mailto:${esc(S.email)}" class="ulink">${esc(S.email)}</a>`);

    /* Pie de página */
    set('.footer__title', rich(S.footerTitle));
    const fHours = full.closed ? full.days : full.same ? `${esc(full.days)}<br>${esc(full.time)}` : full.parts.map((p) => `${esc(cap(p.label))} ${esc(p.from)} – ${esc(p.to)}`).join('<br>');
    set('.footer__grid', `
        <div><span class="eyebrow">Dirección</span><a href="${esc(S.mapsUrl)}" target="_blank" rel="noopener" class="ulink">${esc(S.street)}<br>${esc(S.city)}</a></div>
        <div><span class="eyebrow">Horario</span>${fHours}</div>
        <div><span class="eyebrow">Pedidos</span><a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener" class="ulink">WhatsApp ${esc(S.phone)}</a><br><a href="mailto:${esc(S.email)}" class="ulink">${esc(S.email)}</a></div>
        <div><span class="eyebrow">Síguenos</span><a href="https://www.instagram.com/${esc(S.instagram)}" target="_blank" rel="noopener" class="ulink">Instagram @${esc(S.instagram)}</a></div>`);

    /* Enlaces sueltos (botones, WhatsApp flotante…) */
    qa('a[href*="wa.me/"]').forEach((a) => {
      if (a.id === 'waRetry') return;
      const h = a.getAttribute('href');
      a.setAttribute('href', `https://wa.me/${S.whatsapp}` + (h.includes('?') ? `?text=${encodeURIComponent(S.waMessage || '')}` : ''));
    });
    qa('a[href*="share.google"]').forEach((a) => a.setAttribute('href', S.reviewsUrl));

    /* Tienda */
    const SH = D.shop;
    if (SH && q('.shop__head')) {
      set('.shop__head .eyebrow', esc(SH.eyebrow));
      set('.shop__head .title', rich(SH.title));
      text('.shop__lead', String(SH.lead || '').replace('{street}', S.street));
      const card = q('.info-card p');
      if (card) {
        const when = full.closed ? 'Ahora mismo no hay recogida disponible' : full.same ? `${full.days}, de ${full.parts[0].from} a ${full.parts[0].to}` : full.parts.map((p) => `${p.label}, de ${p.from} a ${p.to}`).join('; ');
        card.textContent = `${when}${full.closed ? '' : `, en ${S.street} (${town})`}.`;
      }
      const cats = new Set((SH.products || []).filter((p) => !p.hidden).map((p) => p.cat));
      qa('.filter[data-filter]').forEach((f) => { if (f.dataset.filter !== 'all') f.hidden = !cats.has(f.dataset.filter); });
    }

    /* Datos estructurados para Google */
    const ld = q('script[type="application/ld+json"]');
    if (ld) {
      try {
        const j = JSON.parse(ld.textContent);
        j.telephone = `+34 ${S.phone}`;
        j.email = S.email;
        j.address.streetAddress = S.street;
        j.address.postalCode = (S.city.match(/\d{5}/) || [j.address.postalCode])[0];
        j.address.addressLocality = town;
        j.sameAs = [`https://www.instagram.com/${S.instagram}`];
        const EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        j.openingHoursSpecification = hoursRuns(H).map((r) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: EN.slice(r.start, r.end + 1), opens: r.from, closes: r.to }));
        ld.textContent = JSON.stringify(j, null, 2);
      } catch (e) { /* se queda el JSON-LD original */ }
    }
  }

  /* ---------- Carta: HTML de cada pestaña ---------- */
  const item = (it) => `<li class="item"${it.img ? ` data-img="${esc(it.img)}"${it.png ? ' data-png' : ''}` : ''}><div class="item__row"><span class="item__name">${esc(it.name)}${it.note ? ` <small>${esc(it.note)}</small>` : ''}</span><span class="item__line"></span><span class="item__price">${esc(it.price)}</span></div></li>`;
  const group = (g) => `<h3 class="group">${icon(g.icon)}${esc(g.title)}</h3>`
    + (g.note ? `<p class="extras__note">${esc(g.note)}</p>` : '')
    + (g.style === 'toppings'
      ? `<ul class="toppings">${(g.items || []).map((i) => `<li><span>${esc(i.name)}</span><b>${esc(i.price)}</b></li>`).join('')}</ul>`
      : `<ul class="items">${(g.items || []).map(item).join('')}</ul>`)
    + (g.beans ? `<div class="beans"><p class="beans__title">${esc(g.beans.title)}</p><p class="chips chips--solid">${(g.beans.chips || []).map((c) => `<span>${esc(c)}</span>`).join('')}</p></div>` : '');
  function panelHtml(c, i) {
    const open = `<div class="panel${i ? '' : ' is-active'}" role="tabpanel" id="p-${esc(c.id)}" aria-labelledby="t-${esc(c.id)}"${i ? ' hidden' : ''}>`;
    if (c.layout === 'cards') {
      return open + (c.intro ? `<p class="panel__desc">${rich(c.intro)}</p>` : '') + `<div class="prods">${(c.items || []).map((p) => `
        <article class="prod${p.star ? ' prod--star' : ''}"${p.photo ? ' data-photo' : ''}>
          <div class="prod__art${p.photoOnly ? ' prod__art--photo' : ''}">
            <img class="prod__ill" src="${esc(p.ill)}" alt="${esc(p.photoOnly ? 'Foto real: ' : 'Ilustración de ')}${esc(p.name)}" loading="lazy" decoding="async">
            ${p.photo ? `<img class="prod__photo" src="${esc(p.photo)}" alt="Foto real: ${esc(p.name)}" loading="lazy" decoding="async"><button class="prod__flip" type="button" aria-pressed="false">Ver foto</button>` : ''}
          </div>
          <div class="prod__body">
            <h3 class="prod__name">${esc(p.name)}${p.size ? ` <small>${esc(p.size)}</small>` : ''}</h3>
            ${p.desc ? `<p class="prod__desc">${esc(p.desc)}</p>` : ''}
            <p class="prod__price">${esc(p.price)}</p>
            ${(p.chips || []).length ? `<p class="chips">${p.chips.map((x) => `<span>${esc(x)}</span>`).join('')}</p>` : ''}
          </div>
        </article>`).join('')}</div></div>`;
    }
    const cols = [1, 2].map((n) => (c.groups || []).filter((g) => (g.col || 1) === n)).filter((a) => a.length)
      .map((a) => `<div>${a.map(group).join('')}</div>`).join('');
    const f = c.feature;
    return open + (c.intro ? `<p class="panel__desc">${rich(c.intro)}</p>` : '') + (f
      ? `<div class="drinks"><figure class="feature"><div class="feature__img"><img src="${esc(f.img)}" alt="${esc(f.title)}" loading="lazy" decoding="async"></div><figcaption><span class="feature__title">${esc(f.title)}</span><span class="feature__text">${esc(f.text)}</span></figcaption></figure><div class="drinks__lists">${cols}</div></div>`
      : `<div class="extras">${cols}</div>`) + '</div>';
  }

  /* ---------- Carga ---------- */
  const load = () => {
    if (PREVIEW) {
      try { const d = JSON.parse(localStorage.getItem('lp-draft')); if (d) return Promise.resolve(d); } catch (e) { /* sin borrador */ }
    }
    return fetch('data/content.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  };

  LP.ready = load().then((D) => {
    LP.data = D;
    if (PREVIEW) {
      try { sessionStorage.setItem('lp-intro', '1'); } catch (e) { /* sin storage */ }
    }
    applyAll(D);
    if (PREVIEW) previewTweaks();
  }).catch(() => { /* la web se queda con el HTML original */ })
    .then(() => document.documentElement.classList.remove('lp-wait'));
  window.LP_READY = LP.ready;

  /* ---------- Modo vista previa (dentro del panel) ---------- */
  function previewTweaks() {
    // Los enlaces internos siguen en modo vista previa
    qa('a[href]').forEach((a) => {
      const h = a.getAttribute('href');
      if (/^(index|tienda)\.html/.test(h)) a.setAttribute('href', h.replace(/^([^#]*)/, (m) => m + (m.includes('?') ? '&' : '?') + 'lp-preview'));
    });
    // Fotos recién subidas que aún no están publicadas
    let pending = {};
    try { pending = window.parent.__lpPending || {}; } catch (e) { /* sin padre */ }
    const fix = (img) => { const s = img.getAttribute('src'); if (s && pending[s]) img.src = pending[s]; };
    const sweep = () => qa('img').forEach(fix);
    sweep();
    new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true });
  }
})();
