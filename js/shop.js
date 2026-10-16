/* =========================================================
   Le Pavlove — Tienda online (pedido para recoger en tienda)
   El pedido se envía por WhatsApp y se paga al recoger.
   ========================================================= */
(window.LP_READY || Promise.resolve()).then(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!window.gsap;
  const LPD = (window.LP && window.LP.data) || null;
  const WA = (LPD && LPD.site.whatsapp) || '34642882027';
  const STORE_KEY = 'lp-cart';

  /* ---------- Catálogo (precios de la carta) ---------- */
  // Alérgenos según los ingredientes de la carta: revisar con el obrador antes de publicar.
  const BUILTIN = [
    { id: 'pav-personal', cat: 'pavlovas', name: 'Pavlova personal', size: '8 cm', img: 'assets/img/pavlova.webp', png: true,
      desc: 'Merengue crujiente con almendra y nuez, dulce de leche, crema de vainilla de Madagascar y fresas.',
      allergens: ['Huevo', 'Leche', 'Frutos secos'],
      variants: [{ label: '1 ud', price: 3.3 }, { label: 'Caja de 4', price: 12.5 }, { label: 'Caja de 6', price: 18 }] },
    { id: 'pav-bites', cat: 'pavlovas', name: 'Bites', size: 'de un bocado', img: 'assets/img/bites.webp', png: true,
      desc: 'Pequeñas, delicadas y peligrosamente adictivas.',
      allergens: ['Huevo', 'Leche', 'Frutos secos'],
      variants: [{ label: '1 ud', price: 1.2 }, { label: 'Caja de 9', price: 10 }, { label: 'Caja de 16', price: 15 }, { label: 'Caja de 25', price: 20 }] },
    { id: 'pav-mediana', cat: 'pavlovas', name: 'Pavlova mediana', size: '11 cm', img: 'assets/img/pavlova-caja.webp',
      desc: 'Ideal para compartir… o no.',
      allergens: ['Huevo', 'Leche', 'Frutos secos'],
      variants: [{ label: '1 ud', price: 7.5 }, { label: 'Caja de 4', price: 26.5 }] },
    { id: 'pav-grande', cat: 'pavlovas', name: 'Pavlova grande', size: '21 cm', img: 'assets/img/grande.webp', png: true,
      desc: 'La que entra con presencia. Para el centro de la mesa.',
      allergens: ['Huevo', 'Leche', 'Frutos secos'],
      variants: [{ label: '1 ud', price: 24 }] },
    { id: 'cup-tradicional', cat: 'cuplovas', name: 'CupLova tradicional', size: 'en vaso', img: 'assets/img/cuplova.webp', png: true,
      desc: 'Pavlova triturada, dulce de leche, crema de vainilla de Madagascar y fresas.',
      allergens: ['Huevo', 'Leche', 'Frutos secos'],
      variants: [{ label: 'Vaso', price: 4.5 }], extra: { label: 'Con helado Le Pavlove', price: 1 } },
    { id: 'cup-parfait', cat: 'cuplovas', name: 'CupLova parfait', size: 'en vaso', img: 'assets/img/parfait.webp', png: true,
      desc: 'Yogur natural o de frutos rojos, granola artesanal, fresas y miel.',
      allergens: ['Leche', 'Gluten (granola)', 'Frutos secos'],
      variants: [{ label: 'Vaso', price: 4.5 }], extra: { label: 'Con helado Le Pavlove', price: 1 } },
    { id: 'cup-fresita', cat: 'cuplovas', name: 'CupLova fresita', size: 'en vaso', img: 'assets/img/fresita.webp', png: true,
      desc: 'Fresas cortadas con crema natural de vainilla de Madagascar.',
      allergens: ['Leche'],
      variants: [{ label: 'Vaso', price: 4.5 }], extra: { label: 'Con helado Le Pavlove', price: 1 } },
    { id: 'heladova', cat: 'helado', name: 'Heladova', size: 'helado artesano', img: 'assets/img/heladova.webp', png: true,
      desc: 'Vainilla de Madagascar, dulce de leche argentino, mermelada de fresa y trocitos de pavlova.',
      allergens: ['Leche', 'Huevo', 'Frutos secos'],
      variants: [{ label: '2 bolas', price: 2 }, { label: '4 bolas', price: 3.5 }, { label: 'Batido 355 ml', price: 6 }] },
    { id: 'cafe-grano', cat: 'cafe', name: 'Café de Quindío en grano', size: 'Colombia, gourmet', img: 'assets/img/cafe.webp',
      desc: 'El mismo café colombiano que servimos en la barra, para llevártelo a casa.',
      allergens: [],
      variants: [{ label: '250 g', price: 12 }, { label: '454 g', price: 16 }, { label: '2,5 kg', price: 74 }] },
  ];
  // El panel de administración guarda el catálogo en data/content.json
  const PRODUCTS = (LPD && LPD.shop && LPD.shop.products ? LPD.shop.products.filter((p) => !p.hidden).map((p) => ({ ...p, png: p.art, extra: p.extra || undefined })) : BUILTIN);

  const eur = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  /* ---------- Estado del carrito (guardado en este navegador) ---------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { cart = []; }
  cart = cart.filter((l) => byId(l.id) && byId(l.id).variants[l.v]);
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) { /* sin storage */ } };
  const lineKey = (l) => `${l.id}|${l.v}|${l.x ? 1 : 0}`;
  const linePrice = (l) => { const p = byId(l.id); return p.variants[l.v].price + (l.x && p.extra ? p.extra.price : 0); };
  const total = () => cart.reduce((s, l) => s + linePrice(l) * l.q, 0);
  const count = () => cart.reduce((s, l) => s + l.q, 0);

  /* ---------- Catálogo en pantalla ---------- */
  const grid = $('#shopGrid');
  grid.innerHTML = PRODUCTS.map((p) => `
    <article class="sp" data-cat="${p.cat}" data-id="${p.id}">
      <div class="sp__art${p.png ? '' : ' sp__art--photo'}"><img src="${p.img}" alt="${p.name}" loading="lazy" decoding="async"></div>
      <div class="sp__body">
        <p class="sp__size">${p.size}</p>
        <h3 class="sp__name">${p.name}</h3>
        <p class="sp__desc">${p.desc}</p>
        <p class="sp__allergens">${p.allergens.length ? `<span>Alérgenos:</span> ${p.allergens.join(' · ')}` : '<span>Alérgenos:</span> sin alérgenos declarados'}</p>
        ${p.variants.length > 1 ? `
        <div class="sp__variants" role="radiogroup" aria-label="Formato de ${p.name}">
          ${p.variants.map((v, i) => `<button type="button" role="radio" class="sp__variant${i === 0 ? ' is-on' : ''}" aria-checked="${i === 0}" data-v="${i}">${v.label}</button>`).join('')}
        </div>` : ''}
        ${p.extra ? `<label class="sp__extra"><input type="checkbox" data-extra> ${p.extra.label} <b>+${eur(p.extra.price)}</b></label>` : ''}
        <div class="sp__buy">
          <p class="sp__price" aria-live="polite">${eur(p.variants[0].price)}</p>
          <div class="qty" aria-label="Cantidad">
            <button type="button" data-q="-1" aria-label="Quitar uno">−</button>
            <output>1</output>
            <button type="button" data-q="1" aria-label="Añadir uno">+</button>
          </div>
        </div>
        <button type="button" class="btn btn--royal sp__add"><svg class="btn__icon" aria-hidden="true"><use href="#i-bag"/></svg><span class="btn__label">Añadir al pedido</span></button>
      </div>
    </article>`).join('');

  // El efecto de flor de los botones (main.js) ya se aplicó antes: se lo damos a los nuevos
  $$('.sp__add', grid).forEach((btn) => {
    btn.classList.add('btn--lead');
    btn.insertAdjacentHTML('afterbegin', '<span class="btn__fill" aria-hidden="true"></span><span class="btn__bloom" aria-hidden="true"><svg><use href="#flor"/></svg></span>');
    const setOrigin = () => { btn.querySelector('.btn__fill').style.left = btn.querySelector('.btn__bloom').offsetLeft + 11 + 'px'; };
    btn.addEventListener('pointerenter', setOrigin);
    btn.addEventListener('focus', setOrigin);
  });

  $$('.sp', grid).forEach((card) => {
    const p = byId(card.dataset.id);
    const st = { v: 0, q: 1, x: false };
    const priceEl = $('.sp__price', card);
    const out = $('.qty output', card);
    const refresh = () => {
      priceEl.textContent = eur((p.variants[st.v].price + (st.x ? p.extra.price : 0)) * st.q);
      out.textContent = st.q;
    };
    $$('.sp__variant', card).forEach((b) => b.addEventListener('click', () => {
      st.v = +b.dataset.v;
      $$('.sp__variant', card).forEach((o) => { const on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-checked', on); });
      refresh();
      if (hasGsap && !reduce) gsap.fromTo(priceEl, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' });
    }));
    const ex = $('[data-extra]', card);
    ex && ex.addEventListener('change', () => { st.x = ex.checked; refresh(); });
    $$('.qty button', card).forEach((b) => b.addEventListener('click', () => {
      st.q = Math.max(1, Math.min(50, st.q + +b.dataset.q));
      refresh();
    }));
    $('.sp__add', card).addEventListener('click', () => {
      const line = { id: p.id, v: st.v, x: st.x, q: st.q };
      const found = cart.find((l) => lineKey(l) === lineKey(line));
      if (found) found.q += st.q; else cart.push(line);
      save();
      flyToCart($('.sp__art img', card));
      announce(`${st.q} × ${p.name} añadido al pedido. Total ${eur(total())}.`);
      st.q = 1; refresh();
      render(true);
    });
  });

  /* ---------- Filtros ---------- */
  const filters = $$('.filter');
  filters.forEach((f) => f.addEventListener('click', () => {
    filters.forEach((o) => { const on = o === f; o.classList.toggle('is-active', on); o.setAttribute('aria-pressed', on); });
    const cat = f.dataset.filter;
    const cards = $$('.sp', grid);
    const show = cards.filter((c) => cat === 'all' || c.dataset.cat === cat);
    const hide = cards.filter((c) => !show.includes(c));
    if (!hasGsap || reduce) { cards.forEach((c) => (c.hidden = !show.includes(c))); return; }
    gsap.to(hide.filter((c) => !c.hidden), { autoAlpha: 0, scale: 0.94, duration: 0.25, onComplete: () => hide.forEach((c) => { c.hidden = true; gsap.set(c, { clearProps: 'transform,opacity,visibility' }); }) });
    gsap.delayedCall(hide.length ? 0.26 : 0, () => {
      show.forEach((c) => (c.hidden = false));
      gsap.fromTo(show, { autoAlpha: 0, y: 30, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
      window.ScrollTrigger && ScrollTrigger.refresh();
    });
  }));

  /* ---------- Carrito (panel lateral) ---------- */
  const cartEl = $('#cart');
  const panel = $('.cart__panel', cartEl);
  const overlay = $('.cart__overlay', cartEl);
  const itemsEl = $('#cartItems');
  const emptyEl = $('#cartEmpty');
  const form = $('#orderForm');
  const foot = $('#cartFoot');
  const done = $('#cartDone');
  const openers = [$('#cartBtn'), $('#cartFab')].filter(Boolean);
  let lastFocus = null;
  let isOpen = false;

  function render(bump) {
    const n = count();
    $('#cartCount') && ($('#cartCount').textContent = n);
    $('#fabCount').textContent = n;
    $('#fabTotal').textContent = eur(total());
    $('#cartTotal').textContent = eur(total());
    document.body.classList.toggle('has-cart', n > 0);
    const empty = n === 0;
    emptyEl.hidden = !empty;
    form.hidden = empty;
    foot.hidden = empty;
    itemsEl.innerHTML = cart.map((l, i) => {
      const p = byId(l.id);
      const variant = p.variants.length > 1 ? p.variants[l.v].label : '';
      const extra = l.x && p.extra ? p.extra.label : '';
      return `<li class="ci" data-i="${i}">
        <div class="ci__img${p.png ? '' : ' ci__img--photo'}"><img src="${p.img}" alt=""></div>
        <div class="ci__info">
          <p class="ci__name">${p.name}</p>
          <p class="ci__meta">${[variant, extra].filter(Boolean).join(' · ') || p.size}</p>
          <div class="qty qty--sm" aria-label="Cantidad de ${p.name}">
            <button type="button" data-d="-1" aria-label="Quitar uno">−</button><output>${l.q}</output><button type="button" data-d="1" aria-label="Añadir uno">+</button>
          </div>
        </div>
        <div class="ci__side">
          <p class="ci__price">${eur(linePrice(l) * l.q)}</p>
          <button type="button" class="ci__remove" aria-label="Quitar ${p.name} del pedido">Quitar</button>
        </div>
      </li>`;
    }).join('');
    if (bump && hasGsap && !reduce) {
      gsap.fromTo(['.nav__count', '.cart-fab__count'], { scale: 1.8 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, .4)' });
      gsap.fromTo('.cart-fab', { y: 0 }, { y: -6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  }

  itemsEl.addEventListener('click', (e) => {
    const li = e.target.closest('.ci');
    if (!li) return;
    const i = +li.dataset.i;
    if (e.target.closest('.ci__remove')) {
      const removeIt = () => { cart.splice(i, 1); save(); render(); };
      if (hasGsap && !reduce) gsap.to(li, { x: 40, autoAlpha: 0, height: 0, paddingBlock: 0, duration: 0.4, ease: 'power2.in', onComplete: removeIt });
      else removeIt();
      return;
    }
    const d = e.target.closest('[data-d]');
    if (d) {
      cart[i].q += +d.dataset.d;
      if (cart[i].q < 1) cart.splice(i, 1);
      save(); render();
    }
  });

  const trap = (e) => {
    if (e.key === 'Escape') { closeCart(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([hidden]), input, select, textarea', panel).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };

  function openCart() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    fillDays();
    cartEl.classList.add('is-open');
    cartEl.removeAttribute('inert');
    cartEl.setAttribute('aria-hidden', 'false');
    openers.forEach((o) => o.setAttribute('aria-expanded', 'true'));
    [$('main'), $('.footer'), $('.nav')].forEach((el) => el && el.setAttribute('inert', ''));
    document.documentElement.classList.add('cart-lock');
    window.__lenis && window.__lenis.stop();
    document.addEventListener('keydown', trap);
    if (hasGsap && !reduce) {
      gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });
      gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.8, ease: 'expo.out' });
      gsap.from('.ci, .cart__empty > *', { x: 40, autoAlpha: 0, duration: 0.6, stagger: 0.05, delay: 0.2, ease: 'expo.out' });
    }
    setTimeout(() => $('.cart__close').focus(), 50);
  }
  function closeCart() {
    if (!isOpen) return;
    isOpen = false;
    const finish = () => {
      cartEl.classList.remove('is-open');
      cartEl.setAttribute('inert', '');
      cartEl.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('cart-lock');
      window.__lenis && window.__lenis.start();
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    };
    openers.forEach((o) => o.setAttribute('aria-expanded', 'false'));
    [$('main'), $('.footer'), $('.nav')].forEach((el) => el && el.removeAttribute('inert'));
    document.removeEventListener('keydown', trap);
    if (hasGsap && !reduce) {
      gsap.to(overlay, { autoAlpha: 0, duration: 0.35 });
      gsap.to(panel, { xPercent: 100, duration: 0.5, ease: 'expo.in', onComplete: finish });
    } else finish();
  }
  openers.forEach((o) => o.addEventListener('click', openCart));
  $$('[data-close]', cartEl).forEach((b) => b.addEventListener('click', closeCart));

  /* ---------- Vuelo al carrito ---------- */
  function flyToCart(img) {
    const target = (getComputedStyle($('#cartFab')).display !== 'none' ? $('#cartFab') : $('#cartBtn'));
    if (!hasGsap || reduce || !img || !target) return;
    const a = img.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const clone = img.cloneNode();
    clone.className = 'fly';
    Object.assign(clone.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(clone);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    gsap.timeline({ onComplete: () => clone.remove() })
      .to(clone, { x: dx, duration: 0.9, ease: 'power1.inOut' }, 0)
      .to(clone, { y: dy, duration: 0.9, ease: 'back.in(1.4)' }, 0)
      .to(clone, { scale: 0.12, rotate: 25, duration: 0.9, ease: 'power2.in' }, 0)
      .to(clone, { autoAlpha: 0, duration: 0.2 }, 0.75);
  }

  /* ---------- Recogida: días y horas de apertura ---------- */
  // Días y franjas salen del horario del panel (última recogida: 30 min antes de cerrar)
  const HOURS = (LPD && LPD.hours) || [0, 1, 1, 1, 1, 0, 1].map((o, i) => ({ open: !!o, from: '17:00', to: '21:00' }));
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const slotsFor = (dow) => { // dow: 0 = domingo
    const h = HOURS[(dow + 6) % 7];
    if (!h || !h.open) return [];
    const out = [];
    for (let m = toMin(h.from); m <= toMin(h.to) - 30; m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    return out;
  };
  const LEAD_MIN = 90; // margen mínimo para preparar el pedido
  const fDay = $('#fDay');
  const fTime = $('#fTime');
  const dayLabel = (d) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  function availableSlots(date) {
    const now = new Date();
    return slotsFor(date.getDay()).filter((s) => {
      const [h, m] = s.split(':').map(Number);
      const t = new Date(date); t.setHours(h, m, 0, 0);
      return t - now >= LEAD_MIN * 60000;
    });
  }
  function fillDays() {
    const prev = fDay.value;
    const opts = [];
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; opts.length < 10 && i < 21; i++) {
      const day = new Date(d); day.setDate(d.getDate() + i);
      if (!availableSlots(day).length) continue;
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const label = (i === 0 ? 'Hoy, ' : i === 1 ? 'Mañana, ' : '') + dayLabel(day);
      opts.push(`<option value="${iso}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`);
    }
    fDay.innerHTML = opts.join('');
    if (prev && [...fDay.options].some((o) => o.value === prev)) fDay.value = prev;
    fillTimes();
  }
  function fillTimes() {
    const prev = fTime.value;
    const [y, m, dd] = fDay.value.split('-').map(Number);
    const slots = availableSlots(new Date(y, m - 1, dd));
    fTime.innerHTML = slots.map((s) => `<option value="${s}">${s}</option>`).join('');
    if (slots.includes(prev)) fTime.value = prev;
  }
  fDay.addEventListener('change', fillTimes);

  /* ---------- Enviar pedido por WhatsApp ---------- */
  const errEl = $('#orderError');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const name = $('#fName').value.trim();
    const phone = $('#fPhone').value.trim();
    const problems = [];
    if (!cart.length) problems.push('Tu pedido está vacío.');
    if (!name) problems.push('Escribe tu nombre.');
    if (!/^[0-9 +]{9,15}$/.test(phone)) problems.push('Escribe un teléfono válido.');
    if (!fDay.value || !fTime.value) problems.push('Elige día y hora de recogida.');
    if (!$('#fTerms').checked) problems.push('Acepta las condiciones de compra.');
    if (problems.length) {
      errEl.textContent = problems.join(' ');
      errEl.hidden = false;
      if (hasGsap && !reduce) gsap.fromTo(errEl, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, .3)' });
      return;
    }
    const [y, m, d] = fDay.value.split('-').map(Number);
    const lines = cart.map((l) => {
      const p = byId(l.id);
      const opts = [p.variants.length > 1 ? p.variants[l.v].label : '', l.x && p.extra ? p.extra.label.charAt(0).toLowerCase() + p.extra.label.slice(1) : ''].filter(Boolean).join(', ');
      return `• ${l.q} × ${p.name}${opts ? ` (${opts})` : ''} — ${eur(linePrice(l) * l.q)}`;
    });
    const notes = $('#fNotes').value.trim();
    const msg = [
      '¡Hola, Le Pavlove! Quiero hacer este pedido para recoger:',
      '',
      ...lines,
      '',
      `Total: ${eur(total())}`,
      `Recogida: ${dayLabel(new Date(y, m - 1, d))} a las ${fTime.value}`,
      `Nombre: ${name}`,
      `Teléfono: ${phone}`,
      notes ? `Notas: ${notes}` : '',
      '',
      'Pagaré al recogerlo. ¡Gracias!',
    ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
    const url = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');
    $('#waRetry').href = url;
    form.hidden = true; foot.hidden = true; itemsEl.hidden = true;
    done.hidden = false;
    if (hasGsap && !reduce) gsap.from(done.children, { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.08, ease: 'expo.out' });
    $('#newOrder').focus();
  });
  $('#newOrder').addEventListener('click', () => {
    cart = []; save();
    form.reset();
    done.hidden = true; itemsEl.hidden = false;
    render();
    closeCart();
  });

  /* ---------- Avisos para lectores de pantalla ---------- */
  const live = $('#cartLive');
  function announce(t) { live.textContent = ''; setTimeout(() => (live.textContent = t), 50); }

  /* ---------- Entrada de las fichas ---------- */
  render();
  if (hasGsap && !reduce && window.ScrollTrigger) {
    gsap.from('.sp', { y: 60, autoAlpha: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: grid, start: 'top 85%' } });
    gsap.from('.info-card', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.shop-info', start: 'top 85%' } });
    gsap.from('.filter', { y: 16, autoAlpha: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: '.filters', start: 'top 90%' } });
  }
});
