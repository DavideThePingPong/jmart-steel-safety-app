"""Data Centre Hub — Main entry point and orchestrator.

This is the CLI interface your wife will use to interact with Barbie and the team.
"""

from __future__ import annotations

import sys
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt
from rich.markdown import Markdown

from hub.config import AGENTS, ANTHROPIC_API_KEY
from hub.agents.barbie import BarbieAgent
from hub.agents.malena import MalenaAgent
from hub.agents.hard_services.volt import VoltAgent
from hub.agents.hard_services.frost import FrostAgent
from hub.agents.hard_services.blaze import BlazeAgent
from hub.agents.hard_services.sentinel import SentinelAgent
from hub.agents.hard_services.cortex import CortexAgent
from hub.agents.hard_services.atlas import AtlasAgent
from hub.agents.hard_services.hydra import HydraAgent
from hub.agents.soft_services.sparkle import SparkleAgent
from hub.agents.soft_services.verde import VerdeAgent
from hub.agents.soft_services.terra import TerraAgent
from hub.agents.soft_services.echo import EchoAgent
from hub.agents.soft_services.grace import GraceAgent
from hub.agents.soft_services.shield import ShieldAgent
from hub.agents.soft_services.ledger import LedgerAgent
from hub.agents.soft_services.pulse import PulseAgent
from hub.agents.soft_services.compass import CompassAgent
from hub.knowledge.learning import LearningStore

console = Console()

# Agent class registry
AGENT_CLASSES = {
    "barbie": BarbieAgent,
    "malena": MalenaAgent,
    "volt": VoltAgent,
    "frost": FrostAgent,
    "blaze": BlazeAgent,
    "sentinel": SentinelAgent,
    "cortex": CortexAgent,
    "atlas": AtlasAgent,
    "hydra": HydraAgent,
    "sparkle": SparkleAgent,
    "verde": VerdeAgent,
    "terra": TerraAgent,
    "echo": EchoAgent,
    "grace": GraceAgent,
    "shield": ShieldAgent,
    "ledger": LedgerAgent,
    "pulse": PulseAgent,
    "compass": CompassAgent,
}


class DataCentreHub:
    """The main orchestrator that manages all agents and routes conversations."""

    def __init__(self):
        self.agents: dict = {}
        self.current_agent_id: str = "barbie"  # Default to Barbie
        self.learning_store = LearningStore()

    def get_agent(self, agent_id: str):
        """Lazy-load and cache agent instances."""
        if agent_id not in self.agents:
            cls = AGENT_CLASSES.get(agent_id)
            if not cls:
                return None
            self.agents[agent_id] = cls()
        return self.agents[agent_id]

    def switch_agent(self, agent_id: str) -> bool:
        """Switch the active agent."""
        if agent_id in AGENT_CLASSES:
            self.current_agent_id = agent_id
            agent = self.get_agent(agent_id)
            console.print(f"\n[bold green]Switched to {agent.name}[/] — {agent.role}")
            return True
        return False

    def chat(self, message: str) -> str:
        """Send a message to the current agent."""
        agent = self.get_agent(self.current_agent_id)
        return agent.chat(message)

    def teach(self, agent_id: str, topic: str, content: str, source: str = None):
        """Teach something to a specific agent."""
        agent = self.get_agent(agent_id)
        return agent.learn(topic, content, source)

    def show_team(self):
        """Display the full agent team."""
        table = Table(title="Data Centre Hub — Agent Team", show_lines=True)
        table.add_column("Agent", style="bold cyan", width=12)
        table.add_column("Role", style="white", width=40)
        table.add_column("Category", style="yellow", width=15)
        table.add_column("Learnings", justify="center", width=10)

        for agent_id, info in AGENTS.items():
            agent = self.get_agent(agent_id)
            learnings_count = str(len(agent.learnings))
            table.add_row(
                info["name"],
                info["role"],
                info["category"].replace("_", " ").title(),
                learnings_count,
            )
        console.print(table)

    def show_help(self):
        """Display help information."""
        help_text = """
## Commands

| Command | Description |
|---------|-------------|
| `/team` | Show all agents and their roles |
| `/switch <agent>` | Switch to a specific agent (e.g., `/switch volt`) |
| `/barbie` | Switch to Barbie (Head Facilities Director) |
| `/malena` | Switch to Malena (Innovation & Technology) |
| `/teach <agent> <topic> :: <content>` | Teach an agent something new |
| `/learnings [agent]` | Show learnings for an agent (or all) |
| `/search <query>` | Search all learnings for a keyword |
| `/stats` | Show learning statistics |
| `/reset` | Reset current agent's conversation |
| `/help` | Show this help message |
| `/quit` | Exit the Hub |

## Tips
- Start with Barbie for general facilities questions — she'll know who to ask.
- Switch to a specialist when you need deep trade-specific advice.
- Use `/teach` to record new information agents should remember.
- Agents remember what they learn between sessions.
"""
        console.print(Markdown(help_text))


def main():
    """Run the Data Centre Hub CLI."""
    if not ANTHROPIC_API_KEY:
        console.print(Panel(
            "[bold red]ANTHROPIC_API_KEY not set![/]\n\n"
            "Set it with: export ANTHROPIC_API_KEY=your_key_here\n"
            "Or create a .env file in the project root.",
            title="Configuration Required",
        ))
        sys.exit(1)

    hub = DataCentreHub()

    console.print(Panel(
        "[bold magenta]Welcome to the Data Centre Hub[/]\n\n"
        "Your AI-powered facilities management team for Australian data centres.\n\n"
        "[bold]Barbie[/] (Head Facilities Director) is ready.\n"
        "Type [bold cyan]/help[/] for commands or just start chatting!",
        title="Data Centre Hub",
        subtitle="19 Specialist Agents at Your Service",
    ))

    while True:
        try:
            agent = hub.get_agent(hub.current_agent_id)
            prompt_text = f"[bold magenta]{agent.name}[/] > "
            user_input = Prompt.ask(prompt_text).strip()

            if not user_input:
                continue

            # Command handling
            if user_input.startswith("/"):
                cmd_parts = user_input.split(maxsplit=1)
                cmd = cmd_parts[0].lower()
                args = cmd_parts[1] if len(cmd_parts) > 1 else ""

                if cmd == "/quit" or cmd == "/exit":
                    console.print("[bold]Goodbye! Stay compliant. 👷[/]")
                    break

                elif cmd == "/help":
                    hub.show_help()

                elif cmd == "/team":
                    hub.show_team()

                elif cmd == "/switch":
                    if not args:
                        console.print("[yellow]Usage: /switch <agent_id>[/]")
                    elif not hub.switch_agent(args.lower()):
                        console.print(f"[red]Unknown agent: {args}[/]")
                        console.print(f"Available: {', '.join(AGENT_CLASSES.keys())}")

                elif cmd == "/barbie":
                    hub.switch_agent("barbie")

                elif cmd == "/malena":
                    hub.switch_agent("malena")

                elif cmd == "/teach":
                    # Format: /teach agent_id topic :: content
                    try:
                        parts = args.split(maxsplit=1)
                        agent_id = parts[0]
                        topic_content = parts[1].split("::", 1)
                        topic = topic_content[0].strip()
                        content = topic_content[1].strip()
                        result = hub.teach(agent_id, topic, content)
                        console.print(f"[green]{result}[/]")
                    except (IndexError, ValueError):
                        console.print("[yellow]Usage: /teach <agent> <topic> :: <content>[/]")

                elif cmd == "/learnings":
                    agent_id = args.lower() if args else hub.current_agent_id
                    target = hub.get_agent(agent_id)
                    if target:
                        console.print(Panel(target.get_learnings_summary(), title=f"{target.name}'s Knowledge"))
                    else:
                        console.print(f"[red]Unknown agent: {agent_id}[/]")

                elif cmd == "/search":
                    if not args:
                        console.print("[yellow]Usage: /search <query>[/]")
                    else:
                        results = hub.learning_store.search_learnings(args)
                        if results:
                            for r in results:
                                console.print(f"  [{r['agent_id']}] {r['topic']}: {r['content'][:100]}")
                        else:
                            console.print("[yellow]No learnings found matching that query.[/]")

                elif cmd == "/stats":
                    stats = hub.learning_store.get_stats()
                    console.print(Panel(
                        f"Total learnings: {stats['total_entries']}\n"
                        f"Agents with data: {stats['agents_with_learnings']}",
                        title="Learning Statistics",
                    ))

                elif cmd == "/reset":
                    agent.reset_conversation()
                    console.print(f"[green]{agent.name}'s conversation has been reset.[/]")

                else:
                    # Check if it's an agent name shortcut
                    cmd_name = cmd.lstrip("/")
                    if cmd_name in AGENT_CLASSES:
                        hub.switch_agent(cmd_name)
                    else:
                        console.print(f"[red]Unknown command: {cmd}[/] — Type /help for options")

            else:
                # Regular chat message
                with console.status(f"[bold magenta]{agent.name} is thinking...[/]"):
                    response = hub.chat(user_input)
                console.print(Panel(Markdown(response), title=f"{agent.name}", border_style="magenta"))

        except KeyboardInterrupt:
            console.print("\n[bold]Use /quit to exit.[/]")
        except Exception as e:
            console.print(f"[red]Error: {e}[/]")


if __name__ == "__main__":
    main()
