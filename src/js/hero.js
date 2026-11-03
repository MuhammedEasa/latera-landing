/* Hero: three real scenes (dusk / golden hour / monsoon) with a mist cross-fade and canvas rain. */
export function initHero({ gsap, reduce, $, $$ }) {
  const hero = $('#hero');
  const vids = $$('.hero__vid', hero);
  const btns = $$('.scene-toggle button', hero);
  const ink = $('.scene-toggle__ink', hero);
  const mist = $('#heroMist');
  const mobile = matchMedia('(max-width: 760px)').matches;
  let current = 'dusk', auto, userPicked = false;

  const load = v => {
    if (v.src) return;
    v.src = (mobile && v.dataset.srcM) || v.dataset.src;
    v.load();
  };
  load(vids[0]);
  vids[0].play().catch(() => {});
  // warm the other scenes once the page is idle
  addEventListener('load', () => setTimeout(() => vids.slice(1).forEach(v => { v.preload = 'auto'; load(v); }), 1500));

  function placeInk(btn) {
    const r = btn.getBoundingClientRect(), pr = btn.parentElement.getBoundingClientRect();
    ink.style.width = r.width + 'px';
    ink.style.transform = `translateX(${r.left - pr.left}px)`;
  }
  function setScene(name) {
    if (name === current) return;
    current = name;
    const next = vids.find(v => v.dataset.scene === name);
    load(next); next.currentTime = 0; next.play().catch(() => {});
    btns.forEach(b => { const on = b.dataset.scene === name; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on)); if (on) placeInk(b); });
    if (!reduce) gsap.fromTo(mist, { opacity: 0, scale: .9 }, { opacity: .9, scale: 1.1, duration: .6, ease: 'power2.in', yoyo: true, repeat: 1 });
    setTimeout(() => vids.forEach(v => v.classList.toggle('is-active', v === next)), reduce ? 0 : 450);
    hero.classList.toggle('is-monsoon', name === 'monsoon');
  }
  btns.forEach(b => b.addEventListener('click', () => { userPicked = true; clearInterval(auto); setScene(b.dataset.scene); }));
  requestAnimationFrame(() => placeInk(btns[0]));
  addEventListener('resize', () => placeInk(btns.find(b => b.classList.contains('is-active'))));

  // gentle auto-tour until the visitor picks a scene
  const order = ['dusk', 'golden', 'monsoon'];
  if (!reduce) auto = setInterval(() => { if (!userPicked && document.visibilityState === 'visible' && hero.getBoundingClientRect().bottom > 0) setScene(order[(order.indexOf(current) + 1) % 3]); }, 9000);

  // pause hero video off-screen
  new IntersectionObserver(([e]) => { const v = vids.find(x => x.classList.contains('is-active')); if (!v) return; e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(hero);

  /* ---------- rain ---------- */
  const cv = $('#heroRain'), g = cv.getContext('2d');
  let drops = [], W = 0, H = 0, running = false;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
    drops = Array.from({ length: Math.round(W * H / 5200) }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 18, v: 9 + Math.random() * 10, a: .15 + Math.random() * .35 }));
  }
  function tick() {
    if (!hero.classList.contains('is-monsoon') || reduce) { running = false; g.clearRect(0, 0, W, H); return; }
    g.clearRect(0, 0, W, H);
    g.lineWidth = 1;
    for (const d of drops) {
      g.strokeStyle = `rgba(220,235,245,${d.a})`;
      g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x - d.l * .18, d.y + d.l); g.stroke();
      d.y += d.v; d.x -= d.v * .18;
      if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 100); }
    }
    requestAnimationFrame(tick);
  }
  size(); addEventListener('resize', size);
  new MutationObserver(() => { if (hero.classList.contains('is-monsoon') && !running) { running = true; tick(); } }).observe(hero, { attributes: true, attributeFilter: ['class'] });
}
