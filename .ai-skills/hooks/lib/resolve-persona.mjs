/**
 * Resolves which persona is active from a hook payload.
 *
 * The resolution order prevents fleet-lane collisions: the orchestrated path reads
 * agent_type directly from the payload (race-free, no shared file), while the solo path
 * falls back to .prism/active-persona (safe because solo = single persona owns the
 * session). See ADR-0067 § Persona identity resolves payload-first.
 *
 * @param {object} payload - The parsed hook input JSON.
 * @param {object} gatesData - The parsed gates.json data (persona key → PersonaGateEntry).
 * @param {string} projectDir - The resolved $CLAUDE_PROJECT_DIR path.
 * @returns {{ persona: string } | null} The resolved persona key, or null when the
 *   dispatch is not gated (non-persona agent_type or no active-persona file).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

export function resolvePersona(payload, gatesData, projectDir) {
  // (1) Orchestrated path: agent_type present in payload.
  // When Claude Code runs a subagent (--agent or SubagentStop context), it populates
  // agent_type with the agent name (e.g. "prism-code-dev", "Explore", "general-purpose").
  if (payload.agent_type) {
    const agentType = payload.agent_type;

    // Map agent_type to a gates.json key. The convention: agent_type matches the
    // skill's slash-command ID (e.g. "prism-code-dev" → gates key "clove").
    // The gates.json persona key is what the report contract's "persona" field contains.
    const personaKey = resolveAgentTypeToKey(agentType, gatesData);

    if (personaKey !== null) {
      return { persona: personaKey };
    }

    // agent_type present but not a gated persona (e.g. "Explore", "general-purpose").
    // This dispatch is not under enforcement — exit 0, stay out of the way.
    return null;
  }

  // (2) Solo path: no agent_type means main-loop solo session.
  // Read .prism/active-persona, which the skill writes on startup.
  // Safe because solo = single persona; no fleet concurrency risk.
  const activePersonaPath = path.join(projectDir, '.prism', 'active-persona');
  try {
    const raw = readFileSync(activePersonaPath, 'utf8').trim();
    if (raw && gatesData[raw]) {
      return { persona: raw };
    }
    // File exists but contains an unrecognized key — not a gated dispatch.
    return null;
  } catch {
    // File absent: solo session with no active persona declared.
    // Not a gated dispatch — enforcement stays out of the way.
    return null;
  }
}

/**
 * Maps an agent_type value to a gates.json persona key.
 *
 * Convention: agent_type is the skill's slash-command ID (e.g. "prism-code-dev");
 * the gates.json key is the persona's short name (e.g. "clove"). The mapping is
 * resolved by checking whether agent_type itself is a gates key, then by checking
 * the skillId-to-personaKey mapping derived from the gates data.
 *
 * Phase 5 can add an explicit agentType field to each PersonaGateEntry when the
 * ID-to-key mapping needs to be more explicit; for Phase 1 the naming convention
 * is sufficient.
 *
 * @param {string} agentType - The agent_type value from the hook payload.
 * @param {object} gatesData - Parsed gates.json data.
 * @returns {string | null} The persona key, or null if not mapped.
 */
function resolveAgentTypeToKey(agentType, gatesData) {
  // Direct match: agent_type is already a gates key (e.g. a persona that registered
  // its gates key as its agent type).
  if (gatesData[agentType]) {
    return agentType;
  }

  // Convention mapping: skill ID → persona key.
  // Skill IDs follow the pattern "prism-<persona-name>" or similar.
  // Check each gates entry for a matching skill_id field (Phase 5 may add this);
  // for now, derive the key from the naming convention.
  const SKILL_ID_TO_PERSONA = {
    'prism-code-dev': 'clove',
    'prism-code-review-self': 'briar',
    'prism-code-review-pr': 'eric',
    'prism-architect': 'winston',
    'prism-debugger': 'sasha',
    'prism-documentation': 'eli',
    'prism-design': 'pixel',
    'prism-ticket-start': 'nora',
    'prism-user-stories': 'mira',
    'prism-qa-test-plan': 'reese',
    'prism-changelog': 'sage',
    'prism-doc-walker': 'theo',
    'prism-surface-audit': 'zoe',
    'prism-onboarding': 'atlas',
    'prism-retro': 'iris',
    'prism-refactor-scout': 'ren',
    'prism-standup-summary': 'lilac',
    'prism-prd': 'parker',
    'prism-conductor': 'sol',
    'prism-founder': 'vera',
    'prism-market-research': 'kora',
    'prism-finance': 'ellis',
    'prism-marketing': 'charlie',
    'prism-sales': 'quinn',
    'prism-data': 'tess',
    'prism-customer-success': 'remy',
    'prism-recruiting': 'penny',
    'prism-legal': 'lex',
    'prism-skill-forge': 'skill-forge',
  };

  const mappedKey = SKILL_ID_TO_PERSONA[agentType];
  if (mappedKey && gatesData[mappedKey]) {
    return mappedKey;
  }

  return null;
}
