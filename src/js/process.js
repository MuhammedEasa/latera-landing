/* The Latera Method — pinned scroll that drives the 3D build and the stage card. */
const DATA = [
  { wk: 'Week 1–2', t: 'Survey & drawings', d: 'Total-station survey, soil test and a KMBR-compliant drawing set — signed off by you before anything is priced.', c: ['Soil SBC test', '3D walkthrough', 'Vasthu review'], img: 'villa-dusk-lines.jpg' },
  { wk: 'Week 3–6', t: 'Footings & plinth', d: 'Isolated footings sized to your soil, a 600 mm plinth and three layers of waterproofing against Kerala groundwater.', c: ['Anti-termite', 'Crystalline seal', 'Plinth beam'], img: 'pour.jpg' },
  { wk: 'Week 7–16', t: 'RCC frame & slabs', d: 'M25 concrete, Fe550D steel and a cube test on every pour — the lab report lands on your WhatsApp the same week.', c: ['Cube-tested', 'Tower crane', 'Rebar audit'], img: 'rebar.jpg' },
  { wk: 'Week 17–24', t: 'Laterite masonry', d: 'Hand-dressed laterite from Kannur quarries — walls that breathe through the humidity and stay cool in April.', c: ['200 mm laterite', 'CM 1:6', 'Daily HSE'], img: 'frame.jpg' },
  { wk: 'Week 25–30', t: 'Roof & weatherproofing', d: 'Teak rafters, Mangalore-pattern clay tile at 30° and 1.2 m overhangs that shed a full monsoon in seconds.', c: ['30° pitch', '1:40 slab fall', '1.2 m eaves'], img: 'cranes.jpg' },
  { wk: 'Week 31–44', t: 'Finishes & keys', d: 'Lime plaster, teak louvres, glazing, pool and landscape — then a snag list closed before you collect the keys.', c: ['Snag-free', 'Pool & deck', '10-yr warranty'], img: 'villa-dusk.jpg' }
];
const EDGES = [0, .14, .30, .50, .68, .82];

export function initProcess({ ScrollTrigger, reduce, $, $$ }) {
  const pin = $('#processPin'), stage = $('#processStage');
  const card = $('#pcard'), num = $('#pNum'), wk = $('#pWk'), title = $('#pTitle'), desc = $('#pDesc'), chips = $('#pChips'), img = $('#pImg');
  const bar = $('#pBar'), pct = $('#pPct'), steps = $$('#ptimeline li');
  let api = null, cur = -1, p = 0;

  DATA.forEach(s => { const i = new Image(); i.src = `./assets/img/${s.img}`; });

  function setStage(i) {
    if (i === cur) return; cur = i;
    const s = DATA[i];
    num.textContent = String(i + 1).padStart(2, '0');
    wk.textContent = s.wk; title.textContent = s.t; desc.textContent = s.d;
    chips.innerHTML = s.c.map(c => `<li>${c}</li>`).join('');
    img.src = `./assets/img/${s.img}`;
    card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
    steps.forEach((li, k) => li.classList.toggle('is-on', k <= i));
  }
  function update(v) {
    p = v;
    api && api.setProgress(p);
    bar.style.transform = `scaleX(${p})`;
    pct.textContent = String(Math.round(p * 100)).padStart(2, '0');
    let s = 0; for (let i = 0; i < EDGES.length; i++) if (p >= EDGES[i]) s = i;
    setStage(s);
  }

  // load three.js only when the section approaches
  const boot = () => {
    if (api !== null) return;
    api = false;
    const gl = document.createElement('canvas');
    if (!(gl.getContext('webgl2') || gl.getContext('webgl'))) { stage.classList.add('is-fallback'); return; }
    import('./scene.js').then(({ createBuildScene }) => {
      api = createBuildScene(stage, $('#processLabels'), {
        small: matchMedia('(max-width: 760px)').matches,
        lowPower: (navigator.hardwareConcurrency || 8) <= 4,
        avoid: () => [$('.process__head'), card, $('.process__hud')]
      });
      api.setProgress(p);
    }).catch(() => stage.classList.add('is-fallback'));
  };
  new IntersectionObserver(([e]) => e.isIntersecting && boot(), { rootMargin: '600px' }).observe(pin);

  if (reduce) { update(1); return; }
  ScrollTrigger.create({
    trigger: pin, start: 'top top', end: () => '+=' + innerHeight * 5,
    pin: true, scrub: true, anticipatePin: 1,
    onUpdate: st => update(st.progress)
  });
  update(0);
}
