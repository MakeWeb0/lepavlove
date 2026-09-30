/* =========================================================
   Le Pavlove Patisserie — interacción y animaciones GSAP
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Funciones que no dependen de GSAP ---------- */

  // Horario: resalta el día de hoy y dice si está abierto
  (() => {
    const rows = $$('.hours > div');
    if (!rows.length) return;
    const now = new Date();
    const idx = (now.getDay() + 6) % 7; // lunes = 0
    const row = rows[idx];
    row.classList.add('is-today');
    const open = !/cerrado/i.test(row.querySelector('dd').textContent);
    const mins = now.getHours() * 60 + now.getMinutes();
    const out = $('#today');
    out.hidden = false;
    out.textContent = open && mins >= 17 * 60 && mins < 21 * 60 ? 'Ahora estamos abiertos.' : open && mins < 17 * 60 ? 'Hoy abrimos a las 17:00.' : 'Ahora mismo estamos cerrados.';
  })();

  // Mapa: solo se carga (y con él las cookies de Google) si se pide
  const loadMap = $('#loadMap');
  loadMap && loadMap.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=Carrer+Josep+Maria+Buck+55,+03201+Elche&output=embed';
    f.title = 'Mapa: Le Pavlove en Carrer Josep Maria Buck, 55, Elche';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    $('#map').replaceChildren(f);
  });

  // Vídeo del hero: pausa manual y respeto a "reducir movimiento"
  const video = $('#heroVideo');
  const vBtn = $('#videoToggle');
  let userPaused = false;
  if (video && vBtn) {
    const setVideoBtn = () => {
      const paused = video.paused;
      vBtn.setAttribute('aria-label', paused ? 'Reproducir vídeo' : 'Pausar vídeo');
      vBtn.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    };
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); userPaused = true; }
    vBtn.addEventListener('click', () => {
      if (video.paused) { video.play().catch(() => {}); userPaused = false; } else { video.pause(); userPaused = true; }
    });
    video.addEventListener('play', setVideoBtn);
    video.addEventListener('pause', setVideoBtn);
    setVideoBtn();
  }

  // Botón fijo de WhatsApp: aparece al pasar el hero
  const wa = $('.wa-float');
  const hero = $('.hero');
  if (wa && hero) new IntersectionObserver(([e]) => wa.classList.toggle('is-visible', !e.isIntersecting), { threshold: 0.15 }).observe(hero);

  const loader = $('.loader');
  if (!window.gsap) { // sin GSAP (CDN caída) la web sigue siendo usable
    loader && loader.remove();
    document.body.classList.remove('is-loading');
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  const ease = 'expo.out';

  /* ---------- Scroll suave ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.__lenis = lenis;
  }
  const goTo = (hash) => {
    const el = $(hash);
    if (!el) return;
    lenis ? lenis.scrollTo(el, { duration: 1.5 }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };
  $$('a[href^="#"]:not(.menu__link)').forEach((a) => a.addEventListener('click', (e) => {
    const h = a.getAttribute('href');
    if (h.length > 1 && $(h)) { e.preventDefault(); goTo(h); }
  }));

  /* ---------- Botones: flor que brota + pétalos al pulsar ---------- */
  $$('.btn').forEach((btn) => {
    if (btn.firstElementChild && btn.firstElementChild.classList.contains('btn__icon')) btn.classList.add('btn--lead');
    btn.insertAdjacentHTML('afterbegin', '<span class="btn__fill" aria-hidden="true"></span><span class="btn__bloom" aria-hidden="true"><svg><use href="#flor"/></svg></span>');
    // El círculo de color nace justo donde brota la flor
    const setOrigin = () => { const f = btn.querySelector('.btn__fill'); const bl = btn.querySelector('.btn__bloom'); f.style.left = bl.offsetLeft + 11 + 'px'; };
    btn.addEventListener('pointerenter', setOrigin);
    btn.addEventListener('focus', setOrigin);
    if (!reduce) btn.addEventListener('pointerdown', (e) => petals(e.clientX, e.clientY));
  });
  function petals(x, y) {
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      document.body.appendChild(p);
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const d = 34 + Math.random() * 26;
      gsap.fromTo(p, { x, y, rotate: (a * 180) / Math.PI + 90, scale: 0.4, opacity: 1 }, {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 10, scale: 1, opacity: 0, rotate: '+=60',
        duration: 0.8, ease: 'power3.out', onComplete: () => p.remove(),
      });
    }
  }

  /* =========================================================
     LOADER (solo la primera visita de la sesión) + ENTRADA
     ========================================================= */
  const start = () => {
    document.body.classList.remove('is-loading');
    lenis && lenis.start();
    ScrollTrigger.refresh();
    if (location.hash && $(location.hash)) setTimeout(() => goTo(location.hash), 200);
  };
  const pageIntro = () => gsap.timeline({ defaults: { ease } })
    .from('.nav', { yPercent: -100, autoAlpha: 0, duration: 1.1, clearProps: 'transform,opacity,visibility' }, 0)
    .from('.shop__head .eyebrow, .shop__lead', { y: 20, autoAlpha: 0, duration: 1.1, stagger: 0.1 }, 0.2);
  const heroIntro = () => (!hero ? pageIntro() : gsap.timeline({ defaults: { ease } })
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.3, stagger: 0.1 }, 0)
    .from('.hero__kicker', { y: 14, autoAlpha: 0, duration: 1 }, 0)
    .from('.hero__more, .hero__ctas .btn', { y: 22, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.45)
    .fromTo('.hero__media', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 26px 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 26px 26px)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.1)
    .from('.hero__ilu', { yPercent: 40, autoAlpha: 0, duration: 2 }, 0.2)
    .from('.hero .doodle', { scale: 0, rotate: -90, duration: 1.2, stagger: 0.12, ease: 'back.out(2)' }, 0.8)
    .from('.nav', { yPercent: -100, autoAlpha: 0, duration: 1.1, clearProps: 'transform,opacity,visibility' }, 0.3));

  let seen = false;
  try { seen = sessionStorage.getItem('lp-intro') === '1'; sessionStorage.setItem('lp-intro', '1'); } catch (e) { /* sin storage */ }

  document.fonts.ready.then(() => {
    if (reduce) { loader && loader.remove(); start(); return; }
    if (seen || !loader) { loader && loader.remove(); heroIntro(); start(); return; }
    gsap.timeline({ onComplete: () => loader.remove() })
      .fromTo('.loader__flor', { scale: 0, rotate: -160 }, { scale: 1, rotate: 0, duration: 0.8, ease })
      .to('.loader__logo', { opacity: 1, duration: 0.5, ease }, 0.3)
      .to('.loader__flor', { scale: 6, opacity: 0, duration: 0.7, ease: 'expo.in' }, 0.6)
      .to('.loader__logo', { opacity: 0, duration: 0.3 }, 0.85)
      .fromTo(loader, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'expo.inOut' }, 0.95)
      .add(heroIntro(), 1.15)
      .add(start, 1.3);
  });

  if (!reduce && hero) {
    const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__copy', { yPercent: -12, ease: 'none', scrollTrigger: st });
    gsap.to('.hero__ilu', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero__ilu', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.hero__media', { yPercent: 8, ease: 'none', scrollTrigger: st });
    // Los dibujitos flotan suavemente
    $$('.doodle').forEach((d, i) => gsap.to(d, { y: i % 2 ? 12 : -12, rotate: i % 2 ? -8 : 8, duration: 3 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
  }
  if (video) ScrollTrigger.create({
    trigger: '.hero', start: 'top bottom', end: 'bottom top',
    onLeave: () => video.pause(),
    onEnterBack: () => { if (!userPaused) video.play().catch(() => {}); },
  });

  /* =========================================================
     NAV
     ========================================================= */
  const nav = $('#nav');
  ScrollTrigger.create({
    start: 70, end: 'max',
    onEnter: () => nav.classList.add('is-solid'),
    onLeaveBack: () => nav.classList.remove('is-solid'),
    onUpdate: (self) => {
      if (document.body.classList.contains('menu-open')) return;
      nav.classList.toggle('is-hidden', self.scroll() > innerHeight * 0.9 && self.direction === 1);
    },
  });

  /* =========================================================
     MENÚ HAMBURGUESA (GSAP + foco accesible)
     ========================================================= */
  const menu = $('#menu');
  const burger = $('#burger');
  const menuBg = $('.menu__bg');
  const bl = $$('.burger__line');
  const outside = [$('main'), $('.footer'), $('.wa-float'), $('.nav__logo'), $('.nav__cta'), $('.nav__cart'), $('.cart-fab')];
  gsap.set('.menu__txt', { yPercent: 110 });

  const menuTl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
    .set(menu, { visibility: 'visible' })
    .fromTo(menuBg, { '--r': '0%' }, { '--r': '150%', duration: reduce ? 0.01 : 1.05 }, 0)
    .to('.burger__shape', { rotate: 180, scale: 1.1, duration: 1, ease: 'expo.out' }, 0)
    .to(bl[0], { top: 6, width: 22, rotate: 45, duration: 0.6, ease: 'power3.inOut' }, 0)
    .to(bl[1], { scaleX: 0, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0)
    .to(bl[2], { top: 6, width: 22, rotate: -45, duration: 0.6, ease: 'power3.inOut' }, 0)
    .fromTo('.menu__ilu', { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.6, ease: 'expo.out' }, 0.5)
    .from('.menu__quote', { y: 20, autoAlpha: 0, duration: 0.9, ease: 'power3.out' }, 0.8)
    .to('.menu__txt', { yPercent: 0, duration: 1.1, stagger: 0.08, ease }, 0.4)
    .from('.menu__num', { autoAlpha: 0, x: -10, duration: 0.7, stagger: 0.08, ease: 'power2.out' }, 0.55)
    .from('.menu__frame', { scale: 0.6, rotate: -8, autoAlpha: 0, duration: 1.2, ease }, 0.45)
    .from('.menu__flor', { rotate: -140, scale: 0.4, autoAlpha: 0, duration: 1.6, ease }, 0.35)
    .from('.menu__foot p', { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, 0.7);
  const florSpin = gsap.to('.menu__flor', { rotate: '+=360', duration: 50, repeat: -1, ease: 'none', paused: true });

  let open = false;
  const focusables = () => [burger, ...$$('a, button', menu)];
  const trap = (e) => {
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };
  function openMenu() {
    open = true;
    const r = burger.getBoundingClientRect();
    menuBg.style.setProperty('--cx', r.left + r.width / 2 + 'px');
    menuBg.style.setProperty('--cy', r.top + r.height / 2 + 'px');
    document.body.classList.add('menu-open');
    nav.classList.remove('is-hidden');
    menu.classList.add('is-open');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    outside.forEach((el) => el && el.setAttribute('inert', ''));
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    lenis && lenis.stop();
    menuTl.timeScale(1).play();
    florSpin.play();
    document.addEventListener('keydown', trap);
    setTimeout(() => $('.menu__link').focus({ preventScroll: true }), 350);
  }
  function closeMenu(after) {
    open = false;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
    outside.forEach((el) => el && el.removeAttribute('inert'));
    document.removeEventListener('keydown', trap);
    menuTl.timeScale(1.6).reverse();
    menuTl.eventCallback('onReverseComplete', () => {
      menu.classList.remove('is-open');
      gsap.set(menu, { visibility: 'hidden' });
      gsap.set(['.burger__line', '.burger__shape'], { clearProps: 'all' });
      document.body.classList.remove('menu-open');
      florSpin.pause();
      lenis && lenis.start();
      if (after) after(); else burger.focus({ preventScroll: true });
    });
  }
  burger.addEventListener('click', () => (open ? closeMenu() : openMenu()));

  const frameImgs = $$('.menu__frame img');
  const showFrame = (key) => {
    frameImgs.forEach((img) => {
      const on = img.dataset.key === key;
      img.classList.toggle('is-active', on);
      gsap.to(img, { opacity: on ? 1 : 0, scale: on ? 1 : 1.15, duration: 0.9, ease, overwrite: true });
    });
    gsap.fromTo('.menu__frame', { rotate: gsap.utils.random(-4, 4) }, { rotate: 0, duration: 1, ease: 'elastic.out(1, .5)' });
  };
  $$('.menu__link').forEach((a) => {
    a.addEventListener('mouseenter', () => showFrame(a.dataset.key));
    a.addEventListener('focus', () => showFrame(a.dataset.key));
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const h = a.getAttribute('href');
      const local = h.startsWith('#') && $(h);
      closeMenu(() => (local ? goTo(h) : (location.href = h)));
    });
  });

  /* =========================================================
     REVEALS GENERALES
     ========================================================= */
  if (!reduce) {
    document.fonts.ready.then(() => {
      $$('.split').forEach((el) => {
        const s = new SplitText(el, { type: 'words', mask: 'words' });
        gsap.from(s.words, { yPercent: 110, duration: 1.2, stagger: 0.06, ease, scrollTrigger: { trigger: el, start: 'top 86%' } });
      });
      ScrollTrigger.refresh();
    });
    $$('.reveal').forEach((el) => gsap.from(el, { y: 34, autoAlpha: 0, duration: 1.2, ease, scrollTrigger: { trigger: el, start: 'top 88%' } }));
    $$('.doodle:not(.hero .doodle), .footer__doodles svg').forEach((d, i) => gsap.from(d, { scale: 0, rotate: -120, duration: 1.2, delay: (i % 4) * 0.08, ease: 'back.out(2)', scrollTrigger: { trigger: d, start: 'top 92%' } }));

    $$('.count').forEach((el) => {
      const to = parseFloat(el.dataset.to);
      const dec = parseInt(el.dataset.dec || '0', 10);
      const o = { v: 0 };
      el.textContent = (0).toFixed(dec).replace('.', ',');
      gsap.to(o, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = o.v.toFixed(dec).replace('.', ',')), scrollTrigger: { trigger: el, start: 'top 92%' } });
    });

    if ($('.about')) {
    // Sobre nosotros: fotos que se revelan y notas del packaging que "se colocan"
    gsap.fromTo('.about__main', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: '.about__photos', start: 'top 80%' } });
    gsap.fromTo('.about__main img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about__photos', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.about__inset', { y: 80, rotate: 14, autoAlpha: 0, duration: 1.4, delay: 0.5, ease: 'back.out(1.4)', clearProps: 'transform', scrollTrigger: { trigger: '.about__photos', start: 'top 80%' } });
    gsap.from('.about__text .more', { y: 20, autoAlpha: 0, duration: 1, ease, scrollTrigger: { trigger: '.about__text .more', start: 'top 92%' } });
    gsap.from('.notes__label', { y: 20, autoAlpha: 0, duration: 1, ease, scrollTrigger: { trigger: '.notes', start: 'top 85%' } });
    gsap.from('.note', {
      y: 90, rotate: (i) => [-4, 3, -3][i], autoAlpha: 0, duration: 1.4, stagger: 0.14, ease,
      scrollTrigger: { trigger: '.notes__row', start: 'top 85%' },
    });
    gsap.from('.note figcaption', { y: 16, autoAlpha: 0, duration: 1, stagger: 0.14, delay: 0.5, ease, scrollTrigger: { trigger: '.notes__row', start: 'top 85%' } });
    }

    // Visítanos
    if ($('.hours')) gsap.from('.hours > div', { x: -20, autoAlpha: 0, duration: 0.8, stagger: 0.05, ease, scrollTrigger: { trigger: '.hours', start: 'top 88%' } });
    if ($('.map')) gsap.fromTo('.map', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 18px 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 18px 18px)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: '.map', start: 'top 85%' } });
  }

  /* =========================================================
     CARTA — pestañas + foto del plato
     ========================================================= */
  if ($('#carta')) {
  const tabs = $$('.tab');
  const ink = $('.tabs__pill');
  const panels = $$('.panel');
  const moveInk = (t, instant) => gsap.to(ink, { x: t.offsetLeft, width: t.offsetWidth, duration: instant ? 0 : 0.7, ease });
  const showItems = (p) => {
    if (reduce) return;
    gsap.fromTo($$('.panel__desc, .prod, .feature, .group, .item, .toppings li, .beans', p), { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.03, ease, overwrite: true });
  };
  document.fonts.ready.then(() => moveInk($('.tab.is-active'), true));
  addEventListener('resize', () => moveInk($('.tab.is-active'), true));
  ScrollTrigger.create({ trigger: '.panels', start: 'top 85%', once: true, onEnter: () => showItems($('.panel:not([hidden])')) });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('is-active')) return;
      const cur = panels.find((p) => !p.hidden);
      const next = $('#' + tab.getAttribute('aria-controls'));
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
      });
      moveInk(tab);
      hidePreview();
      gsap.to(cur, {
        autoAlpha: 0, y: -12, duration: reduce ? 0 : 0.3, ease: 'power2.in',
        onComplete: () => {
          cur.hidden = true;
          gsap.set(cur, { clearProps: 'all' });
          next.hidden = false;
          showItems(next);
          ScrollTrigger.refresh();
        },
      });
    });
    tab.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i };
      if (!(e.key in map)) return;
      e.preventDefault();
      const n = tabs[(i + map[e.key] + tabs.length) % tabs.length];
      n.focus(); n.click();
    });
  });

  // Fichas: "Ver foto" en táctil (en escritorio la foto aparece al pasar el ratón)
  $$('.prod__flip').forEach((b) => b.addEventListener('click', () => {
    const card = b.closest('.prod');
    const on = !card.classList.contains('is-photo');
    card.classList.toggle('is-photo', on);
    b.setAttribute('aria-pressed', on);
    b.textContent = on ? 'Ver dibujo' : 'Ver foto';
  }));
  if (fine && !reduce) {
    $$('.prod').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        gsap.to(card, { y: -8, rotateY: ((e.clientX - r.left) / r.width - 0.5) * 6, rotateX: ((e.clientY - r.top) / r.height - 0.5) * -6, transformPerspective: 900, duration: 0.6, ease: 'power3' });
      });
      card.addEventListener('pointerleave', () => gsap.to(card, { y: 0, rotateY: 0, rotateX: 0, duration: 0.8, ease: 'power3' }));
    });
  }

  // Cada plato con foto se convierte en un botón (ratón, teclado y táctil)
  const preview = $('.preview');
  const pImg = $('img', preview);
  let shown = false;
  const side = (x) => x + (x > innerWidth * 0.55 ? -190 : 190);
  const px = gsap.quickTo(preview, 'x', { duration: 0.55, ease: 'power3' });
  const py = gsap.quickTo(preview, 'y', { duration: 0.55, ease: 'power3' });
  const pr = gsap.quickTo(preview, 'rotation', { duration: 0.8, ease: 'power3' });
  function showPreview(it, x, y) {
    const src = it.dataset.img;
    if (pImg.getAttribute('src') !== src) pImg.src = src;
    preview.classList.toggle('is-png', it.hasAttribute('data-png'));
    if (!shown) gsap.set(preview, { x: side(x), y });
    else { px(side(x)); py(y); }
    shown = true;
    gsap.to(preview, { opacity: 1, scale: 1, duration: reduce ? 0 : 0.6, ease, overwrite: 'auto' });
    if (!reduce) gsap.fromTo(pImg, { scale: 1.2 }, { scale: 1, duration: 0.9, ease });
  }
  function hidePreview() {
    shown = false;
    gsap.to(preview, { opacity: 0, scale: 0.6, duration: reduce ? 0 : 0.4, ease: 'power3.out', overwrite: 'auto' });
  }

  $$('.item[data-img]').forEach((it) => {
    const h3 = $('.item__name', it);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'item__btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = h3.innerHTML;
    h3.replaceChildren(btn);
    const thumb = document.createElement('div');
    thumb.className = 'item__thumb' + (it.hasAttribute('data-png') ? ' is-png' : '');
    thumb.innerHTML = `<img src="${it.dataset.img}" alt="Foto de ${btn.textContent.trim()}" loading="lazy">`;
    it.appendChild(thumb);

    if (fine) {
      it.addEventListener('mouseenter', (e) => showPreview(it, e.clientX, e.clientY));
      it.addEventListener('mouseleave', hidePreview);
      btn.addEventListener('focus', () => {
        const r = btn.getBoundingClientRect();
        showPreview(it, r.right, r.top + r.height / 2);
      });
      btn.addEventListener('blur', hidePreview);
    }
    btn.addEventListener('click', () => {
      if (fine) return; // en escritorio la foto sigue al cursor
      const openNow = !it.classList.contains('is-open');
      it.classList.toggle('is-open', openNow);
      btn.setAttribute('aria-expanded', openNow);
      setTimeout(() => ScrollTrigger.refresh(), 650);
    });
    if (fine) btn.removeAttribute('aria-expanded');
  });
  if (fine) {
    let lastX = 0;
    addEventListener('pointermove', (e) => {
      if (!shown) return;
      px(side(e.clientX)); py(e.clientY);
      pr(gsap.utils.clamp(-10, 10, (e.clientX - lastX) * 0.5));
      lastX = e.clientX;
    });
  }

  }

  /* =========================================================
     CARRUSEL 3D
     ========================================================= */
  (() => {
    const stage = $('#stage');
    if (!stage) return;
    const ring = $('#ring');
    const cards = $$('.card', ring);
    const N = cards.length;
    const step = 360 / N;
    const s = { rot: 0, vel: 0, auto: reduce ? 0 : 7, open: reduce ? 1 : 0, tilt: -8 };
    let R = 0;
    let visible = false;
    let paused = reduce;
    const pauseBtn = $('[data-motion="ring"]');
    const setPauseBtn = () => { pauseBtn.setAttribute('aria-pressed', paused); pauseBtn.textContent = paused ? 'Reanudar giro' : 'Pausar giro'; };
    setPauseBtn();
    pauseBtn.addEventListener('click', () => { paused = !paused; setPauseBtn(); });

    const layout = () => {
      const cw = gsap.utils.clamp(150, 280, innerWidth * 0.19);
      stage.style.setProperty('--cw', cw + 'px');
      R = (cw / 2) / Math.tan(Math.PI / N) + cw * 0.14;
    };
    layout();
    addEventListener('resize', layout);

    const render = () => {
      const r = R * s.open;
      ring.style.transform = `translateZ(${-r}px) rotateX(${s.tilt}deg) rotateY(${s.rot}deg)`;
      cards.forEach((c, i) => {
        const a = i * step;
        c.style.transform = `rotateY(${a}deg) translateZ(${r}px)`;
        const rel = ((a + s.rot) % 360 + 540) % 360 - 180;
        c.style.opacity = (0.25 + Math.pow(1 - Math.abs(rel) / 180, 1.5) * 0.75).toFixed(3);
      });
    };

    let drag = false;
    let lx = 0;
    ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'bottom top', onToggle: (self) => (visible = self.isActive) });
    gsap.ticker.add((t, dt) => {
      if (!visible) return;
      if (!drag) {
        if (!paused) s.rot -= s.auto * dt / 1000;
        s.rot += s.vel;
        s.vel *= 0.94;
      }
      render();
    });
    render();

    stage.addEventListener('pointerdown', (e) => {
      drag = true; lx = e.clientX; s.vel = 0;
      stage.classList.add('is-drag');
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const d = (e.clientX - lx) * 0.22;
      lx = e.clientX;
      s.rot += d; s.vel = d;
    });
    const end = () => { drag = false; stage.classList.remove('is-drag'); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    if (fine) {
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        gsap.to(s, { tilt: -8 + ((e.clientY - r.top) / r.height - 0.5) * -8, duration: 0.8, ease: 'power3' });
      });
      stage.addEventListener('mouseenter', () => gsap.to(s, { auto: 2, duration: 0.8 }));
      stage.addEventListener('mouseleave', () => gsap.to(s, { auto: 7, tilt: -8, duration: 0.8 }));
    }
    if (!reduce) {
      gsap.set(cards, { scale: 0.45 });
      gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 80%' } })
        .to(s, { open: 1, duration: 2.2, ease })
        .fromTo(s, { rot: 110 }, { rot: 0, duration: 2.6, ease, immediateRender: false }, 0)
        .to(cards, { scale: 1, duration: 1.7, stagger: 0.035, ease }, 0);
      ScrollTrigger.create({
        trigger: '.gallery', start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => { if (!paused) s.vel += gsap.utils.clamp(-1.4, 1.4, self.getVelocity() / -4500); },
      });
      gsap.fromTo('.gallery__ilu', { yPercent: 20 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  })();

  /* =========================================================
     CÓMO TRABAJAMOS — scroll horizontal (escritorio)
     ========================================================= */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    if (reduce || !$('.process')) return;
    const track = $('.process__track');
    const dist = () => track.scrollWidth - innerWidth;
    const h = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.process', pin: '.process__pin', start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    gsap.to('.process__progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.process', start: 'top top', end: () => '+=' + dist(), scrub: true } });
    gsap.fromTo('.step__ilu', { clipPath: 'inset(100% 0% 0% 0%)', y: 40 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: '.process', start: 'top 55%' } });
    $$('.step:not(.step--intro)').forEach((st) => {
      const img = $('.step__img img', st);
      img && gsap.to(img, { scale: 1, ease: 'none', scrollTrigger: { trigger: st, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
      gsap.from(st, { y: 70, rotate: 2.5, autoAlpha: 0, duration: 1.2, ease, scrollTrigger: { trigger: st, containerAnimation: h, start: 'left 92%' } });
      const icon = $('.step__icon', st);
      icon && gsap.from(icon, { scale: 0, rotate: -120, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: st, containerAnimation: h, start: 'left 80%' } });
    });
  });
  mm.add('(max-width: 900px)', () => {
    if (reduce || !$('.process')) return;
    gsap.from('.process .step', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease, scrollTrigger: { trigger: '.process__track', start: 'top 85%' } });
  });

  /* =========================================================
     RESEÑAS — las servilletas caen sobre la mesa
     ========================================================= */
  if (!reduce && $('.reviews')) {
    gsap.from('.score__flores svg', { scale: 0, rotate: -120, duration: 1, stagger: 0.1, ease: 'back.out(2.2)', scrollTrigger: { trigger: '.score', start: 'top 88%' } });
    gsap.from('.score .btn', { y: 20, autoAlpha: 0, duration: 1, delay: 0.5, ease, scrollTrigger: { trigger: '.score', start: 'top 88%' } });
    $$('.napkin').forEach((n, i) => {
      gsap.from(n, {
        y: 120, rotate: (i % 2 ? 1 : -1) * gsap.utils.random(10, 18), scale: 0.9, autoAlpha: 0,
        duration: 1.3, delay: (i % 4) * 0.08, ease: 'back.out(1.2)', clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: n, start: 'top 92%' },
      });
      gsap.from($$('.napkin__stars svg', n), { scale: 0, duration: 0.6, stagger: 0.06, delay: 0.5, ease: 'back.out(3)', scrollTrigger: { trigger: n, start: 'top 92%' } });
    });
    gsap.matchMedia().add('(min-width: 1025px)', () => {
      $$('.table__col').forEach((col) => {
        const sp = parseFloat(col.dataset.speed);
        gsap.fromTo(col, { yPercent: sp }, { yPercent: -sp, ease: 'none', scrollTrigger: { trigger: '.table', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
  }

  /* =========================================================
     FOOTER
     ========================================================= */
  if (!reduce) {
    if ($('.footer__grid')) gsap.from('.footer__grid > div', { y: 36, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease, scrollTrigger: { trigger: '.footer__grid', start: 'top 92%' } });
    if ($('.footer__logo')) gsap.from('.footer__logo', { yPercent: 40, autoAlpha: 0, duration: 1.6, ease, scrollTrigger: { trigger: '.footer__logo', start: 'top 98%' } });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
