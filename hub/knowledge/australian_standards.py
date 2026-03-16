"""Australian Standards quick-reference knowledge base for data centre facilities."""

# Mapping of standard codes to detailed reference information.
# Agents use this to provide accurate compliance advice.

STANDARDS_DETAIL = {
    "AS/NZS 3000": {
        "title": "Wiring Rules",
        "scope": "Requirements for the design, construction and verification of electrical installations.",
        "key_sections_for_dc": [
            "Section 1 — Scope, application and general principles",
            "Section 2 — General requirements for safety",
            "Section 3 — Selection and installation of wiring systems",
            "Section 4 — Protection for safety",
            "Section 7 — Special installations and locations",
            "Section 8 — Verification",
        ],
        "dc_relevance": "Governs ALL electrical installation work in the data centre. "
                        "Every cable, every connection, every switchboard must comply.",
        "update_cycle": "Amended regularly; current edition must be used.",
    },
    "AS 1851": {
        "title": "Routine service of fire protection systems and equipment",
        "scope": "Establishes routine service requirements for fire protection systems.",
        "key_sections_for_dc": [
            "Table 1.1 — Fire detection and alarm systems",
            "Table 1.2 — Automatic sprinkler systems",
            "Table 1.4 — Gaseous fire suppression systems",
            "Table 1.5 — Fire hydrant systems",
            "Table 1.6 — Fire hose reel systems",
            "Table 1.7 — Fire doors and smoke doors",
            "Table 1.10 — Emergency lighting",
            "Table 1.15 — EWIS",
        ],
        "dc_relevance": "Mandatory routine testing and maintenance schedule for ALL fire protection "
                        "systems. Non-compliance = Essential Safety Measures failure.",
        "frequencies": {
            "monthly": "Visual inspections, indicator checks",
            "6_monthly": "Functional testing of detection and alarm",
            "annually": "Full system testing including gaseous suppression",
            "5_yearly": "Comprehensive assessment and overhaul",
        },
    },
    "AS/NZS 3666": {
        "title": "Air-handling and water systems of buildings — Microbial control",
        "scope": "Requirements for design, installation, and maintenance to minimise legionella risk.",
        "key_sections_for_dc": [
            "Part 1 — Design, installation and commissioning",
            "Part 2 — Operation and maintenance",
            "Part 3 — Performance-based maintenance",
        ],
        "dc_relevance": "Critical for cooling towers, evaporative coolers, and any water systems. "
                        "Legionella outbreaks are notifiable diseases — compliance is mandatory.",
        "maintenance_requirements": [
            "Monthly cooling tower inspections",
            "Water quality testing (microbiological and chemical)",
            "Annual risk assessments",
            "Drift eliminator inspections",
            "Water treatment program management",
        ],
    },
    "AS/NZS ISO 45001": {
        "title": "Occupational health and safety management systems",
        "scope": "Framework for managing OH&S risks and opportunities.",
        "key_sections_for_dc": [
            "Clause 4 — Context of the organisation",
            "Clause 5 — Leadership and worker participation",
            "Clause 6 — Planning (risk assessment)",
            "Clause 7 — Support (competence, awareness, communication)",
            "Clause 8 — Operation (hazard controls, emergency preparedness)",
            "Clause 9 — Performance evaluation",
            "Clause 10 — Improvement (incident investigation, corrective actions)",
        ],
        "dc_relevance": "The overarching safety management framework. All WHS activities "
                        "should align with this standard's PDCA approach.",
    },
    "AS/NZS ISO/IEC 22237": {
        "title": "Information technology — Data centre facilities and infrastructures",
        "scope": "Comprehensive standard for data centre design, build, and operation.",
        "parts": [
            "Part 1 — General concepts",
            "Part 2 — Building construction",
            "Part 3 — Power distribution",
            "Part 4 — Environmental control",
            "Part 5 — Telecommunications cabling infrastructure",
            "Part 6 — Security systems",
            "Part 7 — Management and operational information",
        ],
        "dc_relevance": "THE data centre standard for Australia. Covers everything from "
                        "building design to operational procedures. This is your bible alongside TIA-942.",
    },
    "AS/NZS ISO 50001": {
        "title": "Energy management systems",
        "scope": "Systematic approach to continual improvement of energy performance.",
        "dc_relevance": "Framework for managing energy consumption and improving PUE. "
                        "Increasingly important for NABERS ratings and ESG reporting.",
    },
    "NCC (BCA)": {
        "title": "National Construction Code / Building Code of Australia",
        "scope": "Minimum requirements for safety, health, amenity and sustainability of buildings.",
        "dc_relevance": "Sets the baseline building requirements. Fire safety, structural, "
                        "accessibility, and energy efficiency provisions all stem from the NCC. "
                        "Essential Safety Measures (ESM) maintenance obligations flow from NCC.",
        "key_volumes": [
            "Volume One — Class 2 to 9 buildings (data centres are typically Class 7b or 8)",
            "Volume Three — Plumbing Code of Australia",
        ],
    },
}


def get_standard_info(standard_code: str) -> dict:
    """Look up detailed information about an Australian Standard."""
    return STANDARDS_DETAIL.get(standard_code, {
        "title": "Standard reference not found in knowledge base",
        "note": f"Add details for {standard_code} to expand the knowledge base.",
    })


def get_standards_for_trade(trade: str) -> list[str]:
    """Return the list of key standards relevant to a specific trade."""
    trade_standards = {
        "electrical": ["AS/NZS 3000", "AS/NZS 3008", "AS/NZS 3010", "AS/NZS 3760", "AS/NZS 61439"],
        "fire": ["AS 1851", "AS 1670.1", "AS 1670.4", "AS 2118", "AS 2444", "AS 1668.1"],
        "hvac": ["AS 1668.1", "AS 1668.2", "AS/NZS 3666", "AS 1210", "AS 4254"],
        "security": ["AS/NZS 2201", "AS 4806", "AS 1725"],
        "structural": ["AS 1170", "AS 3600", "AS 4100", "NCC (BCA)"],
        "plumbing": ["AS/NZS 3500", "AS 4032", "AS/NZS 3666"],
        "whs": ["AS/NZS ISO 45001", "AS 1319", "AS/NZS 1715", "AS/NZS 1716"],
        "energy": ["AS/NZS ISO 50001", "NABERS Energy"],
        "environmental": ["AS/NZS ISO 14001"],
        "data_centre": ["AS/NZS ISO/IEC 22237", "ANSI/TIA-942", "Uptime Institute Tier Standard"],
    }
    return trade_standards.get(trade.lower(), [])
