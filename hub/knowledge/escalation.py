"""Escalation matrix and priority framework for Data Centre Hub operations."""

PRIORITY_MATRIX = {
    "P1": {
        "name": "Critical",
        "response_time": "Immediate (< 5 minutes)",
        "resolution_target": "< 1 hour",
        "escalation": "Barbie + all affected specialists immediately",
        "examples": [
            "Total power failure or UPS bypass",
            "Fire alarm activation in data hall",
            "Cooling failure affecting IT load",
            "Security breach or unauthorised access to data hall",
            "Water ingress in data hall or critical plant room",
            "Serious workplace injury requiring emergency services",
            "Complete BMS/monitoring failure",
        ],
        "communication": "Immediate phone call to Barbie, client notification within 15 minutes",
    },
    "P2": {
        "name": "High",
        "response_time": "< 30 minutes",
        "resolution_target": "< 4 hours",
        "escalation": "Barbie + relevant specialist within 30 minutes",
        "examples": [
            "Single UPS or generator failure (redundancy lost)",
            "Single chiller or CRAC failure (redundancy lost)",
            "Fire system impairment (suppression or detection)",
            "Pest sighting in data hall",
            "Environmental exceedance (temperature, humidity)",
            "Access control system failure",
            "Near-miss safety incident",
            "Compliance non-conformance discovered",
        ],
        "communication": "Phone call to Barbie within 30 min, client notification within 1 hour",
    },
    "P3": {
        "name": "Medium",
        "response_time": "< 4 hours",
        "resolution_target": "< 24 hours",
        "escalation": "Relevant specialist, Barbie notified at next daily briefing",
        "examples": [
            "Non-critical equipment alarm (redundant unit failure)",
            "Minor water leak in non-critical area",
            "Grounds damage or external lighting failure",
            "Non-critical maintenance overdue",
            "Vendor SLA breach (non-critical service)",
            "Minor building fabric damage",
            "Cleaning standard not met",
        ],
        "communication": "Email to Barbie, included in daily operations report",
    },
    "P4": {
        "name": "Low",
        "response_time": "Next business day",
        "resolution_target": "< 5 business days",
        "escalation": "Relevant specialist handles independently",
        "examples": [
            "Cosmetic maintenance (paint, signage, minor repairs)",
            "Non-urgent procurement requests",
            "Documentation updates",
            "Minor process improvement suggestions",
            "Routine vendor correspondence",
            "Non-critical spare parts ordering",
        ],
        "communication": "Included in weekly operations report",
    },
}

ESCALATION_THRESHOLDS = {
    "power": {
        "redundancy_lost": "P2 — immediately notify Dazza and Barbie",
        "total_failure": "P1 — all hands, activate emergency procedures",
        "power_quality_event": "P3 — Dazza investigates, Techno Terry reviews BMS data",
    },
    "cooling": {
        "single_unit_failure": "P2 — Chilli responds, monitor temperatures via Techno Terry",
        "temperature_exceedance_warning": "P2 — Chilli + Techno Terry, 27°C at rack inlet",
        "temperature_exceedance_critical": "P1 — 32°C at rack inlet, consider IT load reduction",
        "total_cooling_failure": "P1 — emergency procedures, IT load shedding",
    },
    "fire": {
        "vesda_alert": "P2 — Smokey investigates, Nightowl Nev monitors",
        "vesda_action": "P1 — evacuate zone, fire brigade notified",
        "suppression_discharge": "P1 — full emergency response",
        "system_impairment": "P2 — Smokey, fire watch if > 4 hours",
    },
    "security": {
        "unauthorised_access_attempt": "P2 — Big Kev investigates",
        "confirmed_breach": "P1 — lockdown, police notification",
        "access_control_failure": "P2 — manual access procedures activated",
        "cctv_failure": "P3 — Big Kev arranges repair",
    },
    "safety": {
        "serious_injury": "P1 — first aid, emergency services, Hard Hat Haz leads investigation",
        "near_miss": "P2 — Hard Hat Haz investigates, report within 24 hours",
        "hazard_identified": "P3 — Hard Hat Haz assesses, controls implemented",
        "minor_injury": "P3 — first aid, Hard Hat Haz records and reviews",
    },
    "water": {
        "leak_in_data_hall": "P1 — immediate containment, Dunny Doug + Dusty Di respond",
        "leak_in_plant_room": "P2 — Dunny Doug responds, assess equipment risk",
        "leak_in_non_critical_area": "P3 — Dunny Doug schedules repair",
    },
    "compliance": {
        "regulatory_notice_received": "P1 — Clipboard Karen + Barbie, legal review",
        "audit_major_nonconformance": "P2 — Clipboard Karen coordinates corrective action",
        "audit_minor_nonconformance": "P3 — Clipboard Karen tracks to resolution",
        "upcoming_deadline_at_risk": "P2 — Clipboard Karen escalates to Barbie",
    },
    "budget": {
        "variance_over_10_percent": "P2 — Penny Pete + Barbie review",
        "unplanned_capex_required": "P2 — Penny Pete prepares business case for Barbie",
        "vendor_invoice_dispute": "P3 — Penny Pete manages",
    },
}

ON_CALL_STRUCTURE = {
    "tier_1": {
        "role": "Operations Centre (Nightowl Nev)",
        "availability": "24/7/365",
        "response": "Immediate — first responder for all alarms",
    },
    "tier_2": {
        "role": "On-call Specialist",
        "availability": "After hours, rotating weekly roster",
        "response": "< 30 minutes phone, < 2 hours on-site",
        "trades": ["Electrical (Dazza)", "Mechanical (Chilli)", "Fire (Smokey)", "Security (Big Kev)"],
    },
    "tier_3": {
        "role": "Facilities Director (Barbie)",
        "availability": "24/7 for P1 incidents",
        "response": "< 15 minutes phone for P1, next business day for P3/P4",
    },
}
