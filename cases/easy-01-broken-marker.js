GW.registerCase({
  "id": "easy-01-broken-marker",
  "title": "The broken marker",
  "tier": "easy",
  "author": "Heather Bedle",
  "summary": "Reflections step down across a steep surface in the middle of the line.",
  "brief": "A 2D line crosses a steep discontinuity where every [[reflection]] below 400 m steps down to the east. Two wells sit on either side. Sand C is logged in W1 but has not been reported in W2.",
  "seismic": {
    "type": "synthetic",
    "frequency_hz": 38,
    "phase_deg": 0,
    "Q": 180,
    "noise": 0.15,
    "multiples": 0.3,
    "diffractions": 0.3,
    "statics_ms": 2,
    "footprint": 0.03,
    "velocityError": 0.015,
    "velocitySmoothing_m": 25,
    "seed": 101,
    "model": {
      "width_m": 4000,
      "depth_m": 2200,
      "dx_m": 12.5,
      "dz_m": 4,
      "dip_m_per_km": 20,
      "layers": [
        {
          "name": "Overburden",
          "lith": "shale",
          "thickness_m": 500,
          "lamination": 0.9
        },
        {
          "name": "Sand A",
          "lith": "sand",
          "thickness_m": 60,
          "profile": "fining"
        },
        {
          "name": "Shale 1",
          "lith": "shale",
          "thickness_m": 120
        },
        {
          "name": "Ridge Limestone",
          "lith": "limestone",
          "thickness_m": 40
        },
        {
          "name": "Shale 2",
          "lith": "silty_shale",
          "thickness_m": 150
        },
        {
          "name": "Sand B",
          "lith": "sand",
          "thickness_m": 80,
          "profile": "coarsening"
        },
        {
          "name": "Shale 3",
          "lith": "shale",
          "thickness_m": 200
        },
        {
          "name": "Sand C",
          "lith": "tight_sand",
          "thickness_m": 70
        },
        {
          "name": "Shale 4",
          "lith": "shale",
          "thickness_m": 400
        },
        {
          "name": "Lower Limestone",
          "lith": "limestone",
          "thickness_m": 50
        },
        {
          "name": "Basal shale",
          "lith": "silty_shale",
          "thickness_m": 1000
        }
      ],
      "faults": [
        {
          "x_m": 1800,
          "dip_deg": 60,
          "dipDirection": 1,
          "throw_m": 120,
          "sense": "normal",
          "tip_m": 380,
          "tipTaper_m": 120
        }
      ]
    }
  },
  "wells": [
    {
      "name": "W1",
      "x_m": 900,
      "td_m": 1800,
      "depthUncertainty_m": 5,
      "note": "Modern wireline suite: gamma ray, caliper, resistivity, density, neutron, sonic."
    },
    {
      "name": "W2",
      "x_m": 2540,
      "td_m": 1800,
      "depthUncertainty_m": 8,
      "note": "Driller's and logger's depths differ by 6 m near TD."
    }
  ],
  "logWindow": {
    "top_m": 450,
    "base_m": 1700
  },
  "tops": [
    {
      "name": "Ridge Limestone",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 5
        },
        "W2": {
          "depth": "model",
          "unc_m": 8
        }
      }
    },
    {
      "name": "Sand B",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 5
        },
        "W2": {
          "depth": "model",
          "unc_m": 8
        }
      }
    },
    {
      "name": "Sand C",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 5
        },
        "W2": {
          "absent": true,
          "note": "Not present; the interval is cut out."
        }
      }
    },
    {
      "name": "Lower Limestone",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 5
        },
        "W2": {
          "depth": "model",
          "unc_m": 10
        }
      }
    }
  ],
  "candidates": [
    {
      "id": "normal",
      "label": "Normal fault",
      "description": "A dip-slip [[normal-fault]] with the [[hanging-wall]] down to the east, formed under extension.",
      "pros": [
        "Reflections on the east side are lower by a similar amount at every level.",
        "Sand C is absent in W2, the expected [[missing-section]] where a borehole crosses a normal fault."
      ],
      "cons": [
        "A single 2D line records only [[apparent-separation]]; the slip direction is not measured."
      ],
      "sketch": "normal-fault"
    },
    {
      "id": "strikeslip",
      "label": "Strike-slip fault",
      "description": "A [[strike-slip]] fault whose horizontal motion of dipping beds appears as vertical offset on this line.",
      "pros": [
        "Beds dip gently east, so horizontal motion would produce some vertical offset on the section.",
        "No line crossing the fault in another direction is available."
      ],
      "cons": [
        "Offset is nearly constant with depth and the fault plane is a single planar surface on the line.",
        "A missing section in W2 is less directly explained."
      ],
      "sketch": "strike-slip"
    },
    {
      "id": "erosion",
      "label": "Erosional scarp and unconformity, no fault",
      "description": "A buried erosional step with an [[unconformity]] that removed Sand C on the east side.",
      "pros": [
        "Erosion could remove Sand C in W2 without faulting."
      ],
      "cons": [
        "Reflections above and below Sand C are offset by the same amount, including beds that would lie below any erosion surface.",
        "Shallow reflections above 380 m are continuous across the step."
      ],
      "sketch": "erosion"
    }
  ],
  "evidence": [
    {
      "id": "offset",
      "label": "Reflections offset by a similar amount at all levels below 400 m",
      "likelihood": {
        "normal": 0.9,
        "strikeslip": 0.6,
        "erosion": 0.15
      },
      "where": {
        "x_m": 2350,
        "z_m": 1150,
        "rx_m": 520,
        "rz_m": 520
      },
      "line": "seismic"
    },
    {
      "id": "missing",
      "label": "Sand C absent in W2",
      "likelihood": {
        "normal": 0.8,
        "strikeslip": 0.25,
        "erosion": 0.6
      },
      "where": {
        "well": "W2",
        "top_m": 1180,
        "base_m": 1320
      },
      "line": "logs"
    },
    {
      "id": "thickness",
      "label": "Unit thicknesses match across the discontinuity",
      "likelihood": {
        "normal": 0.7,
        "strikeslip": 0.6,
        "erosion": 0.3
      },
      "where": {
        "x_m": 1500,
        "z_m": 1000,
        "rx_m": 1300,
        "rz_m": 350
      },
      "line": "seismic"
    },
    {
      "id": "oneline",
      "label": "Only one 2D line, no strike information",
      "likelihood": {
        "normal": 0.5,
        "strikeslip": 0.8,
        "erosion": 0.5
      },
      "line": "seismic"
    },
    {
      "id": "regionaldip",
      "label": "Gentle regional dip to the east",
      "likelihood": {
        "normal": 0.5,
        "strikeslip": 0.5,
        "erosion": 0.5
      },
      "line": "seismic"
    },
    {
      "id": "shallow",
      "label": "Continuous reflections above 380 m",
      "likelihood": {
        "normal": 0.6,
        "strikeslip": 0.6,
        "erosion": 0.3
      },
      "where": {
        "x_m": 2100,
        "z_m": 250,
        "rx_m": 450,
        "rz_m": 130
      },
      "line": "seismic"
    },
    {
      "id": "coh",
      "line": "attributes",
      "label": "Coherence: one narrow low-coherence line dips steeply east from about 550 m to the base of the line",
      "likelihood": {
        "normal": 0.75,
        "strikeslip": 0.7,
        "erosion": 0.25
      },
      "where": {
        "attribute": "coherence",
        "x_m": 2350,
        "z_m": 1150,
        "rx_m": 600,
        "rz_m": 600
      }
    },
    {
      "id": "spec45",
      "line": "attributes",
      "label": "Spectral decomposition, 45 Hz: Sand C is brighter west of the fault than east of it",
      "detail": "East of the fault Sand C is about 150 m deeper.",
      "likelihood": {
        "normal": 0.5,
        "strikeslip": 0.5,
        "erosion": 0.55
      },
      "where": {
        "attribute": "spec_high",
        "x_m": 2000,
        "z_m": 1300,
        "rx_m": 1500,
        "rz_m": 150
      }
    },
    {
      "id": "somorder",
      "line": "ml",
      "label": "SOM: classes repeat in the same vertical order on both sides of the discontinuity, stepped down to the east",
      "model": "Self-organizing map, 8 classes, unsupervised, from four attributes",
      "likelihood": {
        "normal": 0.7,
        "strikeslip": 0.65,
        "erosion": 0.3
      },
      "where": {
        "attribute": "som",
        "x_m": 2300,
        "z_m": 1200,
        "rx_m": 900,
        "rz_m": 500
      }
    },
    {
      "id": "faultnet",
      "line": "ml",
      "label": "Fault-detection network labels the discontinuity a normal fault",
      "model": "Supervised network trained on interpreted normal faults from another basin; its training set has no reverse or strike-slip faults",
      "reportedConfidence": 0.97,
      "likelihood": {
        "normal": 0.55,
        "strikeslip": 0.5,
        "erosion": 0.25
      }
    }
  ],
  "outcome": {
    "statement": "The section was built with a normal fault of 120 m throw.",
    "confidence": 0.9,
    "basis": "For a real line with these data, a subsurface team would still lack strike control. A 3D survey or oriented core would be needed to exclude an oblique-slip component."
  },
  "debrief": "Unit thicknesses that match across the fault indicate the fault moved after these beds were deposited. The missing Sand C in W2 is the borehole crossing the fault plane at about 1280 m. The fault-detection network recognizes the discontinuity as a fault, which helps separate it from erosion, but it can only return the one fault type it was trained on, so its label and its 97% say nothing about normal versus strike-slip.",
  "leads": [
    {
      "id": "core",
      "label": "Oriented core across the fault in W2",
      "result": "Polished fault surfaces with slickenlines plunging steeply, close to the dip direction of the fault.",
      "likelihood": {
        "normal": 0.85,
        "strikeslip": 0.15,
        "erosion": 0.1
      }
    },
    {
      "id": "strikeline",
      "label": "Second 2D line along strike",
      "result": "The step is present 1.5 km along strike, with the same down-to-east sense and a similar throw.",
      "likelihood": {
        "normal": 0.7,
        "strikeslip": 0.35,
        "erosion": 0.25
      }
    },
    {
      "id": "biostrat",
      "label": "Biostratigraphy of W2 cuttings",
      "result": "Microfossil zones above and below about 1280 m are in normal order, with one zone missing.",
      "likelihood": {
        "normal": 0.6,
        "strikeslip": 0.45,
        "erosion": 0.6
      }
    },
    {
      "id": "stress",
      "label": "Borehole breakouts in nearby wells",
      "result": "The least horizontal stress is oriented roughly perpendicular to the fault.",
      "likelihood": {
        "normal": 0.7,
        "strikeslip": 0.35,
        "erosion": 0.5
      }
    }
  ]
});
