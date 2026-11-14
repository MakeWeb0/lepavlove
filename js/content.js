(() => {
  const q = (s, c = document) => c.querySelector(s);
  const qa = (s, c = document) => [...c.querySelectorAll(s)];
  const PREVIEW = /[?&]lp-preview\b/.test(location.search);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = (s) => esc(s).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  const icon = (n) => `<svg aria-hidden="true"><use href="#${esc(n || 'flor')}"/></svg>`;
  const SIZED = /^assets\/img\/(p|p\/galeria|uploads)\/[^/]+\.webp$/;
  const srcsetOf = (p) => { if (!SIZED.test(p || '')) return ''; const b = p.slice(0, -5); return `${b}-480.webp 480w, ${b}-960.webp 960w, ${p} 1600w`; };
  const small = (p) => (SIZED.test(p || '') ? p.slice(0, -5) + '-480.webp' : p);
  const img = (p, alt, sizes, cls = '', extra = '') => {
    const ss = srcsetOf(p);
    return `<img${cls ? ` class="${cls}"` : ''} src="${esc(ss ? small(p).replace('-480.webp', '-960.webp') : p)}"${ss ? ` srcset="${ss}" sizes="${sizes}"` : ''} alt="${esc(alt)}" loading="lazy" decoding="async"${extra}>`;
  };
  const setImg = (el, p, alt, sizes) => {
    if (!el || !p) return;
    const ss = srcsetOf(p);
    el.src = ss ? p.slice(0, -5) + '-960.webp' : p;
    if (ss) { el.srcset = ss; el.sizes = sizes; } else { el.removeAttribute('srcset'); el.removeAttribute('sizes'); }
    if (alt != null) el.alt = alt;
  };
  const set = (sel, html, ctx) => { const el = q(sel, ctx); if (el) el.innerHTML = html; return el; };
  const text = (sel, t, ctx) => { const el = q(sel, ctx); if (el) el.textContent = t; return el; };

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

  const LP = (window.LP = { data: null, preview: PREVIEW, esc, rich, hoursInfo, townOf, img, small, srcsetOf });

  function applyAll(D) {
    const S = D.site || {};
    const H = D.hours || [];
    const full = hoursInfo(H, false);
    const short = hoursInfo(H, true);

    qa('.notice').forEach((n) => n.remove());
    if (D.notice && D.notice.on && D.notice.text) {
      let dismissed = false;
      try { dismissed = sessionStorage.getItem('lp-notice') === D.notice.text; } catch (e) { }
      if (!dismissed || PREVIEW) {
        const n = document.createElement('div');
        n.className = 'notice';
        n.setAttribute('role', 'status');
        n.innerHTML = `<svg class="notice__flor" aria-hidden="true"><use href="#flor"/></svg><p>${rich(D.notice.text)}</p><button type="button" class="notice__x" aria-label="Cerrar aviso">×</button>`;
        n.querySelector('.notice__x').addEventListener('click', () => {
          try { sessionStorage.setItem('lp-notice', D.notice.text); } catch (e) { }
          n.classList.add('is-out');
          setTimeout(() => n.remove(), 400);
        });
        document.body.appendChild(n);
      }
    }

    set('.menu__quote', rich(S.quote));
    const hoursShort = short.closed ? short.days : short.same ? `${short.days} · ${short.time.replace(/ – /, '–')}` : short.parts.map((p) => `${cap(p.label)} ${p.from}–${p.to}`).join(' · ');
    const town = townOf(S.city);
    set('.menu__foot', `
        <p><span class="eyebrow">Visítanos</span><a href="${esc(S.mapsUrl)}" target="_blank" rel="noopener">${esc(S.street)} · ${esc(town)}</a></p>
        <p><span class="eyebrow">Horario</span>${esc(hoursShort)}</p>
        <p><span class="eyebrow">Pedidos</span><a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener">WhatsApp ${esc(S.phone)}</a></p>
        <p><span class="eyebrow">Síguenos</span><a href="https://www.instagram.com/${esc(S.instagram)}" target="_blank" rel="noopener">@${esc(S.instagram)}</a></p>`);

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

    const A = D.about;
    if (A && q('.about')) {
      set('.about__text .eyebrow', esc(A.eyebrow));
      set('.about__text h2', rich(A.title));
      qa('.about__text p.reveal').forEach((p) => p.remove());
      const more = q('.about__text .more');
      (A.paragraphs || []).forEach((t) => more.insertAdjacentHTML('beforebegin', `<p class="reveal">${rich(t)}</p>`));
      more.innerHTML = `${esc(A.link)} <span aria-hidden="true">›</span>`;
      setImg(q('.about__main img'), A.photoMain, A.photoMainAlt || '', '(max-width: 1024px) 100vw, 50vw');
      setImg(q('.about__inset img'), A.photoInset, A.photoInsetAlt || '', '(max-width: 700px) 48vw, 22vw');
      text('.about__inset figcaption', A.photoInsetCaption || '');
    }

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
      const gl = q('.carta__glovo');
      if (gl) {
        gl.hidden = !S.glovoUrl;
        if (S.glovoUrl) { gl.href = S.glovoUrl; q('.btn__label', gl).textContent = C.ctaGlovo || 'Pídelo en Glovo'; }
      }
      text('.allergens', C.allergens || '');
    }

    const G = D.gallery;
    if (G && q('#ring')) {
      set('.gallery h2', rich(G.title));
      set('.gallery__hint', `<span></span>${esc(G.hint)}<span></span>`);
      set('#ring', (G.images || []).map((g) => `<figure class="card">${img(g.img, g.alt, '280px', '', ' draggable="false"')}</figure>`).join(''));
    }

    const P = D.process;
    if (P && q('.process')) {
      set('.process__top .eyebrow', esc(P.eyebrow));
      set('.step--intro h2', rich(P.title));
      set('.step--intro p:not(.more)', esc(P.intro));
      set('.step--intro .more', `${esc(P.hint)} <span aria-hidden="true">›</span>`);
      qa('.step:not(.step--intro):not(.step--cta)').forEach((s) => s.remove());
      const cta = q('.step--cta');
      (P.steps || []).forEach((s, i) => cta.insertAdjacentHTML('beforebegin',
        `<article class="step"><div class="step__img">${img(s.img, s.alt, '(max-width: 900px) 80vw, 380px')}</div><div class="step__meta"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><svg class="step__icon" aria-hidden="true"><use href="#${esc(s.icon || 'flor')}"/></svg></div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`));
      text('.step--cta .eyebrow', `Instagram · @${S.instagram}`);
      set('.step--cta h3', rich(P.ctaTitle));
      text('.step--cta > p:not(.eyebrow)', P.ctaText);
      const sb = qa('.step__ctas .btn__label');
      sb[0] && (sb[0].textContent = P.ctaFollow);
      sb[1] && (sb[1].textContent = P.ctaWrite);
    }

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
        `<figure class="napkin${r.big ? ' napkin--big' : ''}" style="--r:${ROT[i % ROT.length]}deg"><span class="napkin__stars" role="img" aria-label="5 de 5">${flor5}</span><blockquote>“${esc(r.text)}”</blockquote><figcaption><b>${esc(r.name)}</b><span>Opinión en Google</span></figcaption><svg class="napkin__logo" aria-hidden="true"><use href="#logo"/></svg></figure>`).join('')}</div>` : '')).join(''));
    }

    if (q('#visit-title')) set('#visit-title', rich(D.visit && D.visit.title));
    const dl = q('.hours');
    if (dl) set('.hours', H.map((h) => `<div data-open="${h.open ? esc(h.from) : ''}" data-close="${h.open ? esc(h.to) : ''}"><dt>${esc(h.day)}</dt><dd>${h.open ? `${esc(h.from)} – ${esc(h.to)}` : 'Cerrado'}</dd></div>`).join(''));
    set('.visit__addr', `<a href="${esc(S.mapsUrl)}" target="_blank" rel="noopener" class="ulink">${esc(S.street)} · ${esc(S.city)}</a><br><a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener" class="ulink">WhatsApp ${esc(S.phone)}</a> · <a href="mailto:${esc(S.email)}" class="ulink">${esc(S.email)}</a>`);

    set('.footer__title', rich(S.footerTitle));
    const fHours = full.closed ? full.days : full.same ? `${esc(full.days)}<br>${esc(full.time)}` : full.parts.map((p) => `${esc(cap(p.label))} ${esc(p.from)} – ${esc(p.to)}`).join('<br>');
    set('.footer__grid', `
        <div><span class="eyebrow">Dirección</span><a href="${esc(S.mapsUrl)}" target="_blank" rel="noopener" class="ulink">${esc(S.street)}<br>${esc(S.city)}</a></div>
        <div><span class="eyebrow">Horario</span>${fHours}</div>
        <div><span class="eyebrow">Pedidos</span><a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener" class="ulink">WhatsApp ${esc(S.phone)}</a><br><a href="mailto:${esc(S.email)}" class="ulink">${esc(S.email)}</a></div>
        <div><span class="eyebrow">Síguenos</span><a href="https://www.instagram.com/${esc(S.instagram)}" target="_blank" rel="noopener" class="ulink">Instagram @${esc(S.instagram)}</a></div>`);

    qa('[data-year]').forEach((y) => (y.textContent = new Date().getFullYear()));

    const L = D.legal || {};
    qa('[data-legal]').forEach((el) => {
      if (el.dataset.ph == null) el.dataset.ph = el.textContent;
      const v = L[el.dataset.legal];
      el.textContent = v || el.dataset.ph;
      el.classList.toggle('todo', !v);
    });
    qa('[data-site]').forEach((el) => { if (S[el.dataset.site]) el.textContent = S[el.dataset.site]; });
    qa('[data-hours-text]').forEach((el) => {
      const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
      el.textContent = full.closed ? 'según el horario publicado' : full.same ? `${lc(full.days)}, de ${full.parts[0].from} a ${full.parts[0].to}` : full.parts.map((pt) => `${lc(pt.label)}, de ${pt.from} a ${pt.to}`).join('; ');
    });
    const cr = q('[data-legal-credit]');
    if (cr) { cr.hidden = !L.photoCredit; cr.textContent = L.photoCredit || ''; }

    const E = D.events;
    if (E && q('#eventos')) {
      set('.events .eyebrow', `<svg class="eyebrow__flor" aria-hidden="true"><use href="#flor"/></svg> ${esc(E.eyebrow)}`);
      set('.events .title', rich(E.title));
      text('.events__text', E.text);
      set('.events__points', (E.points || []).map((t) => `<li>${icon('flor')}${esc(t)}</li>`).join(''));
      const ec = q('.events__cta');
      if (ec) { ec.href = `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(E.waMessage || '')}`; q('.btn__label', ec).textContent = E.cta; }
      set('.events__track', (E.media || []).map((m, i) => `<figure class="slide" data-i="${i}">
        <div class="slide__media">${m.type === 'video'
          ? `<video src="${esc(m.src)}"${m.poster ? ` poster="${esc(m.poster)}"` : ''} muted loop playsinline preload="none" aria-label="${esc(m.alt)}"></video><span class="slide__play" aria-hidden="true"><svg><use href="#i-play"/></svg></span>`
          : img(m.src, m.alt, '(max-width: 700px) 78vw, (max-width: 1100px) 42vw, 30vw', '', ' draggable="false"')}</div>
        ${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ''}</figure>`).join(''));
    }

    const F = D.franchise;
    if (F && q('#franquicias')) {
      set('.franchise .eyebrow', esc(F.eyebrow));
      set('.franchise .title', rich(F.title));
      text('.franchise__text', F.text);
      set('.franchise__points', (F.points || []).map((pt, i) => `<li><span class="franchise__n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(pt.title)}</h3><p>${esc(pt.text)}</p></div></li>`).join(''));
      text('.franchise__form-title', F.formTitle);
      text('.franchise__send .btn__label', F.cta);
      const fm = q('.franchise__mail');
      if (fm) fm.href = `mailto:${S.email}?subject=${encodeURIComponent('Franquicias Le Pavlove')}`;
    }

    qa('a[href*="wa.me/"]').forEach((a) => {
      if (a.id === 'waRetry') return;
      const h = a.getAttribute('href');
      a.setAttribute('href', `https://wa.me/${S.whatsapp}` + (h.includes('?') ? `?text=${encodeURIComponent(S.waMessage || '')}` : ''));
    });
    qa('a[href*="share.google"]').forEach((a) => a.setAttribute('href', S.reviewsUrl));
    qa('a[href^="mailto:"]').forEach((a) => { if (!a.classList.contains('franchise__mail')) { a.setAttribute('href', `mailto:${S.email}`); if (a.textContent.includes('@')) a.textContent = S.email; } });

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
      } catch (e) { }
    }
  }

  const item = (it) => `<li class="item"${it.img ? ` data-img="${esc(small(it.img))}"${it.png ? ' data-png' : ''}` : ''}><div class="item__row"><span class="item__name">${esc(it.name)}${it.note ? ` <small>${esc(it.note)}</small>` : ''}</span><span class="item__line"></span><span class="item__price">${esc(it.price)}</span></div></li>`;
  const group = (g) => `<h3 class="group">${icon(g.icon)}${esc(g.title)}</h3>`
    + (g.note ? `<p class="extras__note">${esc(g.note)}</p>` : '')
    + (g.style === 'toppings'
      ? `<ul class="toppings">${(g.items || []).map((i) => `<li><span>${esc(i.name)}</span><b>${esc(i.price)}</b></li>`).join('')}</ul>`
      : `<ul class="items">${(g.items || []).map(item).join('')}</ul>`)
    + (g.beans ? `<div class="beans"><p class="beans__title">${esc(g.beans.title)}</p><p class="chips chips--solid">${(g.beans.chips || []).map((c) => `<span>${esc(c)}</span>`).join('')}</p></div>` : '');
  const CARD = '(max-width: 700px) 42vw, (max-width: 1024px) 46vw, 23vw';
  function panelHtml(c, i) {
    const open = `<div class="panel${i ? '' : ' is-active'}" role="tabpanel" id="p-${esc(c.id)}" aria-labelledby="t-${esc(c.id)}"${i ? ' hidden' : ''}>`;
    if (c.layout === 'cards') {
      return open + (c.intro ? `<p class="panel__desc">${rich(c.intro)}</p>` : '') + `<div class="prods">${(c.items || []).map((p) => `
        <article class="prod${p.star ? ' prod--star' : ''}"${p.photo ? ' data-photo' : ''}>
          <div class="prod__art${p.photoOnly ? ' prod__art--photo' : ''}">
            ${img(p.ill, (p.photoOnly ? 'Foto: ' : 'Ilustración de ') + p.name, CARD, 'prod__ill')}
            ${p.photo ? `${img(p.photo, 'Foto: ' + p.name, CARD, 'prod__photo')}<button class="prod__flip" type="button" aria-pressed="false">Ver foto</button>` : ''}
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
      ? `<div class="drinks"><figure class="feature"><div class="feature__img">${img(f.img, f.title, '(max-width: 700px) 120px, (max-width: 1024px) 180px, 30vw')}</div><figcaption><span class="feature__title">${esc(f.title)}</span><span class="feature__text">${esc(f.text)}</span></figcaption></figure><div class="drinks__lists">${cols}</div></div>`
      : `<div class="extras">${cols}</div>`) + '</div>';
  }

  const load = () => {
    if (PREVIEW) {
      try { const d = JSON.parse(localStorage.getItem('lp-draft')); if (d) return Promise.resolve(d); } catch (e) { }
    }
    return fetch('data/content.json').then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  };

  LP.ready = load().then((D) => {
    LP.data = D;
    if (PREVIEW) {
      try { sessionStorage.setItem('lp-intro', '1'); } catch (e) { }
    }
    applyAll(D);
    if (PREVIEW) previewTweaks();
  }).catch(() => { })
    .then(() => document.documentElement.classList.remove('lp-wait'));
  window.LP_READY = LP.ready;

  function previewTweaks() {
    qa('a[href]').forEach((a) => {
      const h = a.getAttribute('href');
      if (/^(index|tienda)\.html/.test(h)) a.setAttribute('href', h.replace(/^([^#]*)/, (m) => m + (m.includes('?') ? '&' : '?') + 'lp-preview'));
    });
    let pending = {};
    try { pending = window.parent.__lpPending || {}; } catch (e) { }
    const fix = (im) => {
      const s = (im.getAttribute('src') || '').replace(/-(480|960)\.webp$/, '.webp');
      if (pending[s] && im.getAttribute('src') !== pending[s]) { im.removeAttribute('srcset'); im.src = pending[s]; }
    };
    const sweep = () => qa('img, video').forEach(fix);
    sweep();
    new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true });
  }
})();
