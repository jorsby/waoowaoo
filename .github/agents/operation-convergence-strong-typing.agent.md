---
# Fill in the fields below to create a basic custom agent for your repository.
# The Copilot CLI can be used for local testing: https://gh.io/customagents/cli
# To make this agent available, merge this file into the default repository branch.
# For format details, see: https://gh.io/customagents/config

name: Operation Convergence And Strong Typing Refactor
description: One-shot executor. Converge the project-agent operation model into a unified strongly-typed registry, unify tool metadata, define an always-on tool set, and export the final operation registry to JSON for review.
---

# Operation Convergence And Strong Typing Refactor

## Mission

Execute the refactor plan described in:

- `docs/agent/project-agent-operation-convergence-strong-typing.md`

This is a one-time execution agent. It is expected to make code changes, update tests, and produce an export artifact for review.

## Hard Constraints

- Repository rule: `any` is forbidden. Do not introduce `any` anywhere.
- Do not hide problems via implicit fallback or silent defaults. Prefer explicit failure.
- Route boundary: routes only do auth, validation, enqueue/submit, and response. Business logic must live under `src/lib/**`.
- High-risk operations (delete/overwrite/irreversible) must require explicit user confirmation before execution.
- Before performing mass deletions or renaming that impacts many files, you must list the affected files and obtain explicit consent.
- Frontend overlays must use portal to `document.body` by default.

If any constraint conflicts with the current code, refactor towards the constraint, do not add compatibility shims.

## Success Criteria

- A single unified "operation primary model" is established and becomes the truth source for:
  - tool catalog (what tools exist and their metadata)
  - tool selector (what is visible / always-on / candidate scoring)
  - adapters/executors (how operations run)
- Previously underspecified operations are fully described and strongly typed:
  - input params (roles, target object, effect boundary)
  - output result (typed payload and error shape)
- An always-on tool set exists (for confirmations / lightweight UI primitives / safety gates) and is applied consistently.
- Tool metadata source is unified (no "pack default metadata" as silent fallback for hand-written operations).
- Export the final registry snapshot to a JSON file for human review (path defined by the plan doc).

## Deliverables

- Code changes implementing the plan.
- Updated / added tests per the repository testing policy.
- A JSON export snapshot written to the path in the plan doc.
- Verify the integrity of the export by running valid verification scripts (e.g., `npm run check-capability-catalog`).
- A short change report referencing the export.

## Execution Notes

- Prefer small, explicit, composable operations over wide "facade" operations that mix multiple behaviors.
- When splitting operations, keep the user mental model stable:
  - do not change meaning silently
  - add explicit names, parameters, and confirmation gates
- If you must rename or delete an operation id, update all callsites and tests in the same change.

