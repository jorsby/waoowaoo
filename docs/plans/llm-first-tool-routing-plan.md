# LLM-first Tool Routing Plan

## Scope

This plan covers the item described in `docs/agent/agent_gap_and_plan.md` under:

- `实现 LLM-first 路由并移除规则兜底`
- 同时移除用户显式 `tools` 开关/配置入口

This file is intentionally a review plan only. It does not imply the code path has been switched yet.

## Why Change

The current assistant runtime still relies on rule-based routing:

- `src/lib/project-agent/router.ts` uses keyword heuristics to derive `intent / domains / nodeId`
- `src/lib/project-agent/tool-policy.ts` scores tools from that rule result
- `WorkspaceAssistantPanel` still exposes `ToolConfigModal`, which leaks internal routing details into user UI

That design has two structural problems:

1. Rule routing is brittle for low-frequency requests and mixed-intent turns.
2. User-facing tool toggles create a second control plane that conflicts with the product decision of "assistant decides tools, user reviews plans/results".

## Target State

1. The runtime performs a dedicated LLM routing call before the main agent turn.
2. The router returns structured categories instead of raw operation allowlists.
3. Tool selection consumes router categories plus phase/context constraints.
4. If routing output is invalid, low-confidence, or ambiguous, the assistant must ask a clarification question or fail explicitly.
5. The assistant UI no longer exposes tool on/off configuration.

## Proposed Design

### 1. Replace rule router with an LLM router

Files:

- `src/lib/project-agent/router.ts`
- `src/lib/project-agent/runtime.ts`
- new: `src/lib/project-agent/router-schema.ts`
- new: `src/lib/project-agent/router-prompt.ts`

Plan:

- Keep `router.ts` as the orchestration entry, but replace keyword inference with `generateObject`/schema-validated model output.
- Router output should be strict and minimal:
  - `intent: 'query' | 'plan' | 'act'`
  - `domains: string[]`
  - `toolCategories: string[]`
  - `confidence: number`
  - `needsClarification: boolean`
  - `clarifyingQuestion: string | null`
  - `reasoning: string[]`
- The router prompt should only see:
  - latest user request
  - compact conversation summary
  - current phase snapshot summary
  - coarse stage / episode context
- The router must not see the full operation registry text.

### 2. Move tool policy input from nodeId to categories

Files:

- `src/lib/project-agent/tool-policy.ts`
- operation tool meta producers under `src/lib/operations/**`

Plan:

- Replace `nodeId -> desiredTags/scopes/riskBudget` as the primary selector with:
  - `toolCategories`
  - `intent`
  - `domains`
  - `riskBudget`
- Add an explicit `tool.category` field in operation meta.
- Keep phase constraints, scope constraints, confirmation gates, and risk filtering as deterministic checks.
- Remove keyword-only routing scores once the LLM router is live.

### 3. Remove explicit tool configuration UI and persistence

Files:

- `src/features/project-workspace/components/WorkspaceAssistantPanel.tsx`
- `src/features/project-workspace/components/workspace-assistant/ToolConfigModal.tsx`
- `src/lib/project-agent/tool-selection.ts`
- `src/lib/project-agent/tool-selection-store.ts`
- `src/app/api/projects/[projectId]/assistant/tool-selection/route.ts`
- `src/app/api/projects/[projectId]/assistant/tool-catalog/route.ts`
- `src/lib/query/hooks/useProjectAssistantToolSelection.ts`

Plan:

- Delete the settings button and `ToolConfigModal` from the workspace assistant panel.
- Remove tool selection query/mutation hooks and storage route.
- Keep `tool-catalog` only if it still serves internal inspection/testing; otherwise remove it too.
- Delete `toolSelection` from runtime context once nothing writes it anymore.

### 4. Clarification-first failure semantics

Files:

- `src/lib/project-agent/runtime.ts`
- `src/lib/project-agent/router.ts`
- renderers around assistant question / approval cards if needed

Plan:

- If router returns:
  - invalid schema
  - `confidence < threshold`
  - conflicting categories
  - `needsClarification = true`
- Then runtime must not silently continue with heuristic fallback.
- Runtime should append a clarification assistant message and stop the turn.

## Migration Order

1. Add router schema + prompt + isolated unit tests.
2. Introduce LLM router execution in runtime behind a temporary internal flag.
3. Update `tool-policy.ts` to consume categories instead of `nodeId`.
4. Remove heuristic fallback.
5. Remove tool configuration UI, query hooks, routes, and persistence.
6. Delete obsolete `tool-selection` code paths and related tests.

## Tests Required

- `tests/unit/project-agent/router.test.ts`
  - valid schema output
  - low confidence -> clarification
  - invalid output -> explicit failure
  - mixed-intent request -> correct category split
- `tests/unit/project-agent/tool-policy.test.ts`
  - category-driven selection
  - no hidden fallback to disabled categories
- `tests/integration/api/contract/project-assistant-chat.route.test.ts`
  - router clarification response path
- `tests/system/long-conversation.test.ts`
  - long context + router + main turn still stay within bounded message window
- Remove or replace:
  - `project-assistant-tool-selection.route.test.ts`
  - UI tests around `ToolConfigModal` if any are added before migration

## Open Decisions For Review

1. Router model:
   - Reuse `analysisModel`
   - Or add a dedicated cheap routing model

2. Category granularity:
   - coarse: `workflow / asset / storyboard / run / config`
   - fine: more precise categories such as `panel-media-generate`, `voice-binding`, `governance-undo`

3. Clarification threshold:
   - fixed confidence threshold
   - or threshold + conflict rules together

4. Whether `tool-catalog` remains as an internal diagnostics endpoint after UI removal

## Recommended Review Outcome

Review this plan first, then implement in two commits:

1. `refactor(agent): switch routing to llm-first categories`
2. `refactor(agent): remove explicit tool selection ui and storage`
