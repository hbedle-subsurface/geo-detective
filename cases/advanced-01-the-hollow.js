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
      "width_m": 4000,
      "depth_m": 1800,
      "dx_m": 12.5,
      "dz_m": 4,
      "dip_m_per_km": 10,
      "layers": [
        {
          "name": "Overburden",
          "lith": "shale",
          "thickness_m": 420,
          "lamination": 1
        },
        {
          "name": "Unit 1",
          "lith": "silty_shale",
          "thickness_m": 90
        },
        {
          "name": "Unit 2",
          "lith": "shale",
          "thickness_m": 110
        },
        {
          "name": "Unit 3",
          "lith": "sand",
          "thickness_m": 35
        },
        {
          "name": "Unit 4",
          "lith": "shale",
          "thickness_m": 150
        },
        {
          "name": "Unit 5",
          "lith": "tight_sand",
          "thickness_m": 40
        },
        {
          "name": "Unit 6",
          "lith": "shale",
          "thickness_m": 130
        },
        {
          "name": "Unit 7",
          "lith": "limestone",
          "thickness_m": 30
        },
        {
          "name": "Unit 8",
          "lith": "silty_shale",
          "thickness_m": 900
        }
      ],
      "lenses": [
        {
          "name": "Lower fill",
          "shape": "channel",
          "lith": "sand",
          "x_m": 1900,
          "width_m": 1100,
          "height_m": 130,
          "level_m": 820,
          "ntg": 0.7,
          "bedScale_m": 6,
          "lateralScale_m": 250
        },
        {
          "name": "Upper fill",
          "shape": "channel",
          "lith": "sand",
          "x_m": 2350,
          "width_m": 700,
          "height_m": 70,
          "level_m": 770,
          "ntg": 0.75,
          "bedScale_m": 5,
          "lateralScale_m": 220
        }
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
      "pros": [
        "The base of the feature cuts across underlying reflections ([[truncation]]).",
        "Width and depth are within the range of valley fills."
      ],
      "cons": [
        "Fill lithology and depositional environment are unknown without wells.",
        "A single line cannot show whether the feature is linear or sinuous in map view."
      ],
      "sketch": "valley"
    },
    {
      "id": "submarine",
      "label": "Submarine channel complex",
      "description": "Stacked [[submarine-channel|submarine channels]] cut and filled by gravity flows on a slope.",
      "pros": [
        "The second, offset incision suggests lateral migration of stacked channels.",
        "Width and depth are within the range of slope channels."
      ],
      "cons": [
        "No slope geometry or water-depth indicator is visible on the line.",
        "Fill character alone does not separate marine from non-marine settings."
      ],
      "sketch": "channel-stack"
    },
    {
      "id": "collapse",
      "label": "Collapse or sag feature",
      "description": "A [[collapse]] into space created by dissolution or evacuation below, not an erosional cut.",
      "pros": [
        "A limestone unit lies below the feature and could have been dissolved.",
        "The limestone reflection is lower beneath the feature than on either side."
      ],
      "cons": [
        "A slow, sand-rich fill would lower deeper reflections on the section through [[pushdown|velocity push-down]] with no real structure.",
        "Truncation at the base indicates removal from above rather than subsidence into a void."
      ],
      "sketch": "collapse"
    }
  ],
  "evidence": [
    {
      "id": "truncation",
      "label": "Underlying reflections terminate against the base of the feature",
      "likelihood": {
        "valley": 0.85,
        "submarine": 0.85,
        "collapse": 0.35
      },
      "where": {
        "x_m": 1750,
        "z_m": 900,
        "rx_m": 480,
        "rz_m": 110
      },
      "line": "seismic"
    },
    {
      "id": "lowbelow",
      "label": "Limestone reflection lower beneath the feature",
      "likelihood": {
        "valley": 0.5,
        "submarine": 0.5,
        "collapse": 0.75
      },
      "where": {
        "x_m": 2250,
        "z_m": 1030,
        "rx_m": 380,
        "rz_m": 90
      },
      "line": "seismic"
    },
    {
      "id": "stacked",
      "label": "A second, smaller incision offset to the east",
      "likelihood": {
        "valley": 0.6,
        "submarine": 0.65,
        "collapse": 0.4
      },
      "where": {
        "x_m": 2380,
        "z_m": 800,
        "rx_m": 360,
        "rz_m": 80
      },
      "line": "seismic"
    },
    {
      "id": "size",
      "label": "Width about 1 km, depth about 130 m",
      "likelihood": {
        "valley": 0.6,
        "submarine": 0.6,
        "collapse": 0.5
      },
      "where": {
        "x_m": 1900,
        "z_m": 880,
        "rx_m": 650,
        "rz_m": 160
      },
      "line": "seismic"
    },
    {
      "id": "nowells",
      "label": "Fill lithology unknown",
      "likelihood": {
        "valley": 0.5,
        "submarine": 0.5,
        "collapse": 0.5
      },
      "line": "seismic"
    },
    {
      "id": "amplitude",
      "label": "Reflection amplitude inside the fill",
      "likelihood": {
        "valley": 0.5,
        "submarine": 0.5,
        "collapse": 0.45
      },
      "where": {
        "x_m": 1900,
        "z_m": 890,
        "rx_m": 300,
        "rz_m": 70
      },
      "line": "seismic"
    },
    {
      "id": "limestone",
      "label": "Limestone unit beneath the feature",
      "likelihood": {
        "valley": 0.5,
        "submarine": 0.5,
        "collapse": 0.7
      },
      "where": {
        "x_m": 1200,
        "z_m": 1010,
        "rx_m": 400,
        "rz_m": 60
      },
      "line": "seismic"
    },
    {
      "id": "envfade",
      "line": "attributes",
      "label": "Envelope: the bright reflection at about 850 m fades out across the feature, and the fill itself is dim",
      "likelihood": {
        "valley": 0.6,
        "submarine": 0.6,
        "collapse": 0.4
      },
      "where": {
        "attribute": "envelope",
        "x_m": 1900,
        "z_m": 880,
        "rx_m": 560,
        "rz_m": 90
      }
    },
    {
      "id": "cohlst",
      "line": "attributes",
      "label": "Coherence: the limestone reflection near 1000 m stays continuous beneath the feature",
      "likelihood": {
        "valley": 0.6,
        "submarine": 0.6,
        "collapse": 0.35
      },
      "where": {
        "attribute": "coherence",
        "x_m": 2100,
        "z_m": 1020,
        "rx_m": 520,
        "rz_m": 60
      }
    },
    {
      "id": "spechigh",
      "line": "attributes",
      "label": "Spectral decomposition, 45 Hz: the base of the feature shows as a faint concave-up line that is not resolved at 15 Hz",
      "likelihood": {
        "valley": 0.6,
        "submarine": 0.6,
        "collapse": 0.45
      },
      "where": {
        "attribute": "spec_high",
        "x_m": 1900,
        "z_m": 930,
        "rx_m": 520,
        "rz_m": 80
      }
    },
    {
      "id": "somfill",
      "line": "ml",
      "label": "SOM: the fill falls in the same classes as the layered strata beside it",
      "model": "Self-organizing map, 8 classes, unsupervised, from four attributes",
      "likelihood": {
        "valley": 0.5,
        "submarine": 0.5,
        "collapse": 0.5
      },
      "where": {
        "attribute": "som",
        "x_m": 1900,
        "z_m": 900,
        "rx_m": 600,
        "rz_m": 120
      }
    },
    {
      "id": "faultnet",
      "line": "ml",
      "label": "A fault-detection network marks both margins of the feature and the low beneath it as faults",
      "model": "Supervised network trained on synthetic fault images",
      "reportedConfidence": 0.88,
      "likelihood": {
        "valley": 0.5,
        "submarine": 0.5,
        "collapse": 0.55
      }
    }
  ],
  "outcome": {
    "statement": "The section was built with two nested erosional channel fills over undeformed strata. The lead results were written for a fluvial to estuarine incised valley.",
    "confidence": 0.5,
    "basis": "Seismic geometry separates an erosional cut from a collapse with moderate confidence. It does not separate a fluvial valley from a submarine channel; that needs lithology, fossils, or regional mapping of the surrounding sequence."
  },
  "debrief": "The low in the limestone reflection is a velocity effect: the fill is slower than the strata it replaced, so the limestone arrives later in time, and the smoothed velocity model used for depth conversion does not fully remove the delay. Switching the display to two-way time shows the delay directly. Distinguishing erosion from collapse rests on the truncation at the base. Distinguishing a valley from a slope channel rests on information this line does not contain, so the panel spread its weight nearly evenly between those two. The fault-detection network flags any abrupt lateral change in reflections, so channel margins and the velocity push-down look like faults to it; its 88% measures how fault-like the image pattern is, not whether a fault is present.",
  "leads": [
    {
      "id": "well",
      "label": "Well through the fill",
      "result": "Interbedded sandstone and mudstone with root traces and coal fragments near the base.",
      "likelihood": {
        "valley": 0.85,
        "submarine": 0.15,
        "collapse": 0.4
      }
    },
    {
      "id": "map3d",
      "label": "3D map of the base surface",
      "result": "The base forms a sinuous, branching trough more than 12 km long.",
      "likelihood": {
        "valley": 0.7,
        "submarine": 0.7,
        "collapse": 0.1
      }
    },
    {
      "id": "forams",
      "label": "Microfossils from the fill",
      "result": "Brackish-water foraminifera in the upper fill; none recovered from the lower fill.",
      "likelihood": {
        "valley": 0.8,
        "submarine": 0.25,
        "collapse": 0.45
      }
    },
    {
      "id": "karst",
      "label": "Core of the limestone in a nearby well",
      "result": "No breccia, dissolution vugs or cave fill in the limestone.",
      "likelihood": {
        "valley": 0.55,
        "submarine": 0.55,
        "collapse": 0.15
      }
    }
  ]
});
