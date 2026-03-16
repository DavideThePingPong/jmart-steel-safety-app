"""Agent class registry — single source of truth for agent-to-class mapping.

Separated from main.py to avoid circular imports (API server needs this too).
"""

from __future__ import annotations

from hub.agents.barbie import BarbieAgent
from hub.agents.malena import MalenaAgent
from hub.agents.hard_services.volt import VoltAgent
from hub.agents.hard_services.frost import FrostAgent
from hub.agents.hard_services.blaze import BlazeAgent
from hub.agents.hard_services.sentinel import SentinelAgent
from hub.agents.hard_services.cortex import CortexAgent
from hub.agents.hard_services.atlas import AtlasAgent
from hub.agents.hard_services.hydra import HydraAgent
from hub.agents.hard_services.nexus import NexusAgent
from hub.agents.soft_services.sparkle import SparkleAgent
from hub.agents.soft_services.verde import VerdeAgent
from hub.agents.soft_services.terra import TerraAgent
from hub.agents.soft_services.echo import EchoAgent
from hub.agents.soft_services.grace import GraceAgent
from hub.agents.soft_services.shield import ShieldAgent
from hub.agents.soft_services.ledger import LedgerAgent
from hub.agents.soft_services.pulse import PulseAgent
from hub.agents.soft_services.compass import CompassAgent
from hub.agents.soft_services.audit import AuditAgent
from hub.agents.soft_services.forge import ForgeAgent

AGENT_CLASSES: dict[str, type] = {
    "barbie": BarbieAgent,
    "malena": MalenaAgent,
    # Hard Services
    "volt": VoltAgent,
    "frost": FrostAgent,
    "blaze": BlazeAgent,
    "sentinel": SentinelAgent,
    "cortex": CortexAgent,
    "atlas": AtlasAgent,
    "hydra": HydraAgent,
    "nexus": NexusAgent,
    # Soft Services
    "sparkle": SparkleAgent,
    "verde": VerdeAgent,
    "terra": TerraAgent,
    "echo": EchoAgent,
    "grace": GraceAgent,
    "shield": ShieldAgent,
    # Support
    "ledger": LedgerAgent,
    "pulse": PulseAgent,
    "compass": CompassAgent,
    "audit": AuditAgent,
    "forge": ForgeAgent,
}
