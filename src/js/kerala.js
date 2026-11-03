/* Interactive district map of Kerala with project density, live sites and local notes. */
import { VIEWBOX, DISTRICTS } from './kerala-paths.js';

const INFO = {
  Kasaragod: [6, 1, 31, 'Laterite plateau — excellent bearing; we quarry blocks within 40 km.'],
  Kannur: [14, 2, 29, 'Home of the best laterite in Kerala. Coastal wind loads on the beach belt.'],
  Wayanad: [9, 2, 41, 'Hill-zone rules and slopes up to 30° — retaining walls and stepped plinths.'],
  Kozhikode: [22, 3, 33, 'Gulf-returnee villas; sandy coastal soil near the beach needs raft footings.'],
  Malappuram: [17, 2, 30, 'Large family homes on laterite ridges — rainwater harvesting mandatory.'],
  Palakkad: [8, 1, 27, 'Hottest district — deep overhangs and cavity walls for summer comfort.'],
  Thrissur: [26, 4, 32, 'Paddy-land conversion rules apply — we handle the Data Bank checks.'],
  Ernakulam: [48, 7, 34, 'Coastal clay & high water table — raft or pile foundations after SPT.'],
  Idukki: [7, 2, 46, 'Munnar & Vagamon: landslide-zone norms, steep sites, cold-climate glazing.'],
  Kottayam: [19, 3, 31, 'Rubber-belt hillocks and tharavad restorations are our specialty here.'],
  Alappuzha: [11, 2, 38, 'Below-sea-level Kuttanad — elevated plinths and flood-resilient design.'],
  Pathanamthitta: [8, 1, 30, 'NRI-heavy district — most owners follow the build by weekly film.'],
  Kollam: [9, 1, 29, 'Cashew-belt plots; coastal corrosion-grade rebar near the lake shore.'],
  Thiruvananthapuram: [24, 2, 36, 'Kovalam & Varkala cliff homes — CRZ clearance managed in-house.']
};

export function initKerala({ $ }) {
  const svg = $('#keralaSvg'), tip = $('#keralaTip'), wrap = $('#keralaMap');
  const ns = 'http://www.w3.org/2000/svg';
  svg.setAttribute('viewBox', VIEWBOX);
  const tier = n => (n >= 40 ? 't4' : n >= 20 ? 't3' : n >= 12 ? 't2' : 't1');
  const els = {};

  DISTRICTS.forEach(d => {
    const [homes, live] = INFO[d.name];
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d.d); p.setAttribute('class', 'kd ' + tier(homes));
    p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button'); p.setAttribute('aria-label', `${d.name}: ${homes} homes, ${live} live sites`);
    svg.appendChild(p); els[d.name] = p;
    p.addEventListener('pointerenter', e => showTip(d, e));
    p.addEventListener('pointermove', e => moveTip(e));
    p.addEventListener('pointerleave', () => tip.classList.remove('is-on'));
    p.addEventListener('click', () => select(d.name));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d.name); } });
  });
  // pins on top of all paths
  DISTRICTS.forEach(d => {
    const [, live] = INFO[d.name];
    if (live >= 2) { const r = document.createElementNS(ns, 'circle'); r.setAttribute('cx', d.cx); r.setAttribute('cy', d.cy); r.setAttribute('r', 6); r.setAttribute('class', 'kring'); r.style.animationDelay = (Math.random() * 2).toFixed(2) + 's'; svg.appendChild(r); }
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', d.cx); c.setAttribute('cy', d.cy); c.setAttribute('r', live >= 2 ? 5 : 4); c.setAttribute('class', 'kpin' + (live >= 2 ? ' kpin--live' : '')); svg.appendChild(c);
    const t = document.createElementNS(ns, 'text'); t.setAttribute('x', d.cx + 9); t.setAttribute('y', d.cy + 3); t.setAttribute('class', 'klabel'); t.textContent = d.name === 'Thiruvananthapuram' ? 'Trivandrum' : d.name; svg.appendChild(t);
  });

  function showTip(d, e) { const [h, l] = INFO[d.name]; tip.innerHTML = `<b>${d.name}</b> · ${h} homes · ${l} live`; tip.classList.add('is-on'); moveTip(e); }
  function moveTip(e) { const r = wrap.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; }
  function select(name) {
    Object.values(els).forEach(p => p.classList.remove('is-active'));
    els[name].classList.add('is-active');
    const [h, l, permit, note] = INFO[name];
    $('#kpLabel').textContent = 'District profile';
    $('#kpName').textContent = name;
    $('#kpHomes').textContent = h; $('#kpLive').textContent = l; $('#kpPermit').textContent = permit + ' days';
    $('#kpNote').textContent = note;
    const panel = $('#keralaPanel'); panel.animate([{ opacity: .4, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  select('Ernakulam');
}
