"""Learning system for Steel Hub agents."""

from __future__ import annotations

import json
import datetime
from pathlib import Path
from typing import Optional

from steel.config import LEARNINGS_DIR


class SteelLearningStore:
    """Centralised learning store for all steel agents."""

    def __init__(self):
        LEARNINGS_DIR.mkdir(parents=True, exist_ok=True)

    def get_all_learnings(self) -> dict[str, list[dict]]:
        """Retrieve all learnings across all steel agents."""
        result = {}
        for file in LEARNINGS_DIR.glob("*_learnings.json"):
            agent_id = file.stem.replace("_learnings", "")
            with open(file, "r") as f:
                result[agent_id] = json.load(f)
        return result

    def search_learnings(self, query: str) -> list[dict]:
        """Search all learnings across all agents for a keyword."""
        results = []
        query_lower = query.lower()
        for agent_id, learnings in self.get_all_learnings().items():
            for entry in learnings:
                if (query_lower in entry.get("topic", "").lower()
                        or query_lower in entry.get("content", "").lower()):
                    results.append({**entry, "agent_id": agent_id})
        return results

    def get_stats(self) -> dict:
        """Get learning statistics across all steel agents."""
        all_learnings = self.get_all_learnings()
        return {
            "total_entries": sum(len(v) for v in all_learnings.values()),
            "agents_with_learnings": len(all_learnings),
            "entries_per_agent": {k: len(v) for k, v in all_learnings.items()},
        }

    def export_knowledge_base(self, output_path: Optional[Path] = None) -> str:
        """Export the entire steel knowledge base."""
        all_learnings = self.get_all_learnings()
        lines = [
            "# JM Artsteel Intelligence Hub -- Accumulated Knowledge Base",
            f"# Exported: {datetime.datetime.now().isoformat()}",
            "",
        ]
        for agent_id, learnings in sorted(all_learnings.items()):
            lines.append(f"## Agent: {agent_id}")
            lines.append(f"Total entries: {len(learnings)}")
            lines.append("")
            for entry in learnings:
                date = entry.get("date", "unknown")[:10]
                lines.append(f"### [{date}] {entry.get('topic', 'Untitled')}")
                lines.append(entry.get("content", ""))
                if entry.get("source"):
                    lines.append(f"_Source: {entry['source']}_")
                lines.append("")

        output = "\n".join(lines)
        if output_path:
            with open(output_path, "w") as f:
                f.write(output)
        return output
