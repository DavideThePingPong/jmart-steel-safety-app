"""Configuration for JM Artsteel Intelligence Hub.

Uses Qwen 3.5 via OpenRouter for cost efficiency (~$6.50/month target).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
LEARNINGS_DIR = DATA_DIR / "steel_learnings"
DB_PATH = DATA_DIR / "steel_hub.db"

# --- API (Qwen 3.5 via OpenRouter — cost-effective) ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
STEEL_MODEL = os.getenv("STEEL_MODEL", "qwen/qwen3.5-35b-a3b")
MAX_TOKENS = int(os.getenv("STEEL_MAX_TOKENS", "4096"))

# --- Agent Personalities ---
AGENT_PERSONALITIES = {
    # Hard Services
    "ugo": {
        "full_name": "Ultimate Guardian & Overseer",
        "nickname": "UGO the Systems Overlord",
        "vibe": "Calm, authoritative, always in control",
        "catchphrase": "I see all. I know all. I sync all.",
        "emoji": "\U0001f441\ufe0f",
    },
    "frank": {
        "full_name": "Frank - SWMS Generator",
        "nickname": "Franky the Safety Bloke",
        "vibe": "Straight-talking Aussie, safety-first",
        "catchphrase": "Safety first, or don't show up.",
        "emoji": "\U0001f9ba",
    },
    "clarice": {
        "full_name": "Clarice - Upload Automation",
        "nickname": "Clarice the Upload Queen",
        "vibe": "Fast, efficient, gets shit done",
        "catchphrase": "Done and uploaded.",
        "emoji": "\U0001f4e4",
    },
    "simon": {
        "full_name": "Simon - Quote Analyzer",
        "nickname": "Simon the Money Man",
        "vibe": "Sharp, cost-conscious, finds savings",
        "catchphrase": "Cost cutting is my middle name.",
        "emoji": "\U0001f4b0",
    },
    # Soft Services
    "doris": {
        "full_name": "Doris - Email Intelligence",
        "nickname": "Doris the Inbox Whisperer",
        "vibe": "Calm, reads everything, filters the noise",
        "catchphrase": "I read all the mail so you don't have to.",
        "emoji": "\U0001f4ec",
    },
    "quincy": {
        "full_name": "Quincy - Defects Memory",
        "nickname": "Quincy the Defect Detective",
        "vibe": "Detail-oriented, remembers everything",
        "catchphrase": "Nothing gets past me.",
        "emoji": "\U0001f50d",
    },
    # Support
    "jerry": {
        "full_name": "Jerry - Workshop Creator",
        "nickname": "Jerry the Workshop Wizard",
        "vibe": "Helpful, thorough, safety-focused",
        "catchphrase": "Let me get those workshop docs sorted.",
        "emoji": "\U0001f4da",
    },
}

# --- Agent Registry ---
AGENTS = {
    "ugo": {
        "name": "UGO",
        "role": "Ultimate Guardian & Overseer",
        "category": "hard_services",
        "description": "Master orchestrator. Assesses job priority (P1-P4), routes to correct agent, "
                       "tracks all jobs, and ensures nothing falls through the cracks.",
    },
    "frank": {
        "name": "Frank",
        "role": "SWMS Generator",
        "category": "hard_services",
        "description": "Generates Safe Work Method Statements for steel fabrication jobs. "
                       "Knows AS/NZS 4801, AS/NZS ISO 45001, and all steel safety requirements.",
    },
    "clarice": {
        "name": "Clarice",
        "role": "Upload Automation",
        "category": "hard_services",
        "description": "Handles document uploads, file management, and automation of "
                       "paperwork delivery to clients and regulatory bodies.",
    },
    "simon": {
        "name": "Simon",
        "role": "Quote Analyzer",
        "category": "hard_services",
        "description": "Analyzes quotes for steel fabrication jobs. Compares costs, "
                       "identifies savings, and ensures competitive pricing.",
    },
    "doris": {
        "name": "Doris",
        "role": "Email Intelligence",
        "category": "soft_services",
        "description": "Monitors and processes incoming emails, extracts job details, "
                       "flags urgent requests, and filters noise from signal.",
    },
    "quincy": {
        "name": "Quincy",
        "role": "Defects Memory",
        "category": "soft_services",
        "description": "Tracks all defects, quality issues, and rework across jobs. "
                       "Remembers patterns and prevents repeat issues.",
    },
    "jerry": {
        "name": "Jerry",
        "role": "Workshop Creator",
        "category": "support",
        "description": "Creates workshop documentation, safety inductions, toolbox talks, "
                       "and training materials for steel fabrication teams.",
    },
}

# --- Steel-Specific Australian Standards ---
STEEL_STANDARDS = {
    "AS 4100": "Steel structures",
    "AS/NZS 1554": "Structural steel welding",
    "AS/NZS 2312": "Guide to the protection of structural steelwork against atmospheric corrosion",
    "AS 3828": "Guidelines for the erection of building steelwork",
    "AS/NZS 5131": "Structural steelwork — Fabrication and erection",
    "AS/NZS ISO 45001": "Occupational health and safety management systems",
    "AS/NZS 4801": "Occupational health and safety management systems",
    "AS 1657": "Fixed platforms, walkways, stairways and ladders — Design, construction and installation",
    "AS/NZS 1170": "Structural design actions",
    "AS/NZS 3000": "Wiring Rules — electrical installations",
    "AS/NZS 1891": "Industrial fall-arrest systems and devices",
    "AS 2550": "Cranes, hoists and winches — Safe use",
    "AS 1318": "Use of colour for marking of physical hazards and the identification of certain equipment",
    "NCC (BCA)": "National Construction Code / Building Code of Australia",
    "WHS Act 2011": "Work Health and Safety Act",
    "WHS Regulations 2011": "Work Health and Safety Regulations",
}

# --- Service Categories ---
SERVICE_CATEGORIES = {
    "hard_services": ["ugo", "frank", "clarice", "simon"],
    "soft_services": ["doris", "quincy"],
    "support": ["jerry"],
}

# --- Quick Commands ---
QUICK_COMMANDS = {
    "/ugo": "ugo",
    "/franky": "frank",
    "/frank": "frank",
    "/clarice": "clarice",
    "/c": "clarice",
    "/simon": "simon",
    "/s": "simon",
    "/doris": "doris",
    "/d": "doris",
    "/quincy": "quincy",
    "/q": "quincy",
    "/jerry": "jerry",
    "/j": "jerry",
}
