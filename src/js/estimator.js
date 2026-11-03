/* Instant estimate: 4 steps, live itemised sheet, validation and WhatsApp hand-off. */
const RATES = { essential: [1850, 2150], signature: [2350, 2850], bespoke: [3200, 4200] };
const TYPE = {
  villa: { k: 1, label: 'Luxury villa' },
  home: { k: .95, label: 'Family home' },
  renovation: { k: .62, label: 'Restoration' },
  commercial: { k: 1.08, label: 'Resort / commercial' },
  interiors: { k: .42, label: 'Interiors only' }
};
const FLOORS = { g: { k: 1.07, label: 'Ground' }, g1: { k: 1, label: 'G + 1' }, g2: { k: 1.02, label: 'G + 2' }, g3: { k: 1.05, label: 'G + 3' } };
const TIERS = { essential: 'Essential', signature: 'Signature', bespoke: 'Bespoke' };
const WA = '919847000000';

export function initEstimator({ gsap, ScrollTrigger, reduce, $, $$, scrollTo }) {
  const form = $('#estForm');
  const panels = $$('.est__panel', form), stepBtns = $$('.est__step', form);
  const ink = $('#estInk'), back = $('#estBack'), next = $('#estNext'), mini = $('#estMini');
  const area = $('#area'), areaNum = $('#areaNum'), phone = $('#phone');
  const val = n => { const el = $(`input[name="${n}"]:checked`, form); return el ? el.value : null; };
  const num = n => Math.round(n).toLocaleString('en-IN');
  const inr = n => (n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : '₹' + (n / 1e5).toFixed(n >= 1e6 ? 1 : 2).replace(/\.0+$/, '') + ' L');
  let step = 0, shown = { lo: 0, hi: 0 }, tween;

  function calc() {
    const a = Math.max(500, Math.min(12000, +area.value || 2400));
    const type = val('type') || 'villa', t = TYPE[type], f = FLOORS[val('floors')] || FLOORS.g1, tier = val('tier') || 'signature', r = RATES[tier];
    const lo = a * r[0] * t.k * f.k, hi = a * r[1] * t.k * f.k;
    const months = Math.round(Math.max(3, Math.min(26, (a / 320 + 4) * (type === 'renovation' ? .6 : type === 'interiors' ? .4 : 1) * (tier === 'bespoke' ? 1.15 : 1))));
    return { a, lo, hi, t, f, tier, r, months, type };
  }
  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el.textContent === txt) return;
    el.textContent = txt; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  function render() {
    const c = calc();
    setText('sType', c.t.label); setText('sArea', num(c.a) + ' sq ft'); setText('sFloors', c.f.label); setText('sTier', TIERS[c.tier]);
    setText('sRate', '₹' + num(c.r[0] * c.t.k) + '–' + num(c.r[1] * c.t.k)); setText('sDistrict', $('#district').value); setText('sTime', c.months + '–' + (c.months + 2) + ' months');
    const max = 6e7, l = Math.sqrt(c.lo / max) * 100, w = Math.max(6, (Math.sqrt(c.hi / max) - Math.sqrt(c.lo / max)) * 100);
    $('#sheetBar').style.left = Math.min(94, l) + '%'; $('#sheetBar').style.width = w + '%';
    const paint = () => { const t = inr(shown.lo) + ' – ' + inr(shown.hi); $('#sheetRange').textContent = t; mini.textContent = t; };
    if (!reduce) {
      tween && tween.kill();
      const o = { lo: shown.lo || c.lo * .6, hi: shown.hi || c.hi * .6 };
      tween = gsap.to(o, { lo: c.lo, hi: c.hi, duration: .9, ease: 'expo.out', onUpdate: () => { shown = { lo: o.lo, hi: o.hi }; paint(); } });
    } else { shown = { lo: c.lo, hi: c.hi }; paint(); }
    area.style.setProperty('--fill', ((c.a - 500) / 11500 * 100) + '%');
  }
  area.addEventListener('input', () => { areaNum.value = area.value; render(); });
  areaNum.addEventListener('input', () => { const v = parseInt(areaNum.value, 10); if (v >= 500 && v <= 12000) { area.value = v; render(); } });
  areaNum.addEventListener('blur', () => { const v = Math.max(500, Math.min(12000, Math.round((parseInt(areaNum.value, 10) || 2400) / 50) * 50)); areaNum.value = v; area.value = v; render(); });
  form.addEventListener('change', render);
  $('#sheetDate').textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  function goStep(n) {
    step = Math.max(0, Math.min(panels.length - 1, n));
    panels.forEach((p, i) => p.classList.toggle('is-active', i === step));
    stepBtns.forEach((b, i) => { b.classList.toggle('is-active', i === step); b.classList.toggle('is-done', i < step); b.setAttribute('aria-selected', String(i === step)); });
    ink.style.transform = `translateX(calc(${step} * (100% + 4px)))`;
    back.disabled = step === 0;
    $('span', next).textContent = step === panels.length - 1 ? 'Get my estimate' : 'Continue';
    setTimeout(() => ScrollTrigger.refresh(), 60);
  }
  stepBtns.forEach(b => b.addEventListener('click', () => { const n = +b.dataset.goto; if (n > step && !validate(step)) return; goStep(n); }));
  back.addEventListener('click', () => goStep(step - 1));
  next.addEventListener('click', () => {
    if (!validate(step)) return;
    if (step < panels.length - 1) { goStep(step + 1); const r = form.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * .5) scrollTo(form, -90); }
    else submit();
  });

  phone.addEventListener('input', () => { const d = phone.value.replace(/\D/g, '').slice(0, 10); phone.value = d.length > 5 ? d.slice(0, 5) + ' ' + d.slice(5) : d; clearErr(phone); });
  ['#name', '#email'].forEach(s => $(s).addEventListener('input', e => clearErr(e.target)));
  function setErr(input, msg) { const f = input.closest('.field'); f.classList.add('is-invalid'); $('.field__err', f).textContent = msg; input.setAttribute('aria-invalid', 'true'); }
  function clearErr(input) { const f = input.closest('.field'); f.classList.remove('is-invalid'); $('.field__err', f).textContent = ''; input.removeAttribute('aria-invalid'); }
  function validate(s) {
    if (s !== 3) return true;
    let first = null;
    const name = $('#name'), email = $('#email');
    if (name.value.trim().length < 2) { setErr(name, 'Please tell us your name.'); first = first || name; }
    if (!/^[6-9]\d{9}$/.test(phone.value.replace(/\D/g, ''))) { setErr(phone, 'Enter a 10-digit Indian mobile number.'); first = first || phone; }
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { setErr(email, 'That email looks incomplete.'); first = first || email; }
    if (first) { first.focus({ preventScroll: true }); if (!reduce) gsap.fromTo(form, { x: -6 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' }); }
    return !first;
  }

  function submit() {
    const c = calc(), d = new Date();
    const data = {
      type: c.type, stage: val('stage'), area: c.a, floors: val('floors'), tier: c.tier, district: $('#district').value,
      locality: $('#locality').value.trim(), timeline: val('timeline'), nri: $('#nri').checked,
      name: $('#name').value.trim(), phone: '+91' + phone.value.replace(/\D/g, ''), email: $('#email').value.trim(),
      notes: $('#notes').value.trim(), whatsapp: $('#wa').checked, estimate: { low: Math.round(c.lo), high: Math.round(c.hi), months: c.months }
    };
    // Prototype: no backend yet — POST `data` to the CRM / Google Sheet endpoint here.
    console.info('[Latera] quote request', data);
    const ref = 'LTR-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000);
    $('#doneRef').textContent = `REF · ${ref} · ${inr(c.lo)} – ${inr(c.hi)}`;
    $('#doneName').textContent = data.name.split(' ')[0];
    const msg = `Hi Latera, I just requested an estimate (${ref}).\n${c.t.label}, ${num(c.a)} sq ft, ${c.f.label}, ${TIERS[c.tier]} finish\nSite: ${data.locality ? data.locality + ', ' : ''}${data.district}\nEstimate: ${inr(c.lo)} – ${inr(c.hi)}`;
    $('#doneWa').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    const done = $('#estDone'); done.hidden = false; form.classList.add('is-done');
    if (!reduce) gsap.fromTo(done, { clipPath: 'circle(0% at 85% 92%)' }, { clipPath: 'circle(150% at 85% 92%)', duration: 1.1, ease: 'expo.inOut' });
    setTimeout(() => ScrollTrigger.refresh(), 100);
  }
  $('#estReset').addEventListener('click', () => {
    $('#estDone').hidden = true; form.classList.remove('is-done');
    ['name', 'phone', 'email', 'notes', 'locality'].forEach(id => ($('#' + id).value = ''));
    goStep(0); ScrollTrigger.refresh();
  });

  // hero shortcuts preset the project type
  $$('[data-quick]').forEach(b => b.addEventListener('click', () => {
    const r = $(`input[name="type"][value="${b.dataset.quick}"]`, form);
    if (r) { r.checked = true; render(); }
    goStep(0); scrollTo('#quote');
  }));

  render(); goStep(0);
}
