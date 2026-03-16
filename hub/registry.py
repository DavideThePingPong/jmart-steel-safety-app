"""Agent class registry — single source of truth for agent-to-class mapping.

Separated from main.py to avoid circular imports (API server needs this too).
"""

from __future__ import annotations

from hub.agents.barbie import BarbieAgent
from hub.agents.malena import MalenaAgent
from hub.agents.hard_services.dazza import DazzaAgent
from hub.agents.hard_services.chilli import ChilliAgent
from hub.agents.hard_services.smokey import SmokeyAgent
from hub.agents.hard_services.bigkev import BigKevAgent
from hub.agents.hard_services.technoterry import TechnoTerryAgent
from hub.agents.hard_services.slabsteve import SlabSteveAgent
from hub.agents.hard_services.dunnydoug import DunnyDougAgent
from hub.agents.hard_services.nightowlnev import NightowlNevAgent
from hub.agents.soft_services.dustydi import DustyDiAgent
from hub.agents.soft_services.bugsy import BugsyAgent
from hub.agents.soft_services.mowermick import MowerMickAgent
from hub.agents.soft_services.skipsteve import SkipSteveAgent
from hub.agents.soft_services.sunnysue import SunnySueAgent
from hub.agents.soft_services.hardhathaz import HardHatHazAgent
from hub.agents.soft_services.pennypete import PennyPeteAgent
from hub.agents.soft_services.wattsy import WattsyAgent
from hub.agents.soft_services.tetristrev import TetrisTrevAgent
from hub.agents.soft_services.clipboardkaren import ClipboardKarenAgent
from hub.agents.soft_services.tradietony import TradieTonyAgent

AGENT_CLASSES: dict[str, type] = {
    "barbie": BarbieAgent,
    "malena": MalenaAgent,
    # Hard Services
    "dazza": DazzaAgent,
    "chilli": ChilliAgent,
    "smokey": SmokeyAgent,
    "bigkev": BigKevAgent,
    "technoterry": TechnoTerryAgent,
    "slabsteve": SlabSteveAgent,
    "dunnydoug": DunnyDougAgent,
    "nightowlnev": NightowlNevAgent,
    # Soft Services
    "dustydi": DustyDiAgent,
    "bugsy": BugsyAgent,
    "mowermick": MowerMickAgent,
    "skipsteve": SkipSteveAgent,
    "sunnysue": SunnySueAgent,
    "hardhathaz": HardHatHazAgent,
    # Support
    "pennypete": PennyPeteAgent,
    "wattsy": WattsyAgent,
    "tetristrev": TetrisTrevAgent,
    "clipboardkaren": ClipboardKarenAgent,
    "tradietony": TradieTonyAgent,
}
