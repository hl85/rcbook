# rcbook 产品设计文档

## 1. 产品概述

**产品名称**：rcbook  
**产品定位**：rcbook 是一款开源的 VS Code 扩展插件，专为应用开发者（前后端工程师）设计，提供一种**Notebook 驱动的多 Agent 协作编程范式**。它借鉴了 Roo Code 的 Agent 模式，但完全独立实现，支持**结构化计划生成**、**多 Agent 自动编排**以及**多模型动态绑定**。rcbook 通过 notebook cell 结构管理 AI 协作过程，不仅解决“黑盒”问题，更将开发过程升级为“规划-执行-验收”的自动化流水线。

**产品愿景**：成为应用开发者在 AI 时代的核心 IDE 伴侣，通过**多 Agent 分工（Architect/Coder/Reviewer）**和**结构化计划**，实现复杂任务的自动化处理，同时保留完整的可追溯过程资产。

**版本**：v1.0（MVP）  
**发布平台**：VS Code Marketplace，开源于 GitHub。  
**当前日期**：2026 年 1 月

## 2. 目标用户与市场分析

**目标用户**：
- **主要用户群**：前后端应用开发者（JavaScript、Python、Go 等通用语言使用者），包括独立开发者、初创团队和中型企业工程师。典型画像：熟悉 VS Code/Cursor，日常使用 AI 辅助编码，但痛点是过程信息丢失导致 CR 困难。
- **用户规模估算**：初期针对 Roo Code 用户（数万活跃用户）和 Cursor 开源替代需求者；长期扩展到 10 万+ VS Code 用户。
- **用户痛点**：
  - AI 生成代码缺乏上下文记录，导致维护和调试困难。
  - 传统 sidebar chat 历史易丢失，不便于 git 版本化。
  - 需要一种平衡“快速生成”和“过程透明”的工具。
- **竞争分析**：
  - **优势**：开源、过程追溯（diff 快照 + 历史文件）、无缝 IDE 集成；Roo Code 基础确保 AI 能力强劲。
  - **竞品**：Cursor（闭源、付费）、Continue.dev（类似 sidebar，但无 notebook 结构）、Aider（CLI 偏好）。
  - **差异化**：rcbook 的 notebook cell + 项目文件存储，提供“可回放过程”，而非单纯聊天。

## 3. 问题与解决方案

**核心问题**：
- 当前 AI 编程丢失“过程信息”，CR 退化为黑盒测试。
- 应用开发者习惯 IDE 生态，但缺乏结构化 AI 历史管理。
- 性能与存储问题：大对话历史易导致工具卡顿。

**解决方案**：
- 通过 notebook-like cell 在 sidebar 中组织任务（每个 cell 包含 chatbox、模式选择、模型反馈、tools、MCP 调用）。
- 历史数据持久化到项目目录（.rcnb markdown 文件 + .rcnbhistory 隐藏目录），便于 git 和离线访问。
- 动态 UI：任务展开/收缩，确保 sidebar 不拥挤；集成 Roo Code AI 核心，提供高效生成。

## 4. 核心功能需求与用户故事

### 4.1 角色定义 (Persona)
- **开发者 (Developer)**: rcbook 的主要使用者。需要快速生成代码，同时保留上下文以便审查。
- **技术负责人 (Tech Lead)**: 审查代码变更。关注代码生成的透明度、安全性和过程记录。

### 4.2 用户故事 (User Stories)

#### EPIC-1: 任务管理 (Task Management)
- **US-1.1 创建任务**
  - **作为** 开发者，
  - **我想要** 在 Sidebar 点击“新任务”按钮创建一个新的空白 Cell，
  - **从而** 开始一个新的编程任务而不干扰之前的上下文。
  - **验收标准 (AC)**:
    - [ ] 点击 "+" 按钮，列表顶部出现一个新的 Expanded 状态的 Cell。
    - [ ] 新 Cell 自动聚焦输入框。
    - [ ] 默认模式为 "Code"。
    - [ ] 系统自动生成唯一的 Task ID。

- **US-1.2 折叠/展开任务**
  - **作为** 开发者，
  - **我想要** 点击任务标题来折叠或展开 Cell，
  - **从而** 在有限的 Sidebar 空间中聚焦当前工作，隐藏无关细节。
  - **验收标准 (AC)**:
    - [ ] 点击 Expanded Cell 的标题栏 -> 变为 Collapsed 状态，仅显示标题和状态图标。
    - [ ] 点击 Collapsed Cell 的标题栏 -> 变为 Expanded 状态。
    - [ ] **约束**：同一时间只能有一个 Cell 处于 Expanded 状态（自动折叠其他）。

#### EPIC-2: AI 交互与代码生成 (AI Interaction)
- **US-2.1 AI 代码生成**
  - **作为** 开发者，
  - **我想要** 输入自然语言 Prompt 并获得 AI 生成的代码和解释，
  - **从而** 解决编程问题。
  - **验收标准 (AC)**:
    - [ ] 输入 Prompt 按 Enter，Chatbox 显示用户消息。
    - [ ] AI 状态变为 "Thinking" (流式显示思维链)。
    - [ ] AI 输出 Markdown 格式的解释和代码块。
    - [ ] 代码块包含 "Apply" 和 "Copy" 按钮。
    - [ ] **异常**：若 API 失败，显示红色重试按钮。

- **US-2.2 代码变更预览 (Diff Preview)**
  - **作为** 开发者，
  - **我想要** 在应用代码前查看 Diff 对比，
  - **从而** 确保 AI 没有破坏现有逻辑。
  - **验收标准 (AC)**:
    - [ ] 点击代码块的 "Apply" 按钮。
    - [ ] **交互**：弹出一个全屏/宽屏的 Modal 或新 Editor Tab (非 Sidebar 内嵌)，显示 Monaco Diff Editor。
    - [ ] Diff 视图左侧为当前文件，右侧为 AI 生成结果。
    - [ ] 包含 "Confirm Apply" 和 "Cancel" 按钮。

#### EPIC-4: 计划与编排 (Planning & Orchestration)
- **US-4.1 结构化计划生成 (Plan Mode)**
  - **作为** 开发者，
  - **我想要** 在面对复杂需求时，AI 能先生成一个结构化的执行计划，
  - **从而** 将大任务拆解为可管理的步骤。
  - **验收标准 (AC)**:
    - [ ] 选择 "Architect" 模式输入需求。
    - [ ] AI 分析后生成一个特殊的 **Plan Cell**。
    - [ ] Plan Cell 包含一系列待执行的子任务（Sub-tasks）。
    - [ ] 点击 "Approve Plan"，系统自动根据子任务生成后续的 **Task Cells**（状态为 Pending）。

- **US-4.2 多 Agent 自动编排**
  - **作为** 开发者，
  - **我想要** 系统能根据任务阶段自动切换最合适的 Agent，
  - **从而** 实现从设计到编码再到测试的全流程自动化，无需手动干预。
  - **验收标准 (AC)**:
    - [ ] Architect Agent 生成计划后，自动唤起 Coder Agent 执行第一个 Code Cell。
    - [ ] Coder Agent 完成代码后，自动唤起 Reviewer/Test Agent 进行检查。
    - [ ] **可视化**：当前活跃的 Agent 在对应 Cell 上有明显标识（如 "Coder is working..."）。

#### EPIC-5: 多模型与 Agent 配置 (Multi-Model & Configuration)
- **US-5.1 Agent-模型绑定**
  - **作为** 开发者，
  - **我想要** 为不同的 Agent 角色配置不同的 LLM 模型，
  - **从而** 在成本和效果之间取得平衡（例如 Architect 用 Claude 3.5 Sonnet，Coder 用 DeepSeek V3）。
  - **验收标准 (AC)**:
    - [ ] 设置界面提供 "Agent Profiles" 配置。
    - [ ] 可以为 Architect, Coder, Reviewer 分别选择 Provider 和 Model。
    - [ ] 支持自定义 Agent（如 "SQL Specialist"）并绑定特定模型。

- **US-5.2 外部工具支持 (MCP & Tools)**
  - **作为** 开发者，
  - **我想要** Agent 能调用外部工具（如数据库查询、浏览器、API），
  - **从而** 解决单纯代码生成无法覆盖的问题。
  - **验收标准 (AC)**:
    - [ ] 实现 Model Context Protocol (MCP) Client。
    - [ ] 支持配置 MCP Server（如 Postgres, Brave Search）。
    - [ ] Agent 在执行过程中能自主决定调用工具，并在 Cell 中显示调用结果。

### 4.3 核心交互流程图 (State Machine)
- **Workflow**: `User Req` -> `Architect (Plan Cell)` -> `Auto-Generate Task Cells` -> `Coder (Exec Cell 1)` -> `Reviewer (Check)` -> `Next Cell...`
- **Task Cell States**: `Pending` -> `Planning` -> `Executing` -> `Reviewing` -> `Completed` -> `Failed`

### 4.4 用户界面概述
- **右边栏面板**：固定宽度，顶部工具栏（新任务、搜索历史）；主体为任务 cell 列表。
- **Fallback 左边栏**：树视图显示 .rcnb 文件，点击弹出 sidebar 或浮动窗。
- **视觉风格**：简洁、现代（VS Code 主题适配）；任务展开时用动画过渡。

### 4.3 用户旅程
1. **安装与启动**：用户在 VS Code Marketplace 安装，首次启动向导扫描项目/导入历史。
2. **日常使用**：
   - 打开 sidebar，点击“新任务”创建 cell。
   - 输入 Prompt，AI 生成代码；预览 diff，apply。
   - 完成任务，插件保存 .rcnb/.rcnbhistory。
3. **回溯/CR**：在 sidebar 历史列表点击 .rcnb，展开查看过程；修改 cell 重跑。
4. **协作**：git push 项目，团队查看 .rcnb 文件。

## 5. 非功能需求

- **性能**：sidebar 加载 <1s；懒加载 history，避免大文件卡顿。
- **安全性**：文件写入白名单（仅 src/）；API key 本地存储。
- **兼容性**：VS Code 1.80+；多 OS（Windows/Mac/Linux）。
- **可访问性**：键盘导航、屏幕阅读器支持。
- **国际化**：英文优先，后续多语言。
- **开源策略**：Apache-2.0/MI T，鼓励社区贡献。

## 6. 优先级与路线图

**MVP 功能优先级**：
- 高：核心任务 cell、AI 交互、历史保存/加载。
- 中：回放与分支、MCP/tools。
- 低：多模型切换、自定义配置。

**路线图**：
- **Q1 2026**：MVP 发布，VS Code Marketplace 上线。
- **Q2**：用户反馈迭代，添加左边栏 fallback。
- **Q3**：扩展到其他 IDE（Cursor/Zed），开源社区构建。
- **指标**：安装量 >5k，NPS >70。

## 7. 风险与缓解

- **风险**：用户不适应 notebook cell（碎片化感）。
  - 缓解：默认简单模式，提供教程；A/B 测试 UI。
- **风险**：Roo Code 上游变更导致不兼容。
  - 缓解：定期 merge fork；模块化隔离。
- **风险**：性能瓶颈（大项目历史）。
  - 缓解：优化懒加载；用户配置 history 清理。

这份产品设计文档基于我们此前讨论，确保与技术/工程视角自洽。接下来，如果你确认，可以继续整理技术设计文档或 UI 草图！