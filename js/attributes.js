/* Geo-Detective: seismic attributes and an unsupervised classification computed from the synthetic section.
 * All attributes are computed on the two-way-time section and depth-converted with the same
 * processing velocity model as the amplitude display.
 * License: CC BY-SA 4.0
 */
(function () {
  'use strict';
  const GW = (window.GW = window.GW || {});

  GW.ATTRIBUTES = {
    amplitude: { label: 'Amplitude', kind: 'diverging' },
    envelope: { label: 'Envelope', kind: 'sequential', min: 0, max: 1.2, term: 'envelope' },
    coherence: { label: 'Coherence', kind: 'coherence', min: 0.2, max: 1, term: 'coherence' },
    dip: { label: 'Apparent dip', kind: 'sequential', min: 0, max: 3, unit: 'samples/trace', term: 'dip-attribute' },
    spec_low: { label: 'Spectral, 15 Hz', kind: 'sequential', min: 0, max: 0.5, freq: 15, term: 'spectral-decomposition' },
    spec_high: { label: 'Spectral, 45 Hz', kind: 'sequential', min: 0, max: 0.5, freq: 45, term: 'spectral-decomposition' },
    som: { label: 'SOM facies', kind: 'classes', term: 'som' }
  };

  function hilbert(x, n) {
    const L = 30, h = [];
    for (let k = -L; k <= L; k++) h.push(k % 2 ? (2 / (Math.PI * k)) * (0.54 + 0.46 * Math.cos((Math.PI * k) / L)) : 0);
    const out = new Float32Array(n);
    for (let k = 0; k < n; k++) { let s = 0; for (let m = -L; m <= L; m++) { const j = k - m; if (j >= 0 && j < n) s += x[j] * h[m + L]; } out[k] = s; }
    return out;
  }
  function morletMag(x, n, f, dt) {
    const sigma = 5 / (2 * Math.PI * f), H = Math.ceil((3 * sigma) / dt), re = [], im = [];
    let norm = 0;
    for (let k = -H; k <= H; k++) { const t = k * dt, g = Math.exp((-t * t) / (2 * sigma * sigma)); re.push(g * Math.cos(2 * Math.PI * f * t)); im.push(g * Math.sin(2 * Math.PI * f * t)); norm += g; }
    const out = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      let a = 0, b = 0;
      for (let m = -H; m <= H; m++) { const j = k - m; if (j >= 0 && j < n) { a += x[j] * re[m + H]; b += x[j] * im[m + H]; } }
      out[k] = (2 * Math.sqrt(a * a + b * b)) / norm;
    }
    return out;
  }

  // Dip-steered three-trace semblance; apparent dip is the lag with the highest semblance.
  function coherenceDip(sec) {
    const { nx, nt, timeData: d } = sec, W = 8, P = 3, T = 2;
    const coh = new Float32Array(nx * nt), dip = new Float32Array(nx * nt);
    const num = new Float32Array(nt + 1), den = new Float32Array(nt + 1);
    for (let i = 0; i < nx; i++) {
      const cols = [];
      for (let q = -T; q <= T; q++) cols.push(Math.min(nx - 1, Math.max(0, i + q)) * nt);
      const best = new Float32Array(nt).fill(-1), bestP = new Float32Array(nt);
      for (let p = -P; p <= P; p++) {
        num[0] = 0; den[0] = 0;
        for (let k = 0; k < nt; k++) {
          let sum = 0, e = 0;
          for (let q = -T; q <= T; q++) { const kk = Math.min(nt - 1, Math.max(0, k + q * p)), v = d[cols[q + T] + kk]; sum += v; e += v * v; }
          num[k + 1] = num[k] + sum * sum; den[k + 1] = den[k] + e;
        }
        for (let k = 0; k < nt; k++) {
          const lo = Math.max(0, k - W), hi = Math.min(nt, k + W + 1), e = den[hi] - den[lo];
          const sv = e > 1e-6 ? (num[hi] - num[lo]) / ((2 * T + 1) * e) : 1;
          if (sv > best[k]) { best[k] = sv; bestP[k] = p; }
        }
      }
      for (let k = 0; k < nt; k++) { coh[i * nt + k] = best[k]; dip[i * nt + k] = Math.abs(bestP[k]); }
    }
    return { coh, dip };
  }
  function boxSmooth(a, nx, nt, hx, ht) {
    const tmp = new Float32Array(nx * nt), out = new Float32Array(nx * nt);
    for (let i = 0; i < nx; i++) { let s = 0; const c = i * nt; for (let k = -ht; k <= ht; k++) s += a[c + Math.min(nt - 1, Math.max(0, k))];
      for (let k = 0; k < nt; k++) { tmp[c + k] = s / (2 * ht + 1); s += a[c + Math.min(nt - 1, k + ht + 1)] - a[c + Math.max(0, k - ht)]; } }
    for (let k = 0; k < nt; k++) for (let i = 0; i < nx; i++) { let s = 0, n = 0; for (let q = -hx; q <= hx; q++) { const ii = i + q; if (ii >= 0 && ii < nx) { s += tmp[ii * nt + k]; n++; } } out[i * nt + k] = s / n; }
    return out;
  }

  // One-dimensional self-organizing map (Kohonen, 1982) on standardized attribute vectors.
  function som(features, nx, nt, K, seed) {
    let s = seed || 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const F = features.length, N = nx * nt;
    const mean = [], sd = [];
    features.forEach((f, q) => {
      let m = 0, v = 0, c = 0;
      for (let i = 0; i < N; i += 5) { m += f[i]; c++; }
      m /= c;
      for (let i = 0; i < N; i += 5) v += (f[i] - m) ** 2;
      mean[q] = m; sd[q] = Math.sqrt(v / c) || 1;
    });
    const vec = (i, out) => { for (let q = 0; q < F; q++) out[q] = (features[q][i] - mean[q]) / sd[q]; return out; };
    const nodes = [];
    for (let k = 0; k < K; k++) nodes.push(vec(Math.floor(rnd() * N), new Float32Array(F)));
    const x = new Float32Array(F), iters = 30000;
    for (let it = 0; it < iters; it++) {
      vec(Math.floor(rnd() * N), x);
      let bk = 0, bd = Infinity;
      for (let k = 0; k < K; k++) { let dd = 0; for (let q = 0; q < F; q++) dd += (x[q] - nodes[k][q]) ** 2; if (dd < bd) { bd = dd; bk = k; } }
      const frac = it / iters, lr = 0.5 * (1 - frac) + 0.01, rad = Math.max(0.5, (K / 2) * (1 - frac));
      for (let k = 0; k < K; k++) {
        const h = Math.exp(-((k - bk) ** 2) / (2 * rad * rad)) * lr;
        for (let q = 0; q < F; q++) nodes[k][q] += h * (x[q] - nodes[k][q]);
      }
    }
    const cls = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      vec(i, x);
      let bk = 0, bd = Infinity;
      for (let k = 0; k < K; k++) { let dd = 0; for (let q = 0; q < F; q++) dd += (x[q] - nodes[k][q]) ** 2; if (dd < bd) { bd = dd; bk = k; } }
      cls[i] = bk;
    }
    return { cls, nodes, mean, sd };
  }

  function toDepth(sec, arr) {
    const out = new Float32Array(sec.nx * sec.nz);
    for (let i = 0; i < sec.nx; i++) for (let j = 0; j < sec.nz; j++) {
      const k = sec.tproc[i * sec.nz + j] / sec.dt, k0 = Math.floor(k), v = k - k0;
      out[i * sec.nz + j] = k0 + 1 < sec.nt ? arr[i * sec.nt + k0] * (1 - v) + arr[i * sec.nt + k0 + 1] * v : 0;
    }
    return out;
  }
  function toDepthNearest(sec, arr) {
    const out = new Uint8Array(sec.nx * sec.nz);
    for (let i = 0; i < sec.nx; i++) for (let j = 0; j < sec.nz; j++) {
      const k = Math.min(sec.nt - 1, Math.round(sec.tproc[i * sec.nz + j] / sec.dt));
      out[i * sec.nz + j] = arr[i * sec.nt + k];
    }
    return out;
  }

  // Compute one attribute (and anything it depends on), caching results on the section object.
  GW.attribute = function (sec, key) {
    sec.attr = sec.attr || {};
    if (key === 'amplitude') return { time: sec.timeData, depth: sec.data };
    if (sec.attr[key]) return sec.attr[key];
    const { nx, nt, timeData: d, dt } = sec;
    let time;
    if (key === 'envelope') {
      time = new Float32Array(nx * nt);
      for (let i = 0; i < nx; i++) {
        const tr = d.subarray(i * nt, (i + 1) * nt), h = hilbert(tr, nt);
        for (let k = 0; k < nt; k++) time[i * nt + k] = Math.hypot(tr[k], h[k]);
      }
    } else if (key === 'coherence' || key === 'dip') {
      const r = coherenceDip(sec);
      sec.attr.coherence = { time: r.coh, depth: toDepth(sec, r.coh) };
      sec.attr.dip = { time: r.dip, depth: toDepth(sec, r.dip) };
      return sec.attr[key];
    } else if (key === 'spec_low' || key === 'spec_high') {
      const f = GW.ATTRIBUTES[key].freq;
      time = new Float32Array(nx * nt);
      for (let i = 0; i < nx; i++) time.set(morletMag(d.subarray(i * nt, (i + 1) * nt), nt, f, dt), i * nt);
    } else if (key === 'som') {
      const feats = ['envelope', 'coherence', 'spec_low', 'spec_high'].map((k) => boxSmooth(GW.attribute(sec, k).time, nx, nt, 2, 4));
      const K = 8, r = som(feats, nx, nt, K, 11);
      sec.attr.som = { time: r.cls, depth: toDepthNearest(sec, r.cls), classes: K, inputs: ['Envelope', 'Coherence', 'Spectral 15 Hz', 'Spectral 45 Hz', 'each smoothed over 50 m and 18 ms'] };
      return sec.attr.som;
    }
    sec.attr[key] = { time, depth: toDepth(sec, time) };
    return sec.attr[key];
  };
})();
