/* Concave 3D carousel of residences — driven by the pinned scroll on desktop, by swipe/drag everywhere. */
export function initArc({ gsap, ScrollTrigger, reduce, $, $$ }) {
  const arc = $('#arc'), cards = $$('.arc__card', arc), N = cards.length;
  const count = $('#arcCount'), name = $('#arcName'), meta = $('#arcMeta');
  const pinned = matchMedia('(min-width: 761px) and (min-height: 521px)').matches && !reduce;
  let scrollOff = 0, dragOff = 0, cur = 0, center = -1;

  const wrapRel = r => { r = ((r % N) + N) % N; return r > N / 2 ? r - N : r; };
  function layout() {
    const cw = cards[0].offsetWidth || 300;
    const gap = cw * 1.06;
    for (let i = 0; i < N; i++) {
      const u = wrapRel(i - cur), a = Math.abs(u);
      const x = u * gap * (1 - Math.min(a, 4) * .04);
      const z = Math.pow(a, 1.6) * cw * .16;
      const ry = -u * 14;
      const sc = 1 + Math.max(0, 1 - a) * .08;
      const o = a > 3.6 ? Math.max(0, 1 - (a - 3.6) * 2) : 1;
      cards[i].style.transform = `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      cards[i].style.opacity = o.toFixed(3);
      cards[i].style.zIndex = String(100 - Math.round(a * 10));
    }
    const c = ((Math.round(cur) % N) + N) % N;
    if (c !== center) {
      center = c;
      cards.forEach((el, i) => {
        el.classList.toggle('is-center', i === c);
        const v = el.querySelector('video');
        if (!v) return;
        const near = Math.abs(wrapRel(i - c)) <= 1;
        if (near) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
      });
      const cap = cards[c].querySelector('figcaption');
      name.textContent = cap.querySelector('b').textContent;
      meta.textContent = cap.querySelector('span').textContent;
      count.textContent = String(c + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    }
  }

  let target = 0;
  gsap.ticker.add(() => {
    target = scrollOff + dragOff;
    const d = target - cur;
    if (Math.abs(d) > .0005) { cur += d * .09; layout(); }
  });

  // drag / swipe
  let down = false, sx = 0, start = 0, moved = 0;
  arc.addEventListener('pointerdown', e => { down = true; sx = e.clientX; start = dragOff; moved = 0; arc.setPointerCapture(e.pointerId); });
  arc.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
    dragOff = start - dx / ((cards[0].offsetWidth || 300) * 1.06);
  });
  const up = () => {
    if (!down) return; down = false;
    // snap so a card always lands in the centre
    const total = scrollOff + dragOff;
    dragOff += Math.round(total) - total;
  };
  arc.addEventListener('pointerup', up); arc.addEventListener('pointercancel', up);

  if (pinned) {
    ScrollTrigger.create({
      trigger: '#workPin', start: 'top top', end: () => '+=' + innerHeight * 2.4, pin: true, scrub: true, anticipatePin: 1,
      onUpdate: st => { scrollOff = st.progress * (N - 1); }
    });
  } else if (!reduce) {
    // gentle auto-advance on touch devices until the visitor swipes
    let idle = setInterval(() => { if (!down) dragOff = Math.round(dragOff) + 1; }, 4200);
    arc.addEventListener('pointerdown', () => { clearInterval(idle); idle = null; }, { once: true });
  }
  addEventListener('resize', layout);
  layout();
}
