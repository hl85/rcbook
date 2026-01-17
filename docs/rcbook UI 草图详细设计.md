# rcbook UI 草图详细设计

## 1. 概述

**设计目标**：rcbook 的 UI 设计旨在提供简洁、直观的交互体验，融入 VS Code 的原生风格（主题适配、字体一致），以右边栏插件形式为主，确保不干扰主编辑器。UI 强调任务导向的 notebook cell 结构：每个 cell 代表一个编程任务，支持动态展开/收缩，便于焦点管理。历史浏览器集成在 sidebar 中，便于快速访问项目中的 .rcnb 文件。整体风格现代、响应式（适应不同屏幕宽度），使用 VS Code 的图标和颜色方案（e.g., 蓝色为链接，灰色为收缩状态）。

**设计原则**：
- **简洁性**：避免信息过载，收缩 cell 只显示标题；展开时全宽焦点。
- **交互性**：动画过渡（e.g., 展开用 fade-in 0.3s）；键盘导航支持（Tab/Enter）。
- **可访问性**：ARIA 标签、对比度 >4.5:1；屏幕阅读器友好（e.g., alt text for icons）。
- **Fallback**：如果右边栏空间不足（<300px），切换到左边栏树视图 + 浮动窗。
- **工具**：基于 React 在 Webview 中实现，Monaco Editor 用于代码高亮/diff。

**假设分辨率**：标准 VS Code 窗口（1440x900），sidebar 宽度 300-400px。

以下草图使用 ASCII art 和文本描述表示（实际实现用 CSS/Flexbox）。每个草图包括布局、关键元素和状态变体。

## 2. 主要界面组件

- **Sidebar 面板**：右边栏主视图（WebviewPanel），顶部工具栏 + 主体内容。
- **工具栏**：新任务按钮、搜索框、设置图标。
- **任务 Cell**：可展开/收缩的卡片，包含 chatbox、模式选择等子组件。
- **历史浏览器**：树状列表，显示项目 .rcnb 文件。
- **Diff 预览**：Monaco-based 侧边 diff 查看器。
- **浮动元素**：错误提示、确认对话（用 VS Code showInformationMessage）。

## 3. 详细草图

### 3.1 Sidebar 面板整体布局（默认状态）
- 描述：顶部工具栏固定；下方分两部分：当前任务区（cell 列表，默认一个新 cell 展开）；历史浏览器区（折叠面板）。
- ASCII 草图（垂直布局）：

```
[ VS Code Right Sidebar - Width: 350px ]
-----------------------------------------
| Toolbar:                              |
| [New Task] [Search History] [Settings]|
-----------------------------------------
| Current Tasks:                        |
| + Task 1 (Collapsed)                  |
|   - Title: "Implement Login API"      |
| + Task 2 (Expanded - Full Height)     |
|   - Chatbox: [User Prompt Input]      |
|     [AI Response Stream]              |
|   - Mode: [Dropdown: Code v]          |
|   - Tools: [Button: MCP Call]         |
|   - Feedback: [思维链 Markdown]       |
|   - Actions: [Apply] [Cancel]         |
-----------------------------------------
| History Browser (Accordion):          |
| + Expand to view project .rcnb files  |
|   - myproject.rcnb (2026-01-15)       |
|     [Click to Load]                   |
|   - oldtask.rcnb                      |
-----------------------------------------
```

- 变体：如果无当前任务，显示欢迎信息："Start a new AI task to generate code."
- 交互：点击收缩 cell 展开（动画：height from 50px to auto）；拖拽调整 sidebar 宽度时，UI 响应式（e.g., chatbox 换行）。

### 3.2 任务 Cell 详细视图（展开状态）
- 描述：单个 cell 展开时，占用主体空间；子组件垂直堆叠。Chatbox 支持多轮对话（滚动视图）；模式选择影响 AI 行为（e.g., Architect 模式显示架构图预览）。
- ASCII 草图（内嵌在 sidebar）：

```
[ Expanded Task Cell ]
------------------------
| Title: Edit [Input]  |
------------------------
| Mode:                |
| [Dropdown] Code | Architect | Debug |
------------------------
| Chatbox:             |
| User: How to add auth? |
| AI: Here's the code...|
| [Streaming Indicator]|
| [New Message Input]  |
------------------------
| Model Feedback:      |
| Thinking: Step1...   |
| [Markdown Rendered]  |
------------------------
| Tools/MCP:           |
| [Button: Call MCP]   |
| [Button: Add Tool]   |
------------------------
| Generated Code:      |
| ```js                |
| function login() {...}|
| ```                  |
| [Monaco Editor Mini] |
------------------------
| Actions:             |
| [Apply (with Diff)]  |
| [Save & Contract]    |
| [Delete]             |
------------------------
```

- 变体：收缩状态只显示标题 + 摘要（e.g., "Status: Completed, Diff: +10 lines"）。
- 交互：输入 Prompt 后，按 Enter 发送；AI 流式输出用打字机效果。Apply 按钮弹出 diff 预览模态（见下）。

### 3.3 Diff 预览模态
- **变更说明**：由于 Sidebar 宽度限制（通常 <400px），在其中显示 Side-by-Side Diff 体验极差。因此，Diff 预览将使用 **VS Code 原生 Diff Editor 标签页** 或 **全屏 Webview 模态框**。
- **交互流程**：
  1. 用户在 Task Cell 点击 "Apply"。
  2. 插件调用 `vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri)`。
  3. VS Code 打开一个新的 Editor Tab，显示标准 Diff 视图。
  4. 同时，Sidebar 中的 Task Cell 进入 "Reviewing" 状态，显示 "Confirm" 和 "Reject" 按钮。
  5. 用户在 Diff Tab 确认无误后，回到 Sidebar 点击 "Confirm"，代码写入磁盘，Diff Tab 关闭。

- ASCII 草图（Sidebar 状态）：

```
[ Task Cell (Reviewing State) ]
------------------------
| Title: Edit Login    |
------------------------
| Status: Diffing...   |
| [Icon: Eye] Viewing  |
| changes in main area |
------------------------
| Actions:             |
| [Confirm Apply]      |
| [Reject / Cancel]    |
------------------------
```

- 备选方案（全屏模态）：如果必须模态，则覆盖整个 VS Code 窗口 80% 区域，但首选原生 Tab。

### 3.4 历史浏览器视图
- 描述：Accordion 风格，下拉展开树列表；每个 .rcnb 文件显示元数据（日期、任务数）。
- ASCII 草图（展开状态）：

```
[ History Browser ]
--------------------
| Search: [Input]  |
--------------------
| - myproject.rcnb |
|   Date: 2026-01-15
|   Tasks: 3
|   [Load to Sidebar]
| - oldtask.rcnb   |
|   [Load] [Delete]|
--------------------
```

- 变体：左边栏 fallback：用 VS Code Tree View（图标 + 标签），点击弹出 sidebar 或独立 Webview。
- 交互：点击文件加载到当前任务区（覆盖或追加）；右键菜单：Rename/Delete/Export。

### 3.5 设置与配置视图
- 描述：点击工具栏 Settings 图标，弹出侧面板或模态，配置存储路径、LLM key 等。
- ASCII 草图：

```
[ Settings Modal ]
-----------------------
| Storage Path: .rcbook/ |
| [Browse]             |
| LLM Model: Claude    |
| [Dropdown]           |
| API Key: [Secure Input]|
| [Save] [Cancel]      |
-----------------------
```

## 4. 交互流程与状态机

- **状态机**：Cell 有三种状态：Collapsed（标题 only）、Expanded（全组件）、Editing（输入焦点）。
  - 过渡：Click title → Expanded；Apply/Save → Collapsed。
- **流程示例**：
  1. 打开 sidebar：加载默认 new cell (Expanded)。
  2. 输入 Prompt：AI 生成 → 更新 feedback/code。
  3. Apply：弹出 diff → 确认 → 保存 .rcnb/.rcnbhistory → 刷新历史浏览器。
  4. 加载历史：点击 .rcnb → 解析文件 → 渲染 cell 列表。
- **错误状态**：API 失败显示红色 banner in cell："Retry or check key"。

## 5. 视觉与主题适配

- **颜色**：继承 VS Code theme（e.g., background: var(--sideBar-background)）。
- **图标**：用 VS Code codicons（e.g., add for New Task, history for Browser）。
- **响应式**：Media queries：宽度 <300px 时，隐藏非必需按钮；垂直滚动。
- **动画**：CSS transitions for expand/collapse；无障碍：skip animations if prefers-reduced-motion。

## 6. 实现注意事项

- **React 组件树**：App > Toolbar > TaskList > TaskCell > SubComponents (Chatbox 等)。
  - 用自主实现的 `useChatCompletion` hooks 处理流式输出。
- **Webview 通信**：用 postMessage 与 VS Code 后端交互（e.g., 发送 'applyCode' 命令）。
- **原型工具**：Figma 或 VS Code mockup 扩展用于可视化测试。

这份 UI 草图设计与产品/技术文档对齐，确保用户友好和工程可行。如果需要更详细的 Figma 链接模拟或调整草图，请告知！