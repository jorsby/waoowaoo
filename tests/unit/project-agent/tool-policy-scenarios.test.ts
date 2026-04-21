import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { PROJECT_PHASE, type ProjectPhaseSnapshot } from '@/lib/project-agent/project-phase'
import type { ProjectAgentOperationDefinition, ProjectAgentOperationRegistry } from '@/lib/operations/types'
import type { ProjectAgentRouteDecision } from '@/lib/project-agent/router'
import { selectProjectAgentTools, type ProjectAgentToolSelectionResult } from '@/lib/project-agent/tool-policy'

/**
 * Real-world scenario regression tests for tool selection policy.
 *
 * These tests simulate realistic operation registries and routing decisions
 * to verify edge cases, multi-domain requests, phase-action interactions,
 * and risk boundary behavior.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPhase(overrides: Partial<ProjectPhaseSnapshot> = {}): ProjectPhaseSnapshot {
  return {
    phase: PROJECT_PHASE.STORYBOARD_READY,
    progress: { clipCount: 3, screenplayClipCount: 3, storyboardCount: 3, panelCount: 18, voiceLineCount: 0 },
    activeRuns: [],
    activeRunCount: 0,
    failedItems: [],
    staleArtifacts: [],
    availableActions: { actMode: [], planMode: [] },
    ...overrides,
  }
}

function buildRoute(partial: Partial<ProjectAgentRouteDecision>): ProjectAgentRouteDecision {
  return {
    intent: 'query',
    domains: ['unknown'],
    confidence: 0.9,
    toolCategories: ['project-overview'],
    needsClarification: false,
    clarifyingQuestion: null,
    reasoning: ['test'],
    latestUserText: 'test',
    ...partial,
  }
}

function op(id: string, overrides: Partial<ProjectAgentOperationDefinition>): ProjectAgentOperationDefinition {
  return {
    id,
    description: overrides.description ?? id,
    scope: overrides.scope ?? 'project',
    sideEffects: overrides.sideEffects ?? { mode: 'query', risk: 'low' },
    channels: overrides.channels ?? { tool: true, api: true },
    tool: overrides.tool ?? { defaultVisibility: 'core', tags: ['read', 'project'], groups: ['read'], selectable: true },
    selection: overrides.selection ?? { baseWeight: 50, costHint: 'low' },
    inputSchema: z.object({}),
    outputSchema: z.unknown(),
    execute: async () => ({}),
  }
}

function select(params: {
  operations: ProjectAgentOperationRegistry
  route: Partial<ProjectAgentRouteDecision>
  context?: Record<string, string | undefined>
  phase?: Partial<ProjectPhaseSnapshot>
  maxTools?: number
}): ProjectAgentToolSelectionResult {
  return selectProjectAgentTools({
    operations: params.operations,
    context: params.context ?? { episodeId: 'ep-1' },
    phase: buildPhase(params.phase),
    route: buildRoute(params.route),
    maxTools: params.maxTools ?? 45,
  })
}

// ---------------------------------------------------------------------------
// Realistic operation set (mirrors real registry meta from project-agent.ts)
// ---------------------------------------------------------------------------

function buildRealisticRegistry(): ProjectAgentOperationRegistry {
  return {
    get_project_phase: op('get_project_phase', {
      description: 'Resolve the current project phase, progress counts, active runs, failed items, stale artifacts, and available next actions.',
      scope: 'project',
      sideEffects: { mode: 'query', risk: 'none' },
      tool: { defaultVisibility: 'core', tags: ['read', 'project'], groups: ['read'], selectable: true },
      selection: { baseWeight: 70, costHint: 'low' },
    }),
    get_project_snapshot: op('get_project_snapshot', {
      description: 'Load a project snapshot projection with progress, active runs, latest artifacts, and approvals.',
      scope: 'project',
      sideEffects: { mode: 'query', risk: 'low' },
      tool: { defaultVisibility: 'core', tags: ['read', 'project'], groups: ['read'], selectable: true },
      selection: { baseWeight: 70, costHint: 'low' },
    }),
    get_project_context: op('get_project_context', {
      description: 'Load the current project and episode context snapshot.',
      scope: 'project',
      sideEffects: { mode: 'query', risk: 'low' },
      tool: { defaultVisibility: 'core', tags: ['read', 'project'], groups: ['read'], selectable: true },
      selection: { baseWeight: 70, costHint: 'low' },
    }),
    list_workflow_packages: op('list_workflow_packages', {
      description: 'List available workflow packages and skill catalog entries.',
      scope: 'system',
      sideEffects: { mode: 'query', risk: 'none' },
      tool: { defaultVisibility: 'scenario', tags: ['workflow'], groups: ['workflow', 'plan'], selectable: true },
      selection: { baseWeight: 45, costHint: 'low' },
    }),
    create_workflow_plan: op('create_workflow_plan', {
      description: 'Create a workflow execution plan for approval.',
      scope: 'plan',
      sideEffects: { mode: 'plan', risk: 'low' },
      tool: { defaultVisibility: 'scenario', tags: ['workflow'], groups: ['workflow', 'plan'], selectable: true },
      selection: { baseWeight: 45, costHint: 'low' },
    }),
    approve_plan: op('approve_plan', {
      description: 'Approve a pending workflow plan.',
      scope: 'plan',
      sideEffects: { mode: 'plan', risk: 'medium' },
      tool: { defaultVisibility: 'scenario', tags: ['workflow'], groups: ['workflow', 'plan'], selectable: true },
      selection: { baseWeight: 45, costHint: 'low' },
    }),
    list_runs: op('list_runs', {
      description: 'List workflow runs for the project.',
      scope: 'command',
      sideEffects: { mode: 'query', risk: 'low' },
      tool: { defaultVisibility: 'core', tags: ['run'], groups: ['run'], selectable: true },
      selection: { baseWeight: 55, costHint: 'low' },
    }),
    cancel_run: op('cancel_run', {
      description: 'Cancel a running workflow run.',
      scope: 'command',
      sideEffects: { mode: 'act', risk: 'medium' },
      tool: { defaultVisibility: 'core', tags: ['run'], groups: ['run'], selectable: true },
      selection: { baseWeight: 55, costHint: 'low' },
    }),
    list_tasks: op('list_tasks', {
      description: 'List tasks for the current project.',
      scope: 'task',
      sideEffects: { mode: 'query', risk: 'low' },
      tool: { defaultVisibility: 'core', tags: ['task'], groups: ['task'], selectable: true },
      selection: { baseWeight: 55, costHint: 'low' },
    }),
    cancel_task: op('cancel_task', {
      description: 'Cancel a pending task.',
      scope: 'task',
      sideEffects: { mode: 'act', risk: 'medium' },
      tool: { defaultVisibility: 'core', tags: ['task'], groups: ['task'], selectable: true },
      selection: { baseWeight: 55, costHint: 'low' },
    }),
    mutate_storyboard: op('mutate_storyboard', {
      description: 'Edit storyboard: add/update/delete panel fields, prompts, or panels.',
      scope: 'storyboard',
      sideEffects: { mode: 'act', risk: 'medium' },
      channels: { tool: true, api: true },
      tool: { defaultVisibility: 'extended', tags: ['edit', 'asset', 'storyboard'], groups: ['edit'], selectable: true, requiresEpisode: true },
      selection: { baseWeight: 20, costHint: 'low' },
    }),
    regenerate_panel_image: op('regenerate_panel_image', {
      description: 'Regenerate a panel image by submitting an async task.',
      scope: 'panel',
      sideEffects: { mode: 'act', risk: 'medium', billable: true, requiresConfirmation: true, longRunning: true },
      tool: { defaultVisibility: 'scenario', tags: ['media', 'panel', 'storyboard'], groups: ['media'], selectable: true, requiresEpisode: true },
      selection: { baseWeight: 30, costHint: 'high' },
    }),
    generate_character_image: op('generate_character_image', {
      description: 'Generate character appearance images.',
      scope: 'asset',
      sideEffects: { mode: 'act', risk: 'medium', billable: true, requiresConfirmation: true },
      tool: { defaultVisibility: 'scenario', tags: ['media', 'panel', 'storyboard'], groups: ['media'], selectable: true },
      selection: { baseWeight: 30, costHint: 'high' },
    }),
    generate_location_image: op('generate_location_image', {
      description: 'Generate location scene images.',
      scope: 'asset',
      sideEffects: { mode: 'act', risk: 'medium', billable: true, requiresConfirmation: true },
      tool: { defaultVisibility: 'scenario', tags: ['media', 'panel', 'storyboard'], groups: ['media'], selectable: true },
      selection: { baseWeight: 30, costHint: 'high' },
    }),
    voice_generate: op('voice_generate', {
      description: 'Generate voice lines for an episode.',
      scope: 'episode',
      sideEffects: { mode: 'act', risk: 'medium', billable: true, requiresConfirmation: true },
      tool: { defaultVisibility: 'scenario', tags: ['media', 'panel', 'storyboard'], groups: ['media'], selectable: true, requiresEpisode: true },
      selection: { baseWeight: 30, costHint: 'high' },
    }),
    generate_video: op('generate_video', {
      description: 'Generate video for panels.',
      scope: 'panel',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true },
      tool: { defaultVisibility: 'scenario', tags: ['video', 'media'], groups: ['video'], selectable: true, requiresEpisode: true },
      selection: { baseWeight: 30, costHint: 'high' },
    }),
    get_user_model_configs: op('get_user_model_configs', {
      description: 'Get user model configuration and API keys.',
      scope: 'user',
      sideEffects: { mode: 'query', risk: 'low' },
      tool: { defaultVisibility: 'extended', tags: ['config'], groups: ['config', 'models'], selectable: true },
      selection: { baseWeight: 25, costHint: 'low' },
    }),
    get_billing_summary: op('get_billing_summary', {
      description: 'Get current project billing and usage summary.',
      scope: 'project',
      sideEffects: { mode: 'query', risk: 'low' },
      tool: { defaultVisibility: 'extended', tags: ['billing'], groups: ['billing'], selectable: true },
      selection: { baseWeight: 20, costHint: 'low' },
    }),
    list_recent_mutation_batches: op('list_recent_mutation_batches', {
      description: 'List recent mutation batches that can be reverted (undo).',
      scope: 'mutation-batch',
      sideEffects: { mode: 'query', risk: 'low' },
      tool: { defaultVisibility: 'guarded', tags: ['governance'], groups: ['governance'], selectable: false },
      selection: { baseWeight: -20, costHint: 'high' },
    }),
    revert_mutation_batch: op('revert_mutation_batch', {
      description: 'Revert (undo) a mutation batch by id.',
      scope: 'mutation-batch',
      sideEffects: { mode: 'plan', risk: 'high', requiresConfirmation: true, destructive: true },
      tool: { defaultVisibility: 'guarded', tags: ['governance'], groups: ['governance'], selectable: false },
      selection: { baseWeight: -20, costHint: 'high' },
    }),
    download_project: op('download_project', {
      description: 'Download project assets as a zip archive.',
      scope: 'project',
      sideEffects: { mode: 'act', risk: 'low' },
      tool: { defaultVisibility: 'extended', tags: ['download'], groups: ['download'], selectable: true },
      selection: { baseWeight: 15, costHint: 'medium' },
    }),
    hidden_sse_debug: op('hidden_sse_debug', {
      description: 'Debug SSE stream (internal only).',
      scope: 'system',
      sideEffects: { mode: 'query', risk: 'none' },
      tool: { defaultVisibility: 'hidden', tags: ['debug', 'sse'], groups: ['debug'], selectable: false },
      selection: { baseWeight: -100, costHint: 'low' },
    }),
  }
}

// ---------------------------------------------------------------------------
// Scenario tests
// ---------------------------------------------------------------------------

describe('tool-policy real-world scenarios', () => {
  const registry = buildRealisticRegistry()

  // --- Multi-domain scenarios ---

  it('multi-domain: storyboard-edit + panel-media includes both edit and media tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['storyboard'],
        toolCategories: ['storyboard-edit', 'panel-media'],
      },
    })

    expect(result.operationIds).toContain('mutate_storyboard')
    expect(result.operationIds).toContain('regenerate_panel_image')
    expect(result.operationIds).toContain('get_project_phase')
  })

  it('multi-domain: workflow-plan + project-overview includes plan and read tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'plan',
        domains: ['workflow', 'project'],
        toolCategories: ['workflow-plan', 'project-overview'],
      },
    })

    expect(result.operationIds).toContain('create_workflow_plan')
    expect(result.operationIds).toContain('list_workflow_packages')
    expect(result.operationIds).toContain('get_project_phase')
    expect(result.operationIds).not.toContain('regenerate_panel_image')
  })

  it('multi-domain: asset-character + asset-voice includes both asset categories', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['asset', 'voice'],
        toolCategories: ['asset-character', 'asset-voice'],
      },
    })

    expect(result.operationIds).toContain('generate_character_image')
    expect(result.operationIds).toContain('voice_generate')
  })

  // --- Phase-action interaction ---

  it('phase actMode: boosts operations listed in availableActions.actMode', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['storyboard'],
        toolCategories: ['panel-media'],
      },
      phase: {
        phase: PROJECT_PHASE.STORYBOARD_READY,
        availableActions: {
          actMode: ['generate_character_image', 'generate_location_image', 'regenerate_panel_image', 'voice_generate'],
          planMode: [],
        },
      },
    })

    expect(result.operationIds).toContain('regenerate_panel_image')
    expect(result.operationIds).toContain('generate_character_image')
    expect(result.operationIds).toContain('generate_location_image')
  })

  it('phase planMode: boosts plan operations listed in availableActions.planMode', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'plan',
        domains: ['workflow'],
        toolCategories: ['workflow-plan'],
      },
      phase: {
        phase: PROJECT_PHASE.DRAFT,
        availableActions: {
          actMode: [],
          planMode: ['create_workflow_plan'],
        },
      },
    })

    expect(result.operationIds).toContain('create_workflow_plan')
    expect(result.operationIds).toContain('list_workflow_packages')
  })

  // --- Risk boundaries ---

  it('risk: storyboard-read (low-only) excludes medium-risk act tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'query',
        domains: ['storyboard'],
        toolCategories: ['storyboard-read'],
      },
    })

    expect(result.operationIds).not.toContain('mutate_storyboard')
    expect(result.operationIds).not.toContain('regenerate_panel_image')
    expect(result.operationIds).toContain('get_project_phase')
  })

  it('risk: governance category allows high-risk guarded tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['governance'],
        toolCategories: ['governance'],
      },
    })

    expect(result.operationIds).toContain('list_recent_mutation_batches')
    expect(result.operationIds).toContain('revert_mutation_batch')
  })

  it('risk: billing (low-only) does not expose medium or high risk tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'query',
        domains: ['billing'],
        toolCategories: ['billing'],
      },
    })

    expect(result.operationIds).toContain('get_billing_summary')
    expect(result.operationIds).not.toContain('revert_mutation_batch')
    expect(result.operationIds).not.toContain('cancel_run')
  })

  // --- Episode requirement ---

  it('episode: panel-scoped tools excluded when episodeId missing', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['storyboard'],
        toolCategories: ['panel-media'],
      },
      context: {},
    })

    expect(result.operationIds).not.toContain('regenerate_panel_image')
    expect(result.operationIds).not.toContain('voice_generate')
    expect(result.operationIds).not.toContain('generate_video')
    expect(result.operationIds).toContain('get_project_phase')
  })

  it('episode: episode-required tools included when episodeId present', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['storyboard'],
        toolCategories: ['panel-media'],
      },
      context: { episodeId: 'ep-1' },
    })

    expect(result.operationIds).toContain('regenerate_panel_image')
  })

  // --- Intent filtering ---

  it('intent: query mode excludes act and plan tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'query',
        domains: ['project'],
        toolCategories: ['project-overview'],
      },
    })

    expect(result.operationIds).toContain('get_project_phase')
    expect(result.operationIds).toContain('get_project_snapshot')
    expect(result.operationIds).not.toContain('cancel_run')
    expect(result.operationIds).not.toContain('create_workflow_plan')
  })

  it('intent: plan mode includes query and plan tools but excludes act tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'plan',
        domains: ['workflow'],
        toolCategories: ['workflow-plan', 'project-overview'],
      },
    })

    expect(result.operationIds).toContain('get_project_phase')
    expect(result.operationIds).toContain('create_workflow_plan')
    expect(result.operationIds).not.toContain('cancel_run')
    expect(result.operationIds).not.toContain('regenerate_panel_image')
  })

  it('intent: act mode includes all modes', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['storyboard'],
        toolCategories: ['storyboard-edit', 'panel-media', 'project-overview'],
      },
    })

    expect(result.operationIds).toContain('get_project_phase')
    expect(result.operationIds).toContain('mutate_storyboard')
    expect(result.operationIds).toContain('regenerate_panel_image')
  })

  // --- Hidden tools ---

  it('hidden tools never selected regardless of route', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['debug'],
        toolCategories: ['debug'],
      },
    })

    expect(result.operationIds).not.toContain('hidden_sse_debug')
  })

  // --- maxTools cap ---

  it('maxTools: caps the number of selected tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['storyboard', 'asset', 'workflow'],
        toolCategories: ['storyboard-edit', 'panel-media', 'asset-character', 'workflow-plan', 'project-overview'],
      },
      maxTools: 3,
    })

    expect(result.operationIds.length).toBeLessThanOrEqual(3)
    expect(result.totalCandidates).toBeGreaterThan(3)
  })

  // --- Read tools always available ---

  it('read tools (get_project_phase) available across all common categories', () => {
    const categories = [
      'project-overview', 'workflow-plan', 'storyboard-read',
      'storyboard-edit', 'panel-media', 'asset-character',
      'config', 'download',
    ] as const

    for (const category of categories) {
      const result = select({
        operations: registry,
        route: {
          intent: category === 'storyboard-read' || category === 'project-overview' ? 'query' : 'act',
          domains: ['project'],
          toolCategories: [category],
        },
      })

      expect(result.operationIds, `get_project_phase missing for category ${category}`).toContain('get_project_phase')
    }
  })

  // --- Video generation phase ---

  it('voice_ready phase with act intent and panel-media selects generate_video', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'act',
        domains: ['storyboard'],
        toolCategories: ['panel-media'],
      },
      phase: {
        phase: PROJECT_PHASE.VOICE_READY,
        progress: { clipCount: 3, screenplayClipCount: 3, storyboardCount: 3, panelCount: 18, voiceLineCount: 12 },
        availableActions: {
          actMode: ['generate_video'],
          planMode: [],
        },
      },
    })

    expect(result.operationIds).toContain('generate_video')
  })

  // --- Config + billing cross-domain ---

  it('config category includes model and api config tools', () => {
    const result = select({
      operations: registry,
      route: {
        intent: 'query',
        domains: ['config'],
        toolCategories: ['config'],
      },
    })

    expect(result.operationIds).toContain('get_user_model_configs')
    expect(result.operationIds).toContain('get_project_phase')
  })
})
