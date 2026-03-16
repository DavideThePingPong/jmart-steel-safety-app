"""Data Centre Tier classification knowledge base."""

TIER_DETAILS = {
    "Tier I": {
        "name": "Basic Site Infrastructure",
        "uptime_target": "99.671%",
        "annual_downtime": "28.8 hours",
        "redundancy": "N",
        "distribution_paths": 1,
        "concurrently_maintainable": False,
        "fault_tolerant": False,
        "typical_use": "Small business, non-critical workloads",
        "power": {
            "ups": "N capacity",
            "generator": "Optional",
            "distribution": "Single path",
        },
        "cooling": {
            "redundancy": "N capacity",
            "distribution": "Single path",
        },
    },
    "Tier II": {
        "name": "Redundant Site Infrastructure Components",
        "uptime_target": "99.741%",
        "annual_downtime": "22.0 hours",
        "redundancy": "N+1",
        "distribution_paths": 1,
        "concurrently_maintainable": False,
        "fault_tolerant": False,
        "typical_use": "SME, moderate criticality",
        "power": {
            "ups": "N+1 capacity",
            "generator": "N+1 capacity",
            "distribution": "Single path",
        },
        "cooling": {
            "redundancy": "N+1 capacity",
            "distribution": "Single path",
        },
    },
    "Tier III": {
        "name": "Concurrently Maintainable Site Infrastructure",
        "uptime_target": "99.982%",
        "annual_downtime": "1.6 hours",
        "redundancy": "N+1 (multiple paths, one active)",
        "distribution_paths": 2,
        "concurrently_maintainable": True,
        "fault_tolerant": False,
        "typical_use": "Enterprise, financial services, most Australian commercial DCs",
        "power": {
            "ups": "N+1, dual path (one active)",
            "generator": "N+1",
            "distribution": "Dual path (active/passive)",
        },
        "cooling": {
            "redundancy": "N+1",
            "distribution": "Dual path (active/passive)",
        },
    },
    "Tier IV": {
        "name": "Fault Tolerant Site Infrastructure",
        "uptime_target": "99.995%",
        "annual_downtime": "0.4 hours (26.3 minutes)",
        "redundancy": "2(N+1)",
        "distribution_paths": 2,
        "concurrently_maintainable": True,
        "fault_tolerant": True,
        "typical_use": "Government, banking, hyperscale, mission-critical",
        "power": {
            "ups": "2(N+1), dual active paths",
            "generator": "2(N+1)",
            "distribution": "Dual active paths, STS at rack level",
        },
        "cooling": {
            "redundancy": "2(N+1)",
            "distribution": "Dual active paths",
        },
    },
}


def compare_tiers(tier_a: str, tier_b: str) -> dict:
    """Compare two tier classifications."""
    a = TIER_DETAILS.get(tier_a, {})
    b = TIER_DETAILS.get(tier_b, {})
    if not a or not b:
        return {"error": "Invalid tier specified"}
    return {
        "comparison": {
            tier_a: {
                "uptime": a["uptime_target"],
                "downtime": a["annual_downtime"],
                "concurrent_maintenance": a["concurrently_maintainable"],
                "fault_tolerant": a["fault_tolerant"],
            },
            tier_b: {
                "uptime": b["uptime_target"],
                "downtime": b["annual_downtime"],
                "concurrent_maintenance": b["concurrently_maintainable"],
                "fault_tolerant": b["fault_tolerant"],
            },
        }
    }
