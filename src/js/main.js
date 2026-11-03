import '../css/style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHero } from './hero.js';
import { initProcess } from './process.js';
import { initKerala } from './kerala.js';
import { initArc } from './arc.js';
import { initEstimator } from './estimator.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (reduce) root.classList.add('no-motion');

export const ctx = { gsap, ScrollTrigger, reduce, fine, $, $$, lenis: null, scrollTo: null };

/* ---------- smooth scroll ---------- */
if (!reduce) {
  ctx.lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  ctx.lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => ctx.lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  ctx.lenis.stop();
}
ctx.scrollTo = (target, offset = 0) => {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (ctx.lenis) ctx.lenis.scrollTo(el, { offset, duration: 1.6 });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  if (id.length < 2 || !$(id)) return;
  e.preventDefault(); closeMenu(); ctx.scrollTo(id);
}));

/* ---------- loader: line drawing → colour curtains ---------- */
const msgs = ['Surveying the plot', 'Testing the soil', 'Casting the plinth', 'Raising the frame', 'Handing over the keys'];
function startPage() {
  document.body.classList.remove('is-loading');
  ctx.lenis && ctx.lenis.start();
  heroIntro();
}
(function loader() {
  const L = $('#loader');
  if (reduce) { L.remove(); startPage(); return; }
  const count = { v: 0 }, cEl = $('#loaderCount'), mEl = $('#loaderMsg');
  const tl = gsap.timeline({ onComplete: () => L.remove() });
  tl.to('.loader__draw path', { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .12 }, 0)
    .to('.loader__ml', { opacity: 1, y: -6, duration: .8, ease: 'power3.out' }, .5)
    .to(count, { v: 100, duration: 2.1, ease: 'power2.inOut', onUpdate() { const v = Math.round(count.v); cEl.textContent = v; mEl.textContent = msgs[Math.min(4, Math.floor(v / 20.5))]; } }, 0)
    .to('.loader__inner', { y: -30, opacity: 0, duration: .5, ease: 'power3.in' }, 2.15)
    .to('.curtain', { y: '0%', duration: .7, ease: 'expo.inOut', stagger: .08 }, 2.2)
    .set(L, { background: 'transparent' })
    .add(startPage, 2.9)
    .to('.curtain', { y: '-100%', duration: .9, ease: 'expo.inOut', stagger: -.08 }, 2.95);
})();

function heroIntro() {
  if (reduce) return;
  gsap.fromTo('.hero__title .ln > span', { yPercent: 110 }, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: .09, delay: .1 });
  gsap.fromTo('.hero__side, .hero__bar, .hero__top', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: .08, delay: .35 });
  gsap.fromTo('.hero__frame', { scale: 1.06, borderRadius: 0 }, { scale: 1, borderRadius: getComputedStyle($('.hero__frame')).borderRadius, duration: 1.8, ease: 'expo.out', clearProps: 'borderRadius' });
  gsap.fromTo('.nav', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', delay: .3 });
}

/* ---------- nav ---------- */
const nav = $('#nav'), dock = $('#dock');
let lastY = 0;
const darkZones = () => $$('.hero__frame, .voices, .process__ui .pcard');
const dockAvoid = $$('.est, #processPin, .work__pin');
function onScroll(y) {
  const heroBottom = $('.hero').getBoundingClientRect().bottom;
  nav.classList.toggle('is-solid', heroBottom < 90);
  if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY + 2 && y > innerHeight);
  if (dock) {
    const blocked = dockAvoid.some(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight - 40 && r.bottom > 80; });
    dock.classList.toggle('is-on', y > innerHeight * .6 && !blocked);
  }
  lastY = y;
}
ctx.lenis ? ctx.lenis.on('scroll', e => onScroll(e.scroll)) : addEventListener('scroll', () => onScroll(scrollY), { passive: true });
onScroll(scrollY);

const navLinks = $$('.nav__links a');
navLinks.forEach(a => {
  const sec = $(a.getAttribute('href')); if (!sec) return;
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { navLinks.forEach(l => l.classList.remove('is-active')); a.classList.add('is-active'); } }, { rootMargin: '-45% 0px -50% 0px' }).observe(sec);
});

const burger = $('#burger'), menu = $('#menu');
function closeMenu() {
  document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true');
  ctx.lenis && ctx.lenis.start();
}
burger.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-hidden', String(!open));
  nav.classList.remove('is-hidden');
  ctx.lenis && (open ? ctx.lenis.stop() : ctx.lenis.start());
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ---------- hero scroll ---------- */
initHero(ctx);
if (!reduce) {
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__frame', { scale: .94, y: 40, ease: 'none' }, 0)
    .to('.hero__body', { y: -80, opacity: .3, ease: 'none' }, 0);
}

/* ---------- manifesto word reveal ---------- */
const mt = $('#manifestoText');
[...mt.childNodes].forEach(n => {
  if (n.nodeType !== 3) return;
  const f = document.createDocumentFragment();
  n.textContent.split(/(\s+)/).forEach(p => {
    if (!p) return;
    if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(' ')); return; }
    const s = document.createElement('span'); s.className = 'w'; s.textContent = p; f.appendChild(s);
  });
  mt.replaceChild(f, n);
});
if (!reduce) {
  gsap.fromTo($$('.w, .pill-vid', mt), { opacity: .13 }, { opacity: 1, ease: 'none', stagger: .05, scrollTrigger: { trigger: mt, start: 'top 80%', end: 'bottom 45%', scrub: .6 } });
  gsap.fromTo($$('.pill-vid', mt), { width: 0 }, { width: '2.3em', duration: 1.4, ease: 'expo.out', stagger: .2, scrollTrigger: { trigger: mt, start: 'top 72%' } });
}

/* ---------- counters ---------- */
$$('[data-count]').forEach(el => {
  const end = +el.dataset.count, dec = +(el.dataset.dec || 0), fmt = v => v.toFixed(dec);
  if (reduce) { el.textContent = fmt(end); return; }
  const o = { v: 0 }; el.textContent = fmt(0);
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', onUpdate: () => (el.textContent = fmt(o.v)) }) });
});

/* ---------- reveals ---------- */
if (!reduce) {
  $$('.h2').forEach(h => gsap.fromTo(h, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));
  gsap.fromTo('.tile', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.bento', start: 'top 85%' } });
  gsap.fromTo('.monsoon', { clipPath: 'inset(10% 6% 10% 6% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 30px)', ease: 'none', scrollTrigger: { trigger: '.monsoon', start: 'top 95%', end: 'top 35%', scrub: true } });
  gsap.fromTo('.monsoon__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.monsoon', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.monsoon__specs li', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.monsoon__specs', start: 'top 92%' } });
  gsap.fromTo('.compare', { clipPath: 'inset(14% 14% 14% 14% round 30px)' }, { clipPath: 'inset(0% 0% 0% 0% round 30px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.compare', start: 'top 80%' } });
  gsap.fromTo('.est__form, .sheet', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.est', start: 'top 85%' } });
  gsap.fromTo('.foot__word span', { yPercent: 30 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot__word', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('.places__track', { x: 0 }, { x: -200, ease: 'none', scrollTrigger: { trigger: '.places', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ---------- services: stacked cards scale back ---------- */
const cards = $$('.scard');
cards.forEach((c, i) => c.style.setProperty('--i', i));
if (!reduce && matchMedia('(min-height: 521px)').matches) {
  cards.forEach((c, i) => {
    if (i === cards.length - 1) return;
    gsap.to(c, { scale: .92, filter: 'brightness(.86)', ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top+=120', scrub: true } });
  });
}

/* ---------- autoplay videos only while visible ---------- */
const vids = $$('video:not(.hero__vid)');
const vio = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
}), { rootMargin: '120px' });
vids.forEach(v => { v.removeAttribute('autoplay'); vio.observe(v); });

/* ---------- compare ---------- */
(function compare() {
  const cmp = $('#compare'), range = $('#compareRange');
  const set = v => cmp.style.setProperty('--pos', v + '%');
  range.addEventListener('input', () => set(range.value));
  let drag = false;
  const from = e => { const r = cmp.getBoundingClientRect(); const v = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)); range.value = v; set(v); };
  cmp.addEventListener('pointerdown', e => { drag = true; from(e); });
  addEventListener('pointerup', () => (drag = false));
  cmp.addEventListener('pointermove', e => drag && from(e));
  if (!reduce) {
    const o = { v: 50 };
    ScrollTrigger.create({ trigger: cmp, start: 'top 65%', once: true, onEnter: () => gsap.timeline().to(o, { v: 80, duration: 1.1, ease: 'power3.inOut', onUpdate: () => { range.value = o.v; set(o.v); } }).to(o, { v: 28, duration: 1.3, ease: 'power3.inOut', onUpdate: () => { range.value = o.v; set(o.v); } }).to(o, { v: 50, duration: 1, ease: 'power3.inOut', onUpdate: () => { range.value = o.v; set(o.v); } }) });
  }
})();

/* ---------- testimonials ---------- */
(function voices() {
  const qs = $$('.quote'), btns = $$('.quotes__nav button');
  let i = 0, timer;
  const go = n => {
    i = (n + qs.length) % qs.length;
    qs.forEach((q, k) => q.classList.toggle('is-active', k === i));
    btns.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.classList.toggle('is-done', k < i); });
    clearTimeout(timer); timer = setTimeout(() => go(i + 1), 6000);
  };
  btns.forEach((b, k) => b.addEventListener('click', () => go(k)));
  new IntersectionObserver(([e]) => { if (e.isIntersecting) go(i); else clearTimeout(timer); }).observe($('#quotes'));
})();

/* ---------- FAQ ---------- */
$$('.acc__item').forEach(it => {
  const q = $('.acc__q', it);
  q.addEventListener('click', () => {
    const open = !it.classList.contains('is-open');
    $$('.acc__item.is-open').forEach(o => { if (o !== it) { o.classList.remove('is-open'); $('.acc__q', o).setAttribute('aria-expanded', 'false'); } });
    it.classList.toggle('is-open', open); q.setAttribute('aria-expanded', String(open));
    setTimeout(() => ScrollTrigger.refresh(), 650);
  });
});

/* ---------- cursor + magnetic ---------- */
if (fine && !reduce) {
  root.classList.add('has-cursor');
  const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), lab = $('.cursor__ring em');
  const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
  const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  addEventListener('pointermove', e => {
    if (!cur.classList.contains('is-on')) { gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); cur.classList.add('is-on'); }
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    const t = e.target, l = t.closest && t.closest('[data-cursor]');
    cur.classList.toggle('is-label', !!l);
    cur.classList.toggle('is-hover', !l && !!(t.closest && t.closest('a, button, label, input, select, textarea')));
    lab.textContent = l ? l.dataset.cursor : '';
    cur.classList.toggle('on-dark', !!(t.closest && t.closest('.hero__frame, .voices, .monsoon, .tile--emerald, .tile--ink, .scard--ink, .scard--emerald, .sheet, .est__done')));
  });
  root.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  $$('.magnetic').forEach(b => {
    const mx = gsap.quickTo(b, 'x', { duration: .7, ease: 'elastic.out(1,.4)' }), my = gsap.quickTo(b, 'y', { duration: .7, ease: 'elastic.out(1,.4)' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .4); });
    b.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* ---------- sections with their own modules ---------- */
initProcess(ctx);
initKerala(ctx);
initArc(ctx);
initEstimator(ctx);

addEventListener('load', () => ScrollTrigger.refresh());
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
