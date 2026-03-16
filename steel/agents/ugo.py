"""UGO - Ultimate Guardian & Overseer.

Master orchestrator for JM Artsteel. Routes jobs by P1-P4 priority,
coordinates all agents, and ensures nothing falls through the cracks.
"""

from __future__ import annotations

from steel.agents.base import SteelBaseAgent


class UgoAgent(SteelBaseAgent):
    agent_id = "ugo"
    name = "UGO"
    role = "Ultimate Guardian & Overseer"
    category = "hard_services"

    relevant_standards = [
        "AS/NZS ISO 45001",
        "AS 4100",
        "AS/NZS 5131",
        "WHS Act 2011",
        "WHS Regulations 2011",
        "NCC (BCA)",
    ]

    system_prompt = """You are UGO, the Ultimate Guardian & Overseer at JM Artsteel.
You are the Systems Overlord — calm, authoritative, always in control.

## Your Core Identity
- You oversee ALL steel fabrication operations, safety, and job coordination.
- You are the single point of accountability for job routing, priority assessment, and team coordination.
- You manage a team of specialist agents: Frank (SWMS), Clarice (uploads), Simon (quotes),
  Doris (email), Quincy (defects), and Jerry (workshops).
- You know every relevant Australian Standard for structural steel fabrication.

## Your Specialist Team
### Hard Services:
- **Franky the Safety Bloke** (Frank) — SWMS Generator. Generates Safe Work Method Statements.
- **Clarice the Upload Queen** (Clarice) — Upload Automation. Handles document delivery.
- **Simon the Money Man** (Simon) — Quote Analyzer. Analyzes costs and finds savings.

### Soft Services:
- **Doris the Inbox Whisperer** (Doris) — Email Intelligence. Monitors and filters emails.
- **Quincy the Defect Detective** (Quincy) — Defects Memory. Tracks quality issues.

### Support:
- **Jerry the Workshop Wizard** (Jerry) — Workshop Creator. Creates workshop docs and training.

## P1-P4 Priority Escalation Framework
- **P1 Critical** (respond immediately): Job due TODAY/TOMORROW, serious injury, structural failure risk
- **P2 High** (respond < 30 min): Job due THIS WEEK, defect reported, welding quality issue
- **P3 Medium** (respond < 4 hr): Job due NEXT WEEK, routine uploads, non-urgent emails
- **P4 Low** (next business day): Quote requests (no deadline), documentation, training materials

## How You Operate
1. When a new job comes in, ASSESS PRIORITY first (P1-P4).
2. Route to the correct agent based on priority and job type.
3. P1 jobs bypass ALL queues — Frank generates SWMS immediately.
4. P4 jobs go to Simon first for quote analysis before Frank.
5. Track all jobs and ensure nothing falls through the cracks.
6. Use Australian English spelling.
7. Always reference the relevant Australian Standard.

## Your Decision Framework
- **P1**: Act NOW. Route to Frank immediately. No delays.
- **P2**: Act fast. Route to Frank with priority flag.
- **P3**: Normal queue. Frank handles in order.
- **P4**: Simon analyzes quote first, then Frank if approved.

Always respond as a confident, all-seeing orchestrator who knows exactly
where every job is and what needs to happen next.
"""

    def assess_priority(self, job_description: str, deadline: str = None) -> int:
        """Assess job priority (P1-P4) based on deadline and urgency.

        Returns priority level as integer (1-4).
        """
        if deadline:
            deadline_lower = deadline.lower().strip()

            # P1: Critical (due today/tomorrow)
            if deadline_lower in ("today", "tomorrow", "urgent", "asap", "now", "emergency"):
                return 1

            # P2: High (this week)
            if deadline_lower in ("this week", "7 days", "3 days", "2 days", "few days"):
                return 2

            # P3: Medium (next week)
            if deadline_lower in ("next week", "14 days", "2 weeks", "fortnight"):
                return 3

        # Check job description for urgency keywords
        desc_lower = job_description.lower()
        urgent_keywords = ["urgent", "emergency", "critical", "asap", "immediately", "stop work", "injury", "incident"]
        high_keywords = ["defect", "complaint", "quality issue", "welding issue", "this week"]

        if any(kw in desc_lower for kw in urgent_keywords):
            return 1
        if any(kw in desc_lower for kw in high_keywords):
            return 2

        # P4: Low (quote request, no deadline)
        if any(kw in desc_lower for kw in ("quote", "pricing", "estimate", "cost")):
            return 4

        # Default to P3
        return 3

    def route_by_priority(self, job_description: str, priority: int = None) -> dict:
        """Route job to correct agent based on priority.

        Returns routing info dict (actual agent execution happens in the CLI).
        """
        if priority is None:
            priority = self.assess_priority(job_description)

        priority_names = {1: "P1-Critical", 2: "P2-High", 3: "P3-Medium", 4: "P4-Low"}
        priority_emojis = {1: "\U0001f6a8", 2: "\U0001f525", 3: "\U0001f4cb", 4: "\U0001f4b0"}

        if priority == 1:
            return {
                "priority": priority,
                "priority_name": priority_names[1],
                "emoji": priority_emojis[1],
                "route_to": "frank",
                "action": "GENERATE SWMS IMMEDIATELY — bypass queue",
                "message": f"{priority_emojis[1]} P1 Critical Job — Route to FRANKY IMMEDIATELY",
            }
        elif priority == 2:
            return {
                "priority": priority,
                "priority_name": priority_names[2],
                "emoji": priority_emojis[2],
                "route_to": "frank",
                "action": "Generate SWMS with priority flag",
                "message": f"{priority_emojis[2]} P2 High Priority Job — Route to FRANKY (Priority)",
            }
        elif priority == 3:
            return {
                "priority": priority,
                "priority_name": priority_names[3],
                "emoji": priority_emojis[3],
                "route_to": "frank",
                "action": "Queue for SWMS generation (normal)",
                "message": f"{priority_emojis[3]} P3 Medium Priority Job — Route to FRANKY (Normal Queue)",
            }
        else:
            return {
                "priority": priority,
                "priority_name": priority_names[4],
                "emoji": priority_emojis[4],
                "route_to": "simon",
                "action": "Route to Simon for quote analysis first",
                "message": f"{priority_emojis[4]} P4 Low Priority — Route to SIMON (Quote Analysis)",
            }

    async def process_new_job(self, job_description: str, deadline: str = None) -> dict:
        """Enhanced job processing with P1-P4 escalation.

        Returns job processing result with priority, routing, and agent response.
        """
        priority = self.assess_priority(job_description, deadline)
        routing = self.route_by_priority(job_description, priority)

        # Use AI to generate a detailed assessment
        assessment_prompt = f"""Assess this steel fabrication job:

Job: {job_description}
Deadline: {deadline or 'Not specified'}
Priority: {routing['priority_name']}
Routing: {routing['action']}

Provide:
1. Priority justification
2. Key safety considerations
3. Relevant Australian Standards
4. Recommended immediate actions
5. Which team member should handle what"""

        ai_assessment = self.chat(assessment_prompt)

        return {
            "job_description": job_description,
            "deadline": deadline,
            **routing,
            "assessment": ai_assessment,
        }
