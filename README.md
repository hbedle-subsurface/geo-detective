# Geo-Detective

A browser game for seminars. Each case shows a seismic section and, depending on tier, well logs. The player picks tops, reads the logs, and spreads confidence across two or more candidate interpretations. The debrief compares that distribution with a panel distribution, shows the confidence attached to what is actually known, and optionally lists which evidence was selected or passed over.

Live site (once pushed): `https://hbedle-subsurface.github.io/geo-detective/`

## Layout

```
index.html              page shell; one <script> line per built-in case
css/style.css
js/synth.js             synthetic earth: structure, rock physics, seismic in time and depth, well logs
js/glossary.js          term popups ([[key]] in case text)
js/engine.js            game engine; reads cases, never names one
cases/*.js              built-in cases: GW.registerCase({...})
cases/submitted/*.json  cases as plain JSON (Open a case file, or ?case=...)
tools/check_cases.js    validate cases and list model-derived top depths
tools/build_single_file.py  bundle everything into one offline HTML file
CASE-FORMAT.md          the case schema
```

## Adding a case

1. Copy a case in `cases/` (or `cases/submitted/*.json`) and edit it. `CASE-FORMAT.md` documents every field.
2. `node tools/check_cases.js` to validate it.
3. For a built-in case, add `<script src="cases/your-case.js"></script>` to `index.html`. A JSON case needs no code change.

## Offline copy for a seminar room

`python3 tools/build_single_file.py` writes `dist/geo-detective.html`, a single file with all built-in and submitted cases that runs without a network connection (fonts fall back to system fonts).

## Status of this release

All five cases are synthetic. Seismic and logs are computed in the browser from one rock-physics model. The seismic includes attenuation, wavelet phase, multiples, diffraction residuals, statics, random noise, footprint and depth-conversion error. The logs include tool resolution, measurement noise, washouts, calibration offsets and depth shifts. Because the truth is known, every quantity can be computed from the model. The panel weights and evidence ratings were set by the case author and are provisional until collected from a group of interpreters.

## License

CC BY-SA 4.0. See `LICENSE.md`.
