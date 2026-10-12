window.EPC_DATA = {
    stationTypes: [
        { id: "solar-pv", name: "Solar PV" },
        { id: "hybrid-bess", name: "Hibrid + BESS" },
        { id: "zero-export", name: "Zero Export" },
        { id: "solar-bess-zero", name: "Solar + BESS + Zero Export" },
        { id: "bess", name: "BESS" }
    ],

    connectionLevels: [
        { id: "0.4", name: "0,4 kV" },
        { id: "10", name: "10 kV" },
        { id: "35", name: "35 kV" },
        { id: "110", name: "110 kV" }
    ],

    currencies: [
        { id: "EUR", symbol: "€", name: "EUR" },
        { id: "MDL", symbol: "L", name: "MDL" },
        { id: "USD", symbol: "$", name: "USD" }
    ],

    costCategories: [
        { id: "engineering", name: "Proiectare și inginerie" },
        { id: "main-equipment", name: "Echipamente principale" },
        { id: "materials", name: "Materiale" },
        { id: "civil", name: "Lucrări de construcții" },
        { id: "electrical", name: "Lucrări electrice" },
        { id: "grid", name: "Racordare la rețea" },
        { id: "logistics", name: "Logistică" },
        { id: "commissioning", name: "Punere în funcțiune" }
    ],

    units: ["buc", "set", "lot", "m", "m²", "m³", "kg", "t", "kW", "MW", "kWh", "MWh", "km", "ore", "zi"],

    technicalFields: {
        "solar-pv": [
            { id: "pvPower", label: "Putere PV", unit: "kWp" },
            { id: "panelPower", label: "Putere panou", unit: "Wp" },
            { id: "inverterPower", label: "Putere invertor", unit: "kW" }
        ],
        "hybrid-bess": [
            { id: "pvPower", label: "Putere PV", unit: "kWp" },
            { id: "bessCapacity", label: "Capacitate BESS", unit: "MWh" },
            { id: "pcsPower", label: "Putere PCS", unit: "MW" }
        ],
        "zero-export": [
            { id: "pvPower", label: "Putere PV", unit: "kWp" },
            { id: "inverterPower", label: "Putere invertor", unit: "kW" },
            { id: "exportLimit", label: "Limită export", unit: "kW" }
        ],
        "solar-bess-zero": [
            { id: "pvPower", label: "Putere PV", unit: "kWp" },
            { id: "bessCapacity", label: "Capacitate BESS", unit: "MWh" },
            { id: "pcsPower", label: "Putere PCS", unit: "MW" },
            { id: "exportLimit", label: "Limită export", unit: "kW" }
        ],
        "bess": [
            { id: "bessCapacity", label: "Capacitate BESS", unit: "MWh" },
            { id: "pcsPower", label: "Putere PCS", unit: "MW" },
            { id: "dod", label: "Depth of Discharge", unit: "%" }
        ]
    },

    defaultCoefficient: 1.20,

    defaultCostItems: [
        { category: "main-equipment", name: "PCS / Invertor", unit: "buc", quantity: 1, cost: 0, coefficient: 1.20, vatPct: 20 },
        { category: "main-equipment", name: "BESS Container", unit: "buc", quantity: 1, cost: 0, coefficient: 1.20, vatPct: 20 },
        { category: "materials", name: "Cablu de putere", unit: "m", quantity: 0, cost: 0, coefficient: 1.20, vatPct: 20 }
    ],

    STORAGE_KEY: "epc_calculator_projects"
};