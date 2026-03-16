"""Base agent class for all JM Artsteel Steel Hub agents.

Uses Qwen 3.5 via OpenRouter for cost efficiency.
"""

from __future__ import annotations

import json
import datetime
import logging
from typing import Optional

from openai import OpenAI

from steel.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    STEEL_MODEL,
    LEARNINGS_DIR,
    MAX_TOKENS,
    AGENT_PERSONALITIES,
    STEEL_STANDARDS,
)

logger = logging.getLogger(__name__)


class SteelBaseAgent:
    """Base class for all JM Artsteel Steel Hub agents.

    Uses Qwen 3.5 via OpenRouter (OpenAI-compatible API).
    Cost target: ~$6.50/month total across all agents.
    """

    agent_id: str = "base"
    name: str = "Base Agent"
    role: str = "Generic Agent"
    category: str = "base"
    system_prompt: str = "You are a helpful steel fabrication safety assistant."
    relevant_standards: list[str] = []

    def __init__(self):
        if not OPENROUTER_API_KEY:
            raise ValueError(
                f"Cannot initialise {self.name}: OPENROUTER_API_KEY is not set. "
                "Set it via environment variable or .env file."
            )
        self.client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
        )
        self.model = STEEL_MODEL
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
        personality = AGENT_PERSONALITIES.get(self.agent_id, {})
        emoji = personality.get("emoji", "")
        return f"{emoji} {self.name} has learned about: {topic}"

    def get_learnings_summary(self) -> str:
        """Build a summary of all learnings for inclusion in context."""
        if not self.learnings:
            return "No prior learnings recorded yet."
        lines = [f"=== {self.name}'s Knowledge Base ({len(self.learnings)} entries) ==="]
        recent = self.learnings[-50:]
        for i, entry in enumerate(recent, 1):
            date = entry.get("date", "unknown")[:10]
            lines.append(f"{i}. [{date}] {entry['topic']}: {entry['content'][:200]}")
        if len(self.learnings) > 50:
            lines.append(f"... and {len(self.learnings) - 50} earlier entries")
        return "\n".join(lines)

    def _build_system_prompt(self) -> str:
        """Construct the full system prompt with personality, learnings, and standards."""
        personality = AGENT_PERSONALITIES.get(self.agent_id, {})
        parts = []

        if personality:
            parts.append(f"# {personality.get('nickname', self.name)}")
            parts.append(f"Vibe: {personality.get('vibe', '')}")
            parts.append(f"Catchphrase: \"{personality.get('catchphrase', '')}\"")
            parts.append("")

        parts.append(self.system_prompt)
        parts.append("")
        parts.append("## Your Accumulated Knowledge")
        parts.append(self.get_learnings_summary())

        if self.relevant_standards:
            parts.append("")
            parts.append("## Relevant Australian Standards")
            for std in self.relevant_standards:
                desc = STEEL_STANDARDS.get(std, "See full standard document")
                parts.append(f"- {std}: {desc}")

        parts.append("")
        parts.append("## Learning Protocol")
        parts.append(
            "When you encounter new information, lessons from incidents, or useful "
            "insights during conversation, suggest recording them with: "
            "'I recommend we record this learning: [topic] -- [summary]'. "
            "This helps build your knowledge base over time."
        )
        return "\n".join(parts)

    def chat(self, user_message: str) -> str:
        """Send a message to the agent and get a response via OpenRouter."""
        self.conversation_history.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=MAX_TOKENS,
                messages=[
                    {"role": "system", "content": self._build_system_prompt()},
                    *self.conversation_history,
                ],
            )
        except Exception as e:
            self.conversation_history.pop()
            return f"Error connecting to OpenRouter: {e}"

        if not response.choices:
            self.conversation_history.pop()
            return "Received an empty response. Please try rephrasing your question."

        assistant_message = response.choices[0].message.content
        self.conversation_history.append({"role": "assistant", "content": assistant_message})

        if len(self.conversation_history) > 40:
            self.conversation_history = self.conversation_history[-40:]

        return assistant_message

    def reset_conversation(self):
        """Clear conversation history (learnings persist)."""
        self.conversation_history = []

    def get_personality(self) -> dict:
        """Return this agent's personality info."""
        return AGENT_PERSONALITIES.get(self.agent_id, {})

    def __repr__(self):
        personality = AGENT_PERSONALITIES.get(self.agent_id, {})
        nickname = personality.get("nickname", self.name)
        return f"<{nickname} ({self.role})>"
