# Feature: LLM Provider Setup Guide

## 1. Requirement Analysis
**Goal**: Guide users to configure an LLM provider if none is set, ensuring RC Book can function properly.

### UI Requirements
1.  **Guide Area**:
    *   Condition: Displayed when no LLM provider is configured.
    *   Title: "Configure LLM Provider"
    *   Description: "RC Book needs an LLM provider to work. Choose one to start using, you can add more later."
2.  **Configuration Area**:
    *   Provider Selection: Dropdown list.
    *   Fields: API Key (masked), Custom Base URL (optional), Model Name (dropdown or text), 1M Context Window toggle (optional/beta).
3.  **Supported Providers**:
    *   OpenAI
    *   Anthropic
    *   Gemini
    *   DeepSeek
    *   Qwen Code
    *   GLM
    *   Kimi
    *   OpenRouter
    *   Local Models (e.g., Ollama, LM Studio)

## 2. Technical Implementation Plan

### Backend (Extension)
*   **File**: `src/sidebar/SidebarProvider.ts`
*   **Changes**:
    *   Implement `saveConfig` message handler to persist settings to `vscode.workspace.getConfiguration`.
    *   Implement `getConfig` message handler to retrieve current settings for the Webview.
    *   Ensure `_initAIService` reloads correctly upon configuration change.

### Frontend (Webview)
*   **File**: `src/webview/components/SettingsModal.tsx`
*   **Changes**:
    *   Update `PROVIDER_OPTIONS` list with all supported providers.
    *   Add "Guide Area" UI component that shows up when `!currentProvider`.
    *   Enhance configuration form with clearer labels and placeholders matching the specific provider.
    *   Add validation (e.g., API Key is required).

### Core Logic
*   **File**: `src/core/ai/AIProviderFactory.ts`
*   **Changes**:
    *   Ensure all new provider keys map to appropriate implementations (mostly `OpenAICompatibleProvider`).

## 3. Test Cases

| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| TC-01 | Show Guide on Fresh Install | No provider configured | Open RC Book Sidebar | Settings Modal opens (or Guide is visible), showing "Configure LLM Provider" text. |
| TC-02 | Select Provider | Settings Open | Select "DeepSeek" from dropdown | Form fields update. Base URL placeholder might change. |
| TC-03 | Save Configuration | Settings Open, Fields filled | Click "Save Settings" | Modal closes. Configuration is saved to VS Code settings. |
| TC-04 | Persist Settings | Settings Saved | Restart VS Code / Reload Window | Settings persist and are loaded correctly. |
| TC-05 | Switch Provider | Configured (OpenAI) | Open Settings, switch to Gemini | Provider changes, fields clear/update. |

