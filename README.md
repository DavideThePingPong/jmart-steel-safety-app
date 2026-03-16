# Data Centre Hub - AI Facilities Management Platform

An AI-powered facilities management platform designed for Australian data centres,
built to help Facilities Managers excel at their role through intelligent agent assistance.

## The Team (21 Agents)

### Barbie - Head Facilities Director
The boss. Oversees all operations. Expert in Australian Standards (AS/NZS),
compliance, budgeting, vendor management, and strategic facilities planning.
Prioritises: **Safety > Compliance > Uptime > Efficiency > Cost**.

### Malena - Innovation & Technology Lead
Dedicated to tracking data centre industry progress, emerging technologies,
cost-saving strategies, and next-generation infrastructure solutions.

### Hard Services (8 legends)
| Name | Trade | What They Do |
|------|-------|-------------|
| **Dazza** | The Sparky | Electrical & power — UPS, generators, PDUs, AS/NZS 3000 |
| **Chilli** | Keeps It Cool | HVAC & cooling — chillers, CRAC/CRAH, cooling towers, AS 1668 |
| **Smokey** | Fire Warden | Fire protection — FM-200, VESDA, sprinklers, AS 1851 |
| **Big Kev** | Head of Security | Security — biometrics, CCTV, mantraps, AS/NZS 2201 |
| **Techno Terry** | The BMS Nerd | BMS & DCIM — monitoring, alarms, OT cybersecurity |
| **Slab Steve** | The Structural Bloke | Structural & civil — raised floors, seismic, NCC/BCA |
| **Dunny Doug** | The Plumber | Plumbing & hydraulics — water, drainage, gas, AS/NZS 3500 |
| **Nightowl Nev** | 24/7 Ops Legend | Operations centre — change management, CMMS, incidents |

### Soft Services (6 legends)
| Name | Trade | What They Do |
|------|-------|-------------|
| **Dusty Di** | Cleaner Extraordinaire | Data centre cleaning — ISO 14644, sub-floor, particle control |
| **Bugsy** | The Pest Whisperer | Pest control — rodents, redbacks, cable damage prevention |
| **Mower Mick** | Grounds Guru | Landscaping — grounds, irrigation, bushfire prep |
| **Skip Steve** | Waste Warrior | Waste management — e-waste, data destruction, recycling |
| **Sunny Sue** | Front of House Queen | Reception — visitor management, inductions, client tours |
| **Hard Hat Haz** | Safety First, Always | WHS/OHS — SWMS, permits, incidents, AS/NZS ISO 45001 |

### Support (5 legends)
| Name | Trade | What They Do |
|------|-------|-------------|
| **Penny Pete** | The Bean Counter | Contracts & budgets — OPEX/CAPEX, SLAs, vendors |
| **Wattsy** | Energy Guru | Energy & sustainability — PUE, NABERS, carbon reporting |
| **Tetris Trev** | Space Planning Wizard | Capacity management — rack space, power, growth |
| **Clipboard Karen** | Compliance Queen | Compliance — ESM, NGER, certifications, audits |
| **Tradie Tony** | Project Legend | Capital projects — fit-outs, commissioning, upgrades |

## Key Features

- **21 specialist agents** with deep domain expertise and Australian Standards knowledge
- **Every agent learns day by day** — persistent knowledge that grows with use
- **Escalation priority matrix** (P1-P4) with defined response times
- **24/7 operations context** with on-call structures and shift management
- **KPIs per agent** — measurable targets for every discipline
- **State-specific awareness** — VIC, NSW, QLD, SA, WA regulatory variations
- **CLI interface** (Rich) — chat, switch agents, search knowledge
- **REST API** (FastAPI) — ready for web/mobile frontend
- **46 Australian Standards** referenced and mapped to trades

## Getting Started

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
python -m hub.main
```

### CLI Commands
```
/team              Show all agents grouped by category
/switch <agent>    Switch to a specific agent
/<agent>           Quick switch (e.g. /barbie, /chilli, /dazza)
/ask <agent> <q>   Ask a specific agent without switching
/priorities        Show escalation priority matrix
/teach <agent> <topic> :: <content>   Teach an agent
/learnings [agent] Show agent's knowledge base
/search <query>    Search all learnings
/export            Export knowledge base to file
```

### API Server
```bash
uvicorn hub.api.server:app --reload
# API docs at http://localhost:8000/docs
```

## Project Structure
```
datacentre-hub/
├── hub/
│   ├── main.py              # CLI entry point & orchestrator
│   ├── config.py            # Configuration, standards, agent registry
│   ├── registry.py          # Agent class registry
│   ├── agents/
│   │   ├── base.py          # Base agent class (learning, chat, KPIs)
│   │   ├── barbie.py        # Head Facilities Director
│   │   ├── malena.py        # Innovation & Technology
│   │   ├── hard_services/   # 8 hard services agents
│   │   └── soft_services/   # 6 soft services + 5 support agents
│   ├── knowledge/
│   │   ├── australian_standards.py
│   │   ├── data_centre_tiers.py
│   │   ├── escalation.py
│   │   └── learning.py
│   └── api/
│       └── server.py
├── data/
│   └── learnings/           # Agent learning storage
├── requirements.txt
└── README.md
```
