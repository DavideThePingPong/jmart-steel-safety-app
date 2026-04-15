"use strict";

const path = require("path");
const Busboy = require("busboy");
const pdfParse = require("pdf-parse");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");

const DEFAULT_DB_URL =
  "https://jmart-steel-safety-default-rtdb.asia-southeast1.firebasedatabase.app";
const FRANK_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
const FRANK_ATTACHMENT_OPENROUTER_MODEL =
  process.env.FRANK_ATTACHMENT_OPENROUTER_MODEL || "anthropic/claude-4-sonnet-20250522";
const FRANK_GENERATION_MODEL =
  process.env.FRANK_GENERATION_MODEL || "anthropic/claude-4-sonnet-20250522";
const HUB_VISION_MODEL =
  process.env.HUB_VISION_MODEL || "claude-sonnet-4-20250514";
const HUB_WEB_SEARCH_MODEL =
  process.env.HUB_WEB_SEARCH_MODEL || "claude-sonnet-4-20250514";
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");
const FRANK_HOUSE_MODEL = Object.freeze({
  companyName: "J & M Art Steel Fabrication PTY LTD",
  businessAddress: "2/28 Lilian Fowler Pl, Marrickville, 2204",
  phone: "(02) 8201 6707",
  abn: "94164562207",
  worksActivity:
    "Installation of Structural Steel, Dogman, Rigging, Working at Heights, Steel Fabrication and Site Modifications. Installation of Staircases",
  highRiskCategories: [
    "Risk of a person falling more than 2m",
    "Likely to involve disturbing asbestos",
    "Work in or near a shaft or trench deeper than 1.5m or a tunnel",
    "Work on or near chemical, fuel or refrigerant lines",
    "Tilt-up or precast concrete elements",
    "Work in areas with artificial extremes of temperature",
    "Work on a telecommunications tower",
    "Temporary load-bearing support for structural alterations or repairs",
    "Use of explosives",
    "Work on or near energised electrical installations or services",
    "Work on, in or adjacent to a road, railway, shipping lane or other traffic corridor in use",
    "Work in or near water or other liquid that involves a risk of drowning",
    "Demolition of a load-bearing structure",
    "Work in or near a confined space",
    "Work on or near pressurised gas mains or piping",
    "Work in an area that may have a contaminated or flammable atmosphere",
    "Work in an area with movement of powered mobile plant",
    "Diving work",
  ],
  mandatoryPpe: [
    "Hardhat",
    "Steel capped boots",
    "Hi-vis clothing",
    "Gloves",
    "Safety glasses",
    "P2 dust mask",
    "P3 dust mask",
    "Ear protection",
    "Safety harness",
    "Lanyards / tool tethers",
    "Sun protection SPF40+",
    "Long sleeve / long pants",
  ],
  taskSpecificPpe: [
    "Welding helmet",
    "Face shield",
    "Cut 5 rated gloves",
    "Fire proof clothing",
    "Cotton clothing",
    "Leather rigging gloves",
    "Radio / whistle",
  ],
  reviewMethod:
    "The SWMS will be monitored onsite with daily J&M Art Steel pre-starts prior to starting work and reviewed when site hazards, methods, equipment or risks change.",
  emergencyResponseActions: [
    "Stop work immediately if any control measure fails or the work is no longer safe.",
    "Call 000 or radio for emergency services as required and immediately advise the PCBU or site manager.",
    "Clear the area of non-essential personnel and isolate the hazard zone.",
    "Look for ongoing danger, trapped persons or falling object risks before attempting assistance.",
    "If safe to do so, provide first aid, implement corrective actions and assist emergency services as requested.",
  ],
});

initializeApp({
  databaseURL: process.env.JMART_FIREBASE_RTDB_URL || DEFAULT_DB_URL,
});

function buildAttachmentPrompt() {
  return (
    "Extract ALL project requirements, safety requirements, scope of work details, " +
    "special conditions, and constraints from this document. Include specific items like: " +
    "required PPE, restricted areas, working hours, permit requirements, hazard controls, " +
    "environmental conditions, and any builder/client specific requirements.\n\n" +
    "Return a plain text summary organized by category. Be thorough and factual."
  );
}

function sanitizeText(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeList(values, maxItems = 20, maxLength = 240) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => sanitizeText(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeStepList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .slice(0, 20)
    .map((step, index) => ({
      step_number: sanitizeText(step && step.step_number ? step.step_number : String(index + 1), 16),
      job_step: sanitizeText(step && step.job_step, 400),
      hazards: sanitizeText(step && step.hazards, 1600),
      risk_level: sanitizeText(step && step.risk_level, 16),
      controls: sanitizeText(step && step.controls, 2400),
    }))
    .filter((step) => step.job_step && step.hazards && step.controls);
}

const FRANK_GENERIC_TEXT = new Set([
  "",
  "swms",
  "safe work method statement",
  "to be confirmed",
  "project details to be confirmed",
  "job details to be confirmed",
  "builder to be confirmed",
  "builder/client to be confirmed",
  "site details to be confirmed",
  "project to be confirmed",
  "job to be confirmed",
]);

function normalizeFrankKey(value) {
  return sanitizeText(value, 200).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isGenericFrankText(value) {
  return FRANK_GENERIC_TEXT.has(normalizeFrankKey(value));
}

function mergeUniqueFrankLists(...groups) {
  const merged = [];
  const seen = new Set();
  groups.forEach((group) => {
    if (!Array.isArray(group)) {
      return;
    }
    group.forEach((value) => {
      const text = sanitizeText(value, 240);
      const key = normalizeFrankKey(text);
      if (!text || !key || seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(text);
    });
  });
  return merged;
}

function escapeFrankRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTaggedFrankValue(text, labels) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const label of labels) {
    const regex = new RegExp(
      `(?:^|[-*]\\s*)${escapeFrankRegex(label)}\\s*[:\\-]\\s*(.+)$`,
      "i",
    );
    for (const line of lines) {
      const match = line.match(regex);
      if (match && match[1]) {
        return sanitizeText(match[1], 240);
      }
    }
  }
  return "";
}

function buildFrankContextText(payload, swms) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const safeSwms = swms && typeof swms === "object" ? swms : {};
  const steps = Array.isArray(safeSwms.steps)
    ? safeSwms.steps
        .map((step) => [step.job_step, step.hazards, step.controls].filter(Boolean).join(" "))
        .filter(Boolean)
    : [];
  return [
    safePayload.jobDescription,
    safePayload.builder,
    safePayload.location,
    safePayload.attachedRequirements,
    safeSwms.title,
    safeSwms.detailed_description,
    safeSwms.project_name,
    safeSwms.builder_name,
    safeSwms.site_location,
    Array.isArray(safeSwms.hazardous_substances) ? safeSwms.hazardous_substances.join("\n") : "",
    Array.isArray(safeSwms.emergency_rescue_plans) ? safeSwms.emergency_rescue_plans.join("\n") : "",
    Array.isArray(safeSwms.plant_equipment) ? safeSwms.plant_equipment.join("\n") : "",
    steps.join("\n"),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
}

function frankTextHasAny(text, patterns) {
  const haystack = String(text || "");
  return patterns.some((pattern) => pattern.test(haystack));
}

function inferFrankMetadata(payload, swms) {
  const text = buildFrankContextText(payload, swms);
  return {
    project_name: sanitizeText(
      extractTaggedFrankValue(text, [
        "project",
        "project name",
        "site",
        "site name",
        "site/project",
      ]),
      200,
    ),
    builder_name: sanitizeText(
      payload.builder ||
        extractTaggedFrankValue(text, [
          "builder",
          "pcbu",
          "principal contractor",
          "client",
        ]),
      120,
    ),
    site_location: sanitizeText(
      payload.location ||
        extractTaggedFrankValue(text, [
          "location",
          "address",
          "site address",
          "project address",
        ]),
      200,
    ),
  };
}

function deriveFrankTitle(swms, payload, metadata) {
  const current = sanitizeText(swms.title, 160);
  if (current && !isGenericFrankText(current)) {
    return current;
  }

  const bulletLines = String(payload.jobDescription || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s*-]+/, "").trim())
    .filter((line) => line && !/^selected work activit/i.test(line) && !/^job details/i.test(line));

  const fallback =
    bulletLines.slice(0, 2).join(" / ") ||
    sanitizeText(payload.jobDescription, 160) ||
    metadata.project_name ||
    "Steel installation works";
  return sanitizeText(fallback, 160);
}

function deriveFrankDetailedDescription(swms, payload, metadata) {
  const current = sanitizeText(swms.detailed_description, 2400);
  if (current && !isGenericFrankText(current)) {
    return current;
  }

  const title = deriveFrankTitle(swms, payload, metadata);
  const builderPart = metadata.builder_name ? ` for ${metadata.builder_name}` : "";
  const locationPart = metadata.site_location ? ` at ${metadata.site_location}` : "";
  return sanitizeText(
    `J&M Art Steel will carry out ${title.toLowerCase()}${builderPart}${locationPart}. ` +
      `The work includes site establishment, material handling, setout, fixing, installation, verification, ` +
      `and final clean-up in accordance with builder requirements, site controls, and the SWMS controls below.`,
    2400,
  );
}

function isUniversitySydneyText(text) {
  return frankTextHasAny(text, [/\buniversity of sydney\b/i, /\bsydney university\b/i, /\busyd\b/i]);
}

function inferFrankHighRiskCategories(text) {
  const categories = [];
  if (
    frankTextHasAny(text, [
      /\bheight\b/i,
      /\bworking at height/i,
      /\bscaffold/i,
      /\bewp\b/i,
      /\bscissor lift\b/i,
      /\bboom lift\b/i,
      /\bstair/i,
      /\bbalustrade/i,
      /\bhandrail/i,
      /\bedge protection/i,
      /\bfall arrest/i,
    ])
  ) {
    categories.push("Risk of a person falling more than 2m");
  }
  if (
    frankTextHasAny(text, [
      /\bcrane\b/i,
      /\bforklift\b/i,
      /\btelehandler\b/i,
      /\btruck\b/i,
      /\bewp\b/i,
      /\bscissor lift\b/i,
      /\bmobile plant\b/i,
    ])
  ) {
    categories.push("Work in an area with movement of powered mobile plant");
  }
  if (frankTextHasAny(text, [/\btraffic\b/i, /\broad\b/i, /\bstreet\b/i, /\brail/i, /\bloading zone\b/i])) {
    categories.push(
      "Work on, in or adjacent to a road, railway, shipping lane or other traffic corridor in use",
    );
  }
  if (frankTextHasAny(text, [/\benergised\b/i, /\belectrical\b/i, /\bswitchboard\b/i, /\bcable\b/i])) {
    categories.push("Work on or near energised electrical installations or services");
  }
  if (frankTextHasAny(text, [/\bshaft\b/i, /\btrench\b/i, /\btunnel\b/i, /\bpit\b/i, /\bexcavat/i])) {
    categories.push("Work in or near a shaft or trench deeper than 1.5m or a tunnel");
  }
  if (frankTextHasAny(text, [/\bconfined\b/i, /\benclosed space\b/i])) {
    categories.push("Work in or near a confined space");
  }
  if (frankTextHasAny(text, [/\bhot work\b/i, /\bweld/i, /\bcutting\b/i, /\bgrinding\b/i, /\bflammable\b/i])) {
    categories.push("Work in an area that may have a contaminated or flammable atmosphere");
  }
  return categories;
}

function inferFrankPlantEquipment(text) {
  const items = ["Hand tools", "Cordless drills / impact drivers", "Laser / measuring equipment"];
  if (frankTextHasAny(text, [/\bdrill/i, /\banchor/i, /\bchemset/i, /\bepoxy/i])) {
    items.push("Hammer drill / rotary hammer", "Hole cleaning equipment / blow-out pump");
  }
  if (frankTextHasAny(text, [/\bgrind/i, /\bcut/i, /\bsaw/i])) {
    items.push("Angle grinder / cutting equipment");
  }
  if (frankTextHasAny(text, [/\bweld/i, /\bhot work\b/i])) {
    items.push("Welding plant and leads", "Fire extinguisher / fire blanket");
  }
  if (frankTextHasAny(text, [/\bewp\b/i, /\bscissor lift\b/i, /\bboom lift\b/i])) {
    items.push("EWP / scissor lift");
  }
  if (frankTextHasAny(text, [/\bscaffold/i])) {
    items.push("Scaffold / edge protection equipment");
  }
  if (frankTextHasAny(text, [/\bcrane\b/i, /\bdogman/i, /\brigg/i, /\bsling/i, /\bshackle/i, /\bchain block\b/i])) {
    items.push("Crane / lifting equipment", "Rigging gear, slings and shackles", "Tag lines");
  }
  if (frankTextHasAny(text, [/\bforklift\b/i, /\btelehandler\b/i])) {
    items.push("Forklift / telehandler");
  }
  return mergeUniqueFrankLists(items);
}

function inferFrankHazardousSubstances(text) {
  const items = [];
  if (frankTextHasAny(text, [/\bchemset\b/i, /\bepoxy\b/i, /\badhesive\b/i, /\bhilti\b/i, /\bramset\b/i, /\banchor/i])) {
    items.push("Chemical anchors / epoxy adhesive - confirm current SDS before use and follow curing / handling controls");
  }
  if (frankTextHasAny(text, [/\bgrout\b/i])) {
    items.push("Non-shrink grout / cementitious products - use current SDS and control contact / dust exposure");
  }
  if (frankTextHasAny(text, [/\bprimer\b/i, /\bpaint\b/i, /\bcoating\b/i, /\bsealant\b/i, /\bgalv spray\b/i])) {
    items.push("Primers, coatings or sealants - use current SDS and manage ventilation / ignition sources");
  }
  if (frankTextHasAny(text, [/\bweld/i, /\bhot work\b/i, /\boxy\b/i, /\blpg\b/i, /\bshielding gas\b/i])) {
    items.push("Welding consumables / gas cylinders / fumes - use current SDS and hot-work controls");
  }
  if (frankTextHasAny(text, [/\bdrill/i, /\bconcrete\b/i, /\bmasonry\b/i, /\bsilica\b/i])) {
    items.push("Concrete / silica dust generated during drilling or cutting - apply dust suppression and respiratory protection controls");
  }
  return items;
}

function inferFrankRescuePlans(text) {
  const items = [];
  if (frankTextHasAny(text, [/\bheight\b/i, /\bewp\b/i, /\bscissor lift\b/i, /\bboom lift\b/i, /\bfall arrest\b/i])) {
    items.push(
      "EWP / fall-arrest rescue plan to be briefed before work starts, with competent personnel, communication and retrieval equipment available.",
    );
  }
  if (frankTextHasAny(text, [/\bcrane\b/i, /\bdogman/i, /\brigg/i, /\bsuspended load\b/i, /\blift/i])) {
    items.push(
      "Dropped-load, crush-injury and suspended-load emergency response to be controlled by exclusion zones, a dogman / rigger, and clear lowering procedures where safe.",
    );
  }
  if (frankTextHasAny(text, [/\bweld/i, /\bhot work\b/i, /\bgrind/i, /\bcut/i])) {
    items.push(
      "Hot-work emergency plan to include extinguishers, fire watch, ignition-source control and immediate escalation to site management if fire risk changes.",
    );
  }
  return items;
}

function inferFrankTaskSpecificPpe(text) {
  const items = [];
  if (frankTextHasAny(text, [/\bweld/i, /\bhot work\b/i])) {
    items.push("Welding helmet", "Fire proof clothing", "Cotton clothing");
  }
  if (frankTextHasAny(text, [/\bgrind/i, /\bcut/i, /\bdrill/i])) {
    items.push("Face shield", "Cut 5 rated gloves");
  }
  if (frankTextHasAny(text, [/\brigg/i, /\bdogman/i, /\bcrane\b/i, /\blift/i])) {
    items.push("Leather rigging gloves", "Radio / whistle");
  }
  return items;
}

function inferFrankStandards(text) {
  if (!isUniversitySydneyText(text)) {
    return [];
  }
  const items = [
    "Work Health and Safety Act 2011 (NSW)",
    "Work Health and Safety Regulation 2017 (NSW)",
    "Construction Work Code of Practice",
    "AS 4100 Steel Structures",
    "AS/NZS 1170 Structural Design Actions",
  ];
  if (frankTextHasAny(text, [/\bstair/i, /\bbalustrade/i, /\bhandrail/i])) {
    items.push("AS 1657 Fixed Platforms, Walkways, Stairways and Ladders");
  }
  if (frankTextHasAny(text, [/\bweld/i, /\bhot work\b/i])) {
    items.push("AS/NZS 1554 Structural Steel Welding");
  }
  if (frankTextHasAny(text, [/\bewp\b/i, /\bscissor lift\b/i, /\bboom lift\b/i, /\bheight\b/i])) {
    items.push("AS/NZS 1891 Industrial Fall-Arrest Systems");
    items.push("Managing the Risk of Falls at Workplaces Code of Practice");
  }
  if (frankTextHasAny(text, [/\bcrane\b/i, /\brigg/i, /\blift/i, /\bdogman/i])) {
    items.push("AS 2550 Cranes - Safe Use");
    items.push("AS 1418 Cranes, Hoists and Winches");
    items.push("AS 4991 Lifting Devices");
  }
  if (frankTextHasAny(text, [/\bdrill/i, /\bgrind/i, /\bportable electrical\b/i])) {
    items.push("AS 4839 Safe Use of Portable Electrical Equipment");
  }
  if (frankTextHasAny(text, [/\bweld/i, /\bgrind/i, /\bnoise\b/i])) {
    items.push("Managing Noise and Preventing Hearing Loss at Work Code of Practice");
  }
  if (frankTextHasAny(text, [/\bchemset\b/i, /\bepoxy\b/i, /\bprimer\b/i, /\bpaint\b/i, /\bsealant\b/i, /\bsilica\b/i])) {
    items.push("Managing Risks of Hazardous Chemicals in the Workplace Code of Practice");
  }
  return items;
}

function enrichFrankSwms(swms, payload) {
  const metadata = inferFrankMetadata(payload, swms);
  const contextText = buildFrankContextText(payload, {
    ...swms,
    ...metadata,
  });
  const includeStandards = isUniversitySydneyText(contextText);

  const title = deriveFrankTitle(swms, payload, metadata);
  const detailedDescription = deriveFrankDetailedDescription(
    {
      ...swms,
      title,
    },
    payload,
    metadata,
  );

  return {
    ...swms,
    title,
    detailed_description: detailedDescription,
    high_risk_categories: mergeUniqueFrankLists(
      swms.high_risk_categories,
      inferFrankHighRiskCategories(contextText),
    ),
    plant_equipment: mergeUniqueFrankLists(swms.plant_equipment, inferFrankPlantEquipment(contextText)),
    hazardous_substances: mergeUniqueFrankLists(
      swms.hazardous_substances,
      inferFrankHazardousSubstances(contextText),
    ),
    emergency_rescue_plans: mergeUniqueFrankLists(
      swms.emergency_rescue_plans,
      inferFrankRescuePlans(contextText),
    ),
    mandatory_ppe: mergeUniqueFrankLists(swms.mandatory_ppe, FRANK_HOUSE_MODEL.mandatoryPpe),
    ppe_required: mergeUniqueFrankLists(swms.ppe_required, FRANK_HOUSE_MODEL.mandatoryPpe),
    task_specific_ppe: mergeUniqueFrankLists(
      swms.task_specific_ppe,
      inferFrankTaskSpecificPpe(contextText),
    ),
    standards: includeStandards
      ? mergeUniqueFrankLists(swms.standards, inferFrankStandards(contextText))
      : [],
    project_name: metadata.project_name,
    builder_name: metadata.builder_name,
    site_location: metadata.site_location,
  };
}

function assessFrankSwmsQuality(swms, payload) {
  const issues = [];
  const contextText = buildFrankContextText(payload, swms);
  if (swms.steps.length < 6) {
    issues.push("not enough task steps");
  }
  if (isGenericFrankText(swms.title)) {
    issues.push("generic title");
  }
  if (!swms.detailed_description || isGenericFrankText(swms.detailed_description)) {
    issues.push("missing detailed description");
  }
  if (swms.plant_equipment.length < 2) {
    issues.push("plant/equipment is too thin");
  }
  if (
    frankTextHasAny(contextText, [/\bchemset\b/i, /\bepoxy\b/i, /\bweld/i, /\bgrout\b/i, /\bprimer\b/i]) &&
    !swms.hazardous_substances.length
  ) {
    issues.push("hazardous substances are missing");
  }
  if (
    frankTextHasAny(contextText, [/\bheight\b/i, /\bewp\b/i, /\bscissor lift\b/i, /\bcrane\b/i, /\blift/i]) &&
    !swms.emergency_rescue_plans.length
  ) {
    issues.push("rescue / emergency plan is missing");
  }
  return issues;
}

function sanitizeFrankSwms(value, payload) {
  const safe = sanitizeObject(value);
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const mandatoryPpe = sanitizeList(safe.mandatory_ppe || safe.ppe_required, 24, 120);
  const taskSpecificPpe = sanitizeList(
    safe.task_specific_ppe || safe.task_specific_equipment,
    24,
    120,
  );
  const steps = sanitizeStepList(safe.steps);

  if (!steps.length) {
    throw new Error("Generated SWMS is missing steps");
  }

  const normalized = {
    title: sanitizeText(safe.title || safePayload.jobDescription, 160),
    detailed_description: sanitizeText(safe.detailed_description, 2400),
    high_risk_categories: sanitizeList(safe.high_risk_categories, 20, 120),
    mandatory_ppe: mandatoryPpe.length ? mandatoryPpe : FRANK_HOUSE_MODEL.mandatoryPpe.slice(),
    ppe_required: mandatoryPpe.length ? mandatoryPpe : FRANK_HOUSE_MODEL.mandatoryPpe.slice(),
    task_specific_ppe: taskSpecificPpe.length
      ? taskSpecificPpe
      : FRANK_HOUSE_MODEL.taskSpecificPpe.slice(),
    plant_equipment: sanitizeList(safe.plant_equipment, 24, 160),
    hazardous_substances: sanitizeList(
      safe.hazardous_substances || safe.materials_hazardous_substances,
      20,
      200,
    ),
    emergency_rescue_plans: sanitizeList(
      safe.emergency_rescue_plans || safe.rescue_plans,
      12,
      200,
    ),
    steps,
    emergency_procedures: sanitizeText(
      safe.emergency_procedures || safe.emergency_response_procedure,
      3200,
    ),
    emergency_response_actions: sanitizeList(safe.emergency_response_actions, 12, 320).length
      ? sanitizeList(safe.emergency_response_actions, 12, 320)
      : FRANK_HOUSE_MODEL.emergencyResponseActions.slice(),
    review_method:
      sanitizeText(safe.review_method || safe.swms_review_method, 1600) ||
      FRANK_HOUSE_MODEL.reviewMethod,
    standards: sanitizeList(safe.standards, 30, 120),
    worker_names: sanitizeList(safePayload.workers, 30, 80),
    project_name: sanitizeText(safe.project_name, 200),
    builder_name: sanitizeText(safe.builder_name, 120),
    site_location: sanitizeText(safe.site_location, 200),
  };

  const enriched = enrichFrankSwms(normalized, safePayload);
  const issues = assessFrankSwmsQuality(enriched, safePayload);
  if (issues.length >= 4) {
    throw new Error(`Generated SWMS is incomplete: ${issues.join(", ")}`);
  }
  return enriched;
}

function sanitizeMemoryMatches(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .slice(0, 5)
    .map((item) => {
      const safe = item && typeof item === "object" ? item : {};
      return {
        title: sanitizeText(safe.title || safe.jobDesc, 120),
        builder: sanitizeText(safe.builder, 120),
        location: sanitizeText(safe.location, 120),
        stepCount: Number.isFinite(Number(safe.stepCount)) ? Math.max(0, Number(safe.stepCount)) : null,
        standards: sanitizeList(safe.standards, 10, 80),
      };
    })
    .filter((item) => item.title);
}

function sanitizeDate(value) {
  const text = sanitizeText(value, 32);
  if (!text) {
    return "unknown";
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) || /^\d{2}\/\d{2}\/\d{4}$/.test(text)
    ? text
    : "unknown";
}

function sanitizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function extractResponseText(payload) {
  return String(
    (payload?.content || [])
      .filter((item) => item && item.type === "text" && item.text)
      .map((item) => item.text)
      .join("\n"),
  ).trim();
}

function extractJsonObject(text, fallbackMessage) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(fallbackMessage || "Model returned invalid JSON");
  }
  return JSON.parse(match[0]);
}

function extractOpenRouterMessageText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item.text === "string") {
          return item.text;
        }
        if (item && typeof item.content === "string") {
          return item.content;
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return String(content || "").trim();
}

function stripCodeFence(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : raw;
}

function extractBalancedJsonObject(text) {
  const input = String(text || "");
  let start = -1;
  let depth = 0;
  let quote = "";
  let escaping = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quote) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") {
      if (start === -1) {
        start = i;
      }
      depth += 1;
      continue;
    }

    if (char === "}" && start !== -1) {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return "";
}

function normalizeFrankJsonCandidate(text) {
  let candidate = String(text || "");
  candidate = candidate.replace(/<think>[\s\S]*?<\/think>/gi, " ").trim();
  candidate = stripCodeFence(candidate);
  candidate = candidate.replace(/^\uFEFF/, "").trim();
  if (/^json\b/i.test(candidate)) {
    candidate = candidate.replace(/^json\b[:\s]*/i, "").trim();
  }
  candidate = extractBalancedJsonObject(candidate) || candidate;
  candidate = candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .trim();
  return candidate;
}

function tryParseFrankJson(text) {
  const candidate = normalizeFrankJsonCandidate(text);
  if (!candidate) {
    return null;
  }
  try {
    return JSON.parse(candidate);
  } catch (error) {
    return null;
  }
}

async function callAnthropicMessages(options) {
  const apiKey = options && options.apiKey ? options.apiKey : "";
  if (!apiKey) {
    throw new Error("Hosted Anthropic provider is not configured");
  }

  const body = {
    model: options.model || HUB_VISION_MODEL,
    max_tokens: options.maxTokens || 1024,
    temperature: Number.isFinite(options.temperature) ? options.temperature : 0,
    messages: options.messages || [],
  };
  if (options.system) {
    body.system = options.system;
  }
  if (Array.isArray(options.tools) && options.tools.length) {
    body.tools = options.tools;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic failed: ${response.status} ${text}`);
  }

  return response.json();
}

function buildFrankSystemPrompt(memoryMatches, regText, includeStandards) {
  const houseModelGuide =
    "\n\n## J&M Art Steel House SWMS Model\n" +
    "You fill J&M Art Steel's existing SWMS model. Write like a builder-facing site document, not a generic AI summary.\n" +
    "Never use placeholders like 'SWMS', 'To be confirmed', or empty shell sections.\n" +
    "Infer practical project / builder / location wording from the job context when needed.\n" +
    "Focus on concise but practical content for these sections: metadata, high-risk categories, hazardous substances, rescue / emergency, plant, SWMS task table, emergency response, review method.\n" +
    "The task table must use a logical steel-work sequence. Include only relevant stages from:\n" +
    "- site establishment / access / induction\n" +
    "- delivery and unloading materials\n" +
    "- setout and verification\n" +
    "- drilling, anchoring, chemset or fixing\n" +
    "- lifting, dogging, rigging and installation\n" +
    "- welding, cutting, grinding or site modification\n" +
    "- EWP / scaffold / working at heights controls\n" +
    "- clean-up, inspection and handover\n\n" +
    "Controls must be practical, long-form and specific. Avoid generic filler like 'use PPE' on its own.\n" +
    "Reference exclusion zones, permits, rescue planning, plant separation, load control and builder/site requirements where relevant.\n" +
    "Only include standards references for University of Sydney jobs. For all other J&M jobs, leave the standards list empty and do not pad controls with AS/NZS references.\n" +
    "If chemicals, primers, grout, chemset, sealants, fuels or SDS-controlled products are involved, list them in hazardous_substances with SDS/MSDS notes.\n" +
    "Only include high-risk categories that actually apply to the job from this house list:\n- " +
    FRANK_HOUSE_MODEL.highRiskCategories.join("\n- ");

  let systemPrompt =
    "You are FRANK, J&M Art Steel's AI Safety Manager for steel fabrication and installation SWMS. " +
    "Write practical NSW builder-facing SWMS content for J&M jobs. " +
    "Be direct, site-specific, and concise. " +
    "Only include explicit standards references when the job is for University of Sydney.";

  if (includeStandards) {
    systemPrompt +=
      "\n\n## University of Sydney Standards / References\n" +
      "- AS 4100 (Steel Structures)\n" +
      "- AS/NZS 1554 (Structural Steel Welding)\n" +
      "- AS/NZS 1170 (Structural Design Actions)\n" +
      "- AS 1657 (Fixed Platforms, Walkways, Stairways)\n" +
      "- AS 4991 (Lifting Equipment)\n" +
      "- AS/NZS 1891 (Industrial Fall Arrest Systems)\n" +
      "- AS/NZS 4576 (Scaffolding)\n" +
      "- AS 2550 (Cranes - Safe Use)\n" +
      "- AS 1418 (Cranes, Hoists and Winches)\n" +
      "- AS 4839 (Safe Use of Portable Electrical Equipment)\n" +
      "- AS/NZS 1337 (Eye Protection)\n" +
      "- AS/NZS 1715 (Selection of Respiratory Protective Equipment)\n" +
      "- AS/NZS 1716 (Respiratory Protective Devices)\n" +
      "- AS/NZS 2161 (Occupational Protective Gloves)\n" +
      "- AS/NZS 2211 (Laser Safety)\n" +
      "- AS/NZS 1336 (Occupational Eye Protection)\n";
  }

  systemPrompt +=
    houseModelGuide;

  if (memoryMatches.length) {
    systemPrompt +=
      "\n\n## Your Past Experience (use to improve quality)\n" +
      "You have generated similar SWMS before:\n" +
      memoryMatches
        .map((item) => {
          const parts = [
            `- "${item.title}"`,
            `for ${item.builder || "unknown builder"}`,
            `at ${item.location || "unknown location"}`,
          ];
          if (item.stepCount !== null) {
            parts.push(`(${item.stepCount} steps`);
            if (includeStandards && item.standards.length) {
              parts.push(`standards: ${item.standards.join(", ")}`);
            }
            parts[parts.length - 1] += ")";
          }
          return parts.join(" ");
        })
        .join("\n") +
      "\nBuild on this experience. Improve step detail and hazard identification.";
  }

  if (regText) {
    systemPrompt += "\n\n## Recent Regulation Updates (incorporate where relevant)\n" + regText;
  }

  return systemPrompt;
}

function buildFrankUserPrompt(payload, includeStandards) {
  const today = sanitizeText(payload.date, 40) || new Date().toLocaleDateString("en-AU");
  const workers = sanitizeList(payload.workers, 20, 80);
  const selectedTasks = sanitizeList(payload.selectedTasks, 12, 80);
  return (
    "Generate a complete SWMS for the following job using J&M Art Steel's house SWMS model. Return ONLY valid JSON.\n\n" +
    "Job Description: " + sanitizeText(payload.jobDescription, 1000) + "\n" +
    (payload.jobNumber ? "Job Number: " + sanitizeText(payload.jobNumber, 80) + "\n" : "") +
    (payload.location ? "Location: " + sanitizeText(payload.location, 200) + "\n" : "") +
    (payload.builder ? "Builder/Client: " + sanitizeText(payload.builder, 120) + "\n" : "") +
    "Date: " + today + "\n" +
    (selectedTasks.length ? "Selected Tasks: " + selectedTasks.join(", ") + "\n" : "") +
    (workers.length ? "Worker Count: " + workers.length + "\n" : "") +
    "\nReturn JSON with this EXACT format:\n" +
    "{\n" +
    '  "project_name": "Project or site name if known or inferable",\n' +
    '  "builder_name": "Builder / client / PCBU if known or inferable",\n' +
    '  "site_location": "Site location / address if known or inferable",\n' +
    '  "title": "Short SWMS title",\n' +
    '  "detailed_description": "Detailed technical description of the work (2-3 sentences)",\n' +
    '  "high_risk_categories": ["list of applicable high-risk work categories"],\n' +
    '  "hazardous_substances": ["material / chemical - SDS note"],\n' +
    '  "emergency_rescue_plans": ["rescue plan or emergency rescue arrangement"],\n' +
    '  "plant_equipment": ["list of plant and equipment"],\n' +
    '  "steps": [\n' +
    "    {\n" +
    '      "step_number": "1",\n' +
      '      "job_step": "Description of step",\n' +
    '      "hazards": "Specific hazards and risks for this step",\n' +
    '      "risk_level": "H/M/L",\n' +
    '      "controls": "Long-form practical control measures covering permits, exclusion zones, plant separation, rescue planning, builder controls and practical safe work methods"\n' +
    "    }\n" +
    "  ],\n" +
    '  "emergency_procedures": "Site-specific emergency procedures",\n' +
    '  "review_method": "How the SWMS controls will be reviewed onsite",\n' +
    (includeStandards
      ? '  "standards": ["list of applicable AS/NZS standards for University of Sydney requirements"]\n'
      : '  "standards": []\n') +
    "}\n" +
    "Generate 6-8 detailed steps when the work scope is complex, otherwise 5-6. " +
    "Follow the house model sequence and write like a real J&M steel installation SWMS. " +
    "Do not give short generic controls. Make the controls practical, repetitive only where truly necessary, and builder/site specific where the attachment or job details require it. " +
    (includeStandards
      ? "Because this is a University of Sydney job, include a standards list only when the standards are genuinely relevant."
      : "This is not a University of Sydney job, so do not include a standards list and do not pad the controls with AS/NZS references.") +
    " Do not leave shell sections blank and do not use placeholder values." +
    (payload.attachedRequirements
      ? "\n\nADDITIONAL REQUIREMENTS (from attached document - " +
        sanitizeText(payload.attachedFilename || "file", 120) +
        "):\n" +
        sanitizeText(payload.attachedRequirements, 6000)
      : "")
  );
}

async function generateFrankSwms(payload, openrouterKey, anthropicKey = "") {
  if (!openrouterKey && !anthropicKey) {
    throw new Error("Hosted Frank generation is not configured (no Frank model provider key)");
  }

  const safePayload = payload && typeof payload === "object" ? payload : {};
  const jobDescription = sanitizeText(safePayload.jobDescription, 1000);
  if (jobDescription.length < 3) {
    throw { status: 400, detail: "Job description is required" };
  }

  const memoryMatches = [];
  const regText = sanitizeText(safePayload.regText, 4000);
  const includeStandards = isUniversitySydneyText(
    buildFrankContextText(safePayload, {
      title: safePayload.jobDescription,
      detailed_description: safePayload.attachedRequirements,
      project_name: safePayload.project_name,
      builder_name: safePayload.builder,
      site_location: safePayload.location,
    }),
  );
  const systemPrompt = buildFrankSystemPrompt(memoryMatches, regText, includeStandards) +
    "\n\nIMPORTANT: Output ONLY valid JSON. Do NOT use <think> tags or any reasoning. Just the JSON object.";
  const userPrompt = buildFrankUserPrompt({
    ...safePayload,
  jobDescription,
  }, includeStandards) + "\n\n/no_think";

  console.info("Frank generation request", {
    jobNumber: sanitizeText(safePayload.jobNumber, 80),
    builder: sanitizeText(safePayload.builder, 120),
    location: sanitizeText(safePayload.location, 200),
    includeStandards,
  });

  async function requestFrankJson(system, user, retryLabel = "") {
    console.info(`Frank OpenRouter call${retryLabel || ""} starting`);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: FRANK_GENERATION_MODEL,
        max_tokens: 2600,
        temperature: 0,
        stream: false,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
      }),
    });

    console.info(`Frank OpenRouter call${retryLabel || ""} response`, { status: response.status });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter failed${retryLabel}: ${response.status} ${text}`);
    }

    const rawText = await response.text();
    console.info(`Frank OpenRouter raw body${retryLabel || ""} length`, { length: rawText.length });
    try {
      return JSON.parse(rawText);
    } catch (error) {
      throw new Error(
        `OpenRouter returned invalid JSON${retryLabel}: ` +
        rawText.slice(0, 600),
      );
    }
  }

  async function requestFrankAnthropic(system, user, retryLabel = "") {
    console.info(`Frank Anthropic call${retryLabel || ""} starting`);
    const payload = await callAnthropicMessages({
      apiKey: anthropicKey,
      model: HUB_VISION_MODEL,
      maxTokens: 2600,
      temperature: 0,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = (payload?.content || [])
      .filter((item) => item && item.type === "text" && item.text)
      .map((item) => item.text)
      .join("\n")
      .trim();
    console.info(`Frank Anthropic response text${retryLabel || ""} length`, { length: text.length });
    return text;
  }

  async function parseFrankResponseText(providerName, getText) {
    const firstText = await getText();
    let parsed = tryParseFrankJson(firstText);

    if (!parsed) {
      console.warn(`Frank ${providerName} first parse failed`, {
        excerpt: normalizeFrankJsonCandidate(firstText).slice(0, 400),
      });
      const retrySystemPrompt =
        systemPrompt +
        "\n\nRETRY RULES: The previous response was not strict JSON. Return ONLY one valid JSON object. " +
        "No markdown fences. No commentary. No reasoning. No <think> tags. Every key must be double-quoted JSON.";
      const retryUserPrompt = userPrompt + "\n\nReturn the SWMS again as strict JSON only.";
      const retryText = await getText(retrySystemPrompt, retryUserPrompt, " (retry)");
      parsed = tryParseFrankJson(retryText);
      if (!parsed) {
        console.warn(`Frank ${providerName} retry parse failed`, {
          excerpt: normalizeFrankJsonCandidate(retryText).slice(0, 400),
        });
      }
    }

    return parsed;
  }

  let parsed = null;
  const providerErrors = [];

  if (anthropicKey) {
    try {
      parsed = await parseFrankResponseText("Anthropic", async (system = systemPrompt, user = userPrompt, retryLabel = "") =>
        requestFrankAnthropic(system, user, retryLabel),
      );
    } catch (error) {
      providerErrors.push(`Anthropic: ${error.message}`);
      console.warn("Frank Anthropic generation failed", { error: error.message });
    }
  }

  if (!parsed && openrouterKey) {
    try {
      parsed = await parseFrankResponseText("OpenRouter", async (system = systemPrompt, user = userPrompt, retryLabel = "") => {
        const payload = await requestFrankJson(system, user, retryLabel);
        return extractOpenRouterMessageText(payload);
      });
    } catch (error) {
      providerErrors.push(`OpenRouter: ${error.message}`);
      console.warn("Frank OpenRouter generation failed", { error: error.message });
    }
  }

  if (!parsed) {
    throw new Error(providerErrors.join(" | ") || "Could not parse SWMS response");
  }

  console.info("Frank parsed response", {
    topLevelKeys: Object.keys(parsed).slice(0, 20),
    stepCount: Array.isArray(parsed.steps) ? parsed.steps.length : null,
  });

  const sanitized = sanitizeFrankSwms(parsed, {
    ...safePayload,
    jobDescription,
    workers: safePayload.workers,
  });
  console.info("Frank sanitized SWMS", {
    title: sanitized.title,
    stepCount: sanitized.steps.length,
    hazardousSubstances: sanitized.hazardous_substances.length,
    plantEquipment: sanitized.plant_equipment.length,
  });
  return sanitized;
}

async function verifyApprovedDevice(firebaseToken) {
  if (!firebaseToken) {
    return { status: 401, detail: "Firebase device token required" };
  }

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(firebaseToken);
  } catch (error) {
    return { status: 401, detail: "Firebase device token rejected" };
  }

  const snapshot = await getDatabase()
    .ref(`jmart-safety/authDevices/${decoded.uid}`)
    .get();
  const deviceRecord = snapshot.val();
  if (!deviceRecord || !deviceRecord.approvedAt) {
    return { status: 403, detail: "Approved device required" };
  }
  return { uid: decoded.uid };
}

function parseMultipartUpload(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: FRANK_ATTACHMENT_MAX_BYTES,
      },
    });

    let fileFound = false;
    let tooLarge = false;
    let chunks = [];
    let filename = "attachment";
    let mimeType = "application/octet-stream";

    busboy.on("file", (_field, file, info) => {
      fileFound = true;
      filename = path.basename(info.filename || "attachment");
      mimeType = info.mimeType || "application/octet-stream";

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });
      file.on("limit", () => {
        tooLarge = true;
        file.resume();
      });
    });

    busboy.on("finish", () => {
      if (!fileFound) {
        reject({ status: 400, detail: "Attachment is required" });
        return;
      }
      if (tooLarge) {
        reject({ status: 413, detail: "Attachment exceeds 15 MB limit" });
        return;
      }

      const buffer = Buffer.concat(chunks);
      chunks = [];
      if (!buffer.length) {
        reject({ status: 400, detail: "Attachment is empty" });
        return;
      }
      resolve({ filename, mimeType, buffer });
    });

    busboy.on("error", () => {
      reject({ status: 400, detail: "Could not read attachment upload" });
    });

    if (req.rawBody) {
      busboy.end(req.rawBody);
      return;
    }
    req.pipe(busboy);
  });
}

async function extractPdfText(buffer) {
  try {
    const parsed = await pdfParse(buffer);
    return String(parsed.text || "").trim();
  } catch (error) {
    return "";
  }
}

async function extractWithOpenRouter(messages, apiKey) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: FRANK_ATTACHMENT_OPENROUTER_MODEL,
      messages,
      max_tokens: 2048,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  let text = payload?.choices?.[0]?.message?.content || "";
  if (Array.isArray(text)) {
    text = text
      .filter((item) => item && item.type === "text" && item.text)
      .map((item) => item.text)
      .join("\n");
  }
  text = String(text || "").trim();
  if (!text) {
    throw new Error("No requirements found in attachment");
  }
  return text;
}

async function extractWithAnthropic(contentBlock, prompt, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: HUB_VISION_MODEL,
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const text = (payload?.content || [])
    .filter((item) => item && item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();
  if (!text) {
    throw new Error("No requirements found in attachment");
  }
  return text;
}

async function extractRequirementsFromAttachment(filename, mediaType, buffer, secrets) {
  const ext = path.extname(filename || "").toLowerCase();
  if (ext === ".txt" || String(mediaType || "").startsWith("text/")) {
    return buffer.toString("utf8").trim();
  }

  const prompt = buildAttachmentPrompt();
  const openRouterKey = secrets.openRouterKey;
  const anthropicKey = secrets.anthropicKey;

  if (mediaType === "application/pdf" || ext === ".pdf") {
    const pdfText = await extractPdfText(buffer);
    if (openRouterKey && pdfText) {
      return extractWithOpenRouter(
        [
          {
            role: "user",
            content:
              "The following text was extracted from a PDF document.\n\n" +
              pdfText +
              "\n\n" +
              prompt,
          },
        ],
        openRouterKey,
      );
    }

    if (!anthropicKey) {
      throw new Error("Anthropic fallback is not configured for scanned PDFs");
    }

    return extractWithAnthropic(
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
      },
      prompt,
      anthropicKey,
    );
  }

  if (String(mediaType || "").startsWith("image/")) {
    if (openRouterKey) {
      try {
        return await extractWithOpenRouter(
          [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mediaType};base64,${buffer.toString("base64")}`,
                  },
                },
              ],
            },
          ],
          openRouterKey,
        );
      } catch (error) {
        if (!anthropicKey) {
          throw error;
        }
      }
    }

    if (!anthropicKey) {
      throw new Error("No Frank attachment provider is configured for images");
    }

    return extractWithAnthropic(
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: buffer.toString("base64"),
        },
      },
      prompt,
      anthropicKey,
    );
  }

  throw { status: 400, detail: "Unsupported attachment type" };
}

function buildHannaReceiptPrompt() {
  return (
    "Extract all data from this receipt. Return ONLY valid JSON:\n" +
    '{"store_name":"store name","date":"DD/MM/YYYY","subtotal":0.00,"gst":0.00,"total":0.00,' +
    '"items":[{"name":"item name","qty":1,"price":0.00}],"confidence":0.95}\n' +
    "Rules:\n" +
    "- All prices in AUD\n" +
    "- GST is 10% in Australia (calculate if not shown)\n" +
    "- confidence: 0.0-1.0 based on image clarity\n" +
    "- Return ONLY JSON, no other text"
  );
}

function sanitizeReceiptItem(value) {
  const safe = sanitizeObject(value);
  return {
    name: sanitizeText(safe.name, 240),
    qty: Number.isFinite(Number(safe.qty)) ? Number(safe.qty) : 1,
    price: Number.isFinite(Number(safe.price)) ? Number(safe.price) : 0,
  };
}

function sanitizeHannaReceipt(value) {
  const safe = sanitizeObject(value);
  return {
    store_name: sanitizeText(safe.store_name || safe.store, 240),
    date: sanitizeDate(safe.date),
    subtotal: Number.isFinite(Number(safe.subtotal)) ? Number(safe.subtotal) : 0,
    gst: Number.isFinite(Number(safe.gst)) ? Number(safe.gst) : 0,
    total: Number.isFinite(Number(safe.total)) ? Number(safe.total) : 0,
    items: Array.isArray(safe.items) ? safe.items.slice(0, 40).map(sanitizeReceiptItem) : [],
    confidence: Number.isFinite(Number(safe.confidence)) ? Number(safe.confidence) : 0,
  };
}

async function extractHannaReceiptData(filename, mediaType, buffer, secrets) {
  const ext = path.extname(filename || "").toLowerCase();
  const anthropicKey = secrets && secrets.anthropicKey ? secrets.anthropicKey : "";
  const prompt = buildHannaReceiptPrompt();
  let payload;

  if (String(mediaType || "").startsWith("image/")) {
    payload = await callAnthropicMessages({
      apiKey: anthropicKey,
      model: HUB_VISION_MODEL,
      maxTokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });
    return sanitizeHannaReceipt(extractJsonObject(extractResponseText(payload), "Receipt extraction returned invalid JSON"));
  }

  if (mediaType === "application/pdf" || ext === ".pdf") {
    const pdfText = await extractPdfText(buffer);
    if (pdfText) {
      payload = await callAnthropicMessages({
        apiKey: anthropicKey,
        model: HUB_VISION_MODEL,
        maxTokens: 1024,
        messages: [
          {
            role: "user",
            content:
              "The following text was extracted from a receipt PDF.\n\n" +
              pdfText +
              "\n\n" +
              prompt,
          },
        ],
      });
      return sanitizeHannaReceipt(extractJsonObject(extractResponseText(payload), "Receipt extraction returned invalid JSON"));
    }

    payload = await callAnthropicMessages({
      apiKey: anthropicKey,
      model: HUB_VISION_MODEL,
      maxTokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });
    return sanitizeHannaReceipt(extractJsonObject(extractResponseText(payload), "Receipt extraction returned invalid JSON"));
  }

  throw { status: 400, detail: "Unsupported receipt type" };
}

function buildVictorSearchPrompt(input) {
  const safe = sanitizeObject(input);
  const productName = sanitizeText(safe.productName, 160);
  const manufacturer = sanitizeText(safe.manufacturer, 160);
  const currentUrl = sanitizeText(safe.currentUrl, 600);
  const currentDate = sanitizeDate(safe.currentDate);
  const portal = sanitizeObject(safe.portal);
  const portalUrl = sanitizeText(portal.url, 400);
  const portalSds = sanitizeText(portal.sds, 400);
  const portalNote = sanitizeText(portal.note, 240);

  const portalHint = portalUrl
    ? "\n\nKNOWN SDS SOURCE" +
      (manufacturer ? " for " + manufacturer : "") +
      ":\n" +
      "- Manufacturer website: " + portalUrl + "\n" +
      (portalSds ? "- SDS portal/CDN: " + portalSds + "\n" : "") +
      (portalNote ? "- Tip: " + portalNote + "\n" : "") +
      (currentUrl ? "- The current PDF URL is: " + currentUrl + "\n" : "") +
      "- Check the same domain/path pattern for an updated version first.\n"
    : (currentUrl ? "\n\n- The current PDF URL is: " + currentUrl + "\n" : "\n\n") +
      "- Check the same domain for an updated version first.\n";

  return (
    "Find the latest Safety Data Sheet (SDS/MSDS) PDF URL for:\n" +
    "Product: " + productName + "\n" +
    "Manufacturer: " + (manufacturer || "unknown") + "\n\n" +
    "I need the MOST RECENT version of the SDS. The current one is dated " +
    currentDate +
    " and may be outdated." +
    portalHint +
    "\nSearch Strategy:\n" +
    "1. Check the known SDS source/portal listed above FIRST\n" +
    "2. Search the manufacturer official website\n" +
    "3. Look for Australian (.com.au) sources\n" +
    "4. Find direct PDF download links ending in .pdf\n" +
    "5. Prioritize the newest/most recent version available\n" +
    "6. Avoid aggregator sites\n\n" +
    "Return ONLY valid JSON:\n" +
    '{"msds_url":"https://...pdf or NOT_FOUND","msds_date":"YYYY-MM-DD or unknown","hazard_class":"class or unknown","signal_word":"Danger/Warning/None","summary":"brief summary","manufacturer":"company name"}'
  );
}

function sanitizeVictorSearchResult(value) {
  const safe = sanitizeObject(value);
  return {
    msds_url: sanitizeText(safe.msds_url, 800) || "NOT_FOUND",
    manufacturer: sanitizeText(safe.manufacturer, 160),
    msds_date: sanitizeDate(safe.msds_date),
    hazard_class: sanitizeText(safe.hazard_class, 240) || "unknown",
    signal_word: sanitizeText(safe.signal_word, 40) || "unknown",
    summary: sanitizeText(safe.summary, 500),
  };
}

async function searchVictorMsds(input, anthropicKey) {
  const payload = await callAnthropicMessages({
    apiKey: anthropicKey,
    model: HUB_WEB_SEARCH_MODEL,
    maxTokens: 1024,
    messages: [{ role: "user", content: buildVictorSearchPrompt(input) }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
  });
  return sanitizeVictorSearchResult(
    extractJsonObject(extractResponseText(payload), "Victor search returned invalid JSON"),
  );
}

function buildVictorAnalyzePrompt() {
  return (
    "Extract the following from this Safety Data Sheet (SDS/MSDS) and return ONLY valid JSON:\n" +
    '{\n  "name": "product name",\n  "manufacturer": "company name",\n' +
    '  "hazard_class": "GHS hazard classification or empty string",\n' +
    '  "signal_word": "Danger or Warning or None",\n' +
    '  "msds_date": "YYYY-MM-DD format, the revision/issue date",\n' +
    '  "summary": "1-2 sentence description of product and key hazards"\n}\n\n' +
    'Rules:\n- For msds_date, look for "Revision Date", "Date of Issue", "Date Prepared", or "SDS Date"\n' +
    '- If you cannot find a field, use empty string "" for text or "unknown" for msds_date\n' +
    "- Return ONLY the JSON, no other text"
  );
}

function sanitizeVictorAnalyzeResult(value) {
  const safe = sanitizeObject(value);
  return {
    name: sanitizeText(safe.name, 240),
    manufacturer: sanitizeText(safe.manufacturer, 160),
    hazard_class: sanitizeText(safe.hazard_class, 240),
    signal_word: sanitizeText(safe.signal_word, 40),
    msds_date: sanitizeDate(safe.msds_date),
    summary: sanitizeText(safe.summary, 500),
  };
}

async function extractVictorSdsData(filename, mediaType, buffer, secrets) {
  const ext = path.extname(filename || "").toLowerCase();
  const anthropicKey = secrets && secrets.anthropicKey ? secrets.anthropicKey : "";
  const prompt = buildVictorAnalyzePrompt();
  let payload;

  if (mediaType === "application/pdf" || ext === ".pdf") {
    const pdfText = await extractPdfText(buffer);
    if (pdfText) {
      payload = await callAnthropicMessages({
        apiKey: anthropicKey,
        model: HUB_VISION_MODEL,
        maxTokens: 1024,
        messages: [
          {
            role: "user",
            content:
              "The following text was extracted from an SDS PDF.\n\n" +
              pdfText +
              "\n\n" +
              prompt,
          },
        ],
      });
    } else {
      payload = await callAnthropicMessages({
        apiKey: anthropicKey,
        model: HUB_VISION_MODEL,
        maxTokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: buffer.toString("base64"),
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });
    }
    return sanitizeVictorAnalyzeResult(extractJsonObject(extractResponseText(payload), "Victor SDS extraction returned invalid JSON"));
  }

  throw { status: 400, detail: "Unsupported SDS type" };
}

function sanitizeRegChange(value) {
  const safe = sanitizeObject(value);
  return {
    title: sanitizeText(safe.title, 240),
    description: sanitizeText(safe.description, 600),
    effective_date: sanitizeText(safe.effective_date, 32) || "unknown",
    relevance: sanitizeText(safe.relevance, 16) || "unknown",
  };
}

async function searchFrankRegulations(input, anthropicKey) {
  const safe = sanitizeObject(input);
  const queries = sanitizeList(safe.queries, 8, 200);
  const allChanges = [];

  for (const query of queries) {
    const payload = await callAnthropicMessages({
      apiKey: anthropicKey,
      model: HUB_WEB_SEARCH_MODEL,
      maxTokens: 1024,
      messages: [
        {
          role: "user",
          content:
            'Search for: "' +
            query +
            '"\n\nReturn ONLY valid JSON with regulation changes relevant to steel fabrication and construction:\n' +
            '{"changes":[{"title":"...","description":"short description","effective_date":"YYYY-MM or unknown","relevance":"high/medium/low"}]}\n' +
            'If no changes found, return {"changes":[]}. Return ONLY JSON.',
        },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    });
    const parsed = sanitizeObject(
      extractJsonObject(extractResponseText(payload), "Frank regulation search returned invalid JSON"),
    );
    const changes = Array.isArray(parsed.changes) ? parsed.changes.map(sanitizeRegChange) : [];
    allChanges.push(...changes.filter((item) => item.title && item.description));
  }

  const unique = [];
  const seen = new Set();
  for (const change of allChanges) {
    const key = (change.title + "|" + change.effective_date).toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(change);
  }
  return unique;
}

exports.frankAttachmentExtract = onRequest(
  {
    region: "australia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: [
      /^https:\/\/jmart-steel-safety\.web\.app$/,
      /^https:\/\/jmart-steel-safety\.firebaseapp\.com$/,
      /^http:\/\/localhost(?::\d+)?$/,
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    ],
    secrets: [ANTHROPIC_API_KEY, OPENROUTER_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" });
      return;
    }

    try {
      const authResult = await verifyApprovedDevice(req.get("x-firebase-token"));
      if (authResult.status) {
        res.status(authResult.status).json({ success: false, detail: authResult.detail });
        return;
      }

      const { filename, mimeType, buffer } = await parseMultipartUpload(req);
      const allowedTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "text/plain",
      ]);
      const allowedExts = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".txt"]);
      const ext = path.extname(filename).toLowerCase();
      if (!allowedTypes.has(mimeType) || !allowedExts.has(ext)) {
        res.status(400).json({ success: false, detail: "Unsupported attachment type" });
        return;
      }

      const requirements = await extractRequirementsFromAttachment(filename, mimeType, buffer, {
        anthropicKey: ANTHROPIC_API_KEY.value() || "",
        openRouterKey: OPENROUTER_API_KEY.value() || "",
      });

      res.json({
        success: true,
        filename,
        requirements,
      });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && "detail" in error) {
        res.status(error.status).json({ success: false, detail: error.detail });
        return;
      }

      const message =
        error && typeof error.message === "string"
          ? error.message
          : "Failed to extract requirements from attachment";
      res.status(500).json({ success: false, error: message });
    }
  },
);

exports.hannaScanReceipt = onRequest(
  {
    region: "australia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: [
      /^https:\/\/jmart-steel-safety\.web\.app$/,
      /^https:\/\/jmart-steel-safety\.firebaseapp\.com$/,
      /^http:\/\/localhost(?::\d+)?$/,
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    ],
    secrets: [ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" });
      return;
    }

    try {
      const authResult = await verifyApprovedDevice(req.get("x-firebase-token"));
      if (authResult.status) {
        res.status(authResult.status).json({ success: false, detail: authResult.detail });
        return;
      }

      const { filename, mimeType, buffer } = await parseMultipartUpload(req);
      const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
      const allowedExts = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);
      const ext = path.extname(filename).toLowerCase();
      if (!allowedTypes.has(mimeType) || !allowedExts.has(ext)) {
        res.status(400).json({ success: false, detail: "Unsupported receipt type" });
        return;
      }

      const receipt = await extractHannaReceiptData(filename, mimeType, buffer, {
        anthropicKey: ANTHROPIC_API_KEY.value() || "",
      });
      res.json({ success: true, receipt });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && "detail" in error) {
        res.status(error.status).json({ success: false, detail: error.detail });
        return;
      }

      const message =
        error && typeof error.message === "string"
          ? error.message
          : "Failed to scan receipt";
      res.status(500).json({ success: false, error: message });
    }
  },
);

exports.victorSearchMsds = onRequest(
  {
    region: "australia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: [
      /^https:\/\/jmart-steel-safety\.web\.app$/,
      /^https:\/\/jmart-steel-safety\.firebaseapp\.com$/,
      /^http:\/\/localhost(?::\d+)?$/,
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    ],
    secrets: [ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" });
      return;
    }

    try {
      const authResult = await verifyApprovedDevice(req.get("x-firebase-token"));
      if (authResult.status) {
        res.status(authResult.status).json({ success: false, detail: authResult.detail });
        return;
      }

      const result = await searchVictorMsds(req.body || {}, ANTHROPIC_API_KEY.value() || "");
      res.json({ success: true, result });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && "detail" in error) {
        res.status(error.status).json({ success: false, detail: error.detail });
        return;
      }

      const message =
        error && typeof error.message === "string"
          ? error.message
          : "Failed to search Victor SDS";
      res.status(500).json({ success: false, error: message });
    }
  },
);

exports.victorAnalyzeSds = onRequest(
  {
    region: "australia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: [
      /^https:\/\/jmart-steel-safety\.web\.app$/,
      /^https:\/\/jmart-steel-safety\.firebaseapp\.com$/,
      /^http:\/\/localhost(?::\d+)?$/,
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    ],
    secrets: [ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" });
      return;
    }

    try {
      const authResult = await verifyApprovedDevice(req.get("x-firebase-token"));
      if (authResult.status) {
        res.status(authResult.status).json({ success: false, detail: authResult.detail });
        return;
      }

      const { filename, mimeType, buffer } = await parseMultipartUpload(req);
      const allowedTypes = new Set(["application/pdf"]);
      const allowedExts = new Set([".pdf"]);
      const ext = path.extname(filename).toLowerCase();
      if (!allowedTypes.has(mimeType) || !allowedExts.has(ext)) {
        res.status(400).json({ success: false, detail: "Unsupported SDS type" });
        return;
      }

      const result = await extractVictorSdsData(filename, mimeType, buffer, {
        anthropicKey: ANTHROPIC_API_KEY.value() || "",
      });
      res.json({ success: true, result });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && "detail" in error) {
        res.status(error.status).json({ success: false, detail: error.detail });
        return;
      }

      const message =
        error && typeof error.message === "string"
          ? error.message
          : "Failed to analyze SDS";
      res.status(500).json({ success: false, error: message });
    }
  },
);

exports.frankSearchRegulations = onRequest(
  {
    region: "australia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: [
      /^https:\/\/jmart-steel-safety\.web\.app$/,
      /^https:\/\/jmart-steel-safety\.firebaseapp\.com$/,
      /^http:\/\/localhost(?::\d+)?$/,
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    ],
    secrets: [ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" });
      return;
    }

    try {
      const authResult = await verifyApprovedDevice(req.get("x-firebase-token"));
      if (authResult.status) {
        res.status(authResult.status).json({ success: false, detail: authResult.detail });
        return;
      }

      const changes = await searchFrankRegulations(req.body || {}, ANTHROPIC_API_KEY.value() || "");
      res.json({ success: true, changes });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && "detail" in error) {
        res.status(error.status).json({ success: false, detail: error.detail });
        return;
      }

      const message =
        error && typeof error.message === "string"
          ? error.message
          : "Failed to search Frank regulation updates";
      res.status(500).json({ success: false, error: message });
    }
  },
);

exports.frankGenerateSwms = onRequest(
  {
    region: "australia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: [
      /^https:\/\/jmart-steel-safety\.web\.app$/,
      /^https:\/\/jmart-steel-safety\.firebaseapp\.com$/,
      /^http:\/\/localhost(?::\d+)?$/,
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    ],
    secrets: [OPENROUTER_API_KEY, ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed" });
      return;
    }

    try {
      const authResult = await verifyApprovedDevice(req.get("x-firebase-token"));
      if (authResult.status) {
        res.status(authResult.status).json({ success: false, detail: authResult.detail });
        return;
      }

      const swmsData = await generateFrankSwms(
        req.body,
        OPENROUTER_API_KEY.value() || "",
        ANTHROPIC_API_KEY.value() || "",
      );
      console.info("Frank response ready", {
        title: swmsData.title,
        stepCount: Array.isArray(swmsData.steps) ? swmsData.steps.length : 0,
      });
      res.json({ success: true, swmsData });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && "detail" in error) {
        res.status(error.status).json({ success: false, detail: error.detail });
        return;
      }

      const message =
        error && typeof error.message === "string"
          ? error.message
          : "Failed to generate SWMS";
      console.error("frankGenerateSwms failed", {
        message,
        stack: error && typeof error.stack === "string" ? error.stack : null,
      });
      res.status(500).json({ success: false, error: message });
    }
  },
);
