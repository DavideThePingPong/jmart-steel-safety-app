"""JM Artsteel Intelligence Hub -- Main entry point and CLI orchestrator.

Steel fabrication safety & operations management.
Powered by Qwen 3.5 via OpenRouter (~$6.50/month).

Partnership: Gio & Davide
Vibe: Best/hardest solution, always.
"""

from __future__ import annotations

import sys
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt
from rich.markdown import Markdown
from rich.text import Text

from steel.config import (
    AGENTS,
    AGENT_PERSONALITIES,
    SERVICE_CATEGORIES,
    QUICK_COMMANDS,
    OPENROUTER_API_KEY,
    STEEL_MODEL,
)
from steel.registry import STEEL_AGENT_CLASSES
from steel.knowledge.learning import SteelLearningStore
from steel.knowledge.escalation import PRIORITY_MATRIX

console = Console()
logger = logging.getLogger(__name__)


class SteelHub:
    """The main orchestrator for JM Artsteel Intelligence Hub."""

    def __init__(self):
        self.agents: dict = {}
        self.current_agent_id: str = "ugo"
        self.learning_store = SteelLearningStore()

    def get_agent(self, agent_id: str):
        """Lazy-load and cache agent instances."""
        if agent_id not in self.agents:
            cls = STEEL_AGENT_CLASSES.get(agent_id)
            if not cls:
                return None
            self.agents[agent_id] = cls()
        return self.agents[agent_id]

    def switch_agent(self, agent_id: str) -> bool:
        """Switch the active agent."""
        if agent_id in STEEL_AGENT_CLASSES:
            self.current_agent_id = agent_id
            agent = self.get_agent(agent_id)
            personality = AGENT_PERSONALITIES.get(agent_id, {})
            emoji = personality.get("emoji", "")
            nickname = personality.get("nickname", agent.name)
            console.print(
                f"\n[bold green]{emoji} Switched to {nickname}[/] -- {agent.role}"
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
        """Display the full steel agent team, grouped by category."""
        categories = {
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
            table.add_column("Agent", style="bold cyan", width=14)
            table.add_column("Nickname", style="white", width=28)
            table.add_column("Role", style="white", width=25)
            table.add_column("Learnings", justify="center", width=10)

            has_agents = False
            for agent_id in SERVICE_CATEGORIES.get(cat_key, []):
                info = AGENTS.get(agent_id, {})
                personality = AGENT_PERSONALITIES.get(agent_id, {})
                has_agents = True
                agent = self.get_agent(agent_id)
                learnings_count = str(len(agent.learnings)) if agent else "0"
                emoji = personality.get("emoji", "")
                nickname = personality.get("nickname", info.get("name", agent_id))

                name = f"{emoji} {info.get('name', agent_id)}"
                if agent_id == self.current_agent_id:
                    name = f"[bold reverse] {name} [/]"
                table.add_row(name, nickname, info.get("role", ""), learnings_count)

            if has_agents:
                console.print(table)
                console.print()

    def show_priorities(self):
        """Display the P1-P4 escalation priority matrix."""
        table = Table(title="P1-P4 Escalation Priority Matrix", show_lines=True)
        table.add_column("Priority", style="bold", width=14)
        table.add_column("Response", width=22)
        table.add_column("Resolution", width=22)
        table.add_column("Examples", width=50)

        styles = {"P1": "bold red", "P2": "bold yellow", "P3": "white", "P4": "dim"}
        emojis = {"P1": "\U0001f6a8", "P2": "\U0001f525", "P3": "\U0001f4cb", "P4": "\U0001f4b0"}
        for level, data in PRIORITY_MATRIX.items():
            examples = "\n".join(f"- {e}" for e in data["examples"][:3])
            table.add_row(
                Text(f"{emojis.get(level, '')} {level} {data['name']}", style=styles.get(level, "")),
                data["response_time"],
                data["resolution_target"],
                examples,
            )
        console.print(table)

    def show_who(self, agent_id: str):
        """Show detailed info about a specific agent."""
        personality = AGENT_PERSONALITIES.get(agent_id)
        info = AGENTS.get(agent_id)
        if not personality or not info:
            console.print(f"[red]Unknown agent: {agent_id}[/]")
            console.print(f"Available: {', '.join(sorted(STEEL_AGENT_CLASSES.keys()))}")
            return

        panel_content = (
            f"[bold]{personality['emoji']} {personality['full_name']}[/]\n\n"
            f"[bold cyan]Nickname:[/] {personality['nickname']}\n"
            f"[bold cyan]Role:[/] {info['role']}\n"
            f"[bold cyan]Category:[/] {info['category'].replace('_', ' ').title()}\n"
            f"[bold cyan]Vibe:[/] {personality['vibe']}\n"
            f'[bold cyan]Catchphrase:[/] "{personality["catchphrase"]}"\n\n'
            f"[dim]{info['description']}[/]"
        )

        agent = self.get_agent(agent_id)
        if agent:
            panel_content += f"\n\n[bold]Learnings:[/] {len(agent.learnings)} entries"

        console.print(Panel(
            panel_content,
            title=f"{personality['emoji']} {personality['nickname']}",
            border_style="cyan",
        ))

    def escalate(self, job_description: str, deadline: str = None):
        """Run UGO's priority assessment on a job."""
        ugo = self.get_agent("ugo")
        priority = ugo.assess_priority(job_description, deadline)
        routing = ugo.route_by_priority(job_description, priority)

        priority_styles = {1: "bold red", 2: "bold yellow", 3: "white", 4: "dim"}

        console.print(Panel(
            f"[bold]Job:[/] {job_description}\n"
            f"[bold]Deadline:[/] {deadline or 'Not specified'}\n\n"
            f"[{priority_styles.get(priority, 'white')}]"
            f"{routing['emoji']} Priority: {routing['priority_name']}[/]\n\n"
            f"[bold]Action:[/] {routing['action']}\n"
            f"[bold]Route to:[/] {AGENT_PERSONALITIES.get(routing['route_to'], {}).get('nickname', routing['route_to'])}",
            title=f"{routing['emoji']} Escalation Assessment",
            border_style="red" if priority <= 2 else "yellow",
        ))

        return routing

    def show_help(self):
        """Display help information."""
        help_text = """
## Chat Commands

| Command | Description |
|---------|-------------|
| `/team` | Show all agents grouped by category |
| `/switch <agent>` | Switch to a specific agent |
| `/<agent>` | Quick switch (e.g., `/ugo`, `/franky`, `/simon`) |
| `/ask <agent> <question>` | Ask a specific agent without switching |
| `/who <agent>` | Show agent details (nickname, vibe, catchphrase) |

## Job Commands

| Command | Description |
|---------|-------------|
| `/escalate <job description>` | Assess job priority (P1-P4) |
| `/priorities` | Show the P1-P4 escalation matrix |

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

## Quick Shortcuts

| Shortcut | Agent |
|----------|-------|
| `/ugo` | UGO the Systems Overlord |
| `/franky` or `/frank` | Franky the Safety Bloke |
| `/clarice` or `/c` | Clarice the Upload Queen |
| `/simon` or `/s` | Simon the Money Man |
| `/doris` or `/d` | Doris the Inbox Whisperer |
| `/quincy` or `/q` | Quincy the Defect Detective |
| `/jerry` or `/j` | Jerry the Workshop Wizard |

## Tips
- Start with **UGO** — he routes everything to the right agent.
- Use `/escalate` to check job priority before generating SWMS.
- Use `/teach` to record learnings that agents remember forever.
- P1 jobs go straight to Frank. P4 jobs go to Simon first.
"""
        console.print(Markdown(help_text))


def main():
    """Run the JM Artsteel Intelligence Hub CLI."""
    logging.basicConfig(
        level=logging.WARNING,
        format="%(levelname)s: %(message)s",
    )

    if not OPENROUTER_API_KEY:
        console.print(Panel(
            "[bold red]OPENROUTER_API_KEY not set![/]\n\n"
            "Set it with: [bold]export OPENROUTER_API_KEY=your_key_here[/]\n"
            "Or create a [bold].env[/] file in the project root.\n\n"
            "Get a key at: https://openrouter.ai/",
            title="Configuration Required",
        ))
        sys.exit(1)

    hub = SteelHub()
    agent_count = len(STEEL_AGENT_CLASSES)

    console.print(Panel(
        "[bold red]JM Artsteel Intelligence Hub[/]\n\n"
        "Your AI-powered steel fabrication safety & operations team.\n\n"
        f"[bold]{agent_count} specialist agents[/] ready to assist.\n"
        f"[bold]Model:[/] {STEEL_MODEL} (via OpenRouter)\n"
        "[bold]UGO[/] (Systems Overlord) is your starting point.\n\n"
        "Type [bold cyan]/help[/] for commands or just start chatting.\n\n"
        "[dim]Partnership: Gio & Davide | Vibe: Best/hardest solution, always.[/]",
        title="JM Artsteel Intelligence Hub",
        subtitle=f"{agent_count} Steel Agents at Your Service",
    ))

    while True:
        try:
            agent = hub.get_agent(hub.current_agent_id)
            if agent is None:
                hub.current_agent_id = "ugo"
                agent = hub.get_agent("ugo")

            personality = AGENT_PERSONALITIES.get(hub.current_agent_id, {})
            emoji = personality.get("emoji", "")
            prompt_text = f"[bold red]{emoji} {agent.name}[/] > "
            user_input = Prompt.ask(prompt_text).strip()

            if not user_input:
                continue

            # Command handling
            if user_input.startswith("/"):
                cmd_parts = user_input.split(maxsplit=1)
                cmd = cmd_parts[0].lower()
                args = cmd_parts[1] if len(cmd_parts) > 1 else ""

                if cmd in ("/quit", "/exit"):
                    console.print("[bold]Goodbye! Stay safe on site.[/]")
                    break

                elif cmd == "/help":
                    hub.show_help()

                elif cmd == "/team":
                    hub.show_team()

                elif cmd == "/priorities":
                    hub.show_priorities()

                elif cmd == "/who":
                    if not args:
                        console.print("[yellow]Usage: /who <agent>[/]")
                        console.print(f"Available: {', '.join(sorted(STEEL_AGENT_CLASSES.keys()))}")
                    else:
                        hub.show_who(args.lower().strip())

                elif cmd == "/escalate":
                    if not args:
                        console.print("[yellow]Usage: /escalate <job description>[/]")
                        console.print("[dim]Example: /escalate Steel beam installation at Collins St site due tomorrow[/]")
                    else:
                        # Check if deadline is embedded in the description
                        deadline = None
                        for kw in ["due today", "due tomorrow", "this week", "next week", "urgent", "asap"]:
                            if kw in args.lower():
                                deadline = kw.replace("due ", "")
                                break
                        hub.escalate(args, deadline)

                elif cmd == "/switch":
                    if not args:
                        console.print("[yellow]Usage: /switch <agent_id>[/]")
                        console.print(f"Available: {', '.join(sorted(STEEL_AGENT_CLASSES.keys()))}")
                    elif not hub.switch_agent(args.lower().strip()):
                        console.print(f"[red]Unknown agent: {args}[/]")
                        console.print(f"Available: {', '.join(sorted(STEEL_AGENT_CLASSES.keys()))}")

                elif cmd == "/ask":
                    parts = args.split(maxsplit=1)
                    if len(parts) < 2:
                        console.print("[yellow]Usage: /ask <agent> <question>[/]")
                    else:
                        target_id = parts[0].lower()
                        # Resolve shortcuts
                        target_id = QUICK_COMMANDS.get(f"/{target_id}", target_id)
                        question = parts[1]
                        target = hub.get_agent(target_id)
                        if target is None:
                            console.print(f"[red]Unknown agent: {target_id}[/]")
                        else:
                            p = AGENT_PERSONALITIES.get(target_id, {})
                            with console.status(f"[bold red]{p.get('emoji', '')} {target.name} is thinking...[/]"):
                                response = target.chat(question)
                            console.print(Panel(
                                Markdown(response),
                                title=f"{p.get('emoji', '')} {p.get('nickname', target.name)}",
                                border_style="red",
                            ))

                elif cmd == "/teach":
                    try:
                        parts = args.split(maxsplit=1)
                        agent_id = parts[0].lower()
                        agent_id = QUICK_COMMANDS.get(f"/{agent_id}", agent_id)
                        topic_content = parts[1].split("::", 1)
                        topic = topic_content[0].strip()
                        content = topic_content[1].strip()
                        result = hub.teach(agent_id, topic, content)
                        console.print(f"[green]{result}[/]")
                    except (IndexError, ValueError):
                        console.print("[yellow]Usage: /teach <agent> <topic> :: <content>[/]")
                        console.print("[dim]Example: /teach frank Welding hazards :: Always check gas bottle expiry before MIG welding[/]")

                elif cmd == "/learnings":
                    agent_id = args.lower().strip() if args else hub.current_agent_id
                    agent_id = QUICK_COMMANDS.get(f"/{agent_id}", agent_id)
                    target = hub.get_agent(agent_id)
                    if target:
                        p = AGENT_PERSONALITIES.get(agent_id, {})
                        summary = target.get_learnings_summary()
                        console.print(Panel(summary, title=f"{p.get('emoji', '')} {target.name}'s Knowledge Base"))
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
                        title="Steel Hub Learning Statistics",
                    ))

                elif cmd == "/export":
                    from steel.config import DATA_DIR
                    output_path = DATA_DIR / "steel_knowledge_export.md"
                    hub.learning_store.export_knowledge_base(output_path)
                    console.print(f"[green]Knowledge base exported to {output_path}[/]")

                elif cmd == "/reset":
                    agent.reset_conversation()
                    p = AGENT_PERSONALITIES.get(hub.current_agent_id, {})
                    console.print(f"[green]{p.get('emoji', '')} {agent.name}'s conversation has been reset.[/]")

                else:
                    # Check quick commands first, then agent name shortcuts
                    if cmd in QUICK_COMMANDS:
                        hub.switch_agent(QUICK_COMMANDS[cmd])
                    else:
                        cmd_name = cmd.lstrip("/")
                        if cmd_name in STEEL_AGENT_CLASSES:
                            hub.switch_agent(cmd_name)
                        else:
                            console.print(f"[red]Unknown command: {cmd}[/] -- Type /help for options")

            else:
                # Regular chat message
                p = AGENT_PERSONALITIES.get(hub.current_agent_id, {})
                with console.status(f"[bold red]{p.get('emoji', '')} {agent.name} is thinking...[/]"):
                    response = hub.chat(user_input)
                console.print(Panel(
                    Markdown(response),
                    title=f"{p.get('emoji', '')} {p.get('nickname', agent.name)}",
                    border_style="red",
                ))

        except KeyboardInterrupt:
            console.print("\n[dim]Use /quit to exit.[/]")
        except EOFError:
            console.print("\n[bold]Goodbye! Stay safe on site.[/]")
            break


if __name__ == "__main__":
    main()
