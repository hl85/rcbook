# rcbook 产品设计文档

## 1. 产品概述

**产品名称**：rcbook  
**产品定位**：rcbook 是一款开源的 VS Code 扩展插件，专为应用开发者（前后端工程师）设计，提供一种 Notebook 驱动的 AI 编程范式。它基于 Roo Code 的核心 AI 引擎，结合任务导向的 notebook cell 结构，帮助开发者记录和管理 AI 生成代码的过程信息（Prompt、对话历史、思维链、diff 快照），解决传统 AI 工具（如 Cursor、Copilot）中“黑盒”问题。rcbook 以右边栏插件形式存在（fallback 左边栏），历史数据存储在项目目录中，便于版本控制和团队协作。

**产品愿景**：成为应用开发者在 AI 时代的核心工具链补充，让代码生成过程透明、可追溯、可修正，提升代码审查（CR）效率和长期维护性。相比 Roo Code 的纯 sidebar chat，rcbook 强调“过程资产”管理；相比 Jupyter/Marimo，避免数据分析偏向，转而聚焦通用编程任务。

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

#### EPIC-3: 历史记录与持久化 (History & Persistence)
- **US-3.1 自动保存**
  - **作为** 开发者，
  - **我想要** 我的任务记录自动保存到 `.rcnb` 文件，
  - **从而** 即使 IDE 崩溃或重启也不会丢失工作进度。
  - **验收标准 (AC)**:
    - [ ] 每次 AI 回复完成或用户编辑后，自动写入磁盘。
    - [ ] 数据结构符合 YAML Frontmatter + Markdown 规范。
    - [ ] 敏感信息（如 API Key）**绝不**保存到 `.rcnb` 文件中。

- **US-3.2 历史回溯**
  - **作为** 技术负责人，
  - **我想要** 打开 `.rcnb` 文件查看任务的 Prompt 和 AI 思维链，
  - **从而** 理解代码是如何生成的。
  - **验收标准 (AC)**:
    - [ ] 在 Sidebar 历史列表中点击文件名。
    - [ ] 加载该文件的所有 Task Cell 到当前视图。
    - [ ] Cell 显示为只读或可编辑状态（取决于实现，MVP 可编辑）。

### 4.3 核心交互流程图 (State Machine)
- **Task Cell States**: `Init` -> `Editing` -> `Thinking` -> `Reviewing` (Diff) -> `Completed`
- **Error States**: `NetworkError`, `ApiKeyMissing`, `FileConflict`

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