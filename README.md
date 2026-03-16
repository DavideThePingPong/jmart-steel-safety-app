# Data Centre Hub - AI Facilities Management Platform

An AI-powered facilities management platform designed for Australian data centres,
built to help Facilities Managers excel at their role through intelligent agent assistance.

## Agent Architecture (21 Agents)

### Barbie - Head Facilities Director
The master agent who oversees all operations. Expert in Australian Standards (AS/NZS),
compliance, budgeting, vendor management, and strategic facilities planning.
Prioritises: **Safety > Compliance > Uptime > Efficiency > Cost**.

### Malena - Innovation & Technology Agent
Dedicated to tracking data centre industry progress, emerging technologies,
cost-saving strategies, and next-generation infrastructure solutions.

### Hard Services Agents (8 specialists)
| Agent | Domain | Key Standards |
|-------|--------|---------------|
| **Volt** | Electrical & Power Systems | AS/NZS 3000, AS/NZS 3760 |
| **Frost** | HVAC & Cooling Systems | AS 1668, AS/NZS 3666 |
| **Blaze** | Fire Protection & Life Safety | AS 1851, AS 1670 |
| **Sentinel** | Security Systems & Access Control | AS/NZS 2201, AS 4806 |
| **Cortex** | BMS, DCIM & OT Security | AS/NZS ISO/IEC 22237 |
| **Atlas** | Structural, Civil & Raised Floors | AS 1170, NCC/BCA |
| **Hydra** | Plumbing, Hydraulics & Gas | AS/NZS 3500, AS/NZS 3666 |
| **Nexus** | Operations Centre & Change Management | ITIL, ISO/IEC 22237 |

### Soft Services Agents (6 specialists)
| Agent | Domain |
|-------|--------|
| **Sparkle** | Specialised Data Centre Cleaning (ISO 14644) |
| **Verde** | Pest Control & Environmental |
| **Terra** | Landscaping & Grounds Maintenance |
| **Echo** | Waste Management & Recycling |
| **Grace** | Reception & Front of House |
| **Shield** | WHS/OHS Compliance & Safety (AS/NZS ISO 45001) |

### Support Agents (5 specialists)
| Agent | Domain |
|-------|--------|
| **Ledger** | Contracts, Budgets & Procurement |
| **Pulse** | Energy Management & Sustainability (NABERS, PUE) |
| **Compass** | Space Planning & Capacity Management |
| **Audit** | Compliance, Regulatory Affairs & Certifications |
| **Forge** | Capital Projects & Engineering |

## Key Features

- **21 specialist agents** with deep domain expertise and Australian Standards knowledge
- **Escalation priority matrix** (P1-P4) with defined response times and thresholds
- **24/7 operations context** with on-call structures and shift management
- **Day-by-day learning** — agents persist knowledge across sessions and grow smarter
- **KPIs per agent** — measurable targets for every discipline
- **State-specific awareness** — VIC, NSW, QLD, SA, WA regulatory variations
- **CLI interface** (Rich) — chat, switch agents, search knowledge
- **REST API** (FastAPI) — ready for web/mobile frontend
- **40+ Australian Standards** referenced and mapped to trades

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
/<agent>           Quick switch (e.g. /barbie, /frost)
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
│   ├── registry.py          # Agent class registry (avoids circular imports)
│   ├── agents/
│   │   ├── base.py          # Base agent class (learning, chat, KPIs)
│   │   ├── barbie.py        # Head Facilities Director
│   │   ├── malena.py        # Innovation & Technology
│   │   ├── hard_services/   # 8 hard services agents
│   │   └── soft_services/   # 6 soft services + 5 support agents
│   ├── knowledge/
│   │   ├── australian_standards.py  # Detailed standards reference
│   │   ├── data_centre_tiers.py     # Uptime Institute tiers
│   │   ├── escalation.py           # Priority matrix & thresholds
│   │   └── learning.py             # Day-by-day learning system
│   └── api/
│       └── server.py        # FastAPI REST endpoints
├── data/
│   ├── standards/           # Australian Standards reference data
│   └── learnings/           # Agent learning storage (git-ignored)
├── requirements.txt
└── README.md
```
