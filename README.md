# Data Centre Hub - AI Facilities Management Platform

An AI-powered facilities management platform designed for Australian data centres,
built to help Facilities Managers excel at their role through intelligent agent assistance.

## Agent Architecture

### Barbie - Head Facilities Director
The master agent who oversees all operations. Expert in Australian Standards (AS/NZS),
compliance, budgeting, vendor management, and strategic facilities planning.

### Malena - Innovation & Technology Agent
Dedicated to tracking data centre industry progress, emerging technologies,
cost-saving strategies, and next-generation infrastructure solutions.

### Hard Services Agents (7 specialists)
| Agent | Domain |
|-------|--------|
| **Volt** | Electrical & Power Systems |
| **Frost** | HVAC & Cooling Systems |
| **Blaze** | Fire Protection & Life Safety |
| **Sentinel** | Security Systems & Access Control |
| **Cortex** | BMS & DCIM (Building Management) |
| **Atlas** | Structural, Civil & Raised Floors |
| **Hydra** | Plumbing, Hydraulics & Gas |

### Soft Services Agents (6 specialists)
| Agent | Domain |
|-------|--------|
| **Sparkle** | Specialised Data Centre Cleaning |
| **Verde** | Pest Control & Environmental |
| **Terra** | Landscaping & Grounds Maintenance |
| **Echo** | Waste Management & Recycling |
| **Grace** | Reception & Front of House |
| **Shield** | WHS/OHS Compliance & Safety |

### Support Agents (3 specialists)
| Agent | Domain |
|-------|--------|
| **Ledger** | Contracts, Budgets & Procurement |
| **Pulse** | Energy Management & Sustainability |
| **Compass** | Space Planning & Capacity Management |

## Total: 19 Agents
- 1 Director (Barbie)
- 1 Innovation Lead (Malena)
- 7 Hard Services specialists
- 6 Soft Services specialists
- 3 Support specialists
- 1 Hub orchestrator

## Tech Stack
- Python 3.11+
- Claude API (Anthropic) for agent intelligence
- FastAPI for the hub API
- SQLite for local knowledge persistence
- Rich for CLI interface

## Getting Started

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key_here
python -m hub.main
```

## Project Structure
```
datacentre-hub/
├── hub/
│   ├── main.py              # Entry point & Hub orchestrator
│   ├── config.py            # Configuration & Australian Standards refs
│   ├── agents/
│   │   ├── base.py          # Base agent class
│   │   ├── barbie.py        # Head Facilities Director
│   │   ├── malena.py        # Innovation & Technology
│   │   ├── hard_services/   # 7 hard services agents
│   │   └── soft_services/   # 6 soft services agents + 3 support
│   ├── knowledge/
│   │   ├── australian_standards.py
│   │   ├── data_centre_tiers.py
│   │   └── learning.py      # Day-by-day learning system
│   └── api/
│       └── server.py        # FastAPI endpoints
├── data/
│   ├── standards/           # Australian Standards reference data
│   └── learnings/           # Agent learning storage
├── requirements.txt
└── README.md
```
