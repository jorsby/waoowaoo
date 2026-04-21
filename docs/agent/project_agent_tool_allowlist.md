# Project Agent Tool Allowlist (Draft)

目标：让项目级 agent 聚焦“推进项目产出”，把“全局资产库（asset-hub）”当作可复用资源池；避免把全局资产 CRUD/生成等能力直接暴露为 tool，降低误用与污染全局库的风险。

## 约束与现状

- Tool 调用走 `src/lib/adapters/tools/execute-project-agent-operation.ts`，会对需要确认的操作强制 confirmed gate（`confirmed=true`）。
- API 路由已完成 operation 化：assets/asset-hub 的遗留 routes 统一走 `executeProjectAgentOperationFromApi`，并使用 API-only registry：`src/lib/operations/api-only/**` + `createProjectAgentOperationRegistryForApi`（`src/lib/operations/registry.ts`）。这些 `api_*` operations 只用于 API，不应成为 project-agent tools。

## Allowlist v0（建议）

### P0：项目推进必需（建议默认开放）

- **读取/状态**
  - `get_project_phase`
  - `get_project_snapshot`
  - `get_project_context`
  - `get_task_status`
  - `list_recent_commands`
  - `get_project_command`
- **workflow plan**
  - `create_workflow_plan`
  - `approve_plan`
  - `reject_plan`
  - `list_workflow_packages`
  - `fetch_workflow_preview`
  - `list_saved_skills`
  - `save_workflow_plan_as_skill`
  - `create_workflow_plan_from_saved_skill`
- **run**
  - `list_runs`
  - `create_run`
  - `get_run_snapshot`
  - `list_run_events`
  - `cancel_run`
  - `retry_run_step`
- **task**
  - `list_tasks`
  - `get_task`
  - `cancel_task`

### P0：全局资产“读取/使用”（开放），但不开放全局资产“生成/修改/删除”

开放以下只读/选择器能力（帮助 agent 读取并引用全局资产），并通过项目侧操作完成“使用”：

- **全局资产选择器**
  - `asset_hub_picker`
- **全局资产只读列表/详情**
  - `asset_hub_list_characters`
  - `asset_hub_get_character`
  - `asset_hub_list_locations`
  - `asset_hub_get_location`
  - `asset_hub_list_voices`
  - `asset_hub_list_folders`（可选）
- **把全局资产用到项目里（项目侧动作）**
  - `copy_asset_from_global`（把 global 的 character/location/voice 复制/绑定到当前 project）
  - `get_project_assets`（让 agent 能看到复制后的项目资产视图）

### P1：风险操作（按需开放，配合 confirmed gate）

这些操作可能是“恢复/治理”必需，但不应该默认开放：

- `list_recent_mutation_batches`
- `revert_mutation_batch`
- `revert_mutation_batch_by_id`
- `dismiss_failed_tasks`（批量不可逆，建议仅在明确用户确认时开放）

## Denylist（建议不作为 project-agent tools 暴露）

> 这部分依然可以继续作为 UI/API 能力存在（通过 API-only operations 或固定 route→operation 调用），但不应让 agent 可直接 tool 调用。

- **全局资产 CRUD**
  - `asset_hub_create_*` / `asset_hub_update_*` / `asset_hub_delete_*`
  - `asset_hub_add_character_appearance` / `asset_hub_update_character_appearance` / `asset_hub_delete_character_appearance`
  - `asset_hub_create_folder` / `asset_hub_update_folder` / `asset_hub_delete_folder`
  - `asset_hub_create_voice` / `asset_hub_update_voice` / `asset_hub_delete_voice` / `asset_hub_upload_voice`
- **全局资产生成/修改（计费/长耗时）**
  - `asset_hub_ai_design_*` / `asset_hub_ai_modify_*`
  - `asset_hub_reference_to_character`（如果语义为“生成并写入全局库”，建议默认禁止）
  - `asset_hub_voice_design`
- **API-only operations（不应成为 tools）**
  - `api_assets_*`
  - `api_asset_hub_*`

## 关键缺口（需要新增的 project-agent 资产能力）

用户需求里提到的“把项目内资产沉淀为全局资产”，当前 operation registry 中未看到明确对应项（未检索到 `*_to_global`/`publish_*` 等操作）。建议新增一条“项目→全局沉淀”操作，并默认 `requiresConfirmation: true`：

- 建议操作（示例命名）：
  - `publish_asset_to_global`（输入：`type` + `projectAssetId` + `mode=create|update` + `targetFolderId?` + `confirmed?`）
- 行为原则：
  - 强制做权限校验（project 归属、global user 归属）。
  - 统一媒体归一化（图片/音频必须走 `src/lib/media/outbound-image.ts` 链路或等价“storageKey-only”链路），避免裸 URL/SSRF。
  - 明确补偿/回滚：若“创建 global 记录后提交异步任务”可能失败，需回滚，避免僵尸 global 记录。

