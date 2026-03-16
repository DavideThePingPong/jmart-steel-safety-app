"""Escalation matrix and priority framework for Steel Hub operations."""

PRIORITY_MATRIX = {
    "P1": {
        "name": "Critical",
        "response_time": "Immediate (< 5 minutes)",
        "resolution_target": "< 1 hour",
        "escalation": "UGO + Frank immediately, bypass all queues",
        "examples": [
            "Job due TODAY or TOMORROW — no SWMS yet",
            "Serious workplace injury on site",
            "Crane failure or structural collapse risk",
            "Client emergency callback — safety issue on installed steel",
            "Regulatory stop-work notice received",
            "Fall from height incident or near-miss",
        ],
        "communication": "Immediate alert to UGO, Frank generates SWMS NOW",
        "routing": "frank",
    },
    "P2": {
        "name": "High",
        "response_time": "< 30 minutes",
        "resolution_target": "< 4 hours",
        "escalation": "UGO + relevant specialist within 30 minutes",
        "examples": [
            "Job due THIS WEEK — SWMS needed",
            "Defect reported on recent job",
            "Welding quality issue flagged",
            "Client complaint about installed steelwork",
            "Near-miss safety incident",
            "Quote deadline approaching (2-3 days)",
        ],
        "communication": "UGO notifies relevant agent, priority flag set",
        "routing": "frank",
    },
    "P3": {
        "name": "Medium",
        "response_time": "< 4 hours",
        "resolution_target": "< 24 hours",
        "escalation": "Relevant specialist handles, UGO notified",
        "examples": [
            "Job due NEXT WEEK — SWMS needed",
            "Routine document upload required",
            "Non-urgent email requiring response",
            "Minor defect on non-critical element",
            "Workshop documentation update needed",
            "Vendor correspondence follow-up",
        ],
        "communication": "Included in daily operations summary",
        "routing": "frank",
    },
    "P4": {
        "name": "Low",
        "response_time": "Next business day",
        "resolution_target": "< 5 business days",
        "escalation": "Relevant specialist handles independently",
        "examples": [
            "Quote request — no deadline pressure",
            "Documentation updates and filing",
            "Training material development",
            "Process improvement suggestions",
            "Non-urgent procurement",
            "Historical defect analysis",
        ],
        "communication": "Included in weekly operations report",
        "routing": "simon",
    },
}

ESCALATION_THRESHOLDS = {
    "safety": {
        "serious_injury": "P1 — UGO + Frank, emergency procedures, WorkSafe notification",
        "fall_from_height": "P1 — immediate stop-work, incident investigation",
        "near_miss": "P2 — Frank generates incident report, review SWMS",
        "hazard_identified": "P3 — Frank updates risk assessment",
        "minor_injury": "P3 — first aid, record and review SWMS",
    },
    "quality": {
        "structural_defect": "P1 — UGO + Quincy, engineer review required",
        "welding_defect": "P2 — Quincy records, Frank reviews SWMS",
        "cosmetic_defect": "P3 — Quincy records for pattern analysis",
        "documentation_gap": "P4 — Clarice handles upload",
    },
    "deadline": {
        "due_today": "P1 — Frank generates SWMS immediately",
        "due_tomorrow": "P1 — Frank generates SWMS immediately",
        "due_this_week": "P2 — Frank queues with priority flag",
        "due_next_week": "P3 — Frank queues normally",
        "no_deadline": "P4 — Simon analyzes quote first",
    },
    "client": {
        "emergency_callback": "P1 — UGO coordinates immediate response",
        "complaint": "P2 — Quincy records, UGO escalates",
        "routine_query": "P3 — Doris filters and routes",
        "quote_request": "P4 — Simon analyzes",
    },
}
