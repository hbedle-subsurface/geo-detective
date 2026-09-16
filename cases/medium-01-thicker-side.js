GW.registerCase({
  "id": "medium-01-thicker-side",
  "title": "Thicker on one side",
  "tier": "medium",
  "author": "Heather Bedle",
  "summary": "Units thicken eastward across a fault, and the two wells are more than 3 km apart.",
  "brief": "The interval between Sand 1 and Sand 4 is thicker east of a steep fault than west of it. W1 and W2 are 3.1 km apart, on opposite sides of the fault. The logs were recorded 25 years apart with different tools.",
  "seismic": {
    "type": "synthetic",
    "frequency_hz": 32,
    "phase_deg": -25,
    "Q": 130,
    "noise": 0.32,
    "multiples": 0.45,
    "diffractions": 0.5,
    "statics_ms": 4,
    "footprint": 0.06,
    "velocityError": 0.025,
    "seed": 202,
    "model": {
      "width_m": 4000,
      "depth_m": 2400,
      "dx_m": 12.5,
      "dz_m": 4,
      "dip_m_per_km": 15,
      "layers": [
        {
          "name": "Overburden",
          "lith": "shale",
          "thickness_m": 450,
          "lamination": 0.9
        },
        {
          "name": "Sand 1",
          "lith": "sand",
          "thickness_m": 50
        },
        {
          "name": "Shale A",
          "lith": "shale",
          "thickness_m": 150,
          "gradient_m_per_km": 8
        },
        {
          "name": "Sand 2",
          "lith": "sand",
          "thickness_m": 60
        },
        {
          "name": "Shale B",
          "lith": "shale",
          "thickness_m": 160,
          "gradient_m_per_km": 8
        },
        {
          "name": "Lime Stringer",
          "lith": "limestone",
          "thickness_m": 30
        },
        {
          "name": "Shale C",
          "lith": "silty_shale",
          "thickness_m": 180,
          "gradient_m_per_km": 8
        },
        {
          "name": "Sand 3",
          "lith": "sand",
          "thickness_m": 70,
          "profile": "fining"
        },
        {
          "name": "Shale D",
          "lith": "shale",
          "thickness_m": 220,
          "gradient_m_per_km": 8
        },
        {
          "name": "Sand 4",
          "lith": "tight_sand",
          "thickness_m": 60
        },
        {
          "name": "Basal shale",
          "lith": "shale",
          "thickness_m": 1200
        }
      ],
      "faults": [
        {
          "x_m": 1500,
          "dip_deg": 58,
          "dipDirection": 1,
          "throw_m": 190,
          "sense": "normal",
          "growthTop_m": 520,
          "growthBase_m": 1500
        }
      ]
    }
  },
  "wells": [
    {
      "name": "W1",
      "x_m": 400,
      "td_m": 1900,
      "depthUncertainty_m": 10,
      "quality": "old",
      "logs": [
        "GR",
        "RES",
        "DT"
      ],
      "calibration": {
        "GR": {
          "scale": 1,
          "offset": 18
        }
      },
      "note": "Older logging suite with no density or neutron. Gamma ray reads systematically high relative to the modern tool."
    },
    {
      "name": "W2",
      "x_m": 3500,
      "td_m": 2100,
      "depthUncertainty_m": 6,
      "washouts": [
        {
          "top_m": 1080,
          "base_m": 1150,
          "enlarge_in": 4
        }
      ],
      "note": "Modern suite."
    }
  ],
  "logWindow": {
    "top_m": 450,
    "base_m": 2000
  },
  "tops": [
    {
      "name": "Sand 1",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 10
        },
        "W2": {
          "depth": "model",
          "unc_m": 6
        }
      }
    },
    {
      "name": "Sand 2",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 10
        },
        "W2": {
          "depth": "model",
          "unc_m": 6
        }
      }
    },
    {
      "name": "Lime Stringer",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 10
        },
        "W2": {
          "depth": "model",
          "unc_m": 6
        }
      }
    },
    {
      "name": "Sand 4",
      "expert": {
        "W1": {
          "depth": "model",
          "unc_m": 10
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
      "id": "growth",
      "label": "Growth fault",
      "description": "A [[growth-fault]] that slipped while Sand 1 to Sand 4 were deposited, so the [[hanging-wall]] accumulated more sediment.",
      "pros": [
        "Offset of reflections increases with depth.",
        "Thickening is concentrated east of the fault."
      ],
      "cons": [
        "Only two wells, both far from the fault, measure thickness.",
        "Some thickening is also seen west of the fault."
      ],
      "sketch": "growth-fault"
    },
    {
      "id": "wedge",
      "label": "Later fault through a depositional wedge",
      "description": "The units already thickened eastward as a [[wedge]]; a fault cut them after deposition.",
      "pros": [
        "Units west of the fault also thicken gently toward the east.",
        "Well thicknesses alone cannot place where thickening begins."
      ],
      "cons": [
        "A post-depositional fault would offset every unit by the same amount, which the reflections do not show."
      ],
      "sketch": "wedge"
    },
    {
      "id": "withdrawal",
      "label": "Thickening from shale withdrawal",
      "description": "[[shale-withdrawal]] at depth let the eastern block subside during deposition, with the fault accommodating it.",
      "pros": [
        "Would also produce thickening that increases with depth."
      ],
      "cons": [
        "No mobile layer or thinning of a deep unit is imaged on this line.",
        "The line stops at 2.4 km depth."
      ],
      "sketch": "withdrawal"
    }
  ],
  "evidence": [
    {
      "id": "offsetdepth",
      "label": "Offset increases with depth",
      "likelihood": {
        "growth": 0.85,
        "wedge": 0.35,
        "withdrawal": 0.55
      },
      "where": {
        "x_m": 2250,
        "z_m": 1300,
        "rx_m": 500,
        "rz_m": 480
      },
      "line": "seismic"
    },
    {
      "id": "hwthick",
      "label": "Thickening concentrated in the hanging wall",
      "likelihood": {
        "growth": 0.8,
        "wedge": 0.5,
        "withdrawal": 0.4
      },
      "where": {
        "x_m": 3000,
        "z_m": 1300,
        "rx_m": 700,
        "rz_m": 450
      },
      "line": "seismic"
    },
    {
      "id": "isochore",
      "label": "Sand 1 to Sand 4 interval thicker in W2 than W1",
      "likelihood": {
        "growth": 0.6,
        "wedge": 0.6,
        "withdrawal": 0.6
      },
      "where": {
        "well": "W2",
        "top_m": 500,
        "base_m": 1700
      },
      "line": "logs"
    },
    {
      "id": "fwthick",
      "label": "Gentle eastward thickening west of the fault",
      "likelihood": {
        "growth": 0.45,
        "wedge": 0.8,
        "withdrawal": 0.55
      },
      "where": {
        "x_m": 1000,
        "z_m": 1100,
        "rx_m": 800,
        "rz_m": 400
      },
      "line": "seismic"
    },
    {
      "id": "lowrhob",
      "label": "Low bulk density below the Lime Stringer in W2",
      "likelihood": {
        "growth": 0.5,
        "wedge": 0.5,
        "withdrawal": 0.5
      },
      "where": {
        "well": "W2",
        "top_m": 1075,
        "base_m": 1155
      },
      "line": "logs"
    },
    {
      "id": "sonicspikes",
      "label": "Sonic spikes below the Lime Stringer in W2",
      "likelihood": {
        "growth": 0.5,
        "wedge": 0.5,
        "withdrawal": 0.5
      },
      "where": {
        "well": "W2",
        "top_m": 1075,
        "base_m": 1155
      },
      "line": "logs"
    },
    {
      "id": "highgr",
      "label": "Higher gamma ray values throughout W1",
      "likelihood": {
        "growth": 0.5,
        "wedge": 0.5,
        "withdrawal": 0.5
      },
      "where": {
        "well": "W1",
        "top_m": 500,
        "base_m": 1850
      },
      "line": "logs"
    },
    {
      "id": "deep",
      "label": "No imaging below 2.4 km",
      "likelihood": {
        "growth": 0.5,
        "wedge": 0.5,
        "withdrawal": 0.6
      },
      "line": "seismic"
    },
    {
      "id": "cohfade",
      "line": "attributes",
      "label": "Coherence: the fault is a clear low-coherence break below about 900 m and fades out upward",
      "likelihood": {
        "growth": 0.75,
        "wedge": 0.45,
        "withdrawal": 0.55
      },
      "where": {
        "attribute": "coherence",
        "x_m": 2150,
        "z_m": 900,
        "rx_m": 380,
        "rz_m": 480
      }
    },
    {
      "id": "spectune",
      "line": "attributes",
      "label": "Spectral decomposition: Sand 4 is brighter at 15 Hz east of the fault and brighter at 45 Hz west of it",
      "detail": "East of the fault Sand 4 is about 250 m deeper.",
      "likelihood": {
        "growth": 0.5,
        "wedge": 0.5,
        "withdrawal": 0.5
      },
      "where": {
        "attribute": "spec_low",
        "x_m": 2000,
        "z_m": 1550,
        "rx_m": 1600,
        "rz_m": 200
      }
    },
    {
      "id": "somclass",
      "line": "ml",
      "label": "SOM: the Lime Stringer and Sand 4 each keep their own class on both sides of the fault",
      "model": "Self-organizing map, 8 classes, unsupervised, from four attributes",
      "likelihood": {
        "growth": 0.55,
        "wedge": 0.55,
        "withdrawal": 0.55
      },
      "where": {
        "attribute": "som",
        "x_m": 2000,
        "z_m": 1250,
        "rx_m": 1700,
        "rz_m": 450
      }
    },
    {
      "id": "thicknet",
      "line": "ml",
      "label": "A thickness-prediction model predicts the Sand 1 to Sand 4 interval thickening steadily from W1 to W2",
      "model": "Regression from seismic attributes to interval thickness, trained on W1 and W2 only",
      "reportedConfidence": 0.99,
      "likelihood": {
        "growth": 0.45,
        "wedge": 0.6,
        "withdrawal": 0.5
      }
    }
  ],
  "outcome": {
    "statement": "The section was built with a growth fault (throw rising from 0 at 520 m to 190 m at 1500 m) through units that also thicken gently eastward.",
    "confidence": 0.82,
    "basis": "Both processes are present in the model. On real data, deeper imaging and a well nearer the fault would be needed to separate the fault-driven thickening from regional thickening and to rule out a mobile shale."
  },
  "debrief": "The low bulk density and sonic spikes in W2 sit inside a shale on the gamma ray log, over the interval where the caliper shows an enlarged hole, so they are borehole effects rather than a sand. The high gamma ray in W1 is a calibration offset: the log shape correlates even though the values do not match W2. The 15 Hz and 45 Hz brightness of Sand 4 changes across the fault because the eastern side is deeper and has lost more high frequency, not because Sand 4 changes thickness. The thickness model fits its two training wells almost perfectly, so its 99% reflects the fit at two points; between them it can only draw a smooth trend and has no way to place a fault-controlled change.",
  "leads": [
    {
      "id": "nearwell",
      "label": "Well 300 m east of the fault",
      "result": "Every unit from Sand 1 to Sand 4 is thicker than in W2, and the lower units are thicker still.",
      "likelihood": {
        "growth": 0.85,
        "wedge": 0.3,
        "withdrawal": 0.55
      }
    },
    {
      "id": "deepseis",
      "label": "Reprocessed seismic to 4 km",
      "result": "Below 2.4 km a continuous reflection shows no thinning or piercement beneath the eastern block.",
      "likelihood": {
        "growth": 0.7,
        "wedge": 0.6,
        "withdrawal": 0.2
      }
    },
    {
      "id": "ages",
      "label": "Biostratigraphic ages of each unit",
      "result": "Thickening begins in the unit containing Sand 4 and continues upward to Sand 1.",
      "likelihood": {
        "growth": 0.7,
        "wedge": 0.5,
        "withdrawal": 0.6
      }
    },
    {
      "id": "pressure",
      "label": "Formation pressure measurements",
      "result": "Pressures are hydrostatic in both wells.",
      "likelihood": {
        "growth": 0.5,
        "wedge": 0.5,
        "withdrawal": 0.5
      }
    }
  ]
});
