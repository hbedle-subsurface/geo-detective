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
  const LINES = [
    { id: 'seismic', label: 'Seismic', color: '#F7E27A' },
    { id: 'logs', label: 'Well logs', color: '#BFDDF2' },
    { id: 'attributes', label: 'Attributes', color: '#C9E7B8' },
    { id: 'ml', label: 'Machine learning', color: '#D9CBF2' },
    { id: 'lead', label: 'Leads', color: '#F4B6C2' }
  ];
  const lineOf = (e) => (e.kind === 'lead' ? 'lead' : e.line || (e.where && e.where.well ? 'logs' : 'seismic'));
  const lineInfo = (id) => LINES.find((l) => l.id === id) || LINES[0];
  const SEQ = [[13, 8, 35], [84, 15, 110], [165, 44, 96], [230, 92, 48], [252, 180, 50], [252, 253, 191]];
  const CLASS_COLORS = [[31, 119, 180], [255, 127, 14], [44, 160, 44], [214, 39, 40], [148, 103, 189], [140, 86, 75], [227, 119, 194], [127, 127, 127]];
  const TOP_COLORS = ['#841617', '#2F6690', '#4F7A28', '#A86A12', '#6D4C8D', '#1F7A7A'];
  const CAND_COLORS = ['#9E1B22', '#2F6690', '#A86A12', '#4F7A28', '#6D4C8D'];

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const pct = (v) => Math.round(v * 100) + '%';
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const hasL = (c.evidence || []).some((e) => e.likelihood);
    if (hasL) {
      [...(c.evidence || []), ...(c.leads || [])].forEach((e) => (c.candidates || []).forEach((k) => {
        if (!e.likelihood || e.likelihood[k.id] == null) warnings.push('"' + e.id + '" has no likelihood for "' + k.id + '"; 0.5 is used.');
      }));
    } else {
      const ec = c.expertConsensus || {};
      (c.candidates || []).forEach((k) => { if (!(k.id in ec)) errors.push('No evidence likelihoods and no expert weight for candidate "' + k.id + '".'); });
      const sum = Object.values(ec).reduce((a, b) => a + Number(b || 0), 0);
      if (sum > 0 && Math.abs(sum - 1) > 0.01) warnings.push('Expert weights sum to ' + sum.toFixed(2) + ' and were normalized.');
    }
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
    const pop = $('#termPop'), host = btn.closest('dialog') || document.body;
    if (pop.parentElement !== host) host.appendChild(pop);
    pop.innerHTML = '<div class="term-title">' + esc(g[0]) + '</div><p>' + esc(g[1]) + '</p><button type="button" class="term-close" aria-label="Close">×</button>';
    pop.hidden = false;
    const r = btn.getBoundingClientRect(), inDlg = host !== document.body;
    const hr = inDlg ? host.getBoundingClientRect() : { left: -window.scrollX, top: -window.scrollY, width: window.innerWidth };
    const w = Math.min(340, (inDlg ? hr.width : window.innerWidth) - 24);
    pop.style.width = w + 'px';
    const left = r.left - hr.left + (inDlg ? host.scrollLeft : 0);
    pop.style.left = clamp(left, 12, (inDlg ? hr.width : window.scrollX + window.innerWidth) - w - 12) + 'px';
    pop.style.top = r.bottom - hr.top + (inDlg ? host.scrollTop : 0) + 6 + 'px';
    pop.querySelector('.term-close').focus();
  }

  /* ---------- tiers and case list ---------- */
  function caseNumber(c) { return String(GW.cases.indexOf(c) + 1).padStart(3, '0'); }
  function renderTiers() {
    const nav = $('#tiers');
    nav.innerHTML = GW.tiers.map((t) => {
      const n = GW.cases.filter((c) => c.tier === t.id).length;
      return '<button type="button" role="tab" aria-selected="' + (t.id === S.tier) + '" data-tier="' + esc(t.id) + '"' + (n ? '' : ' disabled') + '>' + esc(t.label) + '<span class="count">' + n + '</span></button>';
    }).join('');
    const t = GW.tiers.find((x) => x.id === S.tier) || {};
    $('#tierBlurb').textContent = t.blurb || '';
    $('#caseList').innerHTML = GW.cases.filter((c) => c.tier === S.tier).map((c) =>
      '<button type="button" class="folder' + (S.c && S.c.id === c.id ? ' current' : '') + '" data-case="' + esc(c.id) + '"><span class="folder-no">Case ' + caseNumber(c) + '</span><span class="folder-name">' + esc(c.title || c.id) + '</span><span class="folder-sum">' + esc(c.summary || '') + '</span></button>'
    ).join('');
  }

  /* ---------- evidence model ---------- */
  function orderedEvidence() {
    const ev = (S.c.evidence || []).map((e) => Object.assign({ kind: 'evidence' }, e));
    return LINES.flatMap((l) => ev.filter((e) => lineOf(e) === l.id));
  }
  function allItems() { const c = S.c; return [...(c.evidence || []).map((e) => Object.assign({ kind: 'evidence' }, e)), ...(c.leads || []).map((e) => Object.assign({ kind: 'lead' }, e))]; }
  function itemById(id) { return allItems().find((e) => e.id === id); }
  function noteNo(id) {
    const c = S.c, ei = orderedEvidence().findIndex((e) => e.id === id);
    if (ei >= 0) return 'E' + (ei + 1);
    return 'L' + ((c.leads || []).findIndex((e) => e.id === id) + 1);
  }
  function examinedItems() { return S.c ? S.examined.map(itemById).filter(Boolean) : []; }
  function usesLikelihood() { return (S.c.evidence || []).some((e) => e.likelihood); }
  function posterior(ids) {
    const cands = S.c.candidates;
    if (!usesLikelihood()) return S.expertStatic;
    const p = Object.fromEntries(cands.map((k) => [k.id, 1]));
    ids.forEach((id) => { const e = itemById(id); if (e && e.likelihood) cands.forEach((k) => (p[k.id] *= e.likelihood[k.id] != null ? e.likelihood[k.id] : 0.5)); });
    const s = cands.reduce((a, k) => a + p[k.id], 0) || 1;
    cands.forEach((k) => (p[k.id] /= s));
    return p;
  }
  // 1 when weight is shared equally, 0 when all weight is on one suspect:
  // one minus the total variation distance from equal weights, normalized by its maximum.
  function spread(dist) {
    const v = Object.values(dist), n = v.length;
    if (n < 2) return 0;
    const tv = 0.5 * v.reduce((a, p) => a + Math.abs(p - 1 / n), 0);
    return 1 - tv / (1 - 1 / n);
  }
  function diagnosticRatio(e) {
    if (!e.likelihood) return 1;
    const v = S.c.candidates.map((k) => (e.likelihood[k.id] != null ? e.likelihood[k.id] : 0.5));
    return Math.max(...v) / Math.max(1e-6, Math.min(...v));
  }

  /* ---------- loading a case ---------- */
  function loadCase(id) {
    const c = GW.cases.find((x) => x.id === id); if (!c) return;
    S.c = c; S.tier = c.tier;
    const cands = c.candidates;
    const ec = c.expertConsensus || {}, esum = cands.reduce((a, k) => a + Number(ec[k.id] || 0), 0) || 1;
    Object.assign(S, {
      expertStatic: Object.fromEntries(cands.map((k) => [k.id, Number(ec[k.id] || 0) / esum])),
      raw: Object.fromEntries(cands.map((k) => [k.id, 50])),
      links: {}, examined: [], snaps: [], selected: null, anchors: {}, logs: null, expertTops: null,
      picks: {}, submitted: false, flatten: '', logType: 'GR',
      viewed: new Set(['GR']), flattenUsed: false, domain: 'depth', attr: 'amplitude', attrsSeen: new Set(['amplitude']), showPanel: false, gain: 1, cmap: 'gray', showWells: true, hoverY: null, img: null, section: null
    });
    (c.tops || []).forEach((t) => (S.picks[t.name] = {}));
    S.activeTop = c.tops && c.tops.length ? c.tops[0].name : null;
    S.width_m = c.seismic.type === 'synthetic' ? c.seismic.model.width_m : c.seismic.width_m;
    S.depth_m = c.seismic.type === 'synthetic' ? c.seismic.model.depth_m : c.seismic.depth_m;
    S.refX = S.width_m / 2;
    $('#game').hidden = false;
    $('#building').hidden = false;
    $('#debrief').hidden = true;
    setTimeout(() => {
      if (S.c !== c) return;
      GW._built = GW._built || new WeakMap();
      if (c.seismic.type === 'synthetic') {
        if (!GW._built.has(c)) GW._built.set(c, GW.buildSection(c.seismic.model, c.seismic));
        S.section = GW._built.get(c); S._imgKey = null;
      } else { S.img = new Image(); S.img.onload = drawSeis; S.img.src = c.seismic.src; }
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
    $('#caseNo').textContent = 'Case ' + caseNumber(c);
    $('#caseTier').textContent = (GW.tiers.find((t) => t.id === c.tier) || { label: c.tier }).label;
    $('#caseTitle').textContent = c.title || c.id;
    $('#caseBrief').innerHTML = rich(c.brief || '');
    const hasWells = c.wells && c.wells.length;
    $('#board').classList.toggle('no-wells', !hasWells);
    $('#logPanel').hidden = !hasWells;
    $('#cmap').value = S.cmap; $('#domain').value = S.domain; $('#domain').disabled = c.seismic.type === 'image';
    $('#cmap').disabled = $('#gain').disabled = c.seismic.type === 'image';
    $('#gain').value = 1; $('#gainOut').textContent = '1.0×';
    if (hasWells) {
      const avail = new Set();
      Object.values(S.logs).forEach((L) => L && Object.keys(LOGS).forEach((k) => (LOGS[k].combo ? LOGS[k].combo.every((q) => L[q]) : L[k]) && avail.add(k)));
      S.availLogs = avail;
      $('#logType').innerHTML = Object.entries(LOGS).map(([k, L]) =>
        '<button type="button" data-log="' + k + '" aria-pressed="' + (k === S.logType) + '"' + (avail.has(k) ? '' : ' disabled') + ' title="' + L.label + '">' + (L.combo ? 'D–N' : k) + '</button>').join('');
      const tops = c.tops || [];
      $('#topWrap').hidden = !tops.length;
      $('#activeTop').innerHTML = tops.map((t) => '<option value="' + esc(t.name) + '">' + esc(t.name) + '</option>').join('');
      $('#flatten').innerHTML = '<option value="">Depth</option>' + tops.map((t) => '<option value="' + esc(t.name) + '">Flattened on ' + esc(t.name) + '</option>').join('');
      $('#topLegend').innerHTML = tops.map((t, i) => '<span><i style="background:' + TOP_COLORS[i % TOP_COLORS.length] + '"></i>' + esc(t.name) + '</span>').join('');
      $('#wellNotes').innerHTML = c.wells.map((w) =>
        '<li><strong>' + esc(w.name) + '</strong> ±' + (w.depthUncertainty_m || 0) + ' m. ' + rich(w.note || '') + '</li>').join('');
    }
    const synth = c.seismic.type === 'synthetic';
    $('#attrWrap').hidden = !synth;
    $('#attr').innerHTML = Object.entries(GW.ATTRIBUTES).map(([k, a]) => '<option value="' + k + '">' + a.label + '</option>').join('');
    $('#attr').value = S.attr;
    $('#showPanel').checked = S.showPanel;
    renderLegend();
    renderSuspects();
    renderRail();
    renderNotes();
    renderNoteDetail();
    renderLeads();
    $('#justifyWrap').hidden = !(c.requireJustification || c.tier === 'advanced');
    $('#justify').value = '';
    $('#submitMsg').textContent = '';
    $('#submit').disabled = false;
    document.body.classList.remove('locked');
    updateShares();
    requestAnimationFrame(() => { drawSeis(); drawLogs(); drawTimeline(); drawStrings(); });
  }

  /* ---------- suspects ---------- */
  function renderSuspects() {
    $('#suspects').innerHTML = S.c.candidates.map((k, i) =>
      '<article class="suspect" data-cand="' + esc(k.id) + '" style="--cand:' + CAND_COLORS[i % CAND_COLORS.length] + '">' +
      '<span class="pin"></span>' +
      '<div class="mug">' + sketch(k.sketch) + '<span class="mug-no">' + String.fromCharCode(65 + i) + '</span></div>' +
      '<div class="suspect-body"><h4>' + esc(k.label) + '</h4>' +
      '<label class="wt"><span class="sr-only">Confidence in ' + esc(k.label) + '</span><input type="range" min="0" max="100" step="1" value="50" data-cand="' + esc(k.id) + '"><output data-share="' + esc(k.id) + '"></output></label>' +
      '<details class="dossier"><summary>Dossier</summary><p>' + rich(k.description || '') + '</p>' +
      '<h5>For</h5><ul>' + (k.pros || []).map((p) => '<li>' + rich(p) + '</li>').join('') + '</ul>' +
      '<h5>Against</h5><ul>' + (k.cons || []).map((p) => '<li>' + rich(p) + '</li>').join('') + '</ul></details></div>' +
      '</article>'
    ).join('');
  }
  function shares() {
    const ids = S.c.candidates.map((k) => k.id);
    const sum = ids.reduce((a, id) => a + S.raw[id], 0);
    return Object.fromEntries(ids.map((id) => [id, sum ? S.raw[id] / sum : 1 / ids.length]));
  }
  function updateShares() {
    const sh = shares();
    document.querySelectorAll('output[data-share]').forEach((o) => (o.textContent = pct(sh[o.dataset.share])));
    const sp = spread(sh);
    $('#spreadFill').style.width = sp * 100 + '%';
    $('#spreadVal').textContent = pct(sp);
  }

  /* ---------- evidence notes ---------- */
  function renderNotes() {
    const leads = (S.c.leads || []).filter((l) => S.examined.includes(l.id)).map((e) => Object.assign({ kind: 'lead' }, e));
    const items = [...orderedEvidence(), ...leads];
    let html = '', lastLine = null, i = 0;
    items.forEach((e) => {
      const ln = lineOf(e);
      if (ln !== lastLine) { if (lastLine) html += '</div>'; html += '<p class="line-head" style="--line:' + lineInfo(ln).color + '">' + lineInfo(ln).label + '</p><div class="notes-row">'; lastLine = ln; }
      const seen = S.examined.includes(e.id), links = S.links[e.id] || {};
      const tags = S.c.candidates.map((k, ci) => links[k.id] ? '<span class="tag ' + links[k.id] + '">' + String.fromCharCode(65 + ci) + (links[k.id] === 'for' ? '+' : '−') + '</span>' : '').join('');
      html += '<button type="button" class="note' + (seen ? ' seen' : '') + (S.selected === e.id ? ' selected' : '') + '" data-note="' + esc(e.id) + '" style="--tilt:' + (((i++ * 37) % 7) - 3) * 0.6 + 'deg;--line:' + lineInfo(ln).color + '">' +
        '<span class="pin"></span><span class="note-no">' + noteNo(e.id) + (seen ? '' : ' · unexamined') + '</span>' +
        '<span class="note-text">' + (seen ? rich(e.label) : esc(e.label)) + '</span>' +
        (tags ? '<span class="tags">' + tags + '</span>' : '') + '</button>';
    });
    if (lastLine) html += '</div>';
    $('#notes').innerHTML = html;
  }

  /* ---------- lines of evidence rail and walk-through ---------- */
  function walkOrder() { return orderedEvidence().map((e) => e.id); }
  function renderRail() {
    const ev = orderedEvidence(), leads = S.c.leads || [];
    const groups = LINES.map((l) => ({ l, items: l.id === 'lead' ? leads.map((x) => Object.assign({ kind: 'lead' }, x)) : ev.filter((e) => lineOf(e) === l.id) })).filter((g) => g.items.length);
    const order = walkOrder(), pos = S.selected ? order.indexOf(S.selected) : -1;
    $('#railLines').innerHTML = groups.map((g) =>
      '<div class="rail-line" style="--line:' + g.l.color + '"><span class="rail-label">' + g.l.label + '</span><span class="rail-dots">' +
      g.items.map((e) => '<button type="button" class="rail-dot' + (S.examined.includes(e.id) ? ' seen' : '') + (S.selected === e.id ? ' current' : '') + '" data-rail="' + esc(e.id) + '"' + (e.kind === 'lead' && !S.examined.includes(e.id) ? ' disabled' : '') + ' title="' + esc(noteNo(e.id) + ' ' + e.label) + '">' + noteNo(e.id) + '</button>').join('') +
      '</span></div>').join('');
    const next = order.find((id, k) => k > pos && !S.examined.includes(id)) || order[pos + 1];
    $('#clueNext').disabled = !next;
    $('#cluePrev').disabled = pos <= 0;
    $('#clueCount').textContent = S.examined.length + ' of ' + (order.length + leads.length) + ' clues examined';
  }
  function stepClue(dir) {
    const order = walkOrder(), pos = S.selected ? order.indexOf(S.selected) : -1;
    let id;
    if (dir > 0) id = order.find((x, k) => k > pos && !S.examined.includes(x)) || order[pos + 1];
    else id = order[Math.max(0, pos - 1)];
    if (id) { examine(id); focusClue(id); }
  }
  function focusClue(id) {
    const e = itemById(id); if (!e) return;
    const target = e.where ? (e.where.well ? $('#logPanel') : $('#seisPanel')) : $('#noteDetail');
    if (target && !target.hidden) target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
  }

  function renderNoteDetail() {
    const box = $('#noteDetail'), e = S.selected && itemById(S.selected);
    if (!e) { box.innerHTML = '<p class="howto">Select a note to examine it. Notes that point at the data are circled on the exhibits.</p>'; return; }
    const links = S.links[e.id] || {};
    const where = e.where ? (e.where.well ? 'Circled on Exhibit B, well ' + esc(e.where.well) + '.' : 'Circled on Exhibit A' + (e.where.attribute ? ', ' + GW.ATTRIBUTES[e.where.attribute].label.toLowerCase() + ' display.' : '.')) : '';
    const ln = lineInfo(lineOf(e));
    box.style.setProperty('--line', ln.color);
    const model = lineOf(e) === 'ml' && (e.model || e.reportedConfidence != null) ? '<p class="model-card">' + (e.model ? '<span>' + rich(e.model) + '</span>' : '') + (e.reportedConfidence != null ? '<span>Confidence reported by the model: <b>' + pct(e.reportedConfidence) + '</b></span>' : '') + '</p>' : '';
    box.innerHTML = '<div class="detail-head"><span class="note-no">' + noteNo(e.id) + ' · ' + ln.label.toLowerCase() + '</span><span class="where">' + where + '</span></div>' + model +
      (e.kind === 'lead' ? '<p class="lead-q">' + rich(e.label) + '</p><p class="lead-a">' + rich(e.result || '') + '</p>' : '<p class="detail-text">' + rich(e.label) + '</p>' + (e.detail ? '<p class="howto">' + rich(e.detail) + '</p>' : '')) +
      '<p class="howto">String this note to the suspects it bears on:</p>' +
      '<div class="linkrows">' + S.c.candidates.map((k, ci) => {
        const v = links[k.id] || '';
        return '<div class="linkrow"><span class="lk-name"><b>' + String.fromCharCode(65 + ci) + '</b> ' + esc(k.label) + '</span><span class="seg small" role="group" aria-label="' + esc(k.label) + '">' +
          ['for', '', 'against'].map((d) => '<button type="button" data-link="' + d + '" data-cand="' + esc(k.id) + '" aria-pressed="' + (v === d) + '">' + (d === 'for' ? 'Supports' : d === 'against' ? 'Against' : '—') + '</button>').join('') + '</span></div>';
      }).join('') + '</div>';
  }
  function examine(id) {
    if (!S.submitted && !S.examined.includes(id)) {
      S.snaps.push(shares());
      S.examined.push(id);
    }
    S.selected = id;
    const it = itemById(id);
    if (it && it.where && it.where.attribute && S.section) setAttr(it.where.attribute);
    else if (it && it.where && it.where.x_m != null && S.attr !== 'amplitude' && !(it.where.attribute)) setAttr('amplitude');
    renderNotes(); renderNoteDetail(); renderLeads(); renderRail();
    drawSeis(); drawLogs(); drawTimeline(); drawStrings();
  }

  function setAttr(k) {
    S.attr = k; S.attrsSeen.add(k); $('#attr').value = k; S._imgKey = null;
    $('#building').hidden = false; $('#building').textContent = 'Computing ' + GW.ATTRIBUTES[k].label.toLowerCase() + '…';
    setTimeout(() => { GW.attribute(S.section, k); $('#building').hidden = true; renderLegend(); drawSeis(); drawStrings(); }, 20);
  }
  function renderLegend() {
    const a = GW.ATTRIBUTES[S.attr] || GW.ATTRIBUTES.amplitude, el = $('#attrLegend');
    if (a.kind === 'diverging') { el.innerHTML = '<span>Amplitude</span><span class="bar" style="background:' + (S.cmap === 'gray' ? 'linear-gradient(90deg,#fff,#000)' : 'linear-gradient(90deg,#9e1b1b,#fff,#14327a)') + '"></span><span>− / +</span>'; return; }
    if (a.kind === 'classes') {
      const inputs = S.section && S.section.attr && S.section.attr.som ? S.section.attr.som.inputs.join(', ') : '';
      el.innerHTML = '<span>' + rich('[[som|SOM]] class') + '</span>' + CLASS_COLORS.map((c, i) => '<span class="sw" style="background:rgb(' + c + ')">' + (i + 1) + '</span>').join('') + '<span class="leg-note">Unordered groups; inputs: ' + esc(inputs) + '</span>';
      return;
    }
    const grad = a.kind === 'coherence' ? 'linear-gradient(90deg,#000,#fff)' : 'linear-gradient(90deg,' + SEQ.map((c) => 'rgb(' + c + ')').join(',') + ')';
    el.innerHTML = '<span>' + rich('[[' + a.term + '|' + a.label + ']]') + '</span><span>' + a.min + '</span><span class="bar" style="background:' + grad + '"></span><span>' + a.max + (a.unit ? ' ' + a.unit : '') + '</span>';
  }

  /* ---------- leads ---------- */
  function maxLeads() { return S.c.maxLeads != null ? S.c.maxLeads : 2; }
  function renderLeads() {
    const leads = S.c.leads || [];
    $('#leadsCard').hidden = !leads.length;
    const used = leads.filter((l) => S.examined.includes(l.id)).length, left = maxLeads() - used;
    $('#leadsLeft').textContent = left > 0 ? left + ' of ' + maxLeads() + ' requests left' : 'No requests left';
    $('#leads').innerHTML = leads.map((l, i) => {
      const got = S.examined.includes(l.id);
      return '<li class="' + (got ? 'got' : '') + '"><span class="lead-no">L' + (i + 1) + '</span><span class="lead-label">' + esc(l.label) + '</span>' +
        (got ? '<button type="button" class="chalk-btn" data-open="' + esc(l.id) + '">Open</button>'
          : '<button type="button" class="chalk-btn" data-lead="' + esc(l.id) + '"' + (left > 0 && !S.submitted ? '' : ' disabled') + '>Request</button>') + '</li>';
    }).join('');
  }

  /* ---------- timeline ---------- */
  function drawTimeline(target) {
    const svg = target || $('#timeline'); if (!svg || !S.c) return;
    const W = target ? 640 : 260, H = target ? 230 : 160, m = { l: 34, r: 12, t: 12, b: 36 };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const n = S.examined.length;
    const player = S.snaps.slice(0, n).map(spread);
    player.push(spread(S.submitted ? S.player : shares()));
    const panel = [];
    for (let j = 0; j <= n; j++) panel.push(spread(posterior(S.examined.slice(0, j))));
    const X = (j) => m.l + (n ? (j / n) * (W - m.l - m.r) : (W - m.l - m.r) / 2);
    const Y = (v) => m.t + (1 - v) * (H - m.t - m.b);
    let g = '';
    [0, 0.5, 1].forEach((v) => { g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="tl-grid"/><text x="' + (m.l - 5) + '" y="' + (Y(v) + 4) + '" class="tl-ax" text-anchor="end">' + v * 100 + '</text>'; });
    const gapPx = n ? (W - m.l - m.r) / n : 40, every = Math.max(1, Math.ceil(26 / gapPx));
    for (let j = 0; j <= n; j++) {
      if (j) { const ln = lineInfo(lineOf(itemById(S.examined[j - 1]) || {})), rw = Math.min(22, gapPx - 2); g += '<rect x="' + (X(j) - rw / 2) + '" y="' + (H - m.b + 5) + '" width="' + rw + '" height="14" rx="2" fill="' + ln.color + '"/>'; }
      if (j === 0 || j % every === 0 || j === n) g += '<text x="' + X(j) + '" y="' + (H - m.b + (j ? 16 : 28)) + '" class="tl-ax" text-anchor="' + (j ? 'middle' : 'start') + '">' + (j ? noteNo(S.examined[j - 1]) : 'Start') + '</text>';
    }
    const path = (arr) => arr.map((v, j) => (j ? 'L' : 'M') + X(j).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    if (S.submitted || target || S.showPanel) g += '<path d="' + path(panel) + '" class="tl-panel"/>' + panel.map((v, j) => '<circle cx="' + X(j) + '" cy="' + Y(v) + '" r="3" class="tl-panel-dot"/>').join('');
    g += '<path d="' + path(player) + '" class="tl-you"/>' + player.map((v, j) => '<circle cx="' + X(j) + '" cy="' + Y(v) + '" r="' + (j === n && !S.submitted ? 4.5 : 3.5) + '" class="tl-you-dot' + (j === n && !S.submitted ? ' live' : '') + '"/>').join('');
    svg.innerHTML = g;
  }

  /* ---------- red string ---------- */
  function drawStrings() {
    const board = $('#board'), svg = $('#strings');
    if (!board || !svg || !S.c || getComputedStyle(svg).display === 'none') return;
    const br = board.getBoundingClientRect();
    svg.setAttribute('width', br.width); svg.setAttribute('height', br.height);
    svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
    const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - br.left, y: r.top + r.height / 2 - br.top }; };
    let out = '';
    const line = (a, b, cls) => {
      const sag = Math.min(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.08);
      out += '<path d="M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + ((a.x + b.x) / 2).toFixed(1) + ' ' + ((a.y + b.y) / 2 + sag).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + '" class="' + cls + '"/>';
      out += '<circle cx="' + b.x.toFixed(1) + '" cy="' + b.y.toFixed(1) + '" r="3.5" class="tack"/>';
    };
    S.examined.forEach((id) => {
      const note = document.querySelector('.note[data-note="' + CSS.escape(id) + '"] .pin'); if (!note) return;
      const a = center(note), sel = id === S.selected ? ' sel' : '';
      const an = S.anchors[id];
      if (an) {
        const cv = an.el === 'seis' ? $('#seis') : $('#logs');
        if (cv && cv.offsetParent) { const r = cv.getBoundingClientRect(); line(a, { x: r.left - br.left + an.x, y: r.top - br.top + an.y }, 'str data' + sel); }
      }
      Object.entries(S.links[id] || {}).forEach(([cand, dir]) => {
        const pin = document.querySelector('.suspect[data-cand="' + CSS.escape(cand) + '"] .pin');
        if (pin && dir) line(a, center(pin), 'str ' + dir + sel);
      });
    });
    svg.innerHTML = out;
  }

  /* ---------- suspect sketches ---------- */
  function sketch(key) {
    const L = (d, extra) => '<path d="' + d + '" ' + (extra || '') + '/>';
    const layers = (fn) => [18, 32, 46, 60].map(fn).join('');
    let body = '';
    switch (key) {
      case 'normal-fault': case 'reverse-fault': {
        const off = key === 'normal-fault' ? 11 : -11, xf = (y) => 72 - (y - 4) * 0.34;
        body = layers((y) => L('M4 ' + y + ' L' + xf(y) + ' ' + y) + (y + off < 70 && y + off > 4 ? L('M' + xf(y + off) + ' ' + (y + off) + ' L116 ' + (y + off)) : '')) + L('M72 4 L50 68', 'class="flt"');
        break;
      }
      case 'growth-fault': body = [14, 26, 38, 50].map((y) => L('M4 ' + y + ' L' + (72 - (y - 4) * 0.34) + ' ' + y) + L('M' + (72 - (y * 1.3 - 4) * 0.34) + ' ' + y * 1.3 + ' L116 ' + y * 1.3)).join('') + L('M72 4 L50 68', 'class="flt"'); break;
      case 'wedge': body = [12, 24, 36, 48].map((y, i) => L('M4 ' + y + ' L60 ' + (y + i * 2) + ' L116 ' + (y + i * 5 + 8))).join('') + L('M70 4 L52 68', 'class="flt"'); break;
      case 'strike-slip': body = L('M60 4 L60 68', 'class="flt"') + L('M40 52 L40 20 M34 28 L40 20 L46 28') + L('M80 20 L80 52 M74 44 L80 52 L86 44') + L('M8 60 L56 40') + L('M64 50 L112 30'); break;
      case 'erosion': body = L('M4 18 L116 18') + [34, 48, 62].map((y) => L('M4 ' + y + ' L' + (54 - (62 - y) * 0.4) + ' ' + y)).join('') + L('M4 26 L40 26 C58 26 60 60 80 64 L116 64', 'class="flt"') + L('M84 40 L116 40'); break;
      case 'withdrawal': body = [16, 30, 44].map((y) => L('M4 ' + y + ' C40 ' + y + ' 70 ' + (y + 8) + ' 116 ' + (y + 10))).join('') + L('M4 56 C50 56 80 64 116 66 L116 70 L4 70 Z', 'class="body"'); break;
      case 'fold': body = [22, 36, 50, 64].map((y) => L('M4 ' + y + ' C40 ' + (y - 16) + ' 80 ' + (y - 16) + ' 116 ' + y)).join('') + L('M60 6 L60 70', 'class="axis"'); break;
      case 'drape': body = L('M34 62 C50 38 70 38 86 62 Z', 'class="body"') + [20, 34, 48].map((y, i) => L('M4 ' + (y + 6) + ' C44 ' + (y + 6) + ' 48 ' + (y - 8 + i * 3) + ' 60 ' + (y - 8 + i * 3) + ' C72 ' + (y - 8 + i * 3) + ' 76 ' + (y + 6) + ' 116 ' + (y + 6))).join('') + L('M4 62 L116 62'); break;
      case 'diapir': body = L('M44 70 C44 40 52 22 60 22 C68 22 76 40 76 70 Z', 'class="body"') + [16, 30, 46].map((y) => L('M4 ' + (y + 8) + ' C30 ' + (y + 8) + ' 40 ' + (y - 2) + ' 50 ' + (y - 4)) + L('M70 ' + (y - 4) + ' C80 ' + (y - 2) + ' 90 ' + (y + 8) + ' 116 ' + (y + 8))).join(''); break;
      case 'valley': body = [16, 50, 62].map((y) => L('M4 ' + y + ' L116 ' + y)).join('') + L('M4 30 L116 30', 'stroke-dasharray="0"') + L('M24 24 C36 62 84 62 96 24 Z', 'class="body"') + L('M4 24 L116 24'); break;
      case 'channel-stack': body = [14, 60].map((y) => L('M4 ' + y + ' L116 ' + y)).join('') + L('M14 26 C26 56 66 56 78 26 Z', 'class="body"') + L('M52 20 C60 40 88 40 98 20 Z', 'class="body"') + L('M4 26 L116 26'); break;
      case 'collapse': body = [18, 32, 46].map((y, i) => L('M4 ' + y + ' C40 ' + y + ' 46 ' + (y + 14 - i * 3) + ' 60 ' + (y + 14 - i * 3) + ' C74 ' + (y + 14 - i * 3) + ' 80 ' + y + ' 116 ' + y)).join('') + L('M40 62 C50 56 70 56 80 62 L80 70 L40 70 Z', 'class="void"'); break;
      case 'two-sands': body = L('M60 4 L60 70', 'class="axis"') + L('M50 18 L70 18 L70 28 L50 28 Z', 'class="body"') + L('M50 44 L70 44 L70 54 L50 54 Z', 'class="body"') + L('M4 36 L116 36'); break;
      default: body = '<text x="60" y="48" text-anchor="middle" class="q">?</text>';
    }
    return '<svg viewBox="0 0 120 72" class="sketch" aria-hidden="true">' + body + '</svg>';
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
    const s = S.section, time = S.domain === 'time', key = S.cmap + S.gain + S.domain + S.attr;
    if (S._imgKey === key) return S._off;
    const nz = time ? s.nt : s.nz, A = GW.ATTRIBUTES[S.attr] || GW.ATTRIBUTES.amplitude;
    const arr = GW.attribute(s, S.attr)[time ? 'time' : 'depth'];
    const off = document.createElement('canvas'); off.width = s.nx; off.height = nz;
    const ctx = off.getContext('2d'), id = ctx.createImageData(s.nx, nz);
    const seq = (f) => { f = clamp(f, 0, 1) * (SEQ.length - 1); const i = Math.min(SEQ.length - 2, Math.floor(f)), u = f - i; return [0, 1, 2].map((q) => SEQ[i][q] * (1 - u) + SEQ[i + 1][q] * u); };
    for (let i = 0; i < s.nx; i++) for (let j = 0; j < nz; j++) {
      const v = arr[i * nz + j];
      let rgb;
      if (A.kind === 'diverging') rgb = colorFor(v * S.gain, S.cmap);
      else if (A.kind === 'classes') rgb = CLASS_COLORS[v % CLASS_COLORS.length];
      else if (A.kind === 'coherence') { const g = 255 * clamp((v - A.min) / (A.max - A.min), 0, 1); rgb = [g, g, g]; }
      else rgb = seq((v - A.min) / (A.max - A.min));
      const q = (j * s.nx + i) * 4;
      id.data[q] = rgb[0]; id.data[q + 1] = rgb[1]; id.data[q + 2] = rgb[2]; id.data[q + 3] = 255;
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
    if (!S.c || (!S.section && !S.img)) return;
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

    // circles for examined evidence that points at the section
    S.anchors = S.anchors || {};
    Object.keys(S.anchors).forEach((k) => { if (S.anchors[k].el === 'seis') delete S.anchors[k]; });
    examinedItems().forEach((e) => {
      const w = e.where; if (!w || w.well || w.x_m == null) return;
      if ((w.attribute || 'amplitude') !== S.attr && e.id !== S.selected) return;
      const cx = X(w.x_m), zc = w.z_m, rz = w.rz_m || 150;
      const y1 = Yz(w.x_m, zc - rz), y2 = Yz(w.x_m, zc + rz), cy = (y1 + y2) / 2, ry = Math.max(10, (y2 - y1) / 2);
      const rx = Math.max(12, ((w.rx_m || 300) / S.width_m) * pw);
      circleMark(ctx, cx, cy, rx, ry, e.id === S.selected, noteNo(e.id));
      S.anchors[e.id] = { el: 'seis', x: cx + rx * 0.72, y: cy - ry * 0.72 };
    });
  }

  function circleMark(ctx, cx, cy, rx, ry, strong, label) {
    ctx.save();
    ctx.strokeStyle = '#C0161F'; ctx.lineWidth = strong ? 3.2 : 2.2; ctx.globalAlpha = strong ? 1 : 0.85;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.ellipse(cx + k * 1.5, cy - k, rx + k * 3, ry + k * 2, -0.08 + k * 0.1, 0.15 + k * 0.3, Math.PI * 2 + 0.1 * k);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.fillStyle = '#C0161F'; ctx.font = '700 12px ' + cssv('--sans'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tx = cx - rx * 0.8, ty = cy - ry - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(tx - 14, ty - 8, 28, 16);
    ctx.fillStyle = '#C0161F'; ctx.fillText(label, tx, ty);
    ctx.restore();
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
    const c = S.c; if (!c || !c.wells || !c.wells.length || !S.logs || !S.expertTops) return;
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
    examinedItems().forEach((e) => {
      const w = e.where; if (!w || !w.well) return;
      const k = c.wells.findIndex((q) => q.name === w.well); if (k < 0) return;
      const x0 = m.l + k * (tw + gap), sh = flatShift(w.well);
      const y1 = clamp(Y(w.top_m - sh), m.t + 8, m.t + ph - 8), y2 = clamp(Y(w.base_m - sh), m.t + 8, m.t + ph - 8);
      const cx = x0 + tw / 2, cy = (y1 + y2) / 2, rx = tw / 2 + 4, ry = Math.max(12, (y2 - y1) / 2 + 6);
      circleMark(ctx, cx, cy, rx, ry, e.id === S.selected, noteNo(e.id));
      S.anchors[e.id] = { el: 'logs', x: cx + rx * 0.72, y: cy - ry * 0.72 };
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
    drawLogs(); drawSeis(); drawStrings();
  }

  /* ---------- closing the case ---------- */
  function submit() {
    const c = S.c;
    const just = $('#justify').value.trim();
    if (!$('#justifyWrap').hidden && just.length < 40) { $('#submitMsg').textContent = 'This case needs a written justification of at least a sentence or two.'; $('#justify').focus(); return; }
    S.submitted = true; S.player = shares(); S.justification = just;
    document.body.classList.add('locked');
    $('#submit').disabled = true; $('#submitMsg').textContent = '';
    renderDebrief(); renderLeads();
    drawSeis(); drawLogs(); drawTimeline(); drawStrings();
    $('#debrief').hidden = false;
    $('#debrief').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function renderDebrief() {
    const c = S.c, P = S.player, E = posterior(S.examined), bayes = usesLikelihood();
    const Eall = bayes ? posterior((c.evidence || []).map((e) => e.id)) : E;
    const overlap = c.candidates.reduce((a, k) => a + Math.min(P[k.id], E[k.id]), 0);
    const lead = c.candidates.reduce((a, k) => (E[k.id] > E[a.id] ? k : a), c.candidates[0]);
    const pLead = c.candidates.reduce((a, k) => (P[k.id] > P[a.id] ? k : a), c.candidates[0]);
    const bar = (who, v, col, cls) => '<div class="cmp-bar ' + cls + '"><span class="who">' + who + '</span><span class="track"><span class="fill" style="width:' + v * 100 + '%;background:' + col + '"></span></span><span class="val">' + pct(v) + '</span></div>';
    const rows = c.candidates.map((k, i) => {
      const col = CAND_COLORS[i % CAND_COLORS.length];
      return '<div class="cmp-row"><div class="cmp-label"><b>' + String.fromCharCode(65 + i) + '</b> ' + esc(k.label) + '</div><div class="cmp-bars">' +
        bar('You', P[k.id], col, '') + bar('Panel', E[k.id], col, 'expert') + (bayes ? bar('Panel, all evidence', Eall[k.id], col, 'expert all') : '') + '</div></div>';
    }).join('');

    let narrowing = '';
    if (bayes) {
      const base = 1;
      const rowsN = allItems().map((e) => {
        const sp = spread(posterior([e.id]));
        const drop = Math.max(0, base - sp);
        return '<tr class="' + (S.examined.includes(e.id) ? '' : 'unseen') + '"><td>' + noteNo(e.id) + '</td><td>' + (e.kind === 'lead' ? esc(e.label) + '<div class="subnote">' + esc(e.result || '') + '</div>' : esc(e.label)) + '</td><td>' +
          (e.kind === 'lead' ? (S.examined.includes(e.id) ? 'Requested' : 'Not requested') : (S.examined.includes(e.id) ? 'Examined' : 'Not examined')) + '</td><td><span class="mini"><span style="width:' + Math.min(100, drop * 400) + '%"></span></span> ' + (drop * 100).toFixed(0) + '</td></tr>';
      }).join('');
      narrowing = '<h4>How much each note narrows the field</h4><p class="howto">Reduction in the panel\u2019s [[spread|spread of confidence]], in percentage points, from that note alone starting from equal weights. Notes near zero are consistent with every suspect.</p>'.replace(/\[\[[^\]]+\]\]/g, (m) => rich(m)) +
        '<div class="table-wrap"><table class="narrow"><thead><tr><th></th><th>Note</th><th>Status</th><th>Narrowing</th></tr></thead><tbody>' + rowsN + '</tbody></table></div>';
    }

    let topsTable = '';
    if (c.tops && c.tops.length) {
      const trs = [];
      c.tops.forEach((t) => c.wells.forEach((w) => {
        const e = S.expertTops[t.name][w.name]; if (!e) return;
        const p = S.picks[t.name][w.name];
        let diff = '';
        if (e.absent) diff = p == null ? 'Both absent' : 'Picked where panel has none';
        else if (p == null) diff = 'Not picked';
        else { const dd = p - e.depth; diff = (dd > 0 ? '+' : '') + Math.round(dd) + ' m' + (Math.abs(dd) <= e.unc ? ' (within ±' + e.unc + ')' : ''); }
        trs.push('<tr><td>' + esc(t.name) + '</td><td>' + esc(w.name) + '</td><td>' + (p == null ? '–' : p) + '</td><td>' + (e.absent ? 'Absent' : Math.round(e.depth) + ' ± ' + e.unc) + '</td><td>' + diff + (e.note ? '<div class="subnote">' + esc(e.note) + '</div>' : '') + '</td></tr>');
      }));
      topsTable = '<h4>Tops</h4><div class="table-wrap"><table class="tops"><thead><tr><th>Top</th><th>Well</th><th>Your pick (m)</th><th>Panel (m)</th><th>Difference</th></tr></thead><tbody>' + trs.join('') + '</tbody></table></div>';
    }

    $('#debriefBody').innerHTML =
      '<p class="stamp">Case ' + caseNumber(c) + ' · ' + esc(c.title) + '</p>' +
      '<p class="standing">Suspects still standing at 10% or more: <b>' + c.candidates.filter((k) => P[k.id] >= 0.1).length + ' of ' + c.candidates.length + '</b> in your case, <b>' + c.candidates.filter((k) => E[k.id] >= 0.1).length + '</b> for the panel.</p>' +
      '<h4>Confidence</h4>' +
      (bayes ? '<p class="howto">Panel: the panel\u2019s distribution after the same ' + S.examined.length + ' note' + (S.examined.length === 1 ? '' : 's') + ' examined here. Panel, all evidence: after every evidence note, without leads.</p>' : '') +
      '<div class="cmp">' + rows + '</div>' +
      '<dl class="metrics">' +
      '<div><dt>' + rich('[[overlap|Overlap with panel]]') + '</dt><dd>' + pct(overlap) + '</dd></div>' +
      '<div><dt>' + rich('[[spread|Spread of confidence]]') + '</dt><dd>' + pct(spread(P)) + ' <small>you</small> / ' + pct(spread(E)) + ' <small>panel</small></dd></div>' +
      '<div><dt>Largest weight</dt><dd>' + pct(P[pLead.id]) + ' <small>you, ' + esc(pLead.label) + '</small> / ' + pct(E[lead.id]) + ' <small>panel, ' + esc(lead.label) + '</small></dd></div>' +
      '</dl>' +
      (bayes ? '<h4>Uncertainty timeline</h4><div class="tl-wrap"><svg id="timelineBig" class="timeline big" role="img" aria-label="Spread of confidence after each note"></svg><p class="tl-key"><span class="k you"></span>You <span class="k panel"></span>Panel</p></div>' : '') +
      byLine() + mlTable() +
      narrowing +
      (c.outcome ? '<div class="outcome"><h4>What is known</h4><p>' + rich(c.outcome.statement) + '</p>' +
        '<div class="conf"><span>Confidence attached to this outcome</span><span class="track"><span class="fill" style="width:' + (c.outcome.confidence * 100) + '%"></span></span><strong>' + pct(c.outcome.confidence) + '</strong></div>' +
        '<p class="basis">' + rich(c.outcome.basis || '') + '</p></div>' : '') +
      topsTable +
      (c.debrief ? '<h4>Notes</h4><p>' + rich(c.debrief) + '</p>' : '') +
      (S.justification ? '<h4>Your justification</h4><blockquote>' + esc(S.justification) + '</blockquote>' : '');
    if (bayes) drawTimeline($('#timelineBig'));

    $('#biasToggle').checked = false; $('#bias').hidden = true;
    $('#bias').innerHTML = biasCheck(E);
    S.session = S.session.filter((r) => r.id !== c.id);
    S.session.push({ id: c.id, title: c.title, tier: c.tier, overlap, notes: S.examined.length, you: spread(P), panel: spread(E) });
    renderSession();
  }

  function byLine() {
    if (!usesLikelihood()) return '';
    const groups = LINES.map((l) => ({ l, items: allItems().filter((e) => lineOf(e) === l.id) })).filter((g) => g.items.length);
    const row = (label, color, ids, note) => { const drop = Math.max(0, 1 - spread(posterior(ids))); return '<div class="line-row"><span class="line-name"><i style="background:' + color + '"></i>' + label + '</span><span class="track"><span class="fill" style="width:' + drop * 100 + '%;background:#9E1B22"></span></span><span class="val">' + Math.round(drop * 100) + '</span><span class="subnote">' + note + '</span></div>'; };
    const rows = groups.map((g) => g.l.id === 'lead'
      ? g.items.map((e) => row('Lead ' + noteNo(e.id) + ': ' + esc(e.label), g.l.color, [e.id], S.examined.includes(e.id) ? 'requested' : 'not requested')).join('')
      : row(g.l.label, g.l.color, g.items.map((e) => e.id), g.items.length + ' clue' + (g.items.length === 1 ? '' : 's') + ', ' + g.items.filter((e) => S.examined.includes(e.id)).length + ' examined')).join('');
    return '<h4>Narrowing by line of evidence</h4><p class="howto">Drop in the panel\u2019s spread of confidence, in percentage points, from each line of evidence on its own, starting from equal weights.</p><div class="lines-chart">' + rows + '</div>';
  }
  function mlTable() {
    const ml = allItems().filter((e) => lineOf(e) === 'ml');
    if (!ml.length || !usesLikelihood()) return '';
    return '<h4>Machine learning results</h4><p class="howto">Confidence reported by each model beside how much its result narrows the panel\u2019s field. A model reports confidence in its own output, within what it was trained on; the narrowing depends on how well that output separates the suspects in this geologic setting.</p><div class="table-wrap"><table><thead><tr><th></th><th>Result</th><th>Reported by the model</th><th>Narrowing</th></tr></thead><tbody>' +
      ml.map((e) => { const drop = Math.max(0, 1 - spread(posterior([e.id]))); return '<tr><td>' + noteNo(e.id) + '</td><td>' + esc(e.label) + (e.model ? '<div class="subnote">' + esc(e.model.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, k, l) => l || k)) + '</div>' : '') + '</td><td>' + (e.reportedConfidence != null ? pct(e.reportedConfidence) : 'none (unsupervised)') + '</td><td><span class="mini"><span style="width:' + Math.min(100, drop * 400) + '%"></span></span> ' + Math.round(drop * 100) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }

  function biasCheck(E) {
    const c = S.c, items = [], bayes = usesLikelihood();
    if (bayes) {
      const unseen = (c.evidence || []).filter((e) => diagnosticRatio(e) >= 2 && !S.examined.includes(e.id));
      items.push('<li><strong>Diagnostic notes not examined:</strong> ' + (unseen.length ? unseen.map((e) => noteNo(e.id) + ' ' + esc(e.label)).join('; ') : 'none') + '</li>');
      const flips = [], idle = [];
      S.examined.forEach((id) => {
        const e = itemById(id), links = S.links[id] || {};
        if (!e || !e.likelihood) return;
        const vals = c.candidates.map((k) => (e.likelihood[k.id] != null ? e.likelihood[k.id] : 0.5)), mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        Object.entries(links).forEach(([cand, dir]) => {
          const l = e.likelihood[cand] != null ? e.likelihood[cand] : 0.5, name = (c.candidates.find((k) => k.id === cand) || {}).label;
          if ((dir === 'for' && l < mean - 0.05) || (dir === 'against' && l > mean + 0.05)) flips.push(noteNo(id) + ' strung ' + (dir === 'for' ? 'in support of ' : 'against ') + esc(name));
        });
        if (Object.keys(links).length && diagnosticRatio(e) < 1.25) idle.push(noteNo(id) + ' ' + esc(e.label));
      });
      items.push('<li><strong>Strings the panel reads in the opposite direction:</strong> ' + (flips.length ? flips.join('; ') : 'none') + '</li>');
      items.push('<li><strong>Strung notes the panel treats as consistent with every suspect:</strong> ' + (idle.length ? idle.join('; ') : 'none') + '</li>');
      const leads = (c.leads || []);
      if (leads.length) {
        const best = leads.reduce((a, l) => (spread(posterior([l.id])) < spread(posterior([a.id])) ? l : a), leads[0]);
        items.push('<li><strong>Lead that narrows the panel\u2019s field most on its own:</strong> ' + noteNo(best.id) + ' ' + esc(best.label) + (S.examined.includes(best.id) ? ' (requested)' : ' (not requested)') + '</li>');
      }
    }
    if (c.wells && c.wells.length) {
      const never = [...S.availLogs].filter((k) => !LOGS[k].combo && !S.viewed.has(k));
      items.push('<li><strong>Seismic displays never shown:</strong> ' + (Object.keys(GW.ATTRIBUTES).filter((k) => !S.attrsSeen.has(k)).map((k) => GW.ATTRIBUTES[k].label).join(', ') || 'none') + '</li>');
      items.push('<li><strong>Log types never displayed:</strong> ' + (never.length ? never.map((k) => LOGS[k].label).join(', ') : 'none') + '</li>');
      let need = 0, made = 0;
      (c.tops || []).forEach((t) => c.wells.forEach((w) => { const e = S.expertTops[t.name][w.name]; if (e && !e.absent) { need++; if (S.picks[t.name][w.name] != null) made++; } }));
      if (need) items.push('<li><strong>Tops picked:</strong> ' + made + ' of ' + need + ' that the panel picked' + (S.flattenUsed ? '; display was flattened at least once' : '; display was not flattened') + '</li>');
    }
    const P = S.player;
    const over = c.candidates.filter((k) => P[k.id] - E[k.id] >= 0.2), under = c.candidates.filter((k) => E[k.id] - P[k.id] >= 0.2);
    items.push('<li><strong>Suspects weighted 20 points or more above the panel:</strong> ' + (over.length ? over.map((k) => esc(k.label)).join(', ') : 'none') + '</li>');
    items.push('<li><strong>Suspects weighted 20 points or more below the panel:</strong> ' + (under.length ? under.map((k) => esc(k.label)).join(', ') : 'none') + '</li>');
    return '<ul>' + items.join('') + '</ul>';
  }

  function renderSession() {
    if (!S.session.length) { $('#session').hidden = true; return; }
    $('#session').hidden = false;
    $('#sessionBody').innerHTML = S.session.map((r) =>
      '<tr><td>' + esc(r.title) + '</td><td>' + esc((GW.tiers.find((t) => t.id === r.tier) || { label: r.tier }).label) + '</td><td>' + r.notes + '</td><td>' + pct(r.overlap) + '</td><td>' + pct(r.you) + ' / ' + pct(r.panel) + '</td></tr>').join('');
  }

  function nextCase() {
    const order = [];
    GW.tiers.forEach((t) => GW.cases.filter((c) => c.tier === t.id).forEach((c) => order.push(c.id)));
    loadCase(order[(order.indexOf(S.c.id) + 1) % order.length]);
    window.scrollTo({ top: 0 });
  }

  /* ---------- case file pop-out ---------- */
  function popCase() {
    const c = S.c;
    const win = window.open('', 'gd_casefile', 'width=560,height=780');
    if (!win) { $('#submitMsg').textContent = 'The browser blocked the new window. Allow pop-ups for this page to open the case file separately.'; return; }
    const terms = new Set();
    const plain = (s) => { termsIn(s).forEach((k) => terms.add(k)); return esc(s).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, k, l) => { const g = gloss(k); return '<b>' + (l || (g ? g[0].toLowerCase() : k)) + '</b>'; }); };
    let body = '<p class="no">Case ' + caseNumber(c) + '</p><h1>' + esc(c.title) + '</h1><p>' + plain(c.brief || '') + '</p>';
    body += '<h2>Suspects</h2>' + c.candidates.map((k, i) => '<h3>' + String.fromCharCode(65 + i) + ' · ' + esc(k.label) + '</h3><p>' + plain(k.description || '') + '</p><h4>For</h4><ul>' + (k.pros || []).map((p) => '<li>' + plain(p) + '</li>').join('') + '</ul><h4>Against</h4><ul>' + (k.cons || []).map((p) => '<li>' + plain(p) + '</li>').join('') + '</ul>').join('');
    if (c.wells && c.wells.length) body += '<h2>Wells</h2><ul>' + c.wells.map((w) => '<li><b>' + esc(w.name) + '</b> ±' + (w.depthUncertainty_m || 0) + ' m. ' + plain(w.note || '') + '</li>').join('') + '</ul>';
    if (terms.size) body += '<h2>Terms</h2><dl>' + [...terms].map((k) => gloss(k)).filter(Boolean).map((g) => '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>').join('') + '</dl>';
    win.document.open();
    win.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Case file: ' + esc(c.title) + '</title><style>body{font:15px/1.55 "Source Sans 3","Segoe UI",system-ui,sans-serif;color:#16191C;background:#f3ecdc;max-width:62ch;margin:24px auto;padding:0 18px}.no{font-family:"Special Elite","Courier New",monospace;color:#841617;margin:0}h1{font:600 26px/1.2 "Source Serif 4",Georgia,serif;margin:0 0 8px}h2{font:18px/1.3 "Special Elite","Courier New",monospace;color:#841617;margin:22px 0 4px;border-bottom:1px solid #c9bfa8}h3{font:600 16px/1.3 "Source Serif 4",Georgia,serif;margin:12px 0 2px}h4{font-size:13px;color:#5C6670;margin:6px 0 0}ul{margin:4px 0;padding-left:20px}dt{font-weight:600;margin-top:8px}dd{margin:0}</style></head><body>' + body + '</body></html>');
    win.document.close();
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('#tiers').addEventListener('click', (e) => { const b = e.target.closest('button[data-tier]'); if (!b) return; S.tier = b.dataset.tier; renderTiers(); });
    $('#caseList').addEventListener('click', (e) => { const b = e.target.closest('[data-case]'); if (b) loadCase(b.dataset.case); });
    $('#cmap').addEventListener('change', (e) => { S.cmap = e.target.value; renderLegend(); drawSeis(); });
    $('#attr').addEventListener('change', (e) => setAttr(e.target.value));
    $('#showPanel').addEventListener('change', (e) => { S.showPanel = e.target.checked; drawTimeline(); });
    $('#cluePrev').addEventListener('click', () => stepClue(-1));
    $('#clueNext').addEventListener('click', () => stepClue(1));
    $('#railLines').addEventListener('click', (e) => { const b = e.target.closest('button[data-rail]'); if (b && !b.disabled) { examine(b.dataset.rail); focusClue(b.dataset.rail); } });
    document.addEventListener('keydown', (e) => { const ae = document.activeElement || {}; if (!S.c || $('#howDlg').open || /TEXTAREA|SELECT/.test(ae.tagName || '') || (ae.tagName === 'INPUT' && !/checkbox|radio|button/.test(ae.type))) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); stepClue(1); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); stepClue(-1); } });
    $('#domain').addEventListener('change', (e) => { S.domain = e.target.value; drawSeis(); drawStrings(); });
    $('#gain').addEventListener('input', (e) => { S.gain = Number(e.target.value); $('#gainOut').textContent = S.gain.toFixed(1) + '×'; drawSeis(); });
    $('#showWells').addEventListener('change', (e) => { S.showWells = e.target.checked; drawSeis(); });
    $('#logType').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-log]'); if (!b || b.disabled) return;
      S.logType = b.dataset.log; (LOGS[S.logType].combo || [S.logType]).forEach((k) => S.viewed.add(k));
      document.querySelectorAll('#logType button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      drawLogs(); drawStrings();
    });
    $('#activeTop').addEventListener('change', (e) => { S.activeTop = e.target.value; drawLogs(); });
    $('#flatten').addEventListener('change', (e) => {
      const t = e.target.value;
      if (t && S.c.wells.some((w) => S.picks[t][w.name] == null)) { $('#logReadout').textContent = 'Pick ' + t + ' in every well to flatten on it.'; e.target.value = S.flatten; return; }
      S.flatten = t; if (t) S.flattenUsed = true; drawLogs(); drawStrings();
    });
    $('#clearPicks').addEventListener('click', () => { if (S.submitted) return; Object.keys(S.picks).forEach((k) => (S.picks[k] = {})); S.flatten = ''; $('#flatten').value = ''; drawLogs(); drawSeis(); drawStrings(); });
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
    $('#suspects').addEventListener('input', (e) => {
      const s = e.target.closest('input[data-cand]'); if (!s) return;
      S.raw[s.dataset.cand] = Number(s.value); updateShares(); drawTimeline();
    });
    $('#suspects').addEventListener('toggle', () => requestAnimationFrame(drawStrings), true);
    $('#notes').addEventListener('click', (e) => { const b = e.target.closest('[data-note]'); if (b && !e.target.closest('.term')) examine(b.dataset.note); });
    $('#noteDetail').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-link]'); if (!b || S.submitted) return;
      const id = S.selected, cand = b.dataset.cand;
      S.links[id] = S.links[id] || {};
      if (b.dataset.link) S.links[id][cand] = b.dataset.link; else delete S.links[id][cand];
      renderNotes(); renderNoteDetail(); drawStrings();
    });
    $('#leads').addEventListener('click', (e) => {
      const r = e.target.closest('button[data-lead]'), o = e.target.closest('button[data-open]');
      if (r && !r.disabled) examine(r.dataset.lead);
      if (o) examine(o.dataset.open);
    });
    $('#submit').addEventListener('click', submit);
    $('#biasToggle').addEventListener('change', (e) => { $('#bias').hidden = !e.target.checked; });
    $('#retry').addEventListener('click', () => { loadCase(S.c.id); window.scrollTo({ top: 0 }); });
    $('#next').addEventListener('click', nextCase);
    $('#popCase').addEventListener('click', popCase);
    const dlg = $('#howDlg');
    dlg.querySelectorAll('.brief-page p, .brief-page li').forEach((el) => (el.innerHTML = el.innerHTML.replace(/\[\[[^\]]+\]\]/g, (m) => rich(m.replace(/&amp;/g, '&')))));
    const showPage = (k) => {
      S.briefPage = k;
      dlg.querySelectorAll('.brief-page').forEach((p) => (p.hidden = Number(p.dataset.page) !== k));
      dlg.querySelectorAll('.brief-tabs button').forEach((b) => b.setAttribute('aria-selected', Number(b.dataset.page) === k));
      dlg.querySelectorAll('.brief-dots i').forEach((d, i) => d.classList.toggle('on', i === k));
      $('#briefBack').style.visibility = k ? 'visible' : 'hidden';
      $('#briefNext').textContent = k < 2 ? 'Next' : (S.c && !S.everOpened ? 'Open the case' : 'Back to the board');
    };
    GW._showBrief = (k) => { showPage(k); if (!dlg.open) dlg.showModal(); };
    dlg.querySelector('.brief-tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-page]'); if (b) showPage(Number(b.dataset.page)); });
    $('#briefBack').addEventListener('click', () => showPage(Math.max(0, S.briefPage - 1)));
    $('#briefNext').addEventListener('click', () => { if (S.briefPage < 2) showPage(S.briefPage + 1); else { S.everOpened = true; dlg.close(); } });
    $('#howBtn').addEventListener('click', () => GW._showBrief(2));
    $('#briefBtn').addEventListener('click', () => GW._showBrief(0));
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
      if (t) { e.preventDefault(); e.stopPropagation(); showTerm(t); return; }
      if (e.target.closest('.term-close') || (!pop.hidden && !e.target.closest('#termPop'))) pop.hidden = true;
    }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#termPop').hidden = true; });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { drawSeis(); drawLogs(); drawStrings(); }, 120); });
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(drawStrings)).observe($('#board'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawSeis(); drawLogs(); drawStrings(); });
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
    let seen = false;
    try { seen = localStorage.getItem('geoDetectiveHowSeen') === '1'; localStorage.setItem('geoDetectiveHowSeen', '1'); } catch (e) { /* storage unavailable */ }
    if (!seen && $('#howDlg').showModal) GW._showBrief(0);
  };
})();
