"""FastAPI server for the Data Centre Hub.

Provides a REST API so the hub can also be accessed via web or mobile.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from hub.config import AGENTS
from hub.registry import AGENT_CLASSES
from hub.knowledge.learning import LearningStore
from hub.knowledge.escalation import PRIORITY_MATRIX, ESCALATION_THRESHOLDS

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Data Centre Hub API",
    description="AI-powered facilities management for Australian data centres",
    version="2.0.0",
)

# Lazy-loaded agent instances (per API process)
_agents: dict = {}
_learning_store = LearningStore()


def _get_agent(agent_id: str):
    """Get or create an agent instance by ID."""
    if agent_id not in AGENT_CLASSES:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    if agent_id not in _agents:
        try:
            _agents[agent_id] = AGENT_CLASSES[agent_id]()
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
    return _agents[agent_id]


# --- Request/Response Models ---

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    agent_id: str
    agent_name: str
    agent_role: str
    response: str


class TeachRequest(BaseModel):
    topic: str
    content: str
    source: str | None = None


class TeachResponse(BaseModel):
    agent_id: str
    result: str


# --- Routes ---

@app.get("/")
def root():
    return {
        "name": "Data Centre Hub",
        "version": "2.0.0",
        "agents": len(AGENTS),
        "status": "operational",
    }


@app.get("/agents")
def list_agents():
    """List all available agents with their metadata."""
    return {"agents": AGENTS}


@app.get("/agents/{agent_id}")
def get_agent_info(agent_id: str):
    """Get detailed info about a specific agent including learnings count."""
    if agent_id not in AGENTS:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    agent = _get_agent(agent_id)
    return {
        **AGENTS[agent_id],
        "learnings_count": len(agent.learnings),
        "kpis": agent.kpis,
        "relevant_standards": agent.relevant_standards,
    }


@app.post("/agents/{agent_id}/chat", response_model=ChatResponse)
def chat_with_agent(agent_id: str, request: ChatRequest):
    """Send a message to an agent and get a response."""
    agent = _get_agent(agent_id)
    response = agent.chat(request.message)
    return ChatResponse(
        agent_id=agent_id,
        agent_name=agent.name,
        agent_role=agent.role,
        response=response,
    )


@app.post("/agents/{agent_id}/teach", response_model=TeachResponse)
def teach_agent(agent_id: str, request: TeachRequest):
    """Teach an agent new information that persists across sessions."""
    agent = _get_agent(agent_id)
    result = agent.learn(request.topic, request.content, request.source)
    return TeachResponse(agent_id=agent_id, result=result)


@app.get("/agents/{agent_id}/learnings")
def get_agent_learnings(agent_id: str):
    """Get all learnings for a specific agent."""
    agent = _get_agent(agent_id)
    return {
        "agent_id": agent_id,
        "agent_name": agent.name,
        "count": len(agent.learnings),
        "learnings": agent.learnings,
    }


@app.post("/agents/{agent_id}/reset")
def reset_agent_conversation(agent_id: str):
    """Reset an agent's conversation history (learnings are preserved)."""
    agent = _get_agent(agent_id)
    agent.reset_conversation()
    return {"agent_id": agent_id, "status": "conversation reset"}


# --- Knowledge endpoints ---

@app.get("/learnings/search")
def search_learnings(query: str):
    """Search all agents' learnings for a keyword."""
    results = _learning_store.search_learnings(query)
    return {"query": query, "count": len(results), "results": results}


@app.get("/learnings/recent")
def recent_learnings(days: int = 7):
    """Get recent learnings across all agents."""
    results = _learning_store.get_recent_learnings(days)
    return {"days": days, "count": len(results), "results": results}


@app.get("/learnings/stats")
def learning_stats():
    """Get aggregate learning statistics."""
    return _learning_store.get_stats()


# --- Escalation endpoints ---

@app.get("/escalation/priorities")
def get_priorities():
    """Get the escalation priority matrix."""
    return {"priorities": PRIORITY_MATRIX}


@app.get("/escalation/thresholds")
def get_thresholds():
    """Get escalation thresholds by system type."""
    return {"thresholds": ESCALATION_THRESHOLDS}
