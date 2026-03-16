"""Steel agent class registry — single source of truth for agent-to-class mapping."""

from __future__ import annotations

from steel.agents.ugo import UgoAgent
from steel.agents.frank import FrankAgent
from steel.agents.clarice import ClariceAgent
from steel.agents.simon import SimonAgent
from steel.agents.doris import DorisAgent
from steel.agents.quincy import QuincyAgent
from steel.agents.jerry import JerryAgent

STEEL_AGENT_CLASSES: dict[str, type] = {
    "ugo": UgoAgent,
    "frank": FrankAgent,
    "clarice": ClariceAgent,
    "simon": SimonAgent,
    "doris": DorisAgent,
    "quincy": QuincyAgent,
    "jerry": JerryAgent,
}
