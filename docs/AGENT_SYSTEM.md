# Data Centre Hub — Agent System Documentation

> 21 AI agents. One data centre. Built for Australian Facilities Managers.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How Agents Learn](#how-agents-learn)
3. [The Team](#the-team)
4. [Escalation & Priority Framework](#escalation--priority-framework)
5. [Australian Standards Catalog](#australian-standards-catalog)
6. [CLI Commands](#cli-commands)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)

---

## Architecture Overview

The system is a **multi-agent CLI platform** where each agent is a domain specialist for a specific facilities management trade. All agents share:

- A common `BaseAgent` class (`hub/agents/base.py`) that handles chat, learning, and prompt construction
- The Anthropic Claude API (`claude-sonnet-4-6`) as the underlying LLM
- Persistent JSON-based learning storage per agent
- An Australian Standards reference catalog (46 standards)
- A priority escalation matrix (P1–P4)

**Barbie** (Head Facilities Director) acts as the orchestrator — she delegates specialist questions to the right agent and manages incident severity using the escalation framework.

```
                         ┌──────────┐
                         │  Barbie  │
                         │ Director │
                         └────┬─────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐
     │ Hard Services │ │    Soft    │ │   Support    │
     │   8 agents    │ │  Services  │ │   5 agents   │
     │               │ │  6 agents  │ │              │
     └───────────────┘ └────────────┘ └──────────────┘

     + Malena (Innovation & Technology Lead)
```

---

## How Agents Learn

There is **no machine learning, no vector stores, no embeddings, no fine-tuning**. The system uses **in-context learning** — structured data appended to Claude's system prompt.

### The Learning Loop

```
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │  1. User asks agent a question                      │
  │         │                                           │
  │         ▼                                           │
  │  2. _build_system_prompt() assembles:               │
  │     • Base system prompt (role-specific expertise)  │
  │     • Last 50 learnings from JSON file              │
  │     • Relevant Australian Standards                 │
  │     • KPIs for the discipline                       │
  │     • Learning Protocol instructions                │
  │         │                                           │
  │         ▼                                           │
  │  3. Claude responds using all that context           │
  │         │                                           │
  │         ▼                                           │
  │  4. Agent may suggest:                              │
  │     "I recommend we record this learning:           │
  │      [topic] — [summary]"                           │
  │         │                                           │
  │         ▼                                           │
  │  5. User runs /teach <agent> <topic> :: <content>   │
  │         │                                           │
  │         ▼                                           │
  │  6. Learning saved to JSON → available next chat    │
  │                                                     │
  └─────────────────────────────────────────────────────┘
```

### Learning Storage

Each agent's learnings are stored in a JSON file:

```
data/learnings/
├── barbie_learnings.json
├── dazza_learnings.json
├── chilli_learnings.json
├── smokey_learnings.json
├── bigkev_learnings.json
├── technoterry_learnings.json
├── slabsteve_learnings.json
├── dunnydoug_learnings.json
├── nightowlnev_learnings.json
├── dustydi_learnings.json
├── bugsy_learnings.json
├── mowermick_learnings.json
├── skipsteve_learnings.json
├── sunnysue_learnings.json
├── hardhathaz_learnings.json
├── pennypete_learnings.json
├── wattsy_learnings.json
├── tetristrev_learnings.json
├── clipboardkaren_learnings.json
├── tradietony_learnings.json
└── malena_learnings.json
```

Each entry:
```json
{
  "date": "2026-03-16T09:30:00.000000",
  "topic": "UPS Battery Chemistry",
  "content": "Modern UPS systems use VRLA or Li-ion batteries...",
  "source": "Vendor site visit"
}
```

### Learning Constraints

| Aspect | Detail |
|--------|--------|
| Max learnings shown per chat | 50 (most recent) |
| Conversation history kept | 40 messages (trimmed) |
| Search method | Substring matching (no semantic search) |
| Agent isolation | Each agent has its own learnings file |
| Cross-agent search | `/search <query>` scans all agents |
| Export | `/export` dumps full knowledge base to markdown |

### What Agents Know Before Any Learning

Every agent starts with:
1. **A detailed system prompt** — 60-100+ lines of domain expertise written specifically for their trade
2. **Australian Standards** — mapped to their discipline (e.g. Dazza gets AS/NZS 3000, 3008, 3760, etc.)
3. **KPIs** — measurable targets (e.g. "UPS availability >=99.99%")
4. **The Learning Protocol** — instructions to proactively suggest recording new insights

---

## The Team

### Director

| Agent | ID | Role | Standards | KPIs |
|-------|----|------|-----------|------|
| **Barbie** | `barbie` | Head Facilities Director | 12 | 9 |

Barbie oversees all 20 specialists. She can `delegate_to_specialist()` and `assess_priority()` for incoming incidents. Her priority order: **Safety > Compliance > Uptime > Efficiency > Cost**.

### Innovation

| Agent | ID | Role | Standards | KPIs |
|-------|----|------|-----------|------|
| **Malena** | `malena` | Innovation & Technology Lead | 4 | — |

Malena tracks emerging tech: liquid cooling, renewable energy, AI automation, modular design, ESG trends. Has `research_topic()` and `compare_technologies()` methods.

### Hard Services (8 agents)

| Agent | ID | Role | Standards | KPIs |
|-------|----|------|-----------|------|
| **Dazza** | `dazza` | Electrical & Power Systems (The Sparky) | 9 | 6 |
| **Chilli** | `chilli` | HVAC & Cooling (Keeps It Cool) | 7 | 6 |
| **Smokey** | `smokey` | Fire Protection & Life Safety (Fire Warden) | 9 | 6 |
| **Big Kev** | `bigkev` | Security & Access Control (Head of Security) | 4 | 6 |
| **Techno Terry** | `technoterry` | BMS & DCIM (The BMS Nerd) | 3 | 6 |
| **Slab Steve** | `slabsteve` | Structural, Civil & Raised Floors (The Structural Bloke) | 6 | 4 |
| **Dunny Doug** | `dunnydoug` | Plumbing, Hydraulics & Gas (The Plumber) | 4 | 5 |
| **Nightowl Nev** | `nightowlnev` | Operations Centre & Change Management (24/7 Ops Legend) | 2 | 5 |

### Soft Services (6 agents)

| Agent | ID | Role | Standards | KPIs |
|-------|----|------|-----------|------|
| **Dusty Di** | `dustydi` | Data Centre Cleaning (Cleaner Extraordinaire) | 1 | 5 |
| **Bugsy** | `bugsy` | Pest Control (The Pest Whisperer) | — | — |
| **Mower Mick** | `mowermick` | Landscaping & Grounds (Grounds Guru) | — | — |
| **Skip Steve** | `skipsteve` | Waste Management & Recycling (Waste Warrior) | 1 | — |
| **Sunny Sue** | `sunnysue` | Reception & Front of House (Front of House Queen) | — | — |
| **Hard Hat Haz** | `hardhathaz` | WHS/OHS Compliance & Safety (Safety First, Always) | 5 | 7 |

### Support (5 agents)

| Agent | ID | Role | Standards | KPIs |
|-------|----|------|-----------|------|
| **Penny Pete** | `pennypete` | Contracts, Budgets & Procurement (The Bean Counter) | — | — |
| **Wattsy** | `wattsy` | Energy Management & Sustainability (Energy Guru) | 3 | — |
| **Tetris Trev** | `tetristrev` | Space Planning & Capacity Management (Space Planning Wizard) | 3 | — |
| **Clipboard Karen** | `clipboardkaren` | Compliance & Regulatory Affairs (Compliance Queen) | 7 | 5 |
| **Tradie Tony** | `tradietony` | Capital Projects & Engineering (Project Legend) | 5 | 5 |

### Agent KPI Examples

**Dazza (Electrical):**
- UPS availability >= 99.99%
- Generator start reliability >= 99%
- Zero electrical safety incidents
- Thermal imaging 100% quarterly
- Test and tag 100%
- Critical spare parts 100%

**Hard Hat Haz (WHS/Safety):**
- TRIFR = 0
- LTIFR = 0
- SWMS completion 100%
- Emergency drills >= 2/year
- Monthly inspections 100%
- Investigation closure >= 95%
- WHS training 100%

**Barbie (Director):**
- PUE < 1.4
- Uptime >= 99.995%
- MTTR < 1hr for P1 incidents
- WHS TRIFR = 0
- ESM compliance 100%
- NABERS >= 5 stars
- Preventive maintenance 100%
- Client satisfaction >= 4.5/5
- Budget variance < 5%

---

## Escalation & Priority Framework

### Priority Matrix

| Priority | Response Time | Examples |
|----------|--------------|---------|
| **P1 — Critical** | < 5 minutes | Power failure, fire alarm, security breach, cooling loss to data hall |
| **P2 — High** | < 30 minutes | Single UPS/chiller failure, pest in data hall, significant leak |
| **P3 — Medium** | < 4 hours | Non-critical alarm, minor leak, equipment degradation |
| **P4 — Low** | Next business day | Cosmetic maintenance, documentation, routine scheduling |

### Escalation Thresholds

| Domain | P1 Trigger | P2 Trigger |
|--------|-----------|-----------|
| **Power** | Total power failure, dual UPS failure | Single UPS failure, generator fail-to-start |
| **Cooling** | All cooling lost to data hall | Single chiller/CRAH failure, temp > 27°C |
| **Fire** | Fire alarm activation, suppression discharge | Fire system impairment > 4 hrs |
| **Security** | Confirmed breach, tailgating to data hall | Access control failure, CCTV loss |
| **Safety** | Serious injury, dangerous incident | Near miss with high potential |
| **Water** | Water ingress in data hall | Water detected in plant rooms |
| **Compliance** | Regulatory notice received | Audit finding overdue |
| **Budget** | Unplanned spend > $50K | Budget variance > 10% |

### On-Call Structure

| Tier | Who | When |
|------|-----|------|
| **Tier 1** | Nightowl Nev (Operations Centre) | 24/7 first response |
| **Tier 2** | On-call specialist (trade-specific) | Escalated by Tier 1 |
| **Tier 3** | Barbie (Director) | All P1 incidents |

---

## Australian Standards Catalog

46 standards mapped across all trades:

### Electrical
`AS/NZS 3000` Wiring Rules | `AS/NZS 3008` Cable Selection | `AS/NZS 3010` Generating Sets | `AS/NZS 3012` Electrical Construction | `AS/NZS 3017` Verification | `AS/NZS 3019` Periodic Verification | `AS/NZS 3760` In-Service Safety Inspection | `AS/NZS 61439` Switchgear

### Fire Protection
`AS 1668.1` Fire & Smoke Control | `AS 1670.1` Fire Detection | `AS 1670.4` Sound Systems | `AS 1851` Maintenance of Fire Protection | `AS 2118` Sprinklers | `AS 2444` Portable Extinguishers | `AS 1530.4` Fire Tests | `AS 5062` Gaseous Fire Suppression

### HVAC & Mechanical
`AS 1668.2` Ventilation | `AS/NZS 3666` Air-Handling & Water Systems | `AS 1210` Pressure Vessels | `AS 4254` Ductwork

### Structural & Building
`AS 1170` Structural Actions | `AS 3600` Concrete Structures | `AS 4100` Steel Structures | `AS 2870` Footings | `NCC (BCA)` National Construction Code

### Security
`AS/NZS 2201` Intruder Alarms | `AS 4806` CCTV | `AS 1725` Chain-Wire Fencing

### WHS
`AS/NZS ISO 45001` OHS Management | `AS 1319` Safety Signs | `AS/NZS 1715` PPE Selection | `AS/NZS 1716` Respiratory Protection | `AS/NZS 4360` Risk Management

### Environmental & Energy
`AS/NZS ISO 14001` Environmental Management | `ISO 50001` Energy Management | `NABERS Energy` Rating Scheme

### Data Centre Specific
`AS/NZS ISO/IEC 22237` Data Centre Facilities | `SA TS 22237` (Technical Specification) | `ANSI/TIA-942` Data Centre Telecommunications | `Uptime Institute Tier Standard`

### Plumbing
`AS/NZS 3500` Plumbing & Drainage | `AS 4032` Thermostatic Mixing Valves

### Other
`IEC 62443` OT/Industrial Cybersecurity | `AS/CA S009` Cabling | `Australian Privacy Act 1988`

---

## CLI Commands

```
/team              Show all agents grouped by category
/switch <agent>    Switch active agent (e.g. /switch dazza)
/<agent>           Quick switch (e.g. /barbie, /chilli, /dazza)
/ask <agent> <q>   Ask a specific agent without switching
/teach <agent> <topic> :: <content>   Teach an agent something new
/learnings [agent] Show an agent's knowledge base
/search <query>    Search all agent learnings
/stats             Show learning statistics per agent
/export            Export full knowledge base to markdown file
/reset             Clear current agent's conversation history
/priorities        Show the escalation priority matrix
/help              Show help
/quit              Exit
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| LLM | Claude Sonnet 4.6 via Anthropic API |
| CLI | Rich (styled terminal output) |
| API | FastAPI + Uvicorn (REST endpoints) |
| Data Validation | Pydantic |
| Learning Storage | JSON files (one per agent) |
| Database (future) | SQLAlchemy + aiosqlite |
| HTTP Client | httpx |
| Config | python-dotenv |
| Python | >= 3.11 |

### Key Design Decisions

- **No vector store** — Learnings are simple enough that substring search works. Avoids infra complexity.
- **No fine-tuning** — All domain knowledge is in system prompts + accumulated learnings. Agents improve through use, not training.
- **JSON over SQLite** — Learnings are append-mostly and small. JSON is human-readable and easy to back up.
- **Lazy agent loading** — Agents are instantiated on first use, not at startup. Keeps memory low.
- **40-message conversation limit** — Prevents context overflow while keeping enough history for coherent conversations.
- **50-learning cap per prompt** — Balances knowledge injection with token budget.

---

## Project Structure

```
datacentre-hub/
├── hub/
│   ├── main.py                     # CLI entry point & orchestrator (343 lines)
│   ├── config.py                   # Config, standards catalog, agent registry (209 lines)
│   ├── registry.py                 # Agent class registry & lazy loading (56 lines)
│   ├── agents/
│   │   ├── base.py                 # BaseAgent — chat, learn, prompt building (165 lines)
│   │   ├── barbie.py               # Head Facilities Director (153 lines)
│   │   ├── malena.py               # Innovation & Technology Lead (132 lines)
│   │   ├── hard_services/
│   │   │   ├── dazza.py            # Electrical (The Sparky)
│   │   │   ├── chilli.py           # HVAC (Keeps It Cool)
│   │   │   ├── smokey.py           # Fire Protection (Fire Warden)
│   │   │   ├── bigkev.py           # Security (Head of Security)
│   │   │   ├── technoterry.py      # BMS/DCIM (The BMS Nerd)
│   │   │   ├── slabsteve.py        # Structural (The Structural Bloke)
│   │   │   ├── dunnydoug.py        # Plumbing (The Plumber)
│   │   │   └── nightowlnev.py      # Operations (24/7 Ops Legend)
│   │   └── soft_services/
│   │       ├── dustydi.py          # Cleaning (Cleaner Extraordinaire)
│   │       ├── bugsy.py            # Pest Control (The Pest Whisperer)
│   │       ├── mowermick.py        # Grounds (Grounds Guru)
│   │       ├── skipsteve.py        # Waste (Waste Warrior)
│   │       ├── sunnysue.py         # Reception (Front of House Queen)
│   │       ├── hardhathaz.py       # WHS/Safety (Safety First, Always)
│   │       ├── pennypete.py        # Contracts (The Bean Counter)
│   │       ├── wattsy.py           # Energy (Energy Guru)
│   │       ├── tetristrev.py       # Space Planning (Space Planning Wizard)
│   │       ├── clipboardkaren.py   # Compliance (Compliance Queen)
│   │       └── tradietony.py       # Projects (Project Legend)
│   ├── knowledge/
│   │   ├── learning.py             # LearningStore — search, export, stats (89 lines)
│   │   ├── escalation.py           # Priority matrix & on-call structure (136 lines)
│   │   ├── australian_standards.py  # Standards reference data
│   │   └── data_centre_tiers.py    # Uptime Institute Tier I-IV definitions
│   └── api/
│       └── server.py               # FastAPI REST endpoints
├── data/
│   └── learnings/                  # Per-agent JSON learning files
├── docs/
│   └── AGENT_SYSTEM.md             # This document
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

*Generated 2026-03-16 — Data Centre Hub v1.0.0*
