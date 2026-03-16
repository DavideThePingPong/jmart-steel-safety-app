"""Data Centre Hub — Main entry point and CLI orchestrator."""

from __future__ import annotations

import sys
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt
from rich.markdown import Markdown
from rich.columns import Columns
from rich.text import Text

from hub.config import AGENTS, ANTHROPIC_API_KEY
from hub.registry import AGENT_CLASSES
from hub.knowledge.learning import LearningStore
from hub.knowledge.escalation import PRIORITY_MATRIX

console = Console()
logger = logging.getLogger(__name__)


class DataCentreHub:
    """The main orchestrator that manages all agents and routes conversations."""

    def __init__(self):
        self.agents: dict = {}
        self.current_agent_id: str = "barbie"
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
            info = AGENTS.get(agent_id, {})
            category = info.get("category", "").replace("_", " ").title()
            console.print(
                f"\n[bold green]Switched to {agent.name}[/] — {agent.role} "
                f"[dim]({category})[/]"
            )
            return True
        return False

    def chat(self, message: str) -> str:
        """Send a message to the current agent."""
        agent = self.get_agent(self.current_agent_id)
        return agent.chat(message)

    def teach(self, agent_id: str, topic: str, content: str, source: str = None) -> str:
        """Teach something to a specific agent."""
        agent = self.get_agent(agent_id)
        if agent is None:
            return f"Unknown agent: {agent_id}"
        return agent.learn(topic, content, source)

    def show_team(self):
        """Display the full agent team, grouped by category."""
        categories = {
            "director": ("Director", "bold magenta"),
            "innovation": ("Innovation", "bold cyan"),
            "hard_services": ("Hard Services", "bold red"),
            "soft_services": ("Soft Services", "bold green"),
            "support": ("Support", "bold yellow"),
        }

        for cat_key, (cat_name, style) in categories.items():
            table = Table(
                title=f"{cat_name}",
                title_style=style,
                show_lines=False,
                padding=(0, 1),
            )
            table.add_column("Agent", style="bold cyan", width=12)
            table.add_column("Role", style="white", width=45)
            table.add_column("Learnings", justify="center", width=10)

            has_agents = False
            for agent_id, info in AGENTS.items():
                if info.get("category") == cat_key:
                    has_agents = True
                    agent = self.get_agent(agent_id)
                    learnings_count = str(len(agent.learnings)) if agent else "0"
                    # Highlight current agent
                    name = info["name"]
                    if agent_id == self.current_agent_id:
                        name = f"[bold reverse] {name} [/]"
                    table.add_row(name, info["role"], learnings_count)

            if has_agents:
                console.print(table)
                console.print()

    def show_priorities(self):
        """Display the escalation priority matrix."""
        table = Table(title="Escalation Priority Matrix", show_lines=True)
        table.add_column("Priority", style="bold", width=12)
        table.add_column("Response", width=20)
        table.add_column("Resolution", width=20)
        table.add_column("Examples", width=50)

        styles = {"P1": "bold red", "P2": "bold yellow", "P3": "white", "P4": "dim"}
        for level, data in PRIORITY_MATRIX.items():
            examples = "\n".join(f"- {e}" for e in data["examples"][:3])
            table.add_row(
                Text(f"{level} {data['name']}", style=styles.get(level, "")),
                data["response_time"],
                data["resolution_target"],
                examples,
            )
        console.print(table)

    def show_help(self):
        """Display help information."""
        help_text = """
## Chat Commands

| Command | Description |
|---------|-------------|
| `/team` | Show all agents grouped by category |
| `/switch <agent>` | Switch to a specific agent (e.g., `/switch volt`) |
| `/<agent>` | Quick switch (e.g., `/barbie`, `/frost`, `/malena`) |
| `/ask <agent> <question>` | Ask a specific agent without switching |
| `/priorities` | Show the escalation priority matrix |

## Knowledge Commands

| Command | Description |
|---------|-------------|
| `/teach <agent> <topic> :: <content>` | Teach an agent something new |
| `/learnings [agent]` | Show learnings for an agent (or current) |
| `/search <query>` | Search all learnings for a keyword |
| `/stats` | Show learning statistics |
| `/export` | Export entire knowledge base |

## Session Commands

| Command | Description |
|---------|-------------|
| `/reset` | Reset current agent's conversation history |
| `/help` | Show this help message |
| `/quit` | Exit the Hub |

## Tips
- Start with **Barbie** for general facilities questions — she delegates to specialists.
- Switch to a specialist for deep trade-specific advice.
- Use `/teach` to record new information that agents remember across sessions.
- Type `/priorities` to see the escalation framework.
"""
        console.print(Markdown(help_text))


def main():
    """Run the Data Centre Hub CLI."""
    logging.basicConfig(
        level=logging.WARNING,
        format="%(levelname)s: %(message)s",
    )

    if not ANTHROPIC_API_KEY:
        console.print(Panel(
            "[bold red]ANTHROPIC_API_KEY not set![/]\n\n"
            "Set it with: [bold]export ANTHROPIC_API_KEY=your_key_here[/]\n"
            "Or create a [bold].env[/] file in the project root.\n\n"
            "Get a key at: https://console.anthropic.com/",
            title="Configuration Required",
        ))
        sys.exit(1)

    hub = DataCentreHub()
    agent_count = len(AGENT_CLASSES)

    console.print(Panel(
        "[bold magenta]Welcome to the Data Centre Hub[/]\n\n"
        "Your AI-powered facilities management team for Australian data centres.\n\n"
        f"[bold]{agent_count} specialist agents[/] ready to assist.\n"
        "[bold]Barbie[/] (Head Facilities Director) is your starting point.\n\n"
        "Type [bold cyan]/help[/] for commands or just start chatting.",
        title="Data Centre Hub",
        subtitle=f"{agent_count} Specialist Agents at Your Service",
    ))

    while True:
        try:
            agent = hub.get_agent(hub.current_agent_id)
            if agent is None:
                hub.current_agent_id = "barbie"
                agent = hub.get_agent("barbie")

            prompt_text = f"[bold magenta]{agent.name}[/] > "
            user_input = Prompt.ask(prompt_text).strip()

            if not user_input:
                continue

            # Command handling
            if user_input.startswith("/"):
                cmd_parts = user_input.split(maxsplit=1)
                cmd = cmd_parts[0].lower()
                args = cmd_parts[1] if len(cmd_parts) > 1 else ""

                if cmd in ("/quit", "/exit", "/q"):
                    console.print("[bold]Goodbye! Stay compliant.[/]")
                    break

                elif cmd == "/help":
                    hub.show_help()

                elif cmd == "/team":
                    hub.show_team()

                elif cmd == "/priorities":
                    hub.show_priorities()

                elif cmd == "/switch":
                    if not args:
                        console.print("[yellow]Usage: /switch <agent_id>[/]")
                        console.print(f"Available: {', '.join(sorted(AGENT_CLASSES.keys()))}")
                    elif not hub.switch_agent(args.lower().strip()):
                        console.print(f"[red]Unknown agent: {args}[/]")
                        console.print(f"Available: {', '.join(sorted(AGENT_CLASSES.keys()))}")

                elif cmd == "/ask":
                    # /ask <agent> <question> — ask a specific agent without switching
                    parts = args.split(maxsplit=1)
                    if len(parts) < 2:
                        console.print("[yellow]Usage: /ask <agent> <question>[/]")
                    else:
                        target_id = parts[0].lower()
                        question = parts[1]
                        target = hub.get_agent(target_id)
                        if target is None:
                            console.print(f"[red]Unknown agent: {target_id}[/]")
                        else:
                            with console.status(f"[bold magenta]{target.name} is thinking...[/]"):
                                response = target.chat(question)
                            console.print(Panel(
                                Markdown(response),
                                title=f"{target.name} ({target.role})",
                                border_style="magenta",
                            ))

                elif cmd == "/teach":
                    try:
                        parts = args.split(maxsplit=1)
                        agent_id = parts[0].lower()
                        topic_content = parts[1].split("::", 1)
                        topic = topic_content[0].strip()
                        content = topic_content[1].strip()
                        result = hub.teach(agent_id, topic, content)
                        console.print(f"[green]{result}[/]")
                    except (IndexError, ValueError):
                        console.print("[yellow]Usage: /teach <agent> <topic> :: <content>[/]")
                        console.print("[dim]Example: /teach frost Chiller COP :: Our Carrier 30XA achieves COP of 5.8 at design conditions[/]")

                elif cmd == "/learnings":
                    agent_id = args.lower().strip() if args else hub.current_agent_id
                    target = hub.get_agent(agent_id)
                    if target:
                        summary = target.get_learnings_summary()
                        console.print(Panel(summary, title=f"{target.name}'s Knowledge Base"))
                    else:
                        console.print(f"[red]Unknown agent: {agent_id}[/]")

                elif cmd == "/search":
                    if not args:
                        console.print("[yellow]Usage: /search <query>[/]")
                    else:
                        results = hub.learning_store.search_learnings(args)
                        if results:
                            table = Table(title=f"Search Results: '{args}'")
                            table.add_column("Agent", style="cyan", width=10)
                            table.add_column("Topic", style="bold", width=25)
                            table.add_column("Content", width=60)
                            for r in results[:20]:
                                table.add_row(
                                    r.get("agent_id", "?"),
                                    r.get("topic", "?"),
                                    r.get("content", "")[:80],
                                )
                            console.print(table)
                        else:
                            console.print(f"[yellow]No learnings found for '{args}'.[/]")

                elif cmd == "/stats":
                    stats = hub.learning_store.get_stats()
                    console.print(Panel(
                        f"[bold]Total learnings:[/] {stats['total_entries']}\n"
                        f"[bold]Agents with data:[/] {stats['agents_with_learnings']}\n"
                        + "\n".join(
                            f"  {k}: {v} entries"
                            for k, v in sorted(stats.get("entries_per_agent", {}).items())
                        ),
                        title="Learning Statistics",
                    ))

                elif cmd == "/export":
                    from hub.config import DATA_DIR
                    output_path = DATA_DIR / "knowledge_export.md"
                    hub.learning_store.export_knowledge_base(output_path)
                    console.print(f"[green]Knowledge base exported to {output_path}[/]")

                elif cmd == "/reset":
                    agent.reset_conversation()
                    console.print(f"[green]{agent.name}'s conversation has been reset.[/]")

                else:
                    # Check if it's an agent name shortcut (e.g. /barbie, /volt)
                    cmd_name = cmd.lstrip("/")
                    if cmd_name in AGENT_CLASSES:
                        hub.switch_agent(cmd_name)
                    else:
                        console.print(f"[red]Unknown command: {cmd}[/] — Type /help for options")

            else:
                # Regular chat message
                with console.status(f"[bold magenta]{agent.name} is thinking...[/]"):
                    response = hub.chat(user_input)
                console.print(Panel(
                    Markdown(response),
                    title=agent.name,
                    border_style="magenta",
                ))

        except KeyboardInterrupt:
            console.print("\n[dim]Use /quit to exit.[/]")
        except EOFError:
            console.print("\n[bold]Goodbye![/]")
            break


if __name__ == "__main__":
    main()
