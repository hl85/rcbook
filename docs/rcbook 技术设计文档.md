# rcbook 技术设计文档

## 1. 系统概述

**项目名称**：rcbook  
**版本**：v1.0（MVP）  
**设计目标**：构建一个 VS Code 扩展插件，实现 Notebook 驱动的 AI 编程范式。插件以右边栏（sidebar）形式呈现任务导向的 notebook cell，支持 AI 交互、过程记录和历史回溯。核心采用 TDD（测试驱动开发）模式构建的 AI 编排引擎，支持多 Agent 协作、MCP 工具调用和结构化计划。历史数据持久化到项目目录（.rcnb 文件 + .rcnbhistory 目录），便于 git 版本化和团队协作。

**架构原则**：
- **模块化**：高内聚、低耦合，便于维护和扩展。
- **Test-First**：核心逻辑（Agent, Orchestrator, Tools）必须有 100% 单元测试覆盖。
- **性能优先**：懒加载历史数据，异步 AI 调用，Webview 与 Extension 通信优化。
- **安全性**：文件操作白名单，API key 加密存储。

**系统边界**：作为 VS Code 扩展，依赖 VS Code API；不涉及独立服务器（本地运行）。

## 2. 技术栈

| 类别          | 技术选型                  | 理由                                                                 |
|---------------|---------------------------|----------------------------------------------------------------------|
| **插件框架**  | VS Code Extension API (TypeScript) | 官方支持 sidebar/Webview，成熟生态。                |
| **前端 UI**   | React + Monaco Editor     | React 处理动态 cell 展开/收缩；Monaco 提供代码高亮/编辑。 |
| **AI 引擎**   | Custom Agent Implementation | 自主实现的 BaseAgent/Orchestrator，支持多轮对话与工具调用循环。 |
| **状态管理**  | Redux 或 React Context    | 管理 sidebar 状态（cell 展开、历史列表）；Webview 消息机制同步。           |
| **文件解析**  | remark/rehype + YAML      | 解析 .rcnb markdown + frontmatter；轻量、高效。                      |
| **存储/历史** | Node.js fs + gitpython    | 本地文件系统管理 .rcnb/.rcnbhistory；git 集成 diff 生成。            |
| **异步处理**  | Web Workers / Async/Await | MCP/LLM 调用异步，避免阻塞 UI。                                      |
| **测试框架**  | Jest + VS Code Test Runner| 单元/集成测试；模拟 VS Code 环境。                                   |
| **构建/部署** | webpack + vsce            | 打包扩展；发布到 Marketplace。                                       |

**依赖管理**：npm；最小化外部库，避免膨胀。

## 3. 系统架构

### 3.1 高层架构图（文本描述）
- **入口层**：VS Code 命令/菜单激活插件 → 注册 `SidebarProvider` (WebviewViewProvider)。
- **UI 层**：React App (Webview) 渲染 Notebook 界面（Plan Cell, Task Cells, SettingsModal）。
- **业务逻辑层 (Extension Host)**:
  - **Orchestrator**: 核心调度器。接收用户请求或 Plan 步骤，分配给合适的 Agent 执行。
  - **Agent Framework**:
    - `BaseAgent`: 实现了 `IAgent` 接口，封装了 LLM 调用循环、Prompt 构建和 Tool Execution Loop。
    - `ModelRegistry`: 单例，管理 Agent Profile（角色定义）和 LLM Configuration。
  - **Tooling Layer**:
    - `MCPService`: 管理 MCP Server 连接和工具发现。
    - `FileSystemTools`: 内置本地文件操作工具。
  - **TaskManager**: 管理 .rcnb 文件读写和内存中的 Task 状态。
- **数据层**：本地文件系统 (.rcnb)。

**数据流**：
1. Webview (User Input) -> `postMessage` -> SidebarProvider。
2. SidebarProvider -> TaskManager (Create/Update Task)。
3. SidebarProvider -> Orchestrator (Execute Task)。
4. Orchestrator -> ModelRegistry (Get Profile) -> New BaseAgent。
5. BaseAgent -> LLM Provider (Generate) -> Tool Call (if any) -> MCP/Local Tool -> LLM (Loop)。
6. BaseAgent -> Return Response -> Orchestrator -> Webview (Stream/Final)。

### 3.2 模块设计

- **Sidebar Module**:
  - `SidebarProvider`: Extension 端的主控类，处理 Webview 消息路由。
  - `App.tsx`: React 入口，状态容器。
  - `TaskList`, `TaskCell`: 核心 UI 组件。
  - `SettingsModal`: 配置管理 UI。

- **Agent Orchestration Module** (`src/core/agent`):
  - `Orchestrator`: 
    - 方法: `executeTask(task)`, `generatePlan(requirement)`.
    - 职责: 协调 Agent 工作，注册工具。
  - `BaseAgent`:
    - 属性: `profile`, `llmProvider`, `tools`.
    - 方法: `chat(messages)`, `executeTool(name, args)`.
    - 逻辑: 包含 maxTurns 限制的 ReAct 循环。
  - `ModelRegistry`:
    - 职责: 存储 `AgentProfile` (Architect, Coder, Reviewer)。

- **Configuration Module**:
  - 职责: 同步 VS Code `workspace.getConfiguration` 到 Webview。
  - 实现: 监听配置变更事件，通过 `updateConfig` 消息推送到前端。

## 4. 数据模型与接口

### 4.1 数据模型
- **RcnbFile**: `{ metadata: any, tasks: Task[] }`
- **Task**: 
  - `id`: string
  - `title`: string
  - `content`: string (Markdown)
  - `messages`: Message[] (Role: user/assistant/system)
  - `status`: 'pending' | 'in-progress' | 'completed'
  - `agentType`: 'architect' | 'coder' | 'reviewer'
- **AgentProfile**: `{ name: string, role: string, systemPrompt: string, defaultModel: string }`

### 4.2 关键接口
- **IAgent**:
  ```typescript
  interface IAgent {
      chat(messages: Message[]): Promise<{ response: string, history: Message[] }>;
  }
  ```
- **ILLMProvider**:
  ```typescript
  interface ILLMProvider {
      generateResponse(messages: Message[], systemPrompt: string, tools?: Tool[], model?: string): Promise<string>;
  }
  ```
- **ITool**:
  ```typescript
  interface Tool {
      name: string;
      description: string;
      inputSchema: object;
  }
  ```

## 5. 实现细节

- **TDD 流程**：
  - 开发新功能前，先在 `src/test/unit` 编写测试用例。
  - 运行 `npm test` 确认失败。
  - 实现代码直到测试通过。
  - 例如：`Orchestrator`, `FileSystemTools` 均通过此流程开发。

- **设置同步**：
  - Webview 初始化时请求 `getConfig`。
  - Extension 监听 `onDidChangeConfiguration`，变动时发送 `updateConfig`。
  - Webview 修改设置发送 `saveConfig`，Extension 调用 `config.update` 写入 Global 设置。

- **MCP 集成**：
  - `MCPService` 负责连接 Server。
  - `BaseAgent` 在 chat 循环中解析 XML/JSON 格式的 Tool Call。
  - 优先匹配 `localHandlers` (如 `read_file`)，未匹配则转发给 MCP。

- **RCNB 文件管理**：
  - 自动检测：当用户点击创建任务时，若无活跃 .rcnb，自动在 workspace root 创建并打开。

## 6. 安全与性能考虑

- **安全性**：
  - `FileSystemTools` 限制访问范围（待实现：限制在 Workspace Folder 内）。
  - API Key 仅在 Extension 端读取，不持久化到 .rcnb 文件。
- **性能**：
  - Webview 编译开启 Production 模式 (Webpack)。
  - 避免在主线程进行繁重的 AST 解析。

## 7. 测试与部署

- **测试策略**：
  - 单元测试 (Jest): 覆盖 Agent 逻辑、Parser、Tool Execution。
  - 集成测试: 模拟 VS Code 环境测试 SidebarProvider。
- **部署**：
  - `npm run package`: 生成 VSIX。
  - CI/CD: GitHub Actions 自动运行测试。

## 8. 风险与缓解

- **风险**：VS Code Webview 通信延迟。
  - 缓解：使用 State Update 批处理；减少传输的大对象。
- **风险**：LLM 输出格式不稳定导致 Tool Call 失败。
  - 缓解：在 System Prompt 中强化格式要求；增加 Retry 机制（BaseAgent 已实现基础 Loop）。

这份技术设计文档反映了当前的 TDD 实施状态和架构重构。
