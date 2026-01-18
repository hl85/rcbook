# RC Book

RC Book 是一个为 VS Code 设计的 AI 辅助编程笔记本扩展。它将您的编码任务视为交互式的笔记本单元（Cell），让您能够在一个统一的界面中管理上下文、与 AI 对话并应用代码变更。

## ✨ 特性 (Features)

- **笔记本式界面**: 使用类似 Jupyter Notebook 的界面管理开发任务，底层由 `.rcnb` (Markdown) 文件支持。
- **多 Agent 协作**: 内置 **Architect** (规划)、**Coder** (编码)、**Reviewer** (审查) 角色，支持自动任务编排。
- **MCP 工具支持**: 遵循 Model Context Protocol (MCP)，支持 Agent 调用本地工具（如文件读写）和远程服务。
- **任务管理**: 创建、更新和追踪编码任务的状态（待办、进行中、已完成）。
- **可读文件格式**: 所有数据存储为标准的 Markdown + YAML Frontmatter，确保人类可读且对 Git 友好。
- **TDD 驱动开发**: 核心引擎采用测试驱动开发模式构建，确保高可靠性。

## 🚀 快速开始 (Getting Started)

### 安装

目前项目处于开发阶段，建议通过源码运行：

1. 克隆仓库:
   ```bash
   git clone <repository-url>
   cd rcbook
   ```
2. 安装依赖:
   ```bash
   npm install
   ```
3. 启动调试 (初学者指南):
   - **准备工作**: 确保您已在 VS Code 中打开 `rcbook` 文件夹，并已运行 `npm install`。
   - **启动运行**:
     - 按下 **`F5`** 键，或者点击左侧调试图标并选择 "Run Extension"。
     - 此时 VS Code 会执行编译任务（`compile-web` 和 `watch`），随后弹出一个新的 VS Code 窗口。

### 使用

1. **打开侧边栏**: 点击 Activity Bar 右侧（或左侧）的 RC Book 图标，或运行命令 `RC Book: Open Sidebar`。
2. **配置 AI**: 点击侧边栏顶部的齿轮图标 ⚙️，在 Settings Modal 中输入您的 LLM Provider (OpenAI/Anthropic) 和 API Key。
3. **创建任务**: 点击 "+ New Task"。如果当前没有打开 `.rcnb` 文件，插件会自动为您创建一个。
4. **开始对话**: 在输入框中描述您的需求（例如 "创建一个登录页面"），选择 Agent 模式（Code/Architect），按 Enter 发送。

### 常见问题 (FAQ)

**Q: 插件图标显示在左侧栏，但我习惯在右侧？**
A: VS Code 默认将扩展图标放置在左侧活动栏。您可以将其拖拽到右侧边栏 (Secondary Side Bar)。

**Q: 打开插件后内容为空白？**
A: 请确保您已正确运行构建命令。Webview 需要 `npm run compile-web` 生成资源文件。

## 🛠️ 开发指南 (Development)

本项目严格遵循 **测试驱动开发 (TDD)** 模式。

### 运行测试

- **单元测试 (Unit Tests)**:
  主要测试核心 Agent 逻辑 (`Orchestrator`, `BaseAgent`) 和工具集。
  ```bash
  npm test
  ```

- **端到端测试 (E2E Tests)**:
  测试 VS Code 扩展的集成点。
  ```bash
  npm run test:e2e
  ```

### 项目结构

- `src/core`: 核心业务逻辑
  - `agent/`: Agent 框架 (BaseAgent, Orchestrator, ModelRegistry)
  - `agent/tools/`: MCP 工具实现 (FileSystemTools)
  - `parser.ts`: `.rcnb` 文件解析器
  - `taskManager.ts`: 任务状态管理
- `src/sidebar`: Extension 端 Webview 控制器
  - `SidebarProvider.ts`: 消息路由与配置同步
- `src/webview`: React 前端应用
  - `components/`: UI 组件 (TaskCell, SettingsModal)
  - `App.tsx`: 主入口
- `src/test`: 测试套件
  - `unit/`: Jest 单元测试

## 📄 文件格式规范 (.rcnb)

RC Book 使用扩展名为 `.rcnb` 的文件存储数据。示例：

```markdown
---
id: "project-uuid"
title: "My Feature Plan"
created_at: 1672531200000
---

# Task 1: Initialize Project
<!-- id: task-uuid-1 -->
<!-- status: completed -->
<!-- mode: code -->

Task description goes here...
```

## License

MIT
