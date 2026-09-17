# Geo-Detective

A browser game for seminars, laid out as a detective's evidence board. Geologists work with incomplete and ambiguous subsurface data, so each case has several suspects (candidate interpretations) and no single piece of evidence settles it.

Clues are organized in lines of evidence: seismic, well logs, seismic attributes, and machine learning, followed by leads. Two modes are available. In Discovery mode most clues start hidden and turn up through investigation: clicking something unusual on the section or in a well, switching attribute displays and logs, picking and flattening tops, switching to two-way time, and running models on the model bench, with hints available. In Lecture walk-through mode every clue is on the board and a rail steps through them one at a time (Next clue, or the arrow keys), so a room can follow the same sequence. Attributes (envelope, coherence, spectral decomposition, dip) and an unsupervised SOM are computed in the browser from the synthetic seismic. Machine learning clues report the model's own confidence, and the case report sets that beside how much each result actually narrows the field.

On the board, the seismic line and well logs are pinned exhibits. The evidence is sticky notes circled on the exhibits and strung to the suspects they support or argue against. Confidence is shared among the suspects with sliders, and a chalkboard offers a limited number of leads (core, 3D seismic, biostratigraphy and others). An uncertainty timeline tracks how the spread of confidence changes as notes are examined.

Closing the case produces a report. It compares the player's distribution with a panel distribution computed from likelihoods after the same evidence, shows how much each note and each lead narrows the field, and states what is known about the case with the confidence attached to it.

Live site (once pushed): `https://hbedle-subsurface.github.io/geo-detective/`

## Layout

```
index.html              page shell; one <script> line per built-in case
css/style.css
js/synth.js             synthetic earth: structure, rock physics, seismic in time and depth, well logs
js/attributes.js        envelope, coherence, dip, spectral decomposition, SOM from the synthetic section
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
