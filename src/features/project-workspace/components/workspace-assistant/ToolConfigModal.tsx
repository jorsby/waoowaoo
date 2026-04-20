'use client'

import { useEffect, useMemo, useState } from 'react'
import GlassModalShell from '@/components/ui/primitives/GlassModalShell'
import type { ProjectAgentToolCatalog, ProjectAgentToolCatalogItem } from '@/lib/project-agent/tool-catalog'
import type { ProjectAgentToolSelection } from '@/lib/project-agent/tool-selection'
import { TOOL_PROFILE_MODE, TOOL_RISK_BUDGET } from '@/lib/project-agent/tool-selection'

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

function buildRiskBadge(item: ProjectAgentToolCatalogItem): string | null {
  const se = item.sideEffects
  if (!se) return null
  if (se.billable) return 'Billable'
  if (se.risk === 'high') return 'High'
  if (se.risk === 'medium') return 'Medium'
  if (se.risk === 'low') return 'Low'
  return null
}

function buildDefaultEnabled(item: ProjectAgentToolCatalogItem): boolean {
  return item.defaultVisibility !== 'hidden'
}

function mergeSelectionFromCatalog(params: {
  current: ProjectAgentToolSelection | null
  tools: ProjectAgentToolCatalogItem[]
}): ProjectAgentToolSelection {
  const current = params.current
  const enabled = new Set(current?.overrides.enabledOperationIds ?? [])
  const disabled = new Set(current?.overrides.disabledOperationIds ?? [])
  const pinned = new Set(current?.overrides.pinnedOperationIds ?? [])
  const selectable = new Set(params.tools.map((t) => t.operationId))

  for (const id of Array.from(enabled)) {
    if (!selectable.has(id)) enabled.delete(id)
  }
  for (const id of Array.from(disabled)) {
    if (!selectable.has(id)) disabled.delete(id)
  }
  for (const id of Array.from(pinned)) {
    if (!selectable.has(id)) pinned.delete(id)
  }

  return {
    profile: {
      mode: current?.profile.mode ?? TOOL_PROFILE_MODE.EXPLORE,
      packs: current?.profile.packs ?? [],
      riskBudget: current?.profile.riskBudget ?? TOOL_RISK_BUDGET.ALLOW_MEDIUM,
      optionalTags: current?.profile.optionalTags ?? [],
    },
    overrides: {
      enabledOperationIds: Array.from(enabled),
      disabledOperationIds: Array.from(disabled),
      pinnedOperationIds: Array.from(pinned),
    },
  }
}

async function fetchToolCatalog(projectId: string): Promise<ProjectAgentToolCatalog> {
  const response = await fetch(`/api/projects/${projectId}/assistant/tool-catalog`, { method: 'GET' })
  if (!response.ok) {
    throw new Error(`TOOL_CATALOG_FETCH_FAILED:${response.status}`)
  }
  return (await response.json()) as ProjectAgentToolCatalog
}

export interface ToolConfigModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  value: ProjectAgentToolSelection | null
  onSave: (next: ProjectAgentToolSelection | null) => Promise<void>
}

export function ToolConfigModal({ open, onClose, projectId, value, onSave }: ToolConfigModalProps) {
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<ProjectAgentToolCatalog | null>(null)
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const [draft, setDraft] = useState<ProjectAgentToolSelection | null>(value)

  useEffect(() => {
    if (!open) return
    setDraft(value)
  }, [open, value])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setErrorText(null)
    fetchToolCatalog(projectId)
      .then((data) => {
        setCatalog(data)
        setDraft((current) => mergeSelectionFromCatalog({ current, tools: data.tools }))
      })
      .catch((error: unknown) => {
        setErrorText(error instanceof Error ? error.message : String(error))
      })
      .finally(() => setLoading(false))
  }, [open, projectId])

  const groups = useMemo(() => {
    const tools = catalog?.tools ?? []
    const map = new Map<string, number>()
    for (const tool of tools) {
      const group = tool.groups.length > 0 ? tool.groups.join(' / ') : 'Ungrouped'
      map.set(group, (map.get(group) ?? 0) + 1)
    }
    const items = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }))
    return [{ label: 'all', count: tools.length }, ...items]
  }, [catalog])

  const filteredTools = useMemo(() => {
    const tools = catalog?.tools ?? []
    const q = search.trim().toLowerCase()
    return tools.filter((tool) => {
      const group = tool.groups.length > 0 ? tool.groups.join(' / ') : 'Ungrouped'
      if (activeGroup !== 'all' && group !== activeGroup) return false
      if (!q) return true
      const hay = `${tool.operationId}\n${tool.description}\n${group}\n${tool.tags.join(',')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [activeGroup, catalog, search])

  const checkedState = useMemo(() => {
    const enabled = new Set(draft?.overrides.enabledOperationIds ?? [])
    const disabled = new Set(draft?.overrides.disabledOperationIds ?? [])
    return (item: ProjectAgentToolCatalogItem) => {
      if (enabled.has(item.operationId)) return true
      if (disabled.has(item.operationId)) return false
      return buildDefaultEnabled(item)
    }
  }, [draft])

  const selectedCount = useMemo(() => {
    return filteredTools.reduce((count, item) => (checkedState(item) ? count + 1 : count), 0)
  }, [checkedState, filteredTools])

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-[var(--glass-text-tertiary)]">
        {loading ? 'Loading…' : errorText ? errorText : `已选 ${selectedCount} 项 · Eligible 不等于每轮注入`}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="glass-btn-base glass-btn-ghost px-3 py-2 text-sm"
          onClick={() => {
            setDraft((current) => current ? {
              ...current,
              overrides: {
                enabledOperationIds: [],
                disabledOperationIds: [],
                pinnedOperationIds: [],
              },
            } : null)
          }}
        >
          恢复默认
        </button>
        <button
          type="button"
          className="glass-btn-base glass-btn-primary px-4 py-2 text-sm"
          onClick={async () => {
            setLoading(true)
            setErrorText(null)
            try {
              await onSave(draft)
              onClose()
            } catch (error) {
              setErrorText(error instanceof Error ? error.message : String(error))
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading || !catalog}
        >
          保存
        </button>
      </div>
    </div>
  )

  return (
    <GlassModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="配置工具"
      description="勾选仅影响 eligible 工具集合；后端仍按路由与 Top-N 注入策略裁剪。"
      footer={footer}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px,1fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--glass-text-tertiary)]">模式</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { key: TOOL_PROFILE_MODE.EXPLORE, label: 'Explore' },
                { key: TOOL_PROFILE_MODE.EDIT, label: 'Edit' },
                { key: TOOL_PROFILE_MODE.GENERATE, label: 'Generate' },
                { key: TOOL_PROFILE_MODE.RECOVER, label: 'Recover' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={cx(
                    'rounded-xl border px-3 py-2 text-sm',
                    (draft?.profile.mode ?? TOOL_PROFILE_MODE.EXPLORE) === item.key
                      ? 'border-[var(--glass-accent-from)] bg-[rgba(59,130,246,0.18)] text-[var(--glass-text-primary)]'
                      : 'border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] text-[var(--glass-text-secondary)]'
                  )}
                  onClick={() => {
                    setDraft((current) => (current ? { ...current, profile: { ...current.profile, mode: item.key } } : current))
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--glass-text-tertiary)]">风险预算</div>
            <select
              className="mt-2 w-full rounded-xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] px-3 py-2 text-sm text-[var(--glass-text-primary)]"
              value={draft?.profile.riskBudget ?? TOOL_RISK_BUDGET.ALLOW_MEDIUM}
              onChange={(event) => {
                const value = event.target.value as ProjectAgentToolSelection['profile']['riskBudget']
                setDraft((current) => (current ? { ...current, profile: { ...current.profile, riskBudget: value } } : current))
              }}
            >
              <option value={TOOL_RISK_BUDGET.LOW_ONLY}>low-only</option>
              <option value={TOOL_RISK_BUDGET.ALLOW_MEDIUM}>allow-medium</option>
              <option value={TOOL_RISK_BUDGET.ALLOW_HIGH_WITH_CONFIRM}>allow-high-with-confirm</option>
            </select>
          </div>

          <div className="rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--glass-text-tertiary)]">分组</div>
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
              {groups.map((group) => (
                <button
                  key={group.label}
                  type="button"
                  className={cx(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm',
                    activeGroup === group.label
                      ? 'bg-[rgba(59,130,246,0.18)] text-[var(--glass-text-primary)]'
                      : 'text-[var(--glass-text-secondary)] hover:bg-[rgba(255,255,255,0.06)]'
                  )}
                  onClick={() => setActiveGroup(group.label)}
                >
                  <span className="truncate">{group.label === 'all' ? '全部' : group.label}</span>
                  <span className="ml-2 shrink-0 rounded-full border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] px-2 py-0.5 text-xs text-[var(--glass-text-tertiary)]">
                    {group.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索工具 / 描述 / tag…"
              className="w-full rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] px-3 py-2 text-sm text-[var(--glass-text-primary)] outline-none"
            />
          </div>

          <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-muted)] p-2">
            {filteredTools.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--glass-text-tertiary)]">暂无可配置工具</div>
            ) : (
              <div className="space-y-1">
                {filteredTools.map((item) => {
                  const checked = checkedState(item)
                  const badge = buildRiskBadge(item)
                  return (
                    <label
                      key={item.operationId}
                      className={cx(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2',
                        checked
                          ? 'border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.10)]'
                          : 'border-[var(--glass-stroke-base)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const nextChecked = event.target.checked
                          setDraft((current) => {
                            if (!current) return current
                            const enabled = new Set(current.overrides.enabledOperationIds)
                            const disabled = new Set(current.overrides.disabledOperationIds)
                            const defaultEnabled = buildDefaultEnabled(item)

                            if (nextChecked) {
                              disabled.delete(item.operationId)
                              if (!defaultEnabled) enabled.add(item.operationId)
                            } else {
                              enabled.delete(item.operationId)
                              if (defaultEnabled) disabled.add(item.operationId)
                            }

                            return {
                              ...current,
                              overrides: {
                                ...current.overrides,
                                enabledOperationIds: Array.from(enabled),
                                disabledOperationIds: Array.from(disabled),
                              },
                            }
                          })
                        }}
                        className="mt-1 h-4 w-4 accent-[var(--glass-accent-from)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium text-[var(--glass-text-primary)]">{item.operationId}</div>
                          {badge ? (
                            <span className="rounded-full border border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--glass-text-tertiary)]">
                              {badge}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-[var(--glass-text-secondary)]">{item.description}</div>
                        {item.groups.length > 0 ? (
                          <div className="mt-1 text-[11px] text-[var(--glass-text-tertiary)]">
                            {item.groups.join(' / ')}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassModalShell>
  )
}
