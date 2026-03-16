"""Configuration and Australian Standards references for Data Centre Hub."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STANDARDS_DIR = DATA_DIR / "standards"
LEARNINGS_DIR = DATA_DIR / "learnings"
DB_PATH = DATA_DIR / "hub.db"

# --- API ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "4096"))

# --- Australian Standards Reference Catalogue ---
# These are the key standards every data centre facilities manager in AU must know.
AUSTRALIAN_STANDARDS = {
    # Electrical
    "AS/NZS 3000": "Wiring Rules – electrical installations",
    "AS/NZS 3008": "Electrical installations – selection of cables",
    "AS/NZS 3010": "Electrical installations – generating sets",
    "AS/NZS 3012": "Electrical installations – construction and demolition sites",
    "AS/NZS 3017": "Electrical installations – verification guidelines",
    "AS/NZS 3019": "Electrical installations – periodic verification",
    "AS/NZS 3760": "In-service safety inspection and testing of electrical equipment",
    "AS/NZS 61439": "Low-voltage switchgear and controlgear assemblies",

    # Fire Protection
    "AS 1668.1": "The use of ventilation and airconditioning in buildings – Fire and smoke control",
    "AS 1670.1": "Fire detection, warning, control and intercom systems – Fire",
    "AS 1670.4": "Fire detection – sound systems and intercom for emergency purposes",
    "AS 1851": "Routine service of fire protection systems and equipment",
    "AS 2118": "Automatic fire sprinkler systems",
    "AS 2444": "Portable fire extinguishers and fire blankets – Selection and location",
    "AS 1530.4": "Methods for fire tests on building materials – Fire-resistance of elements",
    "AS 5062": "Fire protection for mobile and transportable equipment",

    # HVAC & Mechanical
    "AS 1668.2": "Ventilation design for indoor air quality",
    "AS/NZS 3666": "Air-handling and water systems of buildings – Microbial control (Legionella)",
    "AS 1210": "Pressure vessels",
    "AS 4254": "Ductwork for air-handling systems in buildings",

    # Building & Structure
    "AS 1170": "Structural design actions (wind, earthquake, general)",
    "AS 3600": "Concrete structures",
    "AS 4100": "Steel structures",
    "AS 2870": "Residential slabs and footings",
    "NCC (BCA)": "National Construction Code / Building Code of Australia",

    # Security
    "AS/NZS 2201": "Intruder alarm systems",
    "AS 4806": "Closed circuit television (CCTV)",
    "AS 1725": "Chain-link fabric security fencing",

    # WHS
    "AS/NZS ISO 45001": "Occupational health and safety management systems",
    "AS 1319": "Safety signs for the occupational environment",
    "AS/NZS 1715": "Selection, use and maintenance of respiratory protective equipment",
    "AS/NZS 1716": "Respiratory protective devices",
    "AS/NZS 4360": "Risk management (now ISO 31000)",

    # Environmental & Energy
    "AS/NZS ISO 14001": "Environmental management systems",
    "AS/NZS ISO 50001": "Energy management systems",
    "NABERS Energy": "National Australian Built Environment Rating System",

    # Data Centre Specific
    "AS/NZS ISO/IEC 22237": "Information technology – Data centre facilities and infrastructures",
    "SA TS 22237": "Australian adoption of ISO/IEC 22237 series",
    "ANSI/TIA-942": "Telecommunications Infrastructure Standard for Data Centers (referenced in AU)",
    "Uptime Institute Tier Standard": "Tier I–IV classification for data centre redundancy",

    # Plumbing & Hydraulics
    "AS/NZS 3500": "Plumbing and drainage (Parts 0-5)",
    "AS 4032": "Water supply – valves for the control of heated water supply",

    # Essential Services (Note: AS 1851 already listed under Fire Protection)
    "Building Regulations (VIC/NSW/QLD)": "State-specific essential safety measures regulations",

    # Security & Privacy
    "Australian Privacy Act 1988": "Privacy principles for personal information (incl. CCTV footage)",

    # OT Security
    "IEC 62443": "Industrial automation and control systems security",

    # Cabling
    "AS/CA S009": "Installation requirements for customer cabling (Australian standard)",
}

# --- Uptime Institute Tiers ---
DATA_CENTRE_TIERS = {
    "Tier I": {
        "name": "Basic Site Infrastructure",
        "uptime": "99.671%",
        "redundancy": "N (no redundancy)",
        "annual_downtime_hours": 28.8,
        "description": "Single path for power and cooling, no redundant components.",
    },
    "Tier II": {
        "name": "Redundant Site Infrastructure Components",
        "uptime": "99.741%",
        "redundancy": "N+1",
        "annual_downtime_hours": 22.0,
        "description": "Single path for power and cooling with redundant components.",
    },
    "Tier III": {
        "name": "Concurrently Maintainable",
        "uptime": "99.982%",
        "redundancy": "N+1 (concurrently maintainable)",
        "annual_downtime_hours": 1.6,
        "description": "Multiple paths for power and cooling, one active. Any component can be removed without disruption.",
    },
    "Tier IV": {
        "name": "Fault Tolerant",
        "uptime": "99.995%",
        "redundancy": "2(N+1) fully fault tolerant",
        "annual_downtime_hours": 0.4,
        "description": "Multiple active power and cooling paths. Fault tolerant – survives any single failure.",
    },
}

# --- Agent Registry ---
AGENTS = {
    # Director
    "barbie": {
        "name": "Barbie",
        "role": "Head Facilities Director",
        "category": "director",
        "description": "Master agent overseeing all data centre facilities operations. "
                       "Expert in Australian Standards, compliance, budgeting, vendor management, "
                       "and strategic facilities planning.",
    },
    # Innovation
    "malena": {
        "name": "Malena",
        "role": "Innovation & Technology Lead",
        "category": "innovation",
        "description": "Tracks data centre industry progress, emerging technologies, "
                       "cost-saving strategies, and next-generation infrastructure.",
    },
    # Hard Services
    "dazza": {"name": "Dazza", "role": "Electrical & Power Systems Specialist (The Sparky)", "category": "hard_services",
              "description": "The Sparky. Expert in UPS, generators, PDUs, switchgear, power distribution, "
                             "and AS/NZS 3000 compliance."},
    "chilli": {"name": "Chilli", "role": "HVAC & Cooling Systems Specialist (Keeps It Cool)", "category": "hard_services",
               "description": "Keeps It Cool (ironic, right?). Expert in CRAC/CRAH units, chillers, cooling towers, "
                              "hot/cold aisle containment, and AS 1668 compliance."},
    "smokey": {"name": "Smokey", "role": "Fire Protection & Life Safety Specialist (Fire Warden)", "category": "hard_services",
               "description": "The Fire Warden. Expert in FM-200/Novec, VESDA, sprinklers, fire suppression, "
                              "and AS 1851 compliance."},
    "bigkev": {"name": "Big Kev", "role": "Security Systems & Access Control Specialist (Head of Security)", "category": "hard_services",
               "description": "Head of Security. Expert in biometrics, CCTV, mantraps, bollards, perimeter security, "
                              "and AS/NZS 2201/4806 compliance."},
    "technoterry": {"name": "Techno Terry", "role": "BMS & DCIM Specialist (The BMS Nerd)", "category": "hard_services",
                    "description": "The BMS Nerd. Expert in building management systems, DCIM platforms, SCADA, "
                                   "environmental monitoring, and OT cybersecurity."},
    "slabsteve": {"name": "Slab Steve", "role": "Structural, Civil & Raised Floors Specialist (The Structural Bloke)", "category": "hard_services",
                  "description": "The Structural Bloke. Expert in building fabric, raised access floors, loading calculations, "
                                 "seismic bracing, and NCC/BCA compliance."},
    "dunnydoug": {"name": "Dunny Doug", "role": "Plumbing, Hydraulics & Gas Specialist (The Plumber)", "category": "hard_services",
                  "description": "The Plumber. Expert in water supply, drainage, gas systems, condensate management, "
                                 "and AS/NZS 3500 compliance."},
    "nightowlnev": {"name": "Nightowl Nev", "role": "Operations Centre & Change Management Specialist (24/7 Ops Legend)", "category": "hard_services",
                    "description": "The 24/7 Ops Legend. Expert in operations centre, change management, CMMS, "
                                   "incident management, shift operations, and maintenance scheduling."},
    # Soft Services
    "dustydi": {"name": "Dusty Di", "role": "Specialised Data Centre Cleaning Specialist (Cleaner Extraordinaire)", "category": "soft_services",
                "description": "Cleaner Extraordinaire. Expert in ISO 14644 cleanroom protocols, sub-floor cleaning, "
                               "particle count management, and contamination control."},
    "bugsy": {"name": "Bugsy", "role": "Pest Control & Environmental Specialist (The Pest Whisperer)", "category": "soft_services",
              "description": "The Pest Whisperer. Expert in integrated pest management for critical environments, "
                             "environmental monitoring, and biosecurity."},
    "mowermick": {"name": "Mower Mick", "role": "Landscaping & Grounds Maintenance Specialist (Grounds Guru)", "category": "soft_services",
                  "description": "The Grounds Guru. Expert in grounds maintenance, stormwater management, external lighting, "
                                 "and perimeter vegetation control."},
    "skipsteve": {"name": "Skip Steve", "role": "Waste Management & Recycling Specialist (Waste Warrior)", "category": "soft_services",
                  "description": "The Waste Warrior. Expert in e-waste disposal, data destruction, hazardous waste, "
                                 "recycling programs, and environmental compliance."},
    "sunnysue": {"name": "Sunny Sue", "role": "Reception & Front of House Specialist (Front of House Queen)", "category": "soft_services",
                 "description": "Front of House Queen. Expert in visitor management, induction programs, "
                                "front of house operations, and customer experience."},
    "hardhathaz": {"name": "Hard Hat Haz", "role": "WHS/OHS Compliance & Safety Specialist (Safety First, Always)", "category": "soft_services",
                   "description": "Safety First, Always. Expert in workplace health and safety, risk assessments, "
                                  "incident management, SWMS, and AS/NZS ISO 45001 compliance."},
    # Support
    "pennypete": {"name": "Penny Pete", "role": "Contracts, Budgets & Procurement Specialist (The Bean Counter)", "category": "support",
                  "description": "The Bean Counter. Expert in FM contracts, OPEX/CAPEX budgeting, vendor management, "
                                 "SLA tracking, and procurement."},
    "wattsy": {"name": "Wattsy", "role": "Energy Management & Sustainability Specialist (Energy Guru)", "category": "support",
               "description": "The Energy Guru. Expert in PUE optimisation, NABERS ratings, renewable energy, "
                              "carbon reporting, and AS/NZS ISO 50001."},
    "tetristrev": {"name": "Tetris Trev", "role": "Space Planning & Capacity Management Specialist (Space Planning Wizard)", "category": "support",
                   "description": "The Space Planning Wizard. Expert in rack space planning, power/cooling capacity, "
                                  "cable management, and growth forecasting."},
    "clipboardkaren": {"name": "Clipboard Karen", "role": "Compliance & Regulatory Affairs Specialist (Compliance Queen)", "category": "support",
                       "description": "The Compliance Queen. Expert in ESM compliance, regulatory reporting (NGER, CBD, NABERS), "
                                      "audit management, certifications, and state-specific regulations."},
    "tradietony": {"name": "Tradie Tony", "role": "Capital Projects & Engineering Manager (Project Legend)", "category": "support",
                   "description": "The Project Legend. Expert in data centre fit-outs, equipment upgrades, commissioning, "
                                  "project management, and design review."},
}
