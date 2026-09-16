/* Geo-Detective: synthetic earth model
 *
 * One model drives everything:
 *   structure + stratigraphy  ->  rock properties (Vsh, porosity, fluid)
 *   rock physics              ->  Vp, Vs, density, gamma ray, resistivity, neutron, sonic
 *   seismic workflow          ->  reflectivity in two-way time, attenuation, phase, multiples,
 *                                 diffraction residuals, statics, noise, footprint,
 *                                 then depth conversion with an imperfect velocity model
 *   logging                   ->  tool vertical resolution, counting noise, borehole effects,
 *                                 calibration offsets, depth shifts
 * License: CC BY-SA 4.0
 */
(function () {
  'use strict';
  const GW = (window.GW = window.GW || {});

  /* ---------- random numbers and noise ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash2(i, j, s) { const h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return (h - Math.floor(h)) * 2 - 1; }
  const sm = (f) => f * f * (3 - 2 * f);
  function vnoise1(t, s) { const i = Math.floor(t), u = sm(t - i); return hash2(i, 0, s) * (1 - u) + hash2(i + 1, 0, s) * u; }
  function vnoise2(x, y, s) {
    const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
    return (hash2(i, j, s) * (1 - u) + hash2(i + 1, j, s) * u) * (1 - v) + (hash2(i, j + 1, s) * (1 - u) + hash2(i + 1, j + 1, s) * u) * v;
  }
  function gsmooth(arr, sigma) {
    if (sigma < 0.3) return arr.slice();
    const h = Math.ceil(3 * sigma), w = [];
    let ws = 0;
    for (let k = -h; k <= h; k++) { const v = Math.exp(-0.5 * (k / sigma) ** 2); w.push(v); ws += v; }
    const out = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      let s = 0;
      for (let k = -h; k <= h; k++) s += arr[clamp(i + k, 0, arr.length - 1)] * w[k + h];
      out[i] = s / ws;
    }
    return out;
  }

  /* ---------- rock physics ---------- */
  // Lithology presets: shale volume, porosity at 1500 m, matrix, consolidation factor on brine Vp.
  const LITH = {
    shale:       { vsh: 0.95, phi: 0.18, matrix: 'quartz', cons: 1.0, lamination: 0.7 },
    silty_shale: { vsh: 0.62, phi: 0.17, matrix: 'quartz', cons: 0.95, lamination: 0.9 },
    sand:        { vsh: 0.08, phi: 0.26, matrix: 'quartz', cons: 0.75, ntg: 0.88, bedScale_m: 4, lateralScale_m: 900 },
    tight_sand:  { vsh: 0.12, phi: 0.06, matrix: 'quartz', cons: 1.0, ntg: 0.92, bedScale_m: 3, lateralScale_m: 1200 },
    limestone:   { vsh: 0.04, phi: 0.08, matrix: 'calcite', cons: 1.0, lamination: 0.3 },
    marl:        { vsh: 0.45, phi: 0.12, matrix: 'calcite', cons: 1.0, lamination: 0.8 }
  };
  const MIN = {
    quartz:  { K: 37.0, rho: 2.65, vp: 6.05, nphi: -0.02 },
    calcite: { K: 70.8, rho: 2.71, vp: 6.40, nphi: 0.0 },
    clay:    { K: 21.0, rho: 2.58, vp: 3.60 }
  };
  const FLUID = { oil: { rho: 0.78, K: 1.0, hi: 0.9 }, gas: { rho: 0.22, K: 0.06, hi: 0.35 } };
  GW.LITH = LITH;

  // Brine-case Vp from Raymer-type time average with a pressure trend; Vs from Greenberg-Castagna;
  // hydrocarbon case by Gassmann substitution; resistivity from Archie with a shale conduction term.
  function rock(L, z, vsh, phiRef, hc) {
    const min = MIN[L.matrix || 'quartz'];
    const comp = L.compaction_m || (vsh > 0.5 ? 1800 : L.matrix === 'calcite' ? 5000 : 3500);
    const phi = clamp(phiRef * Math.exp(-(z - 1500) / comp), 0.01, 0.42);
    const vma = vsh * MIN.clay.vp + (1 - vsh) * min.vp;
    const pf = 0.78 + 0.22 * (1 - Math.exp(-Math.max(z, 0) / 1200));
    const vpB = ((1 - phi) ** 2 * vma + phi * 1.55) * pf * (L.cons != null ? L.cons : 1);
    const rhoMa = vsh * MIN.clay.rho + (1 - vsh) * min.rho;
    const rhoB = phi * 1.05 + (1 - phi) * rhoMa;
    let vsB = L.matrix === 'calcite' ? -0.055 * vpB * vpB + 1.017 * vpB - 1.031 : vsh > 0.5 ? 0.77 * vpB - 0.8674 : 0.8621 * vpB - 1.1724;
    vsB = Math.max(0.35, vsB);
    let vp = vpB, vs = vsB, rho = rhoB, sw = 1, hi = 1;
    if (hc) {
      const fl = FLUID[hc.fluid];
      sw = hc.sw; hi = sw + (1 - sw) * fl.hi;
      const Kv = vsh * MIN.clay.K + (1 - vsh) * min.K, Kr = 1 / (vsh / MIN.clay.K + (1 - vsh) / min.K), Km = (Kv + Kr) / 2;
      const Kb = 2.6, Kf = 1 / (sw / Kb + (1 - sw) / fl.K);
      const Ksat = rhoB * (vpB * vpB - (4 / 3) * vsB * vsB), mu = rhoB * vsB * vsB;
      const a = (phi * Km) / Kb;
      const Kdry = clamp((Ksat * (a + 1 - phi) - Km) / (a + Ksat / Km - 1 - phi), 0.3, 0.95 * Km);
      const K2 = Kdry + (1 - Kdry / Km) ** 2 / (phi / Kf + (1 - phi) / Km - Kdry / (Km * Km));
      rho = phi * (sw * 1.05 + (1 - sw) * fl.rho) + (1 - phi) * rhoMa;
      vp = Math.sqrt((K2 + (4 / 3) * mu) / rho); vs = Math.sqrt(mu / rho);
    }
    const tf = (20 + 21.5) / (20 + 0.03 * z + 21.5);
    const rw = (L.rw || 0.16) * tf, rsh = (L.rsh || 3) * tf, m = L.matrix === 'calcite' ? 2.2 : 2.0;
    const res = 1 / ((1 - vsh) * Math.pow(phi, m) * sw * sw / rw + vsh / rsh);
    const grc = L.grClean != null ? L.grClean : 15, grs = L.grShale != null ? L.grShale : 120;
    const out = {
      vp: vp * 1000, vs: vs * 1000, rho, phi, sw, vsh, res,
      gr: grc + vsh * (grs - grc),
      nphi: phi * hi + vsh * 0.22 + min.nphi
    };
    if (L.vp != null) out.vp = L.vp;
    if (L.rho != null) out.rho = L.rho;
    if (L.gr != null) out.gr = L.gr;
    if (L.res != null) out.res = L.res;
    return out;
  }

  /* ---------- structure and stratigraphy ---------- */
  const cache = new WeakMap();
  function prepare(model) {
    if (cache.has(model)) return cache.get(model);
    const props = (p, idx) => Object.assign({ idx }, p.lith ? LITH[p.lith] : {}, p);
    const M = Object.assign({ dip_m_per_km: 0, rugosity_m: 3, faults: [], folds: [], lenses: [], dimming: [] }, model);
    M.layers = model.layers.map((L, i) => props(L, i));
    M.lenses = (model.lenses || []).map((L, i) => props(L, 100 + i));
    cache.set(model, M);
    return M;
  }

  function restore(M, x, z) {
    let z0 = z;
    for (const f of M.faults) {
      const dir = f.dipDirection || 1;
      const xf = f.x_m + (dir * z) / Math.tan((f.dip_deg * Math.PI) / 180);
      if (dir * (x - xf) > 0) {
        let t = f.throw_m;
        if (f.tip_m != null) t *= clamp((z - f.tip_m) / (f.tipTaper_m || 200), 0, 1);
        if (f.growthTop_m != null) t *= clamp((z - f.growthTop_m) / (f.growthBase_m - f.growthTop_m), 0, 1);
        z0 += f.sense === 'reverse' ? t : -t;
      }
    }
    for (const F of M.folds) {
      let a = F.amplitude_m * Math.exp(-Math.pow((x - F.x_m) / F.halfWidth_m, 2));
      if (F.growthTop_m != null) a *= clamp((z - F.growthTop_m) / (F.growthBase_m - F.growthTop_m), 0, 1);
      z0 += a;
    }
    return z0 - (M.dip_m_per_km * x) / 1000;
  }

  function stratAt(M, x, z0) {
    for (const L of M.lenses) {
      const u = (x - L.x_m) / (L.width_m / 2);
      if (Math.abs(u) < 1) {
        const h = Math.max(1, L.height_m * (1 - u * u));
        if (L.shape === 'mound') { if (z0 <= L.level_m && z0 > L.level_m - h) return { L, p: (z0 - (L.level_m - h)) / h }; }
        else if (z0 >= L.level_m && z0 < L.level_m + h) return { L, p: (z0 - L.level_m) / h };
      }
    }
    let top = 0;
    const xk = (x - M.width_m / 2) / 1000;
    for (let k = 0; k < M.layers.length; k++) {
      const L = M.layers[k];
      const t = Math.max(1, L.thickness_m + (L.gradient_m_per_km || 0) * xk);
      const base = top + t + (k < M.layers.length - 1 ? M.rugosity_m * vnoise1(x / 350, k + 1) : 0);
      if (z0 < base) return { L, p: clamp((z0 - top) / Math.max(1, base - top), 0, 1) };
      top = base;
    }
    return { L: M.layers[M.layers.length - 1], p: 1 };
  }

  function pointProps(M, x, z) {
    z = Math.max(0, z);
    const z0 = restore(M, x, z);
    const { L, p } = stratAt(M, x, z0);
    let vsh = L.vsh != null ? L.vsh : 0.9, phi = L.phi != null ? L.phi : 0.18;
    if (L.profile === 'fining') { vsh += (1 - p) * 0.55 * (1 - vsh); phi *= 1 - (1 - p) * 0.25; }
    else if (L.profile === 'coarsening') { vsh += p * 0.55 * (1 - vsh); phi *= 1 - p * 0.25; }
    if (L.lamination) vsh = clamp(vsh + 0.1 * L.lamination * vnoise2(x / 2500, z0 / 5, L.idx * 3 + 1), 0, 1);
    let interbed = false;
    if (L.ntg != null && L.ntg < 1) {
      const n = vnoise2(x / (L.lateralScale_m || 800), z0 / (L.bedScale_m || 4), L.idx * 7 + 3);
      if (n > 1 - 2.2 * Math.sqrt(1 - L.ntg)) { vsh = 0.88; phi = 0.17; interbed = true; }
    }
    let hc = null;
    if (!interbed && L.fluid && L.fluid !== 'brine' && (L.contact_m == null || z < L.contact_m)) hc = { fluid: L.fluid, sw: L.sw != null ? L.sw : 0.3 };
    const r = rock(L, z, vsh, phi, hc);
    r.L = L;
    return r;
  }
  GW.pointProps = function (model, x, z) { return pointProps(prepare(model), x, z); };

  /* ---------- seismic ---------- */
  function ricker(f, dt, phaseDeg) {
    const h = Math.ceil(1.6 / f / dt), w = [];
    for (let k = -h; k <= h; k++) { const a = (Math.PI * f * k * dt) ** 2; w.push((1 - 2 * a) * Math.exp(-a)); }
    if (!phaseDeg) return { w, h };
    const ph = (phaseDeg * Math.PI) / 180, H = [], Lh = 41;
    for (let k = 0; k < w.length; k++) {
      let s = 0;
      for (let n = -Lh; n <= Lh; n += 2) { const j = k - n; if (j >= 0 && j < w.length) s += (w[j] * 2) / (Math.PI * n); }
      H.push(s);
    }
    return { w: w.map((v, k) => Math.cos(ph) * v + Math.sin(ph) * H[k]), h };
  }

  GW.buildSection = function (model, seis) {
    const M = prepare(model);
    const rng = mulberry32(seis.seed || 7), sd = (seis.seed || 7) % 997;
    const dx = M.dx_m || 12.5, W = M.width_m, D = M.depth_m;
    const nx = Math.round(W / dx) + 1;
    const dzi = 2, nzi = Math.round(D / dzi) + 1;
    const dzD = M.dz_m || 4, nzD = Math.round(D / dzD) + 1;
    const dt = (seis.dt_ms || 2) / 1000, t0 = 0.02;
    const f0 = seis.frequency_hz || 30, Q = seis.Q || 150, phase = seis.phase_deg || 0;
    const noise = seis.noise || 0, mult = seis.multiples || 0, diff = seis.diffractions || 0;
    const statMs = seis.statics_ms || 0, fp = seis.footprint || 0, vErr = seis.velocityError != null ? seis.velocityError : 0.02;

    // 1. rock properties on a 2 m grid
    const vpA = new Float32Array(nx * nzi), impA = new Float32Array(nx * nzi);
    for (let i = 0; i < nx; i++) {
      const x = i * dx;
      for (let j = 0; j < nzi; j++) { const p = pointProps(M, x, j * dzi); vpA[i * nzi + j] = p.vp; impA[i * nzi + j] = p.vp * p.rho; }
    }

    // 2. reflectivity placed in true two-way time, with residual statics
    const stat = new Float32Array(nx);
    for (let i = 0; i < nx; i++) stat[i] = (statMs / 1000) * (0.7 * vnoise1((i * dx) / 450, sd + 1) + 0.3 * vnoise1((i * dx) / 80, sd + 2));
    let tmax = 0;
    for (let i = 0; i < nx; i++) { let t = t0 + stat[i]; for (let j = 0; j < nzi - 1; j++) t += (2 * dzi) / vpA[i * nzi + j]; tmax = Math.max(tmax, t); }
    const nt = Math.ceil((tmax + 0.05) / dt) + 1;
    const rcT = new Float32Array(nx * nt);
    for (let i = 0; i < nx; i++) {
      const x = i * dx;
      let t = t0 + stat[i];
      for (let j = 0; j < nzi - 1; j++) {
        t += (2 * dzi) / vpA[i * nzi + j];
        const a = impA[i * nzi + j], b = impA[i * nzi + j + 1];
        let r = (b - a) / (b + a);
        const z = (j + 1) * dzi;
        for (const Dm of M.dimming) if (z > Dm.top_m) r *= 1 - (1 - Dm.factor) * Math.exp(-Math.pow((x - Dm.x_m) / (Dm.width_m / 2), 2));
        const k = t / dt, k0 = Math.floor(k), u = k - k0;
        if (k0 + 1 < nt) { rcT[i * nt + k0] += r * (1 - u); rcT[i * nt + k0 + 1] += r * u; }
      }
    }

    // 3. coherent noise: surface-related multiples and diffraction residuals
    const extra = new Float32Array(nx * nt);
    if (mult) for (let i = 0; i < nx; i++) for (let k = 2; k < nt; k++) {
      const r = rcT[i * nt + (k >> 1)];
      if (r) extra[i * nt + k] -= mult * r * Math.abs(r);
    }
    if (diff) {
      const cand = [];
      for (let i = 1; i < nx; i++) for (let k = 0; k < nt; k++) {
        const a = rcT[i * nt + k], b = rcT[(i - 1) * nt + k];
        if (Math.abs(a - b) > 0.05 && Math.max(Math.abs(a), Math.abs(b)) > 0.04) cand.push(i * nt + k);
      }
      const n = Math.min(cand.length, Math.round(500 * diff));
      for (let c = 0; c < n; c++) {
        const idx = cand[Math.floor(rng() * cand.length)], i = Math.floor(idx / nt), k = idx % nt;
        const r = rcT[idx] - rcT[idx - nt], tk = k * dt, v = 2600;
        for (let di = -45; di <= 45; di++) {
          if (!di || i + di < 0 || i + di >= nx) continue;
          const kk = Math.round(Math.sqrt(tk * tk + ((2 * di * dx) / v) ** 2) / dt);
          if (kk < nt) extra[(i + di) * nt + kk] += diff * 0.25 * r * Math.exp(-Math.abs(di) / 16);
        }
      }
    }

    // 4. random noise (laterally correlated, stronger at later time)
    let prev = new Float32Array(nt);
    for (let i = 0; i < nx; i++) {
      const cur = new Float32Array(nt);
      for (let k = 0; k < nt; k++) {
        cur[k] = 0.72 * prev[k] + 0.69 * gauss(rng);
        extra[i * nt + k] += cur[k] * 0.028 * noise * (0.6 + (k * dt) / 1.2);
      }
      prev = cur;
    }

    // 5. time-variant wavelet: constant-Q loss of high frequency, constant phase rotation
    const band = 0.1, nb = Math.ceil((nt * dt) / band) + 1, kernels = [];
    for (let b = 0; b < nb; b++) kernels.push(ricker(f0 / (1 + (Math.PI * f0 * (b * band)) / (2 * Q)), dt, phase));
    const timeData = new Float32Array(nx * nt);
    for (let i = 0; i < nx; i++) {
      const g = 1 + fp * Math.cos((2 * Math.PI * i * dx) / (seis.footprintSpacing_m || 300)) + 0.03 * gauss(rng) * (fp ? 1.5 : 0.5);
      for (let k = 0; k < nt; k++) {
        const { w, h } = kernels[Math.min(nb - 1, Math.floor((k * dt) / band))];
        let s = 0;
        for (let m = -h; m <= h; m++) { const kk = k - m; if (kk >= 0 && kk < nt) s += (rcT[i * nt + kk] + extra[i * nt + kk]) * w[m + h]; }
        timeData[i * nt + k] = g * s + gauss(rng) * 0.003 * noise;
      }
    }
    const sample = [];
    for (let q = 0; q < timeData.length; q += 7) sample.push(Math.abs(timeData[q]));
    sample.sort((a, b) => a - b);
    const p99 = sample[Math.floor(sample.length * 0.995)] || 1;
    for (let q = 0; q < timeData.length; q++) timeData[q] /= p99;

    // 6. processing velocity: true Vp smoothed over ~200 m vertically and ~1 km laterally, with a smooth error
    const slow = new Float64Array(nx * nzi);
    const hv = 50, hl = Math.max(1, Math.round((seis.velocitySmoothing_m || 1000) / 2 / dx));
    for (let i = 0; i < nx; i++) {
      const pre = new Float64Array(nzi + 1);
      for (let j = 0; j < nzi; j++) pre[j + 1] = pre[j] + 1 / vpA[i * nzi + j];
      for (let j = 0; j < nzi; j++) { const a = Math.max(0, j - hv), b = Math.min(nzi, j + hv + 1); slow[i * nzi + j] = (pre[b] - pre[a]) / (b - a); }
    }
    const tprocI = new Float64Array(nx * nzi);
    for (let i = 0; i < nx; i++) {
      const a = Math.max(0, i - hl), b = Math.min(nx - 1, i + hl), err = 1 + vErr * vnoise1((i * dx) / 1800, sd + 5);
      let t = t0;
      for (let j = 0; j < nzi; j++) {
        let s = 0;
        for (let ii = a; ii <= b; ii += 2) s += slow[ii * nzi + j];
        s /= Math.floor((b - a) / 2) + 1;
        tprocI[i * nzi + j] = t;
        t += (2 * dzi * s) / err;
      }
    }

    // 7. depth-converted section and the time-depth table used for display and well projection
    const data = new Float32Array(nx * nzD), tproc = new Float32Array(nx * nzD);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nzD; j++) {
      const z = j * dzD, ji = Math.min(nzi - 1, Math.floor(z / dzi)), u = z / dzi - ji;
      const t = ji + 1 < nzi ? tprocI[i * nzi + ji] * (1 - u) + tprocI[i * nzi + ji + 1] * u : tprocI[i * nzi + ji];
      tproc[i * nzD + j] = t;
      const k = t / dt, k0 = Math.floor(k), v = k - k0;
      data[i * nzD + j] = k0 + 1 < nt ? timeData[i * nt + k0] * (1 - v) + timeData[i * nt + k0 + 1] * v : 0;
    }
    return { nx, dx, width_m: W, depth_m: D, nz: nzD, dz: dzD, data, nt, dt, timeData, tmax: (nt - 1) * dt, tproc };
  };

  /* ---------- well logs ---------- */
  GW.LOG_TYPES = ['GR', 'CALI', 'RES', 'RHOB', 'NPHI', 'DT'];
  GW.buildWellLogs = function (model, well, seed) {
    const M = prepare(model);
    const rng = mulberry32(seed || 11);
    const step = 0.5, shift = well.depthShift_m || 0, cal = well.calibration || {};
    const old = well.quality === 'old', qn = old ? 2 : 1, qs = old ? 2.5 : 1;
    const avail = well.logs || GW.LOG_TYPES;
    const bit = well.bit_in || 8.5;
    const z = [], gr = [], rho = [], nphi = [], dtl = [], lres = [], cali = [];
    for (let d = well.top_m || 0; d <= well.td_m; d += step) {
      const p = pointProps(M, well.x_m, d);
      z.push(d);
      gr.push(p.gr); rho.push(p.rho); nphi.push(p.nphi); dtl.push(304800 / p.vp); lres.push(Math.log10(p.res));
      let c = bit + 0.12 * Math.abs(gauss(rng)) + (p.vsh > 0.6 ? 0.35 * (0.5 + 0.5 * vnoise1(d / 4, seed)) : 0.05);
      for (const Wo of well.washouts || []) {
        const e = Math.min(d - Wo.top_m, Wo.base_m - d);
        if (e > -3) c += (Wo.enlarge_in || 3.5) * clamp((e + 3) / 6, 0, 1) * (0.75 + 0.25 * vnoise1(d / 2.5, seed + 3));
      }
      cali.push(c);
    }
    const n = z.length, out = { depth: z.map((d) => d + shift) };
    const calS = gsmooth(cali, 2);
    const grS = gsmooth(gr, (0.6 / step) * qs), rhoS = gsmooth(rho, 0.8 * qs), nS = gsmooth(nphi, 1 * qs), dS = gsmooth(dtl, 1 * qs), rS = gsmooth(lres, (1.4 / step) * qs);
    const g = (k, def) => (cal[k] && cal[k][def] != null ? cal[k][def] : def === 'scale' ? 1 : 0);
    out.CALI = calS.map((c) => c + gauss(rng) * 0.04);
    out.GR = grS.map((v, i) => Math.max(0, (v * (1 - 0.015 * (calS[i] - bit)) + gauss(rng) * 0.35 * Math.sqrt(v) * qn) * g('GR', 'scale') + g('GR', 'offset')));
    out.RHOB = rhoS.map((v, i) => { const e = Math.max(0, calS[i] - bit - 0.6); return v - 0.06 * e + gauss(rng) * (0.009 * qn + 0.015 * e) + g('RHOB', 'offset'); });
    out.NPHI = nS.map((v, i) => v + 0.02 * Math.max(0, calS[i] - bit - 0.6) + gauss(rng) * 0.007 * qn + g('NPHI', 'offset'));
    let skip = 0;
    out.DT = dS.map((v, i) => {
      if (skip > 0) { skip--; return v + 35; }
      if (calS[i] - bit > 1.5 && rng() < 0.04) skip = 1 + Math.floor(rng() * 4);
      return v + gauss(rng) * 0.7 * qn + g('DT', 'offset');
    });
    out.RES = rS.map((v) => Math.pow(10, v + gauss(rng) * 0.015 * qn) * g('RES', 'scale'));
    for (const k of GW.LOG_TYPES) if (!avail.includes(k)) out[k] = null;
    out.n = n;
    return out;
  };

  // Log depth of the first sample of a named unit at a well, or null if the unit is absent.
  GW.modelTopAtWell = function (model, well, unit) {
    const M = prepare(model);
    for (let d = well.top_m || 0; d <= well.td_m; d += 0.5) {
      if (stratAt(M, well.x_m, restore(M, well.x_m, d)).L.name === unit) return Math.round(d + (well.depthShift_m || 0));
    }
    return null;
  };
})();
