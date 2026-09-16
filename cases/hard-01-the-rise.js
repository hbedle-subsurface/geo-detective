GW.registerCase({
  "id": "hard-01-the-rise",
  "title": "The rise",
  "tier": "hard",
  "author": "Heather Bedle",
  "summary": "A broad high with thinning over its crest, poorly imaged underneath.",
  "brief": "Shallow reflections arch gently over a broad high near the center of the line, and intervals thin toward the crest. Imaging is poor below about 1300 m under the crest. W1 is on the crest; W2 and W3 are on the flanks. W3 is an old well with no density or neutron logs.",
  "seismic": {
    "type": "synthetic",
    "frequency_hz": 26,
    "phase_deg": 40,
    "Q": 90,
    "noise": 0.5,
    "multiples": 0.4,
    "diffractions": 0.7,
    "statics_ms": 6,
    "footprint": 0.08,
    "velocityError": 0.035,
    "seed": 303,
    "model": {
      "width_m": 4000,
      "depth_m": 2400,
      "dx_m": 12.5,
      "dz_m": 4,
      "dip_m_per_km": 0,
      "layers": [
        {
          "name": "Overburden",
          "lith": "shale",
          "thickness_m": 500,
          "lamination": 0.9
        },
        {
          "name": "Sand U",
          "lith": "sand",
          "thickness_m": 60
        },
        {
          "name": "Shale 1",
          "lith": "shale",
          "thickness_m": 200
        },
        {
          "name": "Upper Marker",
          "lith": "limestone",
          "thickness_m": 25
        },
        {
          "name": "Shale 2",
          "lith": "shale",
          "thickness_m": 280
        },
        {
          "name": "Shale 3",
          "lith": "silty_shale",
          "thickness_m": 300
        },
        {
          "name": "Flank Sand",
          "lith": "sand",
          "thickness_m": 50
        },
        {
          "name": "Shale 4",
          "lith": "shale",
          "thickness_m": 150
        },
        {
          "name": "Base Marker",
          "lith": "limestone",
          "thickness_m": 30
        },
        {
          "name": "Basal shale",
          "lith": "shale",
          "thickness_m": 1500
        }
      ],
      "folds": [
        {
          "x_m": 2000,
          "halfWidth_m": 950,
          "amplitude_m": 150,
          "growthTop_m": 500,
          "growthBase_m": 1350
        }
      ],
      "lenses": [
        {
          "name": "Crestal carbonate",
          "shape": "mound",
          "lith": "limestone",
          "x_m": 2000,
          "width_m": 1100,
          "height_m": 55,
          "level_m": 1320,
          "vsh": 0.08,
          "phi": 0.1
        }
      ],
      "dimming": [
        {
          "x_m": 2000,
          "width_m": 1300,
          "top_m": 1250,
          "factor": 0.08
        }
      ]
    }
  },
  "wells": [
    {
      "name": "W3",
      "x_m": 650,
      "td_m": 1950,
      "logs": [
        "GR",
        "RES",
        "DT"
      ],
      "quality": "old",
      "depthUncertainty_m": 15,
      "calibration": {
        "RES": {
          "scale": 1.6
        },
        "DT": {
          "offset": 4
        }
      },
      "note": "Drilled 1968. No density or neutron. Resistivity from an early induction tool; values are qualitative. Lithology from cuttings with an estimated lag uncertainty of ±15 m."
    },
    {
      "name": "W1",
      "x_m": 2000,
      "td_m": 1800,
      "depthUncertainty_m": 6,
      "depthShift_m": 5,
      "note": "Crestal well. Logger's depth is 5 m deeper than driller's depth; logs are on logger's depth."
    },
    {
      "name": "W2",
      "x_m": 3300,
      "td_m": 1950,
      "depthUncertainty_m": 6,
      "washouts": [
        {
          "top_m": 1180,
          "base_m": 1215,
          "enlarge_in": 3
        }
      ],
      "note": "Modern wireline suite."
    }
  ],
  "logWindow": {
    "top_m": 600,
    "base_m": 1850
  },
  "tops": [
    {
      "name": "Upper Marker",
      "expert": {
        "W3": {
          "depth": "model",
          "unc_m": 15
        },
        "W1": {
          "depth": "model",
          "unc_m": 6
        },
        "W2": {
          "depth": "model",
          "unc_m": 6
        }
      }
    },
    {
      "name": "Low-GR unit",
      "note": "The low gamma ray unit at the level of the crest.",
      "expert": {
        "W3": {
          "depth": "model",
          "layer": "Flank Sand",
          "unc_m": 25,
          "note": "Correlation disputed."
        },
        "W1": {
          "depth": "model",
          "layer": "Crestal carbonate",
          "unc_m": 10
        },
        "W2": {
          "depth": "model",
          "layer": "Flank Sand",
          "unc_m": 20,
          "note": "Correlation disputed."
        }
      }
    },
    {
      "name": "Base Marker",
      "expert": {
        "W3": {
          "depth": "model",
          "unc_m": 15
        },
        "W1": {
          "depth": "model",
          "unc_m": 8
        },
        "W2": {
          "depth": "model",
          "unc_m": 8
        }
      }
    }
  ],
  "candidates": [
    {
      "id": "growthfold",
      "label": "Compressional growth fold",
      "description": "An [[anticline]] that grew under horizontal shortening while the section above about 1350 m was deposited, producing [[growth-strata]] that thin over the crest.",
      "pros": [
        "Thinning over the crest decreases upward, consistent with a structure growing through time.",
        "Structural relief continues downward as far as reflections can be followed."
      ],
      "cons": [
        "No reverse fault or tightening of the fold is imaged.",
        "Deeper relief under the crest is uncertain because of [[dimming]]."
      ],
      "sketch": "fold"
    },
    {
      "id": "drape",
      "label": "Drape over a carbonate buildup",
      "description": "Layers bent over a rigid [[buildup]] by [[drape|differential compaction]], with no tectonic shortening.",
      "pros": [
        "W1 logs a low gamma ray, high density, high resistivity unit on the crest that the flank wells do not.",
        "Thinning decreases upward, as expected for compaction drape."
      ],
      "cons": [
        "Drape alone does not bend beds below the buildup; relief of the Base Marker is poorly constrained.",
        "Correlating the crestal unit to the Flank Sand on gamma ray changes the thickness picture."
      ],
      "sketch": "drape"
    },
    {
      "id": "diapir",
      "label": "Shale-cored uplift",
      "description": "A mobile shale [[diapir]] or pillow at depth pushed up the overlying section.",
      "pros": [
        "Poor imaging under the crest is common above mobile shale.",
        "Would thin the overlying section over the crest."
      ],
      "cons": [
        "No low-velocity body or piercement is imaged.",
        "The crestal carbonate is not explained by uplift alone."
      ],
      "sketch": "diapir"
    }
  ],
  "evidence": [
    {
      "id": "thinning",
      "label": "Intervals thin toward the crest, less so upward",
      "likelihood": {
        "growthfold": 0.8,
        "drape": 0.8,
        "diapir": 0.7
      },
      "where": {
        "x_m": 2000,
        "z_m": 950,
        "rx_m": 1100,
        "rz_m": 280
      },
      "line": "seismic"
    },
    {
      "id": "crestunit",
      "label": "Low GR, high density, high resistivity unit in W1 only",
      "likelihood": {
        "growthfold": 0.55,
        "drape": 0.85,
        "diapir": 0.4
      },
      "where": {
        "well": "W1",
        "top_m": 1145,
        "base_m": 1215
      },
      "line": "logs"
    },
    {
      "id": "grcorr",
      "label": "Gamma ray suggests W1 crestal unit correlates with Flank Sand",
      "likelihood": {
        "growthfold": 0.5,
        "drape": 0.5,
        "diapir": 0.5
      },
      "where": {
        "well": "W2",
        "top_m": 1335,
        "base_m": 1400
      },
      "line": "logs"
    },
    {
      "id": "rescorr",
      "label": "Resistivity and density suggest the crestal unit has no flank equivalent",
      "likelihood": {
        "growthfold": 0.55,
        "drape": 0.7,
        "diapir": 0.5
      },
      "where": {
        "well": "W1",
        "top_m": 1145,
        "base_m": 1215
      },
      "line": "logs"
    },
    {
      "id": "dim",
      "label": "Poor imaging below 1300 m under the crest",
      "likelihood": {
        "growthfold": 0.5,
        "drape": 0.5,
        "diapir": 0.7
      },
      "where": {
        "x_m": 2000,
        "z_m": 1650,
        "rx_m": 650,
        "rz_m": 350
      },
      "line": "seismic"
    },
    {
      "id": "basemarker",
      "label": "Base Marker relief across the wells",
      "likelihood": {
        "growthfold": 0.85,
        "drape": 0.35,
        "diapir": 0.75
      },
      "where": {
        "well": "W1",
        "top_m": 1405,
        "base_m": 1455
      },
      "line": "logs"
    },
    {
      "id": "w3res",
      "label": "Resistivity values in W3",
      "likelihood": {
        "growthfold": 0.5,
        "drape": 0.5,
        "diapir": 0.5
      },
      "where": {
        "well": "W3",
        "top_m": 700,
        "base_m": 1900
      },
      "line": "logs"
    },
    {
      "id": "deepevent",
      "label": "A continuous, gently arched event near 1900 m",
      "likelihood": {
        "growthfold": 0.5,
        "drape": 0.5,
        "diapir": 0.5
      },
      "where": {
        "x_m": 2000,
        "z_m": 1900,
        "rx_m": 900,
        "rz_m": 160
      },
      "line": "seismic"
    },
    {
      "id": "envcrest",
      "line": "attributes",
      "label": "Envelope: the crestal unit is as bright as the Upper and Base Markers and ends abruptly near 1.5 and 2.5 km",
      "likelihood": {
        "growthfold": 0.6,
        "drape": 0.65,
        "diapir": 0.5
      },
      "where": {
        "attribute": "envelope",
        "x_m": 2000,
        "z_m": 1200,
        "rx_m": 560,
        "rz_m": 80
      }
    },
    {
      "id": "cohcrest",
      "line": "attributes",
      "label": "Coherence: no continuous vertical low-coherence zone crosses the crest; low values below 1250 m are scattered like the noise elsewhere",
      "likelihood": {
        "growthfold": 0.6,
        "drape": 0.6,
        "diapir": 0.4
      },
      "where": {
        "attribute": "coherence",
        "x_m": 2000,
        "z_m": 1100,
        "rx_m": 450,
        "rz_m": 550
      }
    },
    {
      "id": "somdepth",
      "line": "ml",
      "label": "SOM: classes change at about 750 m along the whole line",
      "model": "Self-organizing map, 8 classes, unsupervised, from four attributes",
      "likelihood": {
        "growthfold": 0.5,
        "drape": 0.5,
        "diapir": 0.5
      },
      "where": {
        "attribute": "som",
        "x_m": 2000,
        "z_m": 750,
        "rx_m": 1900,
        "rz_m": 120
      }
    },
    {
      "id": "somgroup",
      "line": "ml",
      "label": "SOM: the crestal unit falls in the same class as the Upper Marker and Base Marker",
      "model": "Self-organizing map, 8 classes, unsupervised, from four attributes",
      "likelihood": {
        "growthfold": 0.5,
        "drape": 0.5,
        "diapir": 0.5
      },
      "where": {
        "attribute": "som",
        "x_m": 2000,
        "z_m": 1200,
        "rx_m": 560,
        "rz_m": 80
      }
    },
    {
      "id": "reefnet",
      "line": "ml",
      "label": "A reef classifier labels the crestal unit a reef",
      "model": "Supervised network trained on reef outlines from 3D surveys in another basin",
      "reportedConfidence": 0.91,
      "likelihood": {
        "growthfold": 0.5,
        "drape": 0.55,
        "diapir": 0.48
      }
    }
  ],
  "outcome": {
    "statement": "The section was built as a growth fold with a thin carbonate shoal deposited on its crest, logged in W1 at about 1155 m.",
    "confidence": 0.68,
    "basis": "With 2D data, poor sub-crest imaging and a disputed correlation, a real team could reasonably keep substantial weight on drape. Separating the two would need the Base Marker mapped in 3D under the crest and regional structural context."
  },
  "debrief": "The Base Marker is deeper in W3 and W2 than in W1, so relief exists below the carbonate, which drape alone would not produce. That measurement rests on three wells with depth uncertainties of 6 to 15 m and relief of about 120 m, while the seismic below the crest cannot confirm it. The continuous event near 1900 m is a surface [[multiple]] of the Upper Marker at twice its two-way time, so its gentle arch repeats the shallow structure rather than recording deeper relief. The SOM class change near 750 m follows the loss of high frequency with depth, and the SOM groups the crestal unit with the markers because all three are bright, continuous limestones; neither grouping separates the suspects. The reef classifier reports 91% for the pattern it was trained on, a bright mounded body, which a carbonate shoal on a growing fold also produces.",
  "leads": [
    {
      "id": "threed",
      "label": "3D seismic over the structure",
      "result": "The Base Marker forms a closed dome under the crest with about 120 m of relief.",
      "likelihood": {
        "growthfold": 0.8,
        "drape": 0.3,
        "diapir": 0.7
      }
    },
    {
      "id": "core",
      "label": "Core from the crestal unit in W1",
      "result": "Grainstone with ooids and shell fragments; no reef framework.",
      "likelihood": {
        "growthfold": 0.65,
        "drape": 0.45,
        "diapir": 0.5
      }
    },
    {
      "id": "regional",
      "label": "Regional structural map",
      "result": "Similar domes nearby lie along a trend parallel to mapped thrust faults.",
      "likelihood": {
        "growthfold": 0.85,
        "drape": 0.45,
        "diapir": 0.4
      }
    },
    {
      "id": "deepwell",
      "label": "Deepen W1 to 2600 m",
      "result": "No salt or overpressured shale is encountered below the Base Marker.",
      "likelihood": {
        "growthfold": 0.6,
        "drape": 0.6,
        "diapir": 0.15
      }
    }
  ]
});
