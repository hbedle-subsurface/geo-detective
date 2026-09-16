// Validate every case in cases/ (and cases/submitted/) and list model-derived top depths.
// Usage: node tools/check_cases.js [path/to/case.json ...]
global.window = global;
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
require(path.join(root, 'js/synth.js'));
require(path.join(root, 'js/engine.js'));
const GW = window.GW;
const files = process.argv.slice(2).length ? process.argv.slice(2) : [
  ...fs.readdirSync(path.join(root, 'cases')).filter((f) => /\.(js|json)$/.test(f)).map((f) => path.join(root, 'cases', f)),
  ...(fs.existsSync(path.join(root, 'cases/submitted')) ? fs.readdirSync(path.join(root, 'cases/submitted')).filter((f) => f.endsWith('.json')).map((f) => path.join(root, 'cases/submitted', f)) : [])
];
let bad = 0;
for (const f of files) {
  let c, v;
  if (f.endsWith('.json')) { c = JSON.parse(fs.readFileSync(f, 'utf8')); v = GW.registerCase(c); }
  else { const orig = GW.registerCase; GW.registerCase = (x) => { c = x; v = orig(x); return v; }; require(path.resolve(f)); GW.registerCase = orig; }
  console.log('\n' + path.basename(f) + ' [' + (c && c.tier) + ']');
  v.errors.forEach((e) => console.log('  ERROR ' + e)); v.warnings.forEach((e) => console.log('  note  ' + e));
  if (v.errors.length) { bad++; continue; }
  const s = c.candidates.reduce((a, k) => a + c.expertConsensus[k.id], 0);
  console.log('  candidates ' + c.candidates.length + ', expert weights sum ' + s.toFixed(2));
  (c.tops || []).forEach((t) => Object.entries(t.expert).forEach(([wn, e]) => {
    const w = c.wells.find((x) => x.name === wn);
    const d = e.absent ? 'absent' : e.depth === 'model' ? GW.modelTopAtWell(c.seismic.model, w, e.layer || t.name) : e.depth;
    console.log('  ' + t.name + ' @ ' + wn + ': ' + (d == null ? 'NOT FOUND in model (will show as absent)' : d));
  }));
}
process.exit(bad ? 1 : 0);
