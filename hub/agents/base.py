"""Base agent class for all Data Centre Hub agents."""

from __future__ import annotations

import json
import datetime
import logging
from typing import Optional

from anthropic import Anthropic, APIError, APIConnectionError

from hub.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, LEARNINGS_DIR

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base class for all specialised agents in the Data Centre Hub.

    Every agent can:
    - Answer questions within its domain
    - Learn new information day-by-day and persist it
    - Escalate to Barbie (director) when outside its expertise
    - Reference Australian Standards relevant to its trade
    - Track KPIs relevant to its discipline
    """

    agent_id: str = "base"
    name: str = "Base Agent"
    role: str = "Generic Agent"
    category: str = "base"
    system_prompt: str = "You are a helpful facilities management assistant."
    relevant_standards: list[str] = []
    kpis: list[str] = []

    def __init__(self):
        if not ANTHROPIC_API_KEY:
            raise ValueError(
                f"Cannot initialise {self.name}: ANTHROPIC_API_KEY is not set. "
                "Set it via environment variable or .env file."
            )
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)
        self.model = ANTHROPIC_MODEL
        self.conversation_history: list[dict] = []
        self.learnings_file = LEARNINGS_DIR / f"{self.agent_id}_learnings.json"
        self._load_learnings()

    def _load_learnings(self):
        """Load persistent learnings from disk."""
        try:
            if self.learnings_file.exists():
                with open(self.learnings_file, "r") as f:
                    self.learnings: list[dict] = json.load(f)
            else:
                self.learnings = []
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Failed to load learnings for {self.name}: {e}")
            self.learnings = []

    def _save_learnings(self):
        """Persist learnings to disk."""
        try:
            self.learnings_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.learnings_file, "w") as f:
                json.dump(self.learnings, f, indent=2, default=str)
        except OSError as e:
            logger.error(f"Failed to save learnings for {self.name}: {e}")

    def learn(self, topic: str, content: str, source: Optional[str] = None) -> str:
        """Record a new learning that persists across sessions."""
        learning = {
            "date": datetime.datetime.now().isoformat(),
            "topic": topic,
            "content": content,
            "source": source,
        }
        self.learnings.append(learning)
        self._save_learnings()
        return f"{self.name} has learned about: {topic}"

    def get_learnings_summary(self) -> str:
        """Build a summary of all learnings for inclusion in context."""
        if not self.learnings:
            return "No prior learnings recorded yet."
        lines = [f"=== {self.name}'s Knowledge Base ({len(self.learnings)} entries) ==="]
        # Include last 50 learnings to avoid exceeding context limits
        recent = self.learnings[-50:]
        for i, entry in enumerate(recent, 1):
            date = entry.get("date", "unknown")[:10]
            lines.append(f"{i}. [{date}] {entry['topic']}: {entry['content'][:200]}")
        if len(self.learnings) > 50:
            lines.append(f"... and {len(self.learnings) - 50} earlier entries")
        return "\n".join(lines)

    def _build_system_prompt(self) -> str:
        """Construct the full system prompt with learnings, standards, and KPIs."""
        parts = [
            self.system_prompt,
            "",
            "## Your Accumulated Knowledge",
            self.get_learnings_summary(),
        ]
        if self.relevant_standards:
            from hub.config import AUSTRALIAN_STANDARDS
            parts.append("")
            parts.append("## Relevant Australian Standards")
            for std in self.relevant_standards:
                desc = AUSTRALIAN_STANDARDS.get(std, "See full standard document")
                parts.append(f"- {std}: {desc}")
        if self.kpis:
            parts.append("")
            parts.append("## Your KPIs (Key Performance Indicators)")
            for kpi in self.kpis:
                parts.append(f"- {kpi}")
        parts.append("")
        parts.append("## Learning Protocol")
        parts.append(
            "When you encounter new information, lessons from incidents, or useful "
            "insights during conversation, suggest recording them with: "
            "'I recommend we record this learning: [topic] — [summary]'. "
            "This helps build your knowledge base over time."
        )
        return "\n".join(parts)

    def chat(self, user_message: str) -> str:
        """Send a message to the agent and get a response."""
        self.conversation_history.append({"role": "user", "content": user_message})

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=self._build_system_prompt(),
                messages=self.conversation_history,
            )
        except APIConnectionError:
            self.conversation_history.pop()
            return (
                "I'm unable to connect to the AI service right now. "
                "Please check your internet connection and ANTHROPIC_API_KEY."
            )
        except APIError as e:
            self.conversation_history.pop()
            return f"API error occurred: {e.message}"

        assistant_message = response.content[0].text
        self.conversation_history.append({"role": "assistant", "content": assistant_message})

        # Trim conversation history to prevent context overflow (keep last 40 messages)
        if len(self.conversation_history) > 40:
            self.conversation_history = self.conversation_history[-40:]

        return assistant_message

    def reset_conversation(self):
        """Clear conversation history (learnings persist)."""
        self.conversation_history = []

    def __repr__(self):
        return f"<{self.name} ({self.role})>"
