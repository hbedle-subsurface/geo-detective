GW.registerCase({
  "id": "advanced-01-the-hollow",
  "title": "The hollow",
  "tier": "advanced",
  "author": "Heather Bedle",
  "summary": "A concave-up feature about a kilometre wide, with no wells.",
  "brief": "A concave-up feature near 900 m depth is roughly a kilometre wide. A second, smaller feature sits slightly above it and offset to the east. No wells, no regional map, and no other lines are available.",
  "requireJustification": true,
  "seismic": {
    "type": "synthetic",
    "frequency_hz": 34,
    "phase_deg": -15,
    "Q": 150,
    "noise": 0.3,
    "multiples": 0.5,
    "diffractions": 0.45,
    "statics_ms": 3,
    "footprint": 0.05,
    "velocityError": 0.02,
    "seed": 404,
    "model": {
      "width_m": 4000, "depth_m": 1800, "dx_m": 12.5, "dz_m": 4,
      "dip_m_per_km": 10,
      "layers": [
        { "name": "Overburden", "lith": "shale", "thickness_m": 420, "lamination": 1.0 },
        { "name": "Unit 1", "lith": "silty_shale", "thickness_m": 90 },
        { "name": "Unit 2", "lith": "shale", "thickness_m": 110 },
        { "name": "Unit 3", "lith": "sand", "thickness_m": 35 },
        { "name": "Unit 4", "lith": "shale", "thickness_m": 150 },
        { "name": "Unit 5", "lith": "tight_sand", "thickness_m": 40 },
        { "name": "Unit 6", "lith": "shale", "thickness_m": 130 },
        { "name": "Unit 7", "lith": "limestone", "thickness_m": 30 },
        { "name": "Unit 8", "lith": "silty_shale", "thickness_m": 900 }
      ],
      "lenses": [
        { "name": "Lower fill", "shape": "channel", "lith": "sand", "x_m": 1900, "width_m": 1100, "height_m": 130, "level_m": 820, "ntg": 0.7, "bedScale_m": 6, "lateralScale_m": 250 },
        { "name": "Upper fill", "shape": "channel", "lith": "sand", "x_m": 2350, "width_m": 700, "height_m": 70, "level_m": 770, "ntg": 0.75, "bedScale_m": 5, "lateralScale_m": 220 }
      ]
    }
  },
  "wells": [],
  "tops": [],
  "candidates": [
    {
      "id": "valley",
      "label": "Incised valley fill",
      "description": "An [[incised-valley]] cut during a fall in relative sea level and filled during the following rise.",
      "pros": ["The base of the feature cuts across underlying reflections ([[truncation]]).", "Width and depth are within the range of valley fills."],
      "cons": ["Fill lithology and depositional environment are unknown without wells.", "A single line cannot show whether the feature is linear or sinuous in map view."]
    },
    {
      "id": "submarine",
      "label": "Submarine channel complex",
      "description": "Stacked [[submarine-channel|submarine channels]] cut and filled by gravity flows on a slope.",
      "pros": ["The second, offset incision suggests lateral migration of stacked channels.", "Width and depth are within the range of slope channels."],
      "cons": ["No slope geometry or water-depth indicator is visible on the line.", "Fill character alone does not separate marine from non-marine settings."]
    },
    {
      "id": "collapse",
      "label": "Collapse or sag feature",
      "description": "A [[collapse]] into space created by dissolution or evacuation below, not an erosional cut.",
      "pros": ["A limestone unit lies below the feature and could have been dissolved.", "The limestone reflection is lower beneath the feature than on either side."],
      "cons": ["A slow, sand-rich fill would lower deeper reflections on the section through [[pushdown|velocity push-down]] with no real structure.", "Truncation at the base indicates removal from above rather than subsidence into a void."]
    }
  ],
  "expertConsensus": { "valley": 0.4, "submarine": 0.36, "collapse": 0.24 },
  "evidence": [
    { "id": "truncation", "label": "Underlying reflections terminate against the base of the feature", "panelWeight": 3 },
    { "id": "lowbelow", "label": "Limestone reflection lower beneath the feature", "panelWeight": 2 },
    { "id": "stacked", "label": "A second, smaller incision offset to the east", "panelWeight": 2 },
    { "id": "size", "label": "Width about 1 km, depth about 130 m", "panelWeight": 1 },
    { "id": "nowells", "label": "Fill lithology unknown", "panelWeight": 3 },
    { "id": "amplitude", "label": "Reflection amplitude inside the fill", "panelWeight": 1 },
    { "id": "limestone", "label": "Limestone unit beneath the feature", "panelWeight": 1 }
  ],
  "outcome": {
    "statement": "The section was built with two nested erosional channel fills over undeformed strata. The model specifies no depositional environment.",
    "confidence": 0.5,
    "basis": "Seismic geometry separates an erosional cut from a collapse with moderate confidence. It does not separate a fluvial valley from a submarine channel; that needs lithology, fossils, or regional mapping of the surrounding sequence."
  },
  "debrief": "The low in the limestone reflection is a velocity effect: the fill is slower than the strata it replaced, so the limestone arrives later in time, and the smoothed velocity model used for depth conversion does not fully remove the delay. Switching the display to two-way time shows the delay directly. Distinguishing erosion from collapse rests on the truncation at the base. Distinguishing a valley from a slope channel rests on information this line does not contain, so the panel spread its weight nearly evenly between those two."
});
