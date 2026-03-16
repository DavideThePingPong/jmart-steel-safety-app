"""FastAPI server for the Data Centre Hub.

Provides a REST API so the hub can also be accessed via web or mobile.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from hub.config import AGENTS
from hub.main import AGENT_CLASSES
from hub.knowledge.learning import LearningStore

app = FastAPI(
    title="Data Centre Hub API",
    description="AI-powered facilities management for Australian data centres",
    version="1.0.0",
)

# In-memory agent instances (per API process)
_agents: dict = {}
_learning_store = LearningStore()


def _get_agent(agent_id: str):
    if agent_id not in AGENT_CLASSES:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    if agent_id not in _agents:
        _agents[agent_id] = AGENT_CLASSES[agent_id]()
    return _agents[agent_id]


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    agent_id: str
    agent_name: str
    response: str


class TeachRequest(BaseModel):
    topic: str
    content: str
    source: str | None = None


class TeachResponse(BaseModel):
    agent_id: str
    result: str


@app.get("/")
def root():
    return {"name": "Data Centre Hub", "agents": len(AGENTS), "status": "operational"}


@app.get("/agents")
def list_agents():
    return {"agents": AGENTS}


@app.get("/agents/{agent_id}")
def get_agent_info(agent_id: str):
    if agent_id not in AGENTS:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    agent = _get_agent(agent_id)
    return {
        **AGENTS[agent_id],
        "learnings_count": len(agent.learnings),
    }


@app.post("/agents/{agent_id}/chat", response_model=ChatResponse)
def chat_with_agent(agent_id: str, request: ChatRequest):
    agent = _get_agent(agent_id)
    response = agent.chat(request.message)
    return ChatResponse(
        agent_id=agent_id,
        agent_name=agent.name,
        response=response,
    )


@app.post("/agents/{agent_id}/teach", response_model=TeachResponse)
def teach_agent(agent_id: str, request: TeachRequest):
    agent = _get_agent(agent_id)
    result = agent.learn(request.topic, request.content, request.source)
    return TeachResponse(agent_id=agent_id, result=result)


@app.get("/agents/{agent_id}/learnings")
def get_agent_learnings(agent_id: str):
    agent = _get_agent(agent_id)
    return {"agent_id": agent_id, "learnings": agent.learnings}


@app.post("/agents/{agent_id}/reset")
def reset_agent_conversation(agent_id: str):
    agent = _get_agent(agent_id)
    agent.reset_conversation()
    return {"agent_id": agent_id, "status": "conversation reset"}


@app.get("/learnings/search")
def search_learnings(query: str):
    results = _learning_store.search_learnings(query)
    return {"query": query, "results": results}


@app.get("/learnings/recent")
def recent_learnings(days: int = 7):
    results = _learning_store.get_recent_learnings(days)
    return {"days": days, "results": results}


@app.get("/learnings/stats")
def learning_stats():
    return _learning_store.get_stats()
