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
- **入口层**：VS Code 命令/菜单激活插件 → 注册右边栏 WebviewPanel（fallback: TreeViewProvider for 左边栏）。
- **UI 层**：React App 在 Webview 中渲染 sidebar（工具栏 + cell 列表 + 历史浏览器）。
- **业务逻辑层**：
  - Task Manager：管理 cell 创建/展开/收缩。
  - AI Service：**Adapter 模式**。并不直接 Fork Roo Code，而是将其核心逻辑（Prompt 构建、LLM 调用流）参考实现或作为子模块引入，自行封装 `AIServiceAdapter`。
    - *理由*：直接 Fork 维护成本过高，且 Roo Code UI 耦合严重。MVP 阶段提取其 Prompt 策略和 MCP 协议实现即可。
  - History Service：扫描/解析/保存 .rcnb/.rcnbhistory。
- **数据层**：本地文件系统（项目目录 .rcbook/）；VS Code workspace API 监听变化。
- **集成层**：VS Code API（文件打开、git 集成）；LLM API 代理。

数据流：用户输入 Prompt → AI Service 生成 → UI 更新 cell → 保存到文件系统 → 历史浏览器刷新。

### 3.2 模块设计
- **Sidebar Module**：
  - 职责：渲染右边栏 UI，包括工具栏（新任务、搜索）、任务 cell 列表、历史树视图。
  - 关键类：SidebarProvider (extends vscode.WebviewViewProvider)。
  - Fallback：如果右边栏冲突（e.g., 其他扩展占用），用 TreeView 注册左边栏，点击节点触发 Webview 浮动窗。
- **Task Cell Module**：
  - 职责：单个 cell 的渲染与交互（chatbox 用 React-Chatbot-Kit；模式选择下拉；反馈/工具用 Roo Code hooks）。
  - 结构：每个 cell 是 React 组件，状态：collapsed/expanded；expanded 时全宽，隐藏其他 cell。
  - 交互：**Diff 策略** - 点击 Apply 按钮，调用 `vscode.commands.executeCommand('vscode.diff', ...)` 打开一个新的 Editor Tab 显示 Diff，而非在 Sidebar 内嵌。
- **AI Integration Module**：
  - 职责：实现 AI Loop。
  - 策略：
    - 定义 `ILLMProvider` 接口。
    - 实现 `AnthropicProvider`, `OpenAIProvider`。
    - 移植 Roo Code 的 `SystemPrompt` 构建逻辑（Context Window 管理）。
  - 扩展：添加上下文注入（vscode.workspace.fs.readFile 获取项目文件）。
  - 异步：用 Promise/WebWorker 处理 LLM 调用，缓存输出（localStorage）。
- **History Storage Module**：
  - 职责：管理 .rcnb (markdown: # Task1\nChat: ...\nYAML frontmatter for metadata) 和 .rcnbhistory (JSON: dialog.json; Patch: diff.patch)。
  - **敏感信息处理**：
    - 在保存前运行 `Sanitizer`，正则匹配 `sk-[a-zA-Z0-9]{20,}` 等常见 Key 格式并替换为 `********`。
    - 添加 `.gitignore` 到 `.rcbook/` 目录（可选，默认建议用户提交 .rcnb 但忽略 .rcnbhistory 中的大文件）。
  - API：saveTask(taskData) → 写文件；loadRcnb(filePath) → 解析返回 cell 数据。
  - 版本化：用 gitpython 计算/存储 diff；监听 vscode.workspace.onDidChangeTextDocument 检测手动修改。
- **Configuration Module**：
  - 职责：用户设置（存储路径、LLM key、模型选择）；用 vscode.workspace.getConfiguration。

## 4. 数据模型与接口

### 4.1 数据模型
- **RcnbFile**：{ path: string, tasks: Task[] } // .rcnb 主文件
- **Task**：{ id: string, title: string, mode: 'Code'|'Architect' etc., chatHistory: Message[], codeDiff: string, timestamp: Date }
- **Message**：{ role: 'user'|'ai', content: string, type: 'text'|'code'|'diff' }
- **HistoryEntry**：{ fileName: string, summary: string } // 用于 sidebar 列表

### 4.2 关键接口
- **VS Code API 接口**：
  - vscode.window.createWebviewPanel('rcbook.sidebar', 'rcbook', vscode.ViewColumn.Beside)
  - vscode.workspace.fs (读写 .rcnb)
- **内部 API**：
  - async generateFromAI(prompt: string, context: ProjectContext): Promise<CodeResponse>
  - saveToProject(task: Task): void
  - loadHistory(): HistoryEntry[]

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