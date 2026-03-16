"""Base agent class for all Data Centre Hub agents."""

from __future__ import annotations

import json
import datetime
from pathlib import Path
from typing import Optional

from anthropic import Anthropic

from hub.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, LEARNINGS_DIR


class BaseAgent:
    """Base class for all specialised agents in the Data Centre Hub.

    Every agent can:
    - Answer questions within its domain
    - Learn new information day-by-day and persist it
    - Escalate to Barbie (director) when outside its expertise
    - Reference Australian Standards relevant to its trade
    """

    agent_id: str = "base"
    name: str = "Base Agent"
    role: str = "Generic Agent"
    category: str = "base"
    system_prompt: str = "You are a helpful facilities management assistant."
    relevant_standards: list[str] = []

    def __init__(self):
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)
        self.model = ANTHROPIC_MODEL
        self.conversation_history: list[dict] = []
        self.learnings_file = LEARNINGS_DIR / f"{self.agent_id}_learnings.json"
        self._load_learnings()

    def _load_learnings(self):
        """Load persistent learnings from disk."""
        if self.learnings_file.exists():
            with open(self.learnings_file, "r") as f:
                self.learnings: list[dict] = json.load(f)
        else:
            self.learnings = []

    def _save_learnings(self):
        """Persist learnings to disk."""
        self.learnings_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.learnings_file, "w") as f:
            json.dump(self.learnings, f, indent=2, default=str)

    def learn(self, topic: str, content: str, source: Optional[str] = None):
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
        for i, entry in enumerate(self.learnings, 1):
            date = entry.get("date", "unknown")[:10]
            lines.append(f"{i}. [{date}] {entry['topic']}: {entry['content'][:200]}")
        return "\n".join(lines)

    def _build_system_prompt(self) -> str:
        """Construct the full system prompt with learnings and standards."""
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
        return "\n".join(parts)

    def chat(self, user_message: str) -> str:
        """Send a message to the agent and get a response."""
        self.conversation_history.append({"role": "user", "content": user_message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self._build_system_prompt(),
            messages=self.conversation_history,
        )

        assistant_message = response.content[0].text
        self.conversation_history.append({"role": "assistant", "content": assistant_message})
        return assistant_message

    def reset_conversation(self):
        """Clear conversation history (learnings persist)."""
        self.conversation_history = []

    def __repr__(self):
        return f"<{self.name} ({self.role})>"
