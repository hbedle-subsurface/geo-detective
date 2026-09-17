# Case file format

Every round of Geo-Detective is one self-contained case object. The engine (`js/engine.js`) reads the object and draws the round; nothing in the engine refers to a particular case.

A case can be supplied in two ways, with identical contents:

1. **Built-in case.** A file in `cases/` that wraps the object in `GW.registerCase({ ... });`, plus one `<script>` line in `index.html`. Works when the page is opened straight from disk.
2. **JSON file.** A plain `.json` file with the same object. It can be opened with the *Open a case file* button, or linked as `index.html?case=path/or/url/to/case.json` when the site is served over http(s). `cases/submitted/easy-02-twice-through.json` is a working example.

Run `node tools/check_cases.js` (or `node tools/check_cases.js my-case.json`) to validate cases and print the depth of every model-derived top.

## Top-level fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, URL-safe identifier. Also used in `#case=id` links. |
| `title` | yes | Short case name. |
| `tier` | yes | `easy`, `medium`, `hard`, `advanced`, or a new tier id. An unknown tier id creates a new tab automatically; `GW.registerTier({id, label, blurb})` gives it a label and description. |
| `author` | no | Case author, for credit. |
| `summary` | no | One line shown on the case list. |
| `brief` | yes | The case text shown above the data. |
| `requireJustification` | no | `true` requires a written justification before submitting. Always on for `advanced`. |
| `seismic` | yes | See below. |
| `wells` | no | Array of wells. Empty or missing hides the log panel. |
| `logWindow` | no | `{ "top_m", "base_m" }` depth range of the log display. |
| `tops` | no | Surfaces the player can pick, with the expert picks. |
| `candidates` | yes | Two or more interpretations. |

| `evidence` | yes | Sticky notes with panel likelihoods; see below. |
| `leads` | no | Further data the player can request, with results and likelihoods. |
| `maxLeads` | no | Number of leads that can be requested (default 2). |
| `outcome` | no | What is known, with the confidence attached to it. |
| `debrief` | no | Text shown after submitting. |
| `glossary` | no | Extra terms: `{ "key": ["Title", "Definition"] }`. |

Text fields can link glossary terms with `[[key]]` or `[[key|shown text]]`. Keys are listed in `js/glossary.js`.

## `seismic`

### Synthetic section

```json
"seismic": {
  "type": "synthetic",
  "seed": 1,
  "frequency_hz": 32,
  "phase_deg": -20,
  "Q": 130,
  "noise": 0.3,
  "multiples": 0.4,
  "diffractions": 0.5,
  "statics_ms": 4,
  "footprint": 0.05,
  "footprintSpacing_m": 300,
  "velocityError": 0.025,
  "velocitySmoothing_m": 1000,
  "dt_ms": 2,
  "model": { ... }
}
```

The section is generated the way recorded data are formed, then depth-converted:

1. Rock properties are computed on a 2 m grid from the model (see *Rock properties* below).
2. Reflection coefficients are placed at their true two-way time for each trace, with residual statics (`statics_ms`, peak time shift) applied.
3. Coherent noise is added: surface-related multiples at twice the time of each reflection, scaled by `multiples` × r × |r| (0 = removed in processing, 1 = no demultiple), and residual diffraction arcs from edges such as fault terminations and pinch-outs, scaled by `diffractions` (0–1).
4. Random noise, laterally correlated and increasing with time, is added in proportion to `noise` (0 clean, about 0.6 poor).
5. Each trace is convolved with a time-variant wavelet: a Ricker wavelet of dominant frequency `frequency_hz` at zero time, losing high frequencies with time according to `Q` (lower Q = faster loss), rotated by `phase_deg`.
6. Trace-to-trace amplitude variation and an acquisition footprint with amplitude `footprint` and spacing `footprintSpacing_m` are applied.
7. The time section is converted to depth with a processing velocity model: true Vp averaged over about 200 m vertically and `velocitySmoothing_m` laterally, multiplied by a smooth lateral error of up to ± `velocityError` (0.02 = 2%). Well depths and converted seismic depths therefore disagree by amounts that grow with depth and with lateral velocity change, and fast or slow bodies leave pull-up or push-down beneath them. A small `velocitySmoothing_m` (25 m) gives a nearly exact conversion for textbook cases.

The player can display the section in two-way time or in depth. Wells are placed on the time display using the same processing velocity model.

### Model

The `model` describes the earth in depth, in metres:

| Field | Meaning |
|---|---|
| `width_m`, `depth_m`, `dx_m`, `dz_m` | Section size, trace spacing, and display depth sampling. 4000 × 2400 m at 12.5 m traces builds in roughly half a second. |
| `dip_m_per_km` | Regional dip, positive = deepening to the right. |
| `rugosity_m` | Small lateral undulation of every layer boundary (default 3). |
| `layers` | Stratigraphy from the top down (fields below). |
| `faults` | `{ "x_m", "dip_deg", "dipDirection" (1 = dips right, -1 = dips left), "throw_m", "sense" ("normal" or "reverse"), "tip_m", "tipTaper_m", "growthTop_m", "growthBase_m" }`. `x_m` is where the fault plane reaches zero depth. With `tip_m` the offset dies out upward above that depth. With `growthTop_m`/`growthBase_m` the throw increases from zero to its full value between those depths, thickening the hanging wall. |
| `folds` | Gaussian domes: `{ "x_m", "halfWidth_m", "amplitude_m", "growthTop_m", "growthBase_m" }`. With the growth depths the amplitude decreases upward, so intervals thin over the crest. |
| `lenses` | Bodies cut into or built on the layering: `{ "name", "shape" ("channel" or "mound"), "x_m", "width_m", "height_m", "level_m", ...layer fields }`. A channel's `level_m` is its top; a mound's is its base. Depths are stratigraphic, so lenses are faulted and folded with the layers. |
| `dimming` | Poor imaging: `{ "x_m", "width_m", "top_m", "factor" }` scales primary reflection strength below `top_m` in a Gaussian zone. Noise and multiples are not scaled, so the zone looks noisier. |

### Layer fields

| Field | Meaning |
|---|---|
| `name`, `thickness_m` | Unit name (used by tops) and thickness. |
| `lith` | Preset: `shale`, `silty_shale`, `sand`, `tight_sand`, `limestone`, `marl`. Any field below overrides the preset. |
| `vsh`, `phi`, `matrix` | Shale volume, porosity at 1500 m (compacts with depth), and `quartz` or `calcite` matrix. |
| `cons` | Consolidation factor on brine Vp (below 1 for soft, young sands). |
| `fluid`, `sw`, `contact_m` | `brine` (default), `oil` or `gas`, water saturation, and an optional present-day depth of the fluid contact; below it the unit is brine-filled. |
| `gradient_m_per_km` | Thickening to the right. |
| `profile` | `blocky` (default), `fining` (shale content increasing upward) or `coarsening`. |
| `ntg`, `bedScale_m`, `lateralScale_m` | Net-to-gross with shale interbeds of about `bedScale_m` thickness that persist laterally for about `lateralScale_m`. |
| `lamination` | Strength of fine internal layering (0–1). |
| `grClean`, `grShale`, `rw`, `rsh` | Gamma ray end points (API), formation water and shale resistivity at 20 °C (ohm-m). |
| `vp`, `rho`, `gr`, `res` | Fixed values that bypass the rock physics. |

### Rock properties

For each point, porosity is compacted to its present depth and the brine-case Vp comes from a Raymer-type relation with a pressure trend. Density comes from matrix, clay and fluid densities, and Vs from the Greenberg–Castagna relations. Hydrocarbon cases use Gassmann fluid substitution. Resistivity follows Archie's relation with a shale conduction term and temperature-corrected water resistivity. Gamma ray is linear in shale volume, and neutron porosity is porosity scaled by fluid hydrogen index plus a clay term. Seismic and every log come from these same values.

### Image section (real data)

```json
"seismic": {
  "type": "image",
  "src": "data/my-line.png",
  "width_m": 6250,
  "depth_m": 2000
}
```

The image is stretched to the stated distance and depth. It must be depth-converted for well sticks and picks to plot in the right place. Color and gain controls are disabled for images. Each well then needs explicit `logData`, and every expert top needs a numeric `depth`.

## `wells`

```json
{
  "name": "W1",
  "x_m": 900,
  "td_m": 1800,
  "depthUncertainty_m": 5,
  "note": "Modern wireline suite.",
  "logs": ["GR", "CALI", "RES", "RHOB", "NPHI", "DT"],
  "quality": "modern",
  "bit_in": 8.5,
  "depthShift_m": 0,
  "calibration": { "GR": { "scale": 1, "offset": 0 }, "RES": { "scale": 1 }, "RHOB": { "offset": 0 }, "NPHI": { "offset": 0 }, "DT": { "offset": 0 } },
  "washouts": [ { "top_m": 1080, "base_m": 1150, "enlarge_in": 4 } ],
  "logData": { "depth": [...], "GR": [...], "CALI": [...], "RES": [...], "RHOB": [...], "NPHI": [...], "DT": [...] }
}
```

Synthetic logs are sampled every 0.5 m and include tool effects:

- **Vertical resolution.** Each curve is smoothed over its tool's resolution, so thin beds are averaged. Deep resistivity is smoothed the most, which spreads it across bed boundaries.
- **Measurement noise.** Gamma ray noise grows with count rate; density, neutron and sonic noise is small and constant.
- **Borehole effects.** Shales enlarge the hole slightly. `washouts` enlarge it by `enlarge_in`, which lowers density, raises neutron, slightly lowers gamma ray, and causes occasional sonic cycle skips.
- **`quality: "old"`.** Doubles noise and coarsens vertical resolution.
- **`calibration`.** Tool offsets or scale errors.
- **`depthShift_m`.** Logger's depth offset from the depth used for the seismic.
- **`logs`.** The curves that were run; others show as *Not logged*. The density–neutron display needs both `RHOB` and `NPHI`.

Display scales are fixed: gamma ray 0–150 API, caliper 6–16 in, resistivity 0.2–2000 ohm-m (logarithmic), bulk density 1.95–2.95 g/cm³, neutron porosity 0.45 to −0.15 (limestone units), sonic 190–40 us/ft.

## `tops`

```json
{ "name": "Sand C", "expert": {
    "W1": { "depth": "model", "unc_m": 5 },
    "W2": { "absent": true, "note": "Not present; the interval is cut out." } } }
```

`depth` is a number (log depth, m), or `"model"` for synthetic cases, which finds the first sample of the unit named `layer` (default: the top name) in the well. `unc_m` is the uncertainty shown as a band after submitting. The uncertainty on an expert pick is meant to include the well's own depth uncertainty.

## `candidates` (suspects)

```json
"candidates": [
  { "id": "normal", "label": "Normal fault", "sketch": "normal-fault", "description": "...", "pros": ["..."], "cons": ["..."] }
]
```

Every case has at least two candidates, including at the easy tier. They appear on the board as suspects with a small line sketch. `sketch` is one of `normal-fault`, `reverse-fault`, `growth-fault`, `wedge`, `strike-slip`, `erosion`, `withdrawal`, `fold`, `drape`, `diapir`, `valley`, `channel-stack`, `collapse`, `two-sands`; any other value shows a question mark. `description`, `pros` and `cons` fill the suspect's dossier.

## `evidence` (sticky notes)

```json
{
  "id": "missing",
  "label": "Sand C absent in W2",
  "detail": "Optional extra text shown when the note is examined.",
  "likelihood": { "normal": 0.8, "strikeslip": 0.25, "erosion": 0.6 },
  "where": { "well": "W2", "top_m": 1180, "base_m": 1320 }
}
```

- `line` is the line of evidence the note belongs to: `seismic`, `logs`, `attributes` or `ml`. Notes are grouped and numbered by line, and **Next clue** steps through them in that order. Without `line`, notes with a well `where` are `logs` and all others `seismic`.
- `label` is the observation written on the note.
- `likelihood` gives, for each candidate, how probable this observation would be if that candidate were correct, on a 0–1 scale. Only the ratios between candidates matter: equal values (0.5, 0.5, 0.5) mean the note is consistent with every suspect and does not narrow the field. A missing value counts as 0.5.
- `where` circles the observation on an exhibit, and a red string runs from the note to the circle. `{ "x_m", "z_m", "rx_m", "rz_m" }` circles a region of the seismic line (centre and half-widths in metres, drawn correctly in both depth and time displays). `{ "well", "top_m", "base_m" }` circles a log interval. Add `"attribute"` to a seismic `where` (`envelope`, `coherence`, `dip`, `spec_low`, `spec_high` or `som`) to switch Exhibit A to that display when the note is examined. Omit `where` for observations that are not a place on the data.
- For `ml` notes, `model` describes the model and what it was trained on, and `reportedConfidence` (0–1) is the confidence the model itself reports; leave it out for unsupervised results. The likelihoods are the panel's reading of the result, which can differ sharply from the model's own confidence.

### Attribute displays

Exhibit A can show the amplitude section or attributes computed in the browser from the same synthetic section, all in two-way time and depth-converted like the amplitude. Each uses a fixed display range:

| Key | Attribute | Computation |
|---|---|---|
| `envelope` | Envelope | Magnitude of the complex trace, Hilbert transform by a 61-tap filter (Taner et al., 1979). |
| `coherence` | Coherence | Dip-steered semblance over 5 traces and ±16 ms, searching ±3 samples of dip (Marfurt et al., 1998). |
| `dip` | Apparent dip | The dip (samples per trace) giving the highest semblance. |
| `spec_low`, `spec_high` | Spectral decomposition | Amplitude of a five-cycle Morlet wavelet transform at 15 Hz and 45 Hz, on one shared scale (Partyka et al., 1999). |
| `som` | SOM facies | One-dimensional self-organizing map (Kohonen, 1982), 8 classes, trained on envelope, coherence and both spectral components, each standardized and smoothed over 50 m and 18 ms. |

Attribute and SOM results are computed, not written by hand, so clues about them should be checked against the displays. In these synthetic sections the SOM classes change with depth along every line because attenuation removes high frequencies, and the 15 Hz and 45 Hz components shift across faults for the same reason.

The panel distribution is computed from the likelihoods by Bayes' rule, starting from equal weights. After a case is closed, the player is compared with the panel's distribution after the same notes and leads the player examined, and with the panel's distribution after all evidence notes. Run `node tools/check_cases.js` to print the panel distribution after all evidence and the effect of each lead, and adjust the likelihoods until those match the distribution the interpreters behind the case would give.

Cases written before likelihoods were added can still supply `expertConsensus` (`{ candidateId: weight }`) and no likelihoods; the board then compares against that fixed distribution and the timeline shows no panel line.

### Discovery triggers

In discovery mode most clues start hidden and are revealed by what the player does. Each evidence note can list its triggers in `discover`; the note is found when any one of them happens. Without `discover`, triggers come from the other fields:

| Note has | Default trigger |
|---|---|
| `line: "ml"` and no `where.attribute` | running it on the model bench (`model`) |
| `where.attribute` | switching Exhibit A to that display (`view`) |
| `where.well` | clicking in that interval of that well, including placing a pick there (`lookWell`) |
| `where.x_m` | clicking inside the circled region of the section, on the amplitude display (`look`) |
| none of these | shown from the start, as part of the case file (`given`) |

Trigger types for `discover`:

```json
"discover": [
  { "type": "given" },
  { "type": "look", "x_m": 2350, "z_m": 1150, "rx_m": 520, "rz_m": 520, "attribute": "amplitude" },
  { "type": "lookWell", "well": "W2", "top_m": 1180, "base_m": 1320 },
  { "type": "view", "attribute": "coherence" },
  { "type": "log", "log": "CALI" },
  { "type": "pickTop", "top": "Sand C", "minWells": 1 },
  { "type": "flatten", "top": "Base Marker" },
  { "type": "domain", "domain": "time" },
  { "type": "model" }
]
```

`look` and `lookWell` fall back to the note's own `where` for any field left out, so `{ "type": "lookWell" }` uses the circled interval. `look` accepts clicks within 1.25 times the region's half-widths, on the stated display (default amplitude), in either depth or time. `log` fires when that curve is displayed (the density–neutron view fires both `RHOB` and `NPHI`). `flatten` without `top` fires on flattening on any top.

`hint` sets the text of a hint for the note; without it the hint is written from the first trigger (for example "Something shows on the coherence display."). `modelName` is the name shown on the model bench for `ml` notes that are run as models.

The case report lists clues not found, where each was, and how much each narrows the panel's field. Switching between Discovery and Lecture walk-through reopens the case.

## `leads` (further data requests)

```json
"maxLeads": 2,
"leads": [
  { "id": "core", "label": "Oriented core across the fault in W2",
    "result": "Polished fault surfaces with slickenlines plunging steeply, close to the dip direction of the fault.",
    "likelihood": { "normal": 0.85, "strikeslip": 0.15, "erosion": 0.1 } }
]
```

Leads are listed on the chalkboard. The player can request up to `maxLeads` of them (default 2); each request adds a pink note with the `result`. Leads use the same `likelihood` and optional `where` fields as evidence. The case report lists every lead with how much it narrows the panel's spread of confidence, including leads that were not requested, so different kinds of additional data can be compared. A lead with equal likelihoods (for example pressure data that cannot separate the suspects) narrows nothing.

## `outcome`

```json
"outcome": { "statement": "...", "confidence": 0.9, "basis": "..." }
```

`confidence` is below 1 even when the answer is known by construction or from a well, and `basis` states what limits it.

## Scoring shown in the case report

- **Overlap with panel**: Σ min(player, panel) across candidates, using the panel distribution after the notes the player examined. 100% for identical distributions.
- **Spread of confidence**: 1 − TV / (1 − 1/n), where TV = ½ Σ |p − 1/n| is the total variation distance from equal weights. 100% when weight is shared equally, 0% when all weight is on one candidate.
- **Uncertainty timeline**: the player's spread before each note was examined and at closing, beside the panel's spread after the same sequence of notes.
- **Narrowing**: for each note and lead, the drop in the panel's spread from that item alone, starting from equal weights.
- **Narrowing by line of evidence**: the same drop for all notes of one line together (seismic, well logs, attributes, machine learning), and for each lead.
- **Machine learning results**: each `ml` note's `reportedConfidence` beside its narrowing.
- **Largest weight**: the player's and the panel's most heavily weighted candidate.
- **Tops**: difference between player and panel picks, flagged when within the panel's stated uncertainty.
- **Evidence check** (optional): diagnostic notes not examined, strings the panel reads in the opposite direction, strung notes that are consistent with every suspect, the lead that narrows the field most, log types never displayed, and suspects weighted 20 points above or below the panel.
