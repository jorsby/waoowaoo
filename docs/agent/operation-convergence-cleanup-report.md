# Operation Convergence Cleanup Report (2026-04-22)

目的：把旧的“类别列表 + 规则推导 + 打分选择”工具注入体系与其遗留痕迹（代码/测试/文档/空目录）全部清零，并给出可复现的校验方式。

## 结论

- 运行时已切换为 `requestedGroups` + always-on 的 group-based 注入，旧类别/打分选择路径不可达。
- 旧的“类别字段/选择器模块/工具配置相关 API 目录/operation 元信息文件”已删除；空目录已清理。

## 关键实现现状（你校验时看的“真入口”）

- router 输出：`src/lib/project-agent/router.ts:24`（`requestedGroups`）
- 注入策略：`src/lib/project-agent/operation-injection.ts:41`（always-on + requestedGroups）
- runtime 装配：`src/lib/project-agent/runtime.ts:175`
- 执行门禁（tool channel）：`src/lib/adapters/tools/execute-project-agent-operation.ts:1`
  - prerequisite：episodeId required/forbidden
  - `interactionMode=plan` 禁止 `effects.writes===true`
  - confirmation gate（保持原有，但基于 `confirmation.required`）

## 删除/清理项

本次清理覆盖：

- 旧工具选择模块与其单测
- 旧工具配置相关 API 目录（空目录）
- 旧 operation 元信息文件
- 其他历史遗留空目录（不再被引用）

## 新增/替换的校验资产

- 注入/always-on 单测：`tests/unit/project-agent/operation-injection.test.ts:1`
- 执行门禁单测：`tests/unit/project-agent/tool-adapter-gates.test.ts:1`
- registry 导出产物：`docs/agent/artifacts/operation-registry.export.json`
- registry 导出脚本：`scripts/agent/export-operation-registry.ts:1`（脚本入口 `package.json:agent:export-operation-registry`）

## 建议的校验命令（你本地复现）

1) TS 编译：

```bash
npm exec -- tsc --noEmit
```

2) 关键单测（优先看 agent 链路）：

```bash
npm exec -- vitest run tests/unit/project-agent
npm exec -- vitest run tests/unit/operations/registry.test.ts
```

3) 导出 registry：

```bash
npm run agent:export-operation-registry
```
