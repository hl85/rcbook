# rcbook 技术设计文档

## 1. 系统概述

**项目名称**：rcbook  
**版本**：v1.0（MVP）  
**设计目标**：构建一个 VS Code 扩展插件，实现 Notebook 驱动的 AI 编程范式。插件以右边栏（sidebar）形式呈现任务导向的 notebook cell，支持 AI 交互、过程记录和历史回溯。基于 Roo Code 的开源核心引擎，确保高效的代码生成和工具集成。历史数据持久化到项目目录（.rcnb 文件 + .rcnbhistory 目录），便于 git 版本化和团队协作。Fallback 到左边栏以处理 UI 限制。

**架构原则**：
- **模块化**：高内聚、低耦合，便于维护和扩展。
- **开源友好**：基于 Roo Code fork，采用 TypeScript/Node.js，确保跨平台兼容。
- **性能优先**：懒加载历史数据，异步 AI 调用，避免 VS Code 卡顿。
- **安全性**：文件操作白名单，API key 加密存储。

**系统边界**：作为 VS Code 扩展，依赖 VS Code API；不涉及独立服务器（本地运行）。

## 2. 技术栈

| 类别          | 技术选型                  | 理由                                                                 |
|---------------|---------------------------|----------------------------------------------------------------------|
| **插件框架**  | VS Code Extension API (TypeScript) | 官方支持 sidebar/Webview，成熟生态；易集成 Roo Code。                |
| **前端 UI**   | React + Monaco Editor     | React 处理动态 cell 展开/收缩；Monaco 提供代码高亮/编辑（复用 VS Code 核心）。 |
| **AI 引擎**   | Roo Code Core (Fork/Extract) | 开源 AI 代理，支持模式选择（Code/Architect/Debug）、MCP、tools 调用。 |
| **状态管理**  | Redux 或 MobX             | 管理 sidebar 状态（cell 展开、历史列表）；React 集成友好。           |
| **文件解析**  | remark/rehype + YAML      | 解析 .rcnb markdown + frontmatter；轻量、高效。                      |
| **存储/历史** | Node.js fs + gitpython    | 本地文件系统管理 .rcnb/.rcnbhistory；git 集成 diff 生成。            |
| **异步处理**  | Web Workers               | MCP/LLM 调用异步，避免阻塞 UI。                                      |
| **测试框架**  | Jest + VS Code Test Runner| 单元/集成测试；模拟 VS Code 环境。                                   |
| **构建/部署** | webpack + vsce            | 打包扩展；发布到 Marketplace。                                       |
| **许可证**    | MIT 或 Apache-2.0         | 与 Roo Code 一致，便于 fork 和社区贡献。                             |

**依赖管理**：pnpm（高效、monorepo 支持）；最小化外部库，避免膨胀。

## 3. 系统架构

### 3.1 高层架构图（文本描述）
- **入口层**：VS Code 命令/菜单激活插件 → 注册 WebviewPanel。
- **UI 层**：React App 渲染 Notebook 界面（Plan Cell, Task Cells）。
- **业务逻辑层**：
  - **Orchestrator (Core)**: 核心大脑。负责解析用户请求，生成 Plan，创建 Cell，并**自动调度** Agent 执行任务。
  - **Agent Manager**: 管理 Agent 实例（Architect, Coder, Reviewer）。
  - **Model Registry**: 管理 LLM Provider (OpenAI, Anthropic, Ollama) 和模型绑定配置。
  - **History Service**: 管理 .rcnb 文件读写。
- **数据层**：本地文件系统 (.rcnb)。
- **外部集成**：MCP Servers (Tools), LLM APIs。

数据流：用户输入 -> Architect Agent (生成 Plan) -> Orchestrator (解析 Plan -> 创建 Task Cells) -> Coder Agent (执行 Cell 1) -> Reviewer Agent (检查) -> Orchestrator (激活下一个 Cell)。

### 3.2 模块设计
- **Sidebar Module**：
  - 职责：渲染 Notebook UI。
  - 关键组件：`NotebookView`, `CellList`, `PlanCell`, `CodeCell`。
- **Agent Orchestration Module** (New):
  - 职责：实现自动编排。
  - **Plan Engine**:
    - 输入：用户需求。
    - 输出：结构化 JSON Plan (Steps: [{ type: 'code', description: '...', agent: 'coder' }])。
    - 行为：将 Plan 渲染为 `Plan Cell`，用户确认后，explode 为多个 `Task Cell`。
  - **Workflow Engine**:
    - 监控 Cell 状态。当 Cell 完成时，根据 Plan 触发下一个 Cell。
    - 处理 Agent 间的上下文传递 (Context Sharing)。
- **AI Core Module** (Refactored):
  - 职责：LLM 通信与 Tool 调用。
  - **Agent Factory**: 根据配置 (`{ role: 'coder', model: 'deepseek-v3' }`) 实例化 Agent。
  - **Prompt Builder**: 动态构建 System Prompt，注入 Project Context 和 MCP Tools 定义。
  - **MCP Client**: 连接本地/远程 MCP Server，暴露工具给 LLM。
- **Configuration Module**:
  - 职责：管理 `Agent Profiles`。
  - 配置项：`agents.architect.model`, `agents.coder.model`, `mcp.servers`。

## 4. 数据模型与接口

### 4.1 数据模型
- **RcnbFile**：{ path: string, cells: Cell[] }
- **Cell (Union)**: `PlanCell` | `TaskCell`
- **PlanCell**: 
  - `type`: 'plan'
  - `content`: string (User Requirement)
  - `planData`: { steps: PlanStep[] }
- **PlanStep**: { id: string, title: string, agent: 'coder'|'reviewer', status: 'pending'|'done' }
- **TaskCell**: 
  - `type`: 'task'
  - `agentType`: 'architect'|'coder'|'reviewer'
  - `modelConfig`: { provider: string, model: string }
  - `chatHistory`: Message[]
  - `codeDiff`: string
- **AgentProfile**: { role: string, provider: string, model: string, systemPrompt: string }

### 4.2 关键接口
- **Agent Interface**:
  - `chat(messages: Message[], tools: Tool[]): Promise<Response>`
  - `getTools(): Tool[]`
- **Orchestrator Interface**:
  - `generatePlan(requirement: string): Promise<Plan>`
  - `executeStep(step: PlanStep): Promise<void>`
  - `delegate(fromAgent: Agent, toAgent: Agent, context: any): void`

## 5. 实现细节

- **初始化流程**：
  1. 插件激活（extension.ts）：注册命令、sidebar provider。
  2. Sidebar 加载：扫描项目目录，构建历史列表。
  3. 新任务：创建空 cell，注入默认上下文。
- **回放实现**：
  - 修改 cell 输入 → Redux dispatch 更新状态 → 触发 AI 重跑（use cache if unchanged）。
  - 用 Roo Code 的 reactive hooks 模拟“自动补齐”。
- **性能优化**：
  - 懒加载：历史列表只加载元数据，点击时解析 .rcnb。
  - 缓存：LLM 输出存 .rcnbhistory JSON，过期策略（用户配置）。
  - 限流：MCP 调用 throttle（1/s）。
- **错误处理**：
  - AI 失败：回滚 cell 状态，显示错误 markdown。
  - 文件冲突：用 vscode.window.showErrorMessage 提示。

## 6. 安全与性能考虑

- **安全性**：
  - 文件白名单：只写 .rcbook/ 子目录，禁止覆盖 src/ 外文件。
  - API Key：用 vscode.secretStorage 加密。
  - 输入 sanitization：防 XSS（React escape）。
- **性能**：
  - 目标：sidebar 响应 <200ms；大项目（100+ .rcnb）用分页。
  - 监控：用 VS Code telemetry 收集（可选）。
- **可扩展性**：
  - 钩子：暴露 onTaskComplete 事件，便于社区插件。

## 7. 测试与部署

- **测试策略**：
  - 单元：Jest 测试模块（e.g., parseRcnb）。
  - 集成：VS Code Test Runner 模拟 UI/文件交互。
  - E2E：手动/自动化脚本测试 sidebar 流程。
  - 覆盖率：>80%。
- **部署流程**：
  - 构建：npm run build → vsce package → .vsix 文件。
  - 发布：VS Code Marketplace；GitHub Releases。
  - CI/CD：GitHub Actions（lint/test/build）。

## 8. 风险与缓解

- **风险**：VS Code API 变更。
  - 缓解：锁定版本依赖；社区监控。
- **风险**：Roo Code fork 维护。
  - 缓解：定期 rebase；如果上游停更，自行维护核心。
- **风险**：UI 在小屏幕拥挤。
  - 缓解：响应式设计；fallback 左边栏/浮动窗。

这份技术设计文档与产品设计文档紧密对齐，确保可实现性。接下来，如果你确认，可以整理 UI 草图（文本描述或简单 ASCII art）。