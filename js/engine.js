/* Geo-Detective: game engine
 * Cases are data. This file never needs editing to add a case or a tier.
 * License: CC BY-SA 4.0
 */
(function () {
  'use strict';
  const GW = (window.GW = window.GW || {});
  GW.cases = GW.cases || [];
  GW.tiers = GW.tiers || [
    { id: 'easy', label: 'Easy', blurb: 'Clean example. One or two wells whose logs mostly agree.' },
    { id: 'medium', label: 'Medium', blurb: 'Noisier seismic, wells farther apart, logs that partly disagree.' },
    { id: 'hard', label: 'Hard', blurb: 'Poor imaging and correlations that change with the log trusted.' },
    { id: 'advanced', label: 'Advanced', blurb: 'Few or no wells. The distribution rests on seismic character.' }
  ];

  const LOGS = {
    GR: { label: 'Gamma ray', unit: 'API', min: 0, max: 150, term: 'gamma-ray' },
    CALI: { label: 'Caliper', unit: 'in', min: 6, max: 16, term: 'caliper' },
    RES: { label: 'Resistivity', unit: 'ohm-m', min: 0.2, max: 2000, log: true, term: 'resistivity' },
    RHOB: { label: 'Bulk density', unit: 'g/cm³', min: 1.95, max: 2.95, term: 'bulk-density' },
    NPHI: { label: 'Neutron porosity', unit: 'v/v', min: 0.45, max: -0.15, term: 'neutron' },
    DT: { label: 'Sonic', unit: 'us/ft', min: 190, max: 40, term: 'sonic' },
    DN: { label: 'Density–neutron', combo: ['RHOB', 'NPHI'] }
  };
  const TOP_COLORS = ['#841617', '#2F6690', '#4F7A28', '#A86A12', '#6D4C8D', '#1F7A7A'];
  const CAND_COLORS = ['#841617', '#2F6690', '#A86A12', '#4F7A28', '#6D4C8D'];

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const pct = (v) => Math.round(v * 100) + '%';

  const S = { c: null, session: [], tier: 'easy' };

  /* ---------- registration and validation ---------- */
  function validate(c) {
    const errors = [], warnings = [];
    if (!c || typeof c !== 'object') return { errors: ['Case is not an object.'], warnings };
    if (!c.id) errors.push('Missing "id".');
    if (!c.title) warnings.push('Missing "title".');
    if (!c.tier) errors.push('Missing "tier".');
    if (!c.seismic || !['synthetic', 'image'].includes(c.seismic.type)) errors.push('"seismic.type" must be "synthetic" or "image".');
    else if (c.seismic.type === 'synthetic' && !c.seismic.model) errors.push('Synthetic seismic needs a "model".');
    else if (c.seismic.type === 'image' && !(c.seismic.src && c.seismic.width_m && c.seismic.depth_m)) errors.push('Image seismic needs "src", "width_m" and "depth_m".');
    if (!Array.isArray(c.candidates) || c.candidates.length < 2) errors.push('At least two "candidates" are required.');
    const ec = c.expertConsensus || {};
    (c.candidates || []).forEach((k) => { if (!(k.id in ec)) errors.push('No expert weight for candidate "' + k.id + '".'); });
    const sum = Object.values(ec).reduce((a, b) => a + Number(b || 0), 0);
    if (sum > 0 && Math.abs(sum - 1) > 0.01) warnings.push('Expert weights sum to ' + sum.toFixed(2) + ' and were normalized.');
    const names = (c.wells || []).map((w) => w.name);
    (c.tops || []).forEach((t) => Object.keys(t.expert || {}).forEach((w) => { if (!names.includes(w)) errors.push('Top "' + t.name + '" refers to unknown well "' + w + '".'); }));
    (c.wells || []).forEach((w) => {
      if (w.x_m == null) errors.push('Well "' + w.name + '" has no x_m.');
      if (!w.logData && c.seismic && c.seismic.type !== 'synthetic') errors.push('Well "' + w.name + '" needs "logData" when seismic is an image.');
    });
    return { errors, warnings };
  }
  GW.validateCase = validate;

  GW.registerTier = function (t) {
    if (!GW.tiers.find((x) => x.id === t.id)) GW.tiers.push(t);
    if (GW._ready) renderTiers();
  };

  GW.registerCase = function (c) {
    const v = validate(c);
    if (v.errors.length) { console.warn('Case rejected', c && c.id, v.errors); return v; }
    const i = GW.cases.findIndex((x) => x.id === c.id);
    if (i >= 0) GW.cases[i] = c; else GW.cases.push(c);
    if (!GW.tiers.find((t) => t.id === c.tier)) GW.tiers.push({ id: c.tier, label: c.tier, blurb: '' });
    if (GW._ready) renderTiers();
    return v;
  };

  /* ---------- glossary ---------- */
  function gloss(k) { return (S.c && S.c.glossary && S.c.glossary[k]) || (GW.glossary || {})[k]; }
  function rich(s) {
    return esc(s).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, k, l) => {
      const g = gloss(k);
      if (!g) return l || k;
      const text = l || g[0].charAt(0).toLowerCase() + g[0].slice(1);
      return '<button type="button" class="term" data-term="' + esc(k) + '">' + text + '</button>';
    });
  }
  function termsIn(s) { const out = []; String(s || '').replace(/\[\[([^\]|]+)/g, (m, k) => out.push(k)); return out; }
  function showTerm(btn) {
    const g = gloss(btn.dataset.term); if (!g) return;
    const pop = $('#termPop');
    pop.innerHTML = '<div class="term-title">' + esc(g[0]) + '</div><p>' + esc(g[1]) + '</p><button type="button" class="term-close" aria-label="Close">×</button>';
    pop.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.left = clamp(r.left + window.scrollX, 12, window.scrollX + window.innerWidth - w - 12) + 'px';
    pop.style.top = r.bottom + window.scrollY + 6 + 'px';
    pop.querySelector('.term-close').focus();
  }

  /* ---------- tiers and case list ---------- */
  function renderTiers() {
    const nav = $('#tiers');
    nav.innerHTML = GW.tiers.map((t) => {
      const n = GW.cases.filter((c) => c.tier === t.id).length;
      return '<button type="button" role="tab" aria-selected="' + (t.id === S.tier) + '" data-tier="' + esc(t.id) + '"' + (n ? '' : ' disabled') + '>' + esc(t.label) + '<span class="count">' + n + '</span></button>';
    }).join('');
    renderCaseList();
  }
  function renderCaseList() {
    const t = GW.tiers.find((x) => x.id === S.tier) || {};
    const list = GW.cases.filter((c) => c.tier === S.tier);
    $('#tierBlurb').textContent = t.blurb || '';
    $('#caseList').innerHTML = list.map((c) =>
      '<button type="button" class="case-card' + (S.c && S.c.id === c.id ? ' current' : '') + '" data-case="' + esc(c.id) + '"><span class="case-name">' + esc(c.title || c.id) + '</span><span class="case-sum">' + esc(c.summary || '') + '</span></button>'
    ).join('');
  }

  /* ---------- loading a case ---------- */
  function loadCase(id) {
    const c = GW.cases.find((x) => x.id === id); if (!c) return;
    S.c = c; S.tier = c.tier;
    const cands = c.candidates;
    const ec = c.expertConsensus; const esum = cands.reduce((a, k) => a + Number(ec[k.id] || 0), 0) || 1;
    Object.assign(S, {
      expert: Object.fromEntries(cands.map((k) => [k.id, Number(ec[k.id] || 0) / esum])),
      raw: Object.fromEntries(cands.map((k) => [k.id, 50])),
      relied: new Set(), picks: {}, submitted: false, flatten: '', logType: 'GR',
      viewed: new Set(['GR']), flattenUsed: false, domain: 'depth', gain: 1, cmap: 'gray', showWells: true, hoverY: null, img: null, section: null
    });
    (c.tops || []).forEach((t) => (S.picks[t.name] = {}));
    S.activeTop = c.tops && c.tops.length ? c.tops[0].name : null;

    S.width_m = c.seismic.type === 'synthetic' ? c.seismic.model.width_m : c.seismic.width_m;
    S.depth_m = c.seismic.type === 'synthetic' ? c.seismic.model.depth_m : c.seismic.depth_m;
    S.refX = S.width_m / 2;
    $('#building').hidden = false;
    setTimeout(() => {
      if (S.c !== c) return;
      GW._built = GW._built || new WeakMap();
      if (c.seismic.type === 'synthetic') {
        if (!GW._built.has(c)) GW._built.set(c, GW.buildSection(c.seismic.model, c.seismic));
        S.section = GW._built.get(c);
        S._imgKey = null;
      } else {
        S.img = new Image(); S.img.onload = drawSeis; S.img.src = c.seismic.src;
      }
      S.logs = {};
      (c.wells || []).forEach((w, i) => {
        S.logs[w.name] = w.logData || (c.seismic.type === 'synthetic' ? GW.buildWellLogs(c.seismic.model, w, (c.seismic.seed || 1) * 31 + i) : null);
      });
      S.expertTops = {};
      (c.tops || []).forEach((t) => {
        S.expertTops[t.name] = {};
        Object.entries(t.expert || {}).forEach(([wn, e]) => {
          const w = c.wells.find((x) => x.name === wn);
          let d = e.absent ? null : e.depth;
          if (d === 'model') d = c.seismic.type === 'synthetic' ? GW.modelTopAtWell(c.seismic.model, w, e.layer || t.name) : null;
          S.expertTops[t.name][wn] = { depth: d, unc: e.unc_m || 0, absent: !!e.absent || d == null, note: e.note || '' };
        });
      });
      $('#building').hidden = true;
      renderCase();
    }, 30);

    try { history.replaceState(null, '', '#case=' + encodeURIComponent(c.id)); } catch (e) { /* file:// */ }
    renderTiers();
  }

  function renderCase() {
    const c = S.c;
    $('#game').hidden = false;
    $('#caseTitle').textContent = c.title || c.id;
    $('#caseTier').textContent = (GW.tiers.find((t) => t.id === c.tier) || { label: c.tier }).label;
    $('#caseBrief').innerHTML = rich(c.brief || '');
    const hasWells = c.wells && c.wells.length;
    $('#board').classList.toggle('no-wells', !hasWells);
    $('#logPanel').hidden = !hasWells;
    $('#seisImageNote').hidden = c.seismic.type !== 'image';
    $('#cmap').disabled = $('#gain').disabled = c.seismic.type === 'image';
    $('#cmap').value = S.cmap; $('#domain').value = S.domain; $('#domain').disabled = c.seismic.type === 'image'; $('#gain').value = 1; $('#gainOut').textContent = '1.0×';

    if (hasWells) {
      const avail = new Set();
      Object.values(S.logs).forEach((L) => L && Object.keys(LOGS).forEach((k) => (LOGS[k].combo ? LOGS[k].combo.every((q) => L[q]) : L[k]) && avail.add(k)));
      $('#logType').innerHTML = Object.entries(LOGS).map(([k, L]) =>
        '<button type="button" data-log="' + k + '" aria-pressed="' + (k === S.logType) + '"' + (avail.has(k) ? '' : ' disabled') + ' title="' + L.label + '">' + (L.combo ? 'D–N' : k) + '</button>'
      ).join('');
      S.availLogs = avail;
      const tops = c.tops || [];
      $('#topWrap').hidden = !tops.length;
      $('#activeTop').innerHTML = tops.map((t, i) => '<option value="' + esc(t.name) + '">' + esc(t.name) + '</option>').join('');
      $('#topLegend').innerHTML = tops.map((t, i) => '<span><i style="background:' + TOP_COLORS[i % TOP_COLORS.length] + '"></i>' + esc(t.name) + '</span>').join('') + (tops.length ? '<span class="key-dash">Dashed line and band after submitting: panel pick ± uncertainty</span>' : '');
      $('#flatten').innerHTML = '<option value="">Depth</option>' + tops.map((t) => '<option value="' + esc(t.name) + '">Flattened on ' + esc(t.name) + '</option>').join('');
      $('#wellNotes').innerHTML = c.wells.map((w) =>
        '<li><strong>' + esc(w.name) + '</strong> ±' + (w.depthUncertainty_m || 0) + ' m' + (w.logs ? ', logs: ' + w.logs.map((k) => LOGS[k].label.toLowerCase()).join(', ') + (w.quality === 'old' ? ' (older tools)' : '') : '') + '. ' + rich(w.note || '') + '</li>'
      ).join('');
    }

    $('#candidates').innerHTML = c.candidates.map((k, i) =>
      '<article class="cand" style="--cand:' + CAND_COLORS[i % CAND_COLORS.length] + '">' +
      '<h4>' + esc(k.label) + '</h4><p>' + rich(k.description || '') + '</p>' +
      '<div class="proscons"><div><h5>For</h5><ul>' + (k.pros || []).map((p) => '<li>' + rich(p) + '</li>').join('') + '</ul></div>' +
      '<div><h5>Against</h5><ul>' + (k.cons || []).map((p) => '<li>' + rich(p) + '</li>').join('') + '</ul></div></div>' +
      '<label class="wt"><span class="sr-only">Weight for ' + esc(k.label) + '</span><input type="range" min="0" max="100" step="1" value="50" data-cand="' + esc(k.id) + '"><output data-share="' + esc(k.id) + '"></output></label>' +
      '</article>'
    ).join('');

    $('#evidence').innerHTML = (c.evidence || []).length
      ? '<h4>Evidence relied on</h4>' + c.evidence.map((e) => '<label class="ev"><input type="checkbox" data-ev="' + esc(e.id) + '"> <span>' + rich(e.label) + '</span></label>').join('')
      : '';
    $('#justifyWrap').hidden = !(c.requireJustification || c.tier === 'advanced');
    $('#justify').value = '';
    $('#submitMsg').textContent = '';
    $('#submit').disabled = false;
    $('#debrief').hidden = true;
    document.body.classList.remove('locked');
    updateShares();
    requestAnimationFrame(() => { drawSeis(); drawLogs(); });
  }

  /* ---------- weights ---------- */
  function shares() {
    const ids = S.c.candidates.map((k) => k.id);
    const sum = ids.reduce((a, id) => a + S.raw[id], 0);
    return Object.fromEntries(ids.map((id) => [id, sum ? S.raw[id] / sum : 0]));
  }
  function updateShares() {
    const sh = shares();
    document.querySelectorAll('output[data-share]').forEach((o) => (o.textContent = pct(sh[o.dataset.share])));
    $('#distBar').innerHTML = S.c.candidates.map((k, i) =>
      '<span style="flex-grow:' + Math.max(sh[k.id], 0.0001) + ';background:' + CAND_COLORS[i % CAND_COLORS.length] + '" title="' + esc(k.label) + ' ' + pct(sh[k.id]) + '"></span>'
    ).join('');
    $('#distLegend').innerHTML = S.c.candidates.map((k, i) =>
      '<span><i style="background:' + CAND_COLORS[i % CAND_COLORS.length] + '"></i>' + esc(k.label) + ' ' + pct(sh[k.id]) + '</span>'
    ).join('');
  }

  /* ---------- seismic canvas ---------- */
  function setupCanvas(cv, W, H) {
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function niceStep(range, target) {
    const raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }
  function colorFor(v, cmap) {
    v = clamp(v, -1, 1);
    if (cmap === 'gray') { const g = Math.round((255 * (1 - v)) / 2); return [g, g, g]; }
    const t = Math.abs(v), u = 1 - t;
    return v >= 0 ? [255 * u + 20 * t, 255 * u + 60 * t, 255 * u + 150 * t] : [255 * u + 150 * t, 255 * u + 25 * t, 255 * u + 25 * t];
  }
  function sectionImage() {
    const s = S.section, time = S.domain === 'time', key = S.cmap + S.gain + S.domain;
    if (S._imgKey === key) return S._off;
    const nz = time ? s.nt : s.nz, arr = time ? s.timeData : s.data;
    const off = document.createElement('canvas'); off.width = s.nx; off.height = nz;
    const ctx = off.getContext('2d'), id = ctx.createImageData(s.nx, nz);
    for (let i = 0; i < s.nx; i++) for (let j = 0; j < nz; j++) {
      const [r, g, b] = colorFor(arr[i * nz + j] * S.gain, S.cmap), q = (j * s.nx + i) * 4;
      id.data[q] = r; id.data[q + 1] = g; id.data[q + 2] = b; id.data[q + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    S._off = off; S._imgKey = key;
    return off;
  }
  // Time-depth conversion from the processing velocity model at distance x.
  function tAt(x, z) {
    const s = S.section; if (!s) return 0;
    const i = clamp(Math.round(x / s.dx), 0, s.nx - 1), j = clamp(z / s.dz, 0, s.nz - 1), j0 = Math.floor(j), u = j - j0;
    const a = s.tproc[i * s.nz + j0], b = s.tproc[i * s.nz + Math.min(s.nz - 1, j0 + 1)];
    return a + (b - a) * u;
  }
  function zAt(x, t) {
    const s = S.section; if (!s) return 0;
    const i = clamp(Math.round(x / s.dx), 0, s.nx - 1), col = i * s.nz;
    let lo = 0, hi = s.nz - 1;
    if (t <= s.tproc[col]) return 0;
    if (t >= s.tproc[col + hi]) return s.depth_m;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s.tproc[col + mid] < t) lo = mid; else hi = mid; }
    const a = s.tproc[col + lo], b = s.tproc[col + hi];
    return (lo + (t - a) / (b - a)) * s.dz;
  }

  function drawSeis() {
    if (!S.c) return;
    const cv = $('#seis'), W = cv.parentElement.clientWidth;
    const H = clamp(Math.round(W * (S.depth_m / S.width_m) * 0.85), 320, 640);
    const ctx = setupCanvas(cv, W, H);
    const time = S.domain === 'time' && S.section;
    const m = { l: 58, r: S.section ? 58 : 12, t: 16, b: 38 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const vmax = time ? S.section.tmax : S.depth_m;
    S.seisGeom = { m, pw, ph, W, H, vmax };
    const X = (x) => m.l + (x / S.width_m) * pw;
    const Yv = (v) => m.t + (v / vmax) * ph;
    const Yz = (x, z) => Yv(time ? tAt(x, z) : z);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = cssv('--panel'); ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    if (S.section) { const off = sectionImage(); ctx.drawImage(off, 0, 0, off.width, off.height, m.l, m.t, pw, ph); }
    else if (S.img && S.img.complete && S.img.naturalWidth) ctx.drawImage(S.img, m.l, m.t, pw, ph);

    const ink = cssv('--ink'), slate = cssv('--slate'), red = cssv('--red'), font = cssv('--sans');
    ctx.strokeStyle = slate; ctx.lineWidth = 1; ctx.strokeRect(m.l + 0.5, m.t + 0.5, pw - 1, ph - 1);
    ctx.fillStyle = ink; ctx.font = '12px ' + font;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    if (time) {
      const st = niceStep(vmax * 1000, 8);
      for (let t = 0; t <= vmax * 1000 + 0.1; t += st) { ctx.fillText(Math.round(t), m.l - 6, Yv(t / 1000)); ctx.fillRect(m.l - 3, Math.round(Yv(t / 1000)), 3, 1); }
    } else {
      const st = niceStep(S.depth_m, 8);
      for (let z = 0; z <= S.depth_m + 1; z += st) { ctx.fillText(Math.round(z), m.l - 6, Yv(z)); ctx.fillRect(m.l - 3, Math.round(Yv(z)), 3, 1); }
    }
    ctx.save(); ctx.translate(13, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText(time ? 'Two-way time (ms)' : 'Depth (m)', 0, 0); ctx.restore();

    // second vertical scale, valid at the reference location
    if (S.section) {
      const rx = S.refX, x0 = X(rx);
      ctx.fillStyle = red; ctx.beginPath(); ctx.moveTo(x0 - 5, m.t - 7); ctx.lineTo(x0 + 5, m.t - 7); ctx.lineTo(x0, m.t); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      if (time) {
        const st = niceStep(S.depth_m, 8);
        for (let z = 0; z <= S.depth_m + 1; z += st) { const y = Yv(tAt(rx, z)); if (y > m.t + ph + 1) break; ctx.fillText(Math.round(z), m.l + pw + 6, y); ctx.fillRect(m.l + pw, Math.round(y), 3, 1); }
      } else {
        const st = niceStep(S.section.tmax * 1000, 8);
        for (let t = 0; t <= S.section.tmax * 1000; t += st) { const z = zAt(rx, t / 1000); if (z <= 0 || z >= S.depth_m) continue; const y = Yv(z); ctx.fillText(Math.round(t), m.l + pw + 6, y); ctx.fillRect(m.l + pw, Math.round(y), 3, 1); }
      }
      ctx.save(); ctx.translate(W - 10, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = red;
      ctx.fillText((time ? 'Depth (m)' : 'Two-way time (ms)') + ' at ' + (rx / 1000).toFixed(2) + ' km', 0, 0); ctx.restore();
    }

    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const dxk = niceStep(S.width_m, 8);
    for (let x = 0; x <= S.width_m + 1; x += dxk) { ctx.fillText((x / 1000).toFixed(dxk < 1000 ? 1 : 0), X(x), m.t + ph + 5); ctx.fillRect(Math.round(X(x)), m.t + ph, 1, 3); }
    ctx.fillText('Distance (km)', m.l + pw / 2, m.t + ph + 21);
    ctx.textAlign = 'right'; ctx.fillStyle = slate;
    if (!time) ctx.fillText('Vertical exaggeration ' + ((ph / S.depth_m) / (pw / S.width_m)).toFixed(1) + '×', m.l + pw, m.t + ph + 21);
    else ctx.fillText('Time section as recorded', m.l + pw, m.t + ph + 21);

    if (S.showWells) (S.c.wells || []).forEach((w) => {
      const x = X(w.x_m), shift = w.depthShift_m || 0, yb = Yz(w.x_m, w.td_m);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, yb); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#16191C';
      ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, yb); ctx.stroke();
      ctx.font = '600 12px ' + font; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const tw = ctx.measureText(w.name).width + 8;
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - tw / 2, m.t + 3, tw, 17);
      ctx.fillStyle = '#16191C'; ctx.fillText(w.name, x, m.t + 5);
      (S.c.tops || []).forEach((t, ti) => {
        const col = TOP_COLORS[ti % TOP_COLORS.length];
        const p = S.picks[t.name][w.name];
        if (p != null) {
          const y = Yz(w.x_m, p - shift);
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 11, y - 2.5, 22, 5);
          ctx.fillStyle = col; ctx.fillRect(x - 10, y - 1.5, 20, 3);
        }
        const e = S.submitted && S.expertTops[t.name] && S.expertTops[t.name][w.name];
        if (e && !e.absent) {
          const y1 = Yz(w.x_m, e.depth - shift - e.unc), y2 = Yz(w.x_m, e.depth - shift + e.unc);
          ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
          ctx.strokeRect(x + 12, y1, 7, Math.max(3, y2 - y1)); ctx.setLineDash([]);
        }
      });
    });
  }

  /* ---------- log canvas ---------- */
  function flatShift(wn) {
    if (!S.flatten) return 0;
    const P = S.picks[S.flatten], vals = S.c.wells.map((w) => P[w.name]);
    const ref = vals.reduce((a, b) => a + b, 0) / vals.length;
    return P[wn] - ref;
  }
  function logFrac(L, v) {
    return L.log ? (Math.log10(v) - Math.log10(L.min)) / (Math.log10(L.max) - Math.log10(L.min)) : (v - L.min) / (L.max - L.min);
  }
  function drawLogs() {
    const c = S.c; if (!c || !c.wells || !c.wells.length) return;
    const cv = $('#logs'), W = cv.parentElement.clientWidth;
    const H = clamp(S.seisGeom ? S.seisGeom.H + 40 : 520, 440, 700);
    const ctx = setupCanvas(cv, W, H);
    const view = LOGS[S.logType], keys = view.combo || [S.logType];
    const n = c.wells.length, m = { l: 56, r: 8, t: 34 + 15 * keys.length, b: 10 }, gap = n > 1 ? 30 : 0;
    const tw = (W - m.l - m.r - gap * (n - 1)) / n, ph = H - m.t - m.b;
    const win = c.logWindow || { top_m: 0, base_m: Math.max(...c.wells.map((w) => w.td_m)) };
    const Y = (d) => m.t + ((d - win.top_m) / (win.base_m - win.top_m)) * ph;
    S.logGeom = { m, tw, gap, ph, Y, win, H, W };
    const ink = cssv('--ink'), slate = cssv('--slate'), grid = cssv('--grid'), panel = cssv('--panel'), font = cssv('--sans');
    const styles = [{ col: ink, dash: [] }, { col: '#2F6690', dash: [5, 3] }];
    ctx.fillStyle = panel; ctx.fillRect(0, 0, W, H);
    ctx.font = '11px ' + font;

    const dstep = niceStep(win.base_m - win.top_m, 10);
    ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let d = Math.ceil(win.top_m / dstep) * dstep; d <= win.base_m; d += dstep) ctx.fillText(Math.round(d), m.l - 6, Y(d));
    ctx.save(); ctx.translate(11, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText(S.flatten ? 'Depth, flattened on ' + S.flatten + ' (m)' : 'Log depth (m)', 0, 0); ctx.restore();
    const pxPerSample = ph / (win.base_m - win.top_m) * 0.5;
    const stride = Math.max(1, Math.floor(0.6 / pxPerSample));

    c.wells.forEach((w, k) => {
      const x0 = m.l + k * (tw + gap), data = S.logs[w.name], sh = flatShift(w.name);
      ctx.fillStyle = cssv('--paper'); ctx.fillRect(x0, m.t, tw, ph);
      ctx.strokeStyle = grid; ctx.lineWidth = 1;
      for (let d = Math.ceil(win.top_m / dstep) * dstep; d <= win.base_m; d += dstep) { const y = Math.round(Y(d + 0)) + 0.5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + tw, y); ctx.stroke(); }
      ctx.strokeStyle = slate; ctx.strokeRect(x0 + 0.5, m.t + 0.5, tw - 1, ph - 1);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = '600 12px ' + font; ctx.fillText(w.name, x0 + tw / 2, 2);
      ctx.font = '11px ' + font;
      keys.forEach((key, ki) => {
        const L = LOGS[key], y = 18 + ki * 15;
        ctx.fillStyle = styles[ki].col; ctx.textAlign = 'left'; ctx.fillText(String(L.min), x0 + 1, y);
        ctx.textAlign = 'right'; ctx.fillText(String(L.max), x0 + tw - 1, y);
        ctx.textAlign = 'center'; ctx.fillText(key === 'NPHI' && view.combo ? 'NPHI' : key === 'RHOB' && view.combo ? 'RHOB' : L.unit, x0 + tw / 2, y);
      });

      ctx.save(); ctx.beginPath(); ctx.rect(x0, m.t, tw, ph); ctx.clip();
      const present = data && keys.every((key) => data[key]);
      if (present) {
        const N = data.depth.length, xOf = (key, i) => x0 + clamp(logFrac(LOGS[key], data[key][i]), 0, 1) * tw;
        const yOf = (i) => Y(data.depth[i] - sh);
        if (S.logType === 'GR') {
          ctx.beginPath(); ctx.moveTo(x0, yOf(0));
          for (let i = 0; i < N; i += stride) ctx.lineTo(xOf('GR', i), yOf(i));
          ctx.lineTo(x0, yOf(N - 1)); ctx.closePath(); ctx.fillStyle = 'rgba(214,170,60,0.28)'; ctx.fill();
        }
        if (view.combo) {
          ctx.fillStyle = 'rgba(214,170,60,0.55)';
          for (let i = 0; i < N; i += stride) {
            const xr = xOf('RHOB', i), xn = xOf('NPHI', i);
            if (xn > xr) ctx.fillRect(xr, yOf(i), xn - xr, Math.max(1, pxPerSample * stride * 2));
          }
        }
        keys.forEach((key, ki) => {
          ctx.beginPath();
          for (let i = 0; i < N; i += stride) { const x = xOf(key, i), y = yOf(i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.strokeStyle = styles[ki].col; ctx.setLineDash(styles[ki].dash); ctx.lineWidth = 1.1; ctx.stroke(); ctx.setLineDash([]);
        });
        const tdY = yOf(N - 1);
        if (tdY < m.t + ph) { ctx.fillStyle = slate; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('TD', x0 + tw / 2, tdY + 3); }
      } else {
        ctx.fillStyle = slate; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Not logged', x0 + tw / 2, m.t + ph / 2);
      }
      if (S.submitted) (c.tops || []).forEach((t, ti) => {
        const e = S.expertTops[t.name][w.name]; if (!e || e.absent) return;
        const col = TOP_COLORS[ti % TOP_COLORS.length];
        const y = Y(e.depth - sh), u = Y(e.depth - sh + e.unc) - y;
        ctx.fillStyle = col + '2A'; ctx.fillRect(x0, y - u, tw, 2 * u);
        ctx.strokeStyle = col; ctx.setLineDash([5, 3]); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + tw, y); ctx.stroke(); ctx.setLineDash([]);
      });
      (c.tops || []).forEach((t, ti) => {
        const p = S.picks[t.name][w.name]; if (p == null) return;
        const col = TOP_COLORS[ti % TOP_COLORS.length], y = Y(p - sh);
        ctx.strokeStyle = col; ctx.lineWidth = t.name === S.activeTop ? 2.6 : 1.8;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + tw, y); ctx.stroke();
        ctx.fillStyle = col; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.font = '600 10px ' + font;
        ctx.fillText(t.name, x0 + tw - 3, y - 2); ctx.font = '11px ' + font;
      });
      ctx.restore();
    });
    (c.tops || []).forEach((t, ti) => {
      const col = TOP_COLORS[ti % TOP_COLORS.length];
      for (let k = 0; k < n - 1; k++) {
        const a = c.wells[k].name, b = c.wells[k + 1].name, pa = S.picks[t.name][a], pb = S.picks[t.name][b];
        if (pa == null || pb == null) continue;
        const xa = m.l + k * (tw + gap) + tw, xb = xa + gap;
        ctx.strokeStyle = col; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(xa, Y(pa - flatShift(a))); ctx.lineTo(xb, Y(pb - flatShift(b))); ctx.stroke();
      }
    });
    if (S.hoverY != null && S.hoverY > m.t && S.hoverY < m.t + ph) {
      ctx.strokeStyle = cssv('--red'); ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.l, S.hoverY + 0.5); ctx.lineTo(W - m.r, S.hoverY + 0.5); ctx.stroke(); ctx.globalAlpha = 1;
      const d = win.top_m + ((S.hoverY - m.t) / ph) * (win.base_m - win.top_m);
      $('#logReadout').textContent = Math.round(d) + ' m' + (S.flatten ? ', flattened on ' + S.flatten : '');
    }
  }

  function logClick(ev) {
    if (S.submitted || !S.activeTop || !S.logGeom) return;
    const r = ev.target.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    const { m, tw, gap, ph, win } = S.logGeom;
    const k = Math.floor((x - m.l) / (tw + gap));
    if (k < 0 || k >= S.c.wells.length || x - m.l - k * (tw + gap) > tw || y < m.t || y > m.t + ph) return;
    const w = S.c.wells[k];
    const disp = win.top_m + ((y - m.t) / ph) * (win.base_m - win.top_m);
    const d = disp + flatShift(w.name);
    const P = S.picks[S.activeTop];
    const pxPerM = ph / (win.base_m - win.top_m);
    if (P[w.name] != null && Math.abs(P[w.name] - d) * pxPerM < 7) {
      delete P[w.name];
      if (S.flatten === S.activeTop) { S.flatten = ''; $('#flatten').value = ''; }
    } else {
      if (S.flatten === S.activeTop) return; // flattened top cannot be moved while flattened
      P[w.name] = Math.round(d);
    }
    drawLogs(); drawSeis();
  }

  /* ---------- submit and debrief ---------- */
  function effN(dist) { const s = Object.values(dist).reduce((a, p) => a + p * p, 0); return s ? 1 / s : 0; }

  function submit() {
    const c = S.c, sh = shares();
    if (Object.values(sh).every((v) => v === 0)) { $('#submitMsg').textContent = 'All weights are zero. Set at least one weight above zero.'; return; }
    const just = $('#justify').value.trim();
    if (!$('#justifyWrap').hidden && just.length < 40) { $('#submitMsg').textContent = 'This tier asks for a written justification of at least a sentence or two before submitting.'; $('#justify').focus(); return; }
    S.submitted = true; S.player = sh; S.justification = just;
    document.body.classList.add('locked');
    $('#submit').disabled = true; $('#submitMsg').textContent = '';
    renderDebrief();
    drawSeis(); drawLogs();
    $('#debrief').hidden = false;
    $('#debrief').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function renderDebrief() {
    const c = S.c, P = S.player, E = S.expert;
    const overlap = c.candidates.reduce((a, k) => a + Math.min(P[k.id], E[k.id]), 0);
    const lead = c.candidates.reduce((a, k) => (E[k.id] > E[a.id] ? k : a), c.candidates[0]);
    const pLead = c.candidates.reduce((a, k) => (P[k.id] > P[a.id] ? k : a), c.candidates[0]);

    const rows = c.candidates.map((k, i) => {
      const col = CAND_COLORS[i % CAND_COLORS.length];
      return '<div class="cmp-row"><div class="cmp-label">' + esc(k.label) + '</div><div class="cmp-bars">' +
        '<div class="cmp-bar"><span class="who">You</span><span class="track"><span class="fill" style="width:' + P[k.id] * 100 + '%;background:' + col + '"></span></span><span class="val">' + pct(P[k.id]) + '</span></div>' +
        '<div class="cmp-bar expert"><span class="who">Panel</span><span class="track"><span class="fill" style="width:' + E[k.id] * 100 + '%;background:' + col + '"></span></span><span class="val">' + pct(E[k.id]) + '</span></div>' +
        '</div></div>';
    }).join('');

    let topsTable = '';
    if (c.tops && c.tops.length) {
      const trs = [];
      c.tops.forEach((t) => c.wells.forEach((w) => {
        const e = S.expertTops[t.name][w.name]; if (!e) return;
        const p = S.picks[t.name][w.name];
        let panel = e.absent ? 'Absent' : Math.round(e.depth) + ' ± ' + e.unc;
        let diff = '';
        if (e.absent) diff = p == null ? 'Both absent' : 'Picked where panel has none';
        else if (p == null) diff = 'Not picked';
        else { const dd = p - e.depth; diff = (dd > 0 ? '+' : '') + Math.round(dd) + ' m' + (Math.abs(dd) <= e.unc ? ' (within ±' + e.unc + ')' : ''); }
        trs.push('<tr><td>' + esc(t.name) + '</td><td>' + esc(w.name) + '</td><td>' + (p == null ? '–' : p) + '</td><td>' + panel + '</td><td>' + diff + (e.note ? '<div class="note">' + esc(e.note) + '</div>' : '') + '</td></tr>');
      }));
      topsTable = '<h4>Tops</h4><div class="table-wrap"><table class="tops"><thead><tr><th>Top</th><th>Well</th><th>Your pick (m)</th><th>Panel (m)</th><th>Difference</th></tr></thead><tbody>' + trs.join('') + '</tbody></table></div>';
    }

    $('#debriefBody').innerHTML =
      '<div class="cmp">' + rows + '</div>' +
      '<dl class="metrics">' +
      '<div><dt>' + rich('[[overlap|Overlap with panel]]') + '</dt><dd>' + pct(overlap) + '</dd></div>' +
      '<div><dt>' + rich('[[effective-number|Effective number of interpretations]]') + '</dt><dd>' + effN(P).toFixed(1) + ' <small>you</small> / ' + effN(E).toFixed(1) + ' <small>panel</small></dd></div>' +
      '<div><dt>Largest weight</dt><dd>' + pct(P[pLead.id]) + ' <small>you, ' + esc(pLead.label) + '</small> / ' + pct(E[lead.id]) + ' <small>panel, ' + esc(lead.label) + '</small></dd></div>' +
      '</dl>' +
      (c.outcome ? '<div class="outcome"><h4>What is known</h4><p>' + rich(c.outcome.statement) + '</p>' +
        '<div class="conf"><span>Confidence attached to this outcome</span><span class="track"><span class="fill" style="width:' + (c.outcome.confidence * 100) + '%"></span></span><strong>' + pct(c.outcome.confidence) + '</strong></div>' +
        '<p class="basis">' + rich(c.outcome.basis || '') + '</p></div>' : '') +
      topsTable +
      (c.debrief ? '<h4>Notes</h4><p>' + rich(c.debrief) + '</p>' : '') +
      (S.justification ? '<h4>Your justification</h4><blockquote>' + esc(S.justification) + '</blockquote>' : '');

    $('#biasToggle').checked = false;
    $('#bias').hidden = true;
    $('#bias').innerHTML = biasCheck();

    S.session = S.session.filter((r) => r.id !== c.id);
    S.session.push({ id: c.id, title: c.title, tier: c.tier, overlap, you: effN(P), panel: effN(E) });
    renderSession();
  }

  function biasCheck() {
    const c = S.c, items = [];
    const ev = c.evidence || [];
    const missed = ev.filter((e) => e.panelWeight >= 3 && !S.relied.has(e.id));
    const weak = ev.filter((e) => e.panelWeight <= 1 && S.relied.has(e.id));
    if (ev.length) {
      items.push('<li><strong>Rated strongly diagnostic by the panel, not selected:</strong> ' + (missed.length ? missed.map((e) => rich(e.label)).join('; ') : 'none') + '</li>');
      items.push('<li><strong>Selected, rated weakly or not diagnostic by the panel:</strong> ' + (weak.length ? weak.map((e) => rich(e.label) + ' (' + e.panelWeight + ' of 3)').join('; ') : 'none') + '</li>');
    }
    if (c.wells && c.wells.length) {
      const never = [...S.availLogs].filter((k) => !LOGS[k].combo && !S.viewed.has(k));
      items.push('<li><strong>Log types never displayed:</strong> ' + (never.length ? never.map((k) => LOGS[k].label).join(', ') : 'none') + '</li>');
      const expected = [], made = [];
      (c.tops || []).forEach((t) => c.wells.forEach((w) => { const e = S.expertTops[t.name][w.name]; if (e && !e.absent) { expected.push(1); if (S.picks[t.name][w.name] != null) made.push(1); } }));
      if (expected.length) items.push('<li><strong>Tops picked:</strong> ' + made.length + ' of ' + expected.length + ' that the panel picked' + (S.flattenUsed ? '; display was flattened at least once' : '; display was not flattened') + '</li>');
    }
    const P = S.player, E = S.expert;
    const over = c.candidates.filter((k) => P[k.id] - E[k.id] >= 0.2), under = c.candidates.filter((k) => E[k.id] - P[k.id] >= 0.2);
    items.push('<li><strong>Interpretations weighted 20 points or more above the panel:</strong> ' + (over.length ? over.map((k) => esc(k.label)).join(', ') : 'none') + '</li>');
    items.push('<li><strong>Interpretations weighted 20 points or more below the panel:</strong> ' + (under.length ? under.map((k) => esc(k.label)).join(', ') : 'none') + '</li>');
    return '<ul>' + items.join('') + '</ul>';
  }

  function renderSession() {
    if (!S.session.length) { $('#session').hidden = true; return; }
    $('#session').hidden = false;
    $('#sessionBody').innerHTML = S.session.map((r) =>
      '<tr><td>' + esc(r.title) + '</td><td>' + esc((GW.tiers.find((t) => t.id === r.tier) || { label: r.tier }).label) + '</td><td>' + pct(r.overlap) + '</td><td>' + r.you.toFixed(1) + ' / ' + r.panel.toFixed(1) + '</td></tr>'
    ).join('');
  }

  function nextCase() {
    const order = [];
    GW.tiers.forEach((t) => GW.cases.filter((c) => c.tier === t.id).forEach((c) => order.push(c.id)));
    const i = order.indexOf(S.c.id);
    loadCase(order[(i + 1) % order.length]);
    window.scrollTo({ top: 0 });
  }

  /* ---------- case file pop-out ---------- */
  function popCase() {
    const c = S.c;
    const win = window.open('', 'gw_casefile', 'width=560,height=780');
    if (!win) { $('#submitMsg').textContent = 'The browser blocked the new window. Allow pop-ups for this page to open the case file separately.'; return; }
    const terms = new Set();
    const plain = (s) => { termsIn(s).forEach((k) => terms.add(k)); return esc(s).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, k, l) => { const g = gloss(k); return '<b>' + (l || (g ? g[0].toLowerCase() : k)) + '</b>'; }); };
    let body = '<h1>' + esc(c.title) + '</h1><p>' + plain(c.brief || '') + '</p>';
    body += c.candidates.map((k) => '<h2>' + esc(k.label) + '</h2><p>' + plain(k.description || '') + '</p><h3>For</h3><ul>' + (k.pros || []).map((p) => '<li>' + plain(p) + '</li>').join('') + '</ul><h3>Against</h3><ul>' + (k.cons || []).map((p) => '<li>' + plain(p) + '</li>').join('') + '</ul>').join('');
    if (c.wells && c.wells.length) body += '<h2>Wells</h2><ul>' + c.wells.map((w) => '<li><b>' + esc(w.name) + '</b> ±' + (w.depthUncertainty_m || 0) + ' m. ' + plain(w.note || '') + '</li>').join('') + '</ul>';
    if (terms.size) body += '<h2>Terms</h2><dl>' + [...terms].map((k) => gloss(k)).filter(Boolean).map((g) => '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>').join('') + '</dl>';
    win.document.open();
    win.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Case file: ' + esc(c.title) + '</title><style>body{font:15px/1.55 "Source Sans 3","Segoe UI",system-ui,sans-serif;color:#16191C;max-width:62ch;margin:24px auto;padding:0 18px}h1{font:600 26px/1.2 "Source Serif 4",Georgia,serif;margin:0 0 8px}h2{font:600 18px/1.3 "Source Serif 4",Georgia,serif;color:#841617;margin:22px 0 4px}h3{font-size:13px;color:#5C6670;margin:8px 0 0}ul{margin:4px 0;padding-left:20px}dt{font-weight:600;margin-top:8px}dd{margin:0 0 0 0;color:#333}</style></head><body>' + body + '</body></html>');
    win.document.close();
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('#tiers').addEventListener('click', (e) => { const b = e.target.closest('button[data-tier]'); if (!b) return; S.tier = b.dataset.tier; renderTiers(); });
    $('#caseList').addEventListener('click', (e) => { const b = e.target.closest('[data-case]'); if (b) loadCase(b.dataset.case); });
    $('#cmap').addEventListener('change', (e) => { S.cmap = e.target.value; drawSeis(); });
    $('#gain').addEventListener('input', (e) => { S.gain = Number(e.target.value); $('#gainOut').textContent = S.gain.toFixed(1) + '×'; drawSeis(); });
    $('#showWells').addEventListener('change', (e) => { S.showWells = e.target.checked; drawSeis(); });
    $('#logType').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-log]'); if (!b || b.disabled) return;
      S.logType = b.dataset.log; (LOGS[S.logType].combo || [S.logType]).forEach((k) => S.viewed.add(k));
      document.querySelectorAll('#logType button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      drawLogs();
    });
    $('#activeTop').addEventListener('change', (e) => { S.activeTop = e.target.value; drawLogs(); });
    $('#flatten').addEventListener('change', (e) => {
      const t = e.target.value;
      if (t && S.c.wells.some((w) => S.picks[t][w.name] == null)) {
        $('#logReadout').textContent = 'Pick ' + t + ' in every well to flatten on it.';
        e.target.value = S.flatten; return;
      }
      S.flatten = t; if (t) S.flattenUsed = true; drawLogs();
    });
    $('#clearPicks').addEventListener('click', () => { if (S.submitted) return; Object.keys(S.picks).forEach((k) => (S.picks[k] = {})); S.flatten = ''; $('#flatten').value = ''; drawLogs(); drawSeis(); });
    const lc = $('#logs');
    lc.addEventListener('click', logClick);
    lc.addEventListener('mousemove', (e) => { S.hoverY = e.clientY - lc.getBoundingClientRect().top; drawLogs(); });
    lc.addEventListener('mouseleave', () => { S.hoverY = null; $('#logReadout').textContent = ''; drawLogs(); });
    const sc = $('#seis');
    sc.addEventListener('mousemove', (e) => {
      const g = S.seisGeom; if (!g) return;
      const r = sc.getBoundingClientRect(), x = ((e.clientX - r.left - g.m.l) / g.pw) * S.width_m, v = ((e.clientY - r.top - g.m.t) / g.ph) * g.vmax;
      if (x < 0 || x > S.width_m || v < 0 || v > g.vmax) { $('#seisReadout').textContent = ''; return; }
      if (S.section) { S.refX = x; drawSeis(); }
      const time = S.domain === 'time' && S.section;
      $('#seisReadout').textContent = (x / 1000).toFixed(2) + ' km, ' + (time ? Math.round(v * 1000) + ' ms (≈ ' + Math.round(zAt(x, v)) + ' m)' : Math.round(v) + ' m' + (S.section ? ' (≈ ' + Math.round(tAt(x, v) * 1000) + ' ms)' : ''));
    });
    $('#domain').addEventListener('change', (e) => { S.domain = e.target.value; drawSeis(); });
    $('#candidates').addEventListener('input', (e) => { const s = e.target.closest('input[data-cand]'); if (!s) return; S.raw[s.dataset.cand] = Number(s.value); updateShares(); });
    $('#evidence').addEventListener('change', (e) => { const cb = e.target.closest('input[data-ev]'); if (!cb) return; cb.checked ? S.relied.add(cb.dataset.ev) : S.relied.delete(cb.dataset.ev); });
    $('#submit').addEventListener('click', submit);
    $('#biasToggle').addEventListener('change', (e) => { $('#bias').hidden = !e.target.checked; });
    $('#retry').addEventListener('click', () => { loadCase(S.c.id); window.scrollTo({ top: 0 }); });
    $('#next').addEventListener('click', nextCase);
    $('#popCase').addEventListener('click', popCase);
    $('#caseFile').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        let obj; try { obj = JSON.parse(rd.result); } catch (err) { status('The file is not valid JSON: ' + err.message); return; }
        const v = GW.registerCase(obj);
        if (v.errors.length) { status('The case was not loaded. ' + v.errors.join(' ')); return; }
        status(v.warnings.length ? 'Loaded with notes: ' + v.warnings.join(' ') : 'Loaded "' + (obj.title || obj.id) + '".');
        loadCase(obj.id);
      };
      rd.readAsText(f); e.target.value = '';
    });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.term'); const pop = $('#termPop');
      if (t) { e.preventDefault(); showTerm(t); return; }
      if (e.target.closest('.term-close') || (!pop.hidden && !e.target.closest('#termPop'))) pop.hidden = true;
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#termPop').hidden = true; });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { drawSeis(); drawLogs(); }, 120); });
  }
  function status(msg) { const s = $('#status'); s.textContent = msg; s.hidden = !msg; }

  GW.start = async function () {
    GW._ready = true;
    wire();
    const params = new URLSearchParams(location.search);
    const url = params.get('case');
    let startId = null;
    if (url) {
      try { const r = await fetch(url); const obj = await r.json(); const v = GW.registerCase(obj); if (v.errors.length) status('Case at ' + url + ' was not loaded. ' + v.errors.join(' ')); else startId = obj.id; }
      catch (err) { status('Could not load a case from ' + url + '.'); }
    }
    const h = decodeURIComponent((location.hash.match(/case=([^&]+)/) || [])[1] || '');
    if (!startId && GW.cases.find((c) => c.id === h)) startId = h;
    if (!startId && GW.cases.length) startId = (GW.cases.find((c) => c.tier === GW.tiers[0].id) || GW.cases[0]).id;
    renderTiers();
    if (startId) loadCase(startId);
  };
})();
