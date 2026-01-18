import * as vscode from 'vscode';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TaskManager } from '../core/taskManager';
import { RcnbFile } from '../core/types';
import { RcnbParser } from '../core/parser';
import { IAIService } from '../core/ai/types';
import { MockAIService } from '../core/ai/MockAIService';
import { OpenAIService } from '../core/ai/OpenAIService';
import { HistoryService } from '../core/historyService';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'rcbook.sidebarView';
    private _view?: vscode.WebviewView;
    private _rcnbFile: RcnbFile = { metadata: {}, tasks: [] };
    private _taskManager: TaskManager = new TaskManager(this._rcnbFile);
    private _parser = new RcnbParser();
    private _aiService: IAIService = new MockAIService();
    private _historyService = new HistoryService();

    constructor(
        private readonly _context: vscode.ExtensionContext,
    ) { 
        vscode.window.onDidChangeActiveTextEditor(() => this._updateFromFile(), null, this._context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(e => {
            if (vscode.window.activeTextEditor && e.document === vscode.window.activeTextEditor.document) {
                this._updateFromFile();
            }
        });
    }

    private _initAIService() {
        const config = vscode.workspace.getConfiguration('rcbook.ai');
        const apiKey = config.get<string>('apiKey');
        const model = config.get<string>('model') || 'gpt-3.5-turbo';
        const baseUrl = config.get<string>('baseUrl') || 'https://api.openai.com/v1';
        const provider = config.get<string>('provider') || 'openai';

        if (apiKey) {
            // TODO: Handle provider selection when more services are implemented
            this._aiService = new OpenAIService(apiKey, model, baseUrl);
            console.log(`RC Book: Switched to OpenAIService (${provider})`);
        } else {
            this._aiService = new MockAIService();
            console.log('RC Book: Using MockAIService');
        }
    }

    private _getConfig() {
        const config = vscode.workspace.getConfiguration('rcbook');
        return {
            'rcbook.ai.provider': config.get('ai.provider'),
            'rcbook.ai.apiKey': config.get('ai.apiKey'),
            'rcbook.ai.model': config.get('ai.model'),
            'rcbook.ai.baseUrl': config.get('ai.baseUrl'),
            'rcbook.ai.temperature': config.get('ai.temperature'),
            'rcbook.mcp.servers': config.get('mcp.servers'),
        };
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('rcbook')) {
                this._initAIService();
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'updateConfig',
                        value: this._getConfig()
                    });
                }
            }
        });

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [
                this._context.extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'webviewReady': {
                    // Send initial state and config
                    this._updateFromFile();
                    if (this._view) {
                        this._view.webview.postMessage({
                            type: 'updateConfig',
                            value: this._getConfig()
                        });
                    }
                    break;
                }
                case 'getConfig': {
                    if (this._view) {
                        this._view.webview.postMessage({
                            type: 'updateConfig',
                            value: this._getConfig()
                        });
                    }
                    break;
                }
                case 'saveConfig': {
                    const newConfig = data.value;
                    const config = vscode.workspace.getConfiguration();
                    
                    // Update settings in global or workspace scope
                    // We'll try to update workspace if available, else global
                    const target = vscode.ConfigurationTarget.Global;

                    for (const key of Object.keys(newConfig)) {
                        // Extract section and key (e.g. rcbook.ai.apiKey -> section: rcbook.ai, key: apiKey)
                        // Actually getConfiguration can take the section 'rcbook' or root
                        // Since keys are full paths like 'rcbook.ai.apiKey', we should use update on the root config object?
                        // No, getConfiguration('rcbook') returns the object under rcbook.
                        // But here we have full keys.
                        
                        // Let's use getConfiguration() (root) and update full key
                        await config.update(key, newConfig[key], target);
                    }
                    
                    vscode.window.showInformationMessage('RC Book settings saved.');
                    this._initAIService();
                    break;
                }
                case 'onInfo': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case 'onError': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
                case 'createTask': {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor || !editor.document.fileName.endsWith('.rcnb')) {
                        // 如果没有活跃的 .rcnb 文件，尝试自动创建一个
                        await this._createAndOpenNewRcnbFile(data.value.title, data.value.content);
                    } else {
                        // 正常流程
                        const task = this._taskManager.createTask(data.value.title);
                        task.content = data.value.content;
                        this._updateWebview();
                        await this._saveToFile();
                    }
                    break;
                }
                case 'askAI': {
                    const { taskId, prompt } = data.value;
                    const task = this._taskManager.getTask(taskId);
                    if (!task) { return; }

                    // Add user message
                    this._taskManager.addMessage(taskId, {
                        role: 'user',
                        content: prompt,
                        timestamp: Date.now()
                    });
                    this._updateWebview();

                    // Call AI Service
                    await this._aiService.streamChat(prompt, task.messages || [], {
                        onToken: (token) => {
                            this._view?.webview.postMessage({
                                type: 'onAIStream',
                                value: { taskId, token }
                            });
                        },
                        onComplete: (fullText) => {
                            this._taskManager.addMessage(taskId, {
                                role: 'assistant',
                                content: fullText,
                                timestamp: Date.now()
                            });
                            this._updateWebview();
                            // Save both file content (if any changes) and history
                            this._saveToFile(taskId);
                        },
                        onError: (error) => {
                            vscode.window.showErrorMessage(`AI Error: ${error.message}`);
                        }
                    });
                    break;
                }
                case 'openDiff': {
                    const { taskId } = data.value;
                    const task = this._taskManager.getTask(taskId);
                    if (!task) { return; }

                    // Create a virtual document for the task content
                    // For a real diff, we usually compare "Previous" vs "Current" or "Current" vs "Proposed".
                    // Since we don't have version history yet, let's demo a diff against a "Previous Version" 
                    // (which we will simulate as empty or slightly different for now, or just show the content).
                    // Actually, a useful Diff for "Apply Code" would be comparing the Task Content against the File content it might replace.
                    // But here, the requirement is "Diff Preview: Implement Apply Code Diff View".
                    // This implies there is some "Generated Code" that we want to apply to the "Task Content" or "Project File".
                    // Since AI generates messages, maybe we want to diff the LAST AI MESSAGE code block against the TASK CONTENT?
                    // Let's implement that: Find last code block in AI messages -> Diff against Task Content.
                    
                    let proposedCode = '';
                    const lastAiMsg = task.messages?.filter(m => m.role === 'assistant').pop();
                    if (lastAiMsg) {
                         // Extract code block
                         const match = lastAiMsg.content.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
                         if (match) {
                             proposedCode = match[1];
                         } else {
                             proposedCode = lastAiMsg.content; // Fallback
                         }
                    }

                    if (!proposedCode) {
                        vscode.window.showInformationMessage('No AI code found to diff.');
                        return;
                    }

                    // We need to create two URIs.
                    // 1. Current Task Content (we can write to temp file or use untitled scheme)
                    // 2. Proposed Code
                    
                    const doc = await vscode.workspace.openTextDocument({ content: task.content, language: 'markdown' });
                    const docProposed = await vscode.workspace.openTextDocument({ content: proposedCode, language: 'markdown' });
                    
                    vscode.commands.executeCommand('vscode.diff', 
                        doc.uri, 
                        docProposed.uri, 
                        `Diff: Task ${task.title}`
                    );
                    break;
                }
                case 'applyCode': {
                    const { taskId, code } = data.value;
                    const task = this._taskManager.getTask(taskId);
                    if (!task) { return; }

                    // Update task content with new code
                    task.content = code;
                    this._updateWebview();
                    
                    // Save to file
                    await this._saveToFile(taskId);
                    vscode.window.showInformationMessage('Code applied successfully!');
                    break;
                }
            }
        });
    }

    private _updateWebview() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateState',
                value: {
                    tasks: this._taskManager.getTasks()
                }
            });
        }
    }

    private async _updateFromFile() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.rcnb')) {
            return;
        }

        const text = editor.document.getText();
        if (!text.trim()) { return; } // Don't parse empty file yet

        try {
            const file = this._parser.parse(text);
            this._rcnbFile = file;

            // Load history for each task
            await Promise.all(this._rcnbFile.tasks.map(async (task) => {
                const messages = await this._historyService.loadHistory(editor.document.uri, task.id);
                task.messages = messages;
            }));

            this._taskManager = new TaskManager(this._rcnbFile);
            this._updateWebview();
        } catch (e) {
            console.error('Failed to parse .rcnb file', e);
        }
    }

    private async _createAndOpenNewRcnbFile(taskTitle: string, taskContent: string) {
        // 1. 确定文件名
        let fileName = 'notebook.rcnb';
        if (taskTitle) {
            // 简单的 sanitize：只保留字母数字和横杠，空格转横杠
            const sanitized = taskTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (sanitized) {
                fileName = `${sanitized}.rcnb`;
            }
        }

        // 2. 确定保存路径
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        let uri: vscode.Uri;

        if (workspaceFolder) {
            // 检查文件是否存在，避免覆盖
            let counter = 0;
            const baseName = fileName.replace('.rcnb', '');
            while (true) {
                const tryName = counter === 0 ? fileName : `${baseName}-${counter}.rcnb`;
                uri = vscode.Uri.joinPath(workspaceFolder.uri, tryName);
                try {
                    await vscode.workspace.fs.stat(uri);
                    counter++;
                } catch {
                    // 文件不存在，可以使用
                    break;
                }
            }
        } else {
            // 没有打开文件夹，提示用户打开
            const selection = await vscode.window.showErrorMessage(
                'Please open a folder (workspace) first to create a notebook.',
                'Open Folder'
            );
            
            if (selection === 'Open Folder') {
                vscode.commands.executeCommand('vscode.openFolder');
            }
            return;
        }

        // 3. 创建初始内容
        // 我们创建一个临时的 TaskManager 来生成初始结构
        const tempRcnb: RcnbFile = {
            metadata: {
                id: uuidv4(),
                title: taskTitle || 'New Notebook',
                created_at: Date.now()
            },
            tasks: []
        };
        const tempManager = new TaskManager(tempRcnb);
        const task = tempManager.createTask(taskTitle);
        task.content = taskContent;

        const fileContent = this._parser.serialize(tempRcnb);

        // 4. 写入文件
        await vscode.workspace.fs.writeFile(uri, Buffer.from(fileContent, 'utf-8'));

        // 5. 打开文件
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);

        // 6. 此时 activeTextEditor 应该是新文件，触发 _updateFromFile，Webview 会自动更新
        vscode.window.showInformationMessage(`Created new notebook: ${path.basename(uri.fsPath)}`);
    }

    private async _saveToFile(taskIdToSaveHistory?: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.rcnb')) {
            vscode.window.showWarningMessage('No .rcnb file active. Changes are not saved to disk.');
            return;
        }

        const newText = this._parser.serialize(this._rcnbFile);
        const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, newText);
        });

        // Save history if requested
        if (taskIdToSaveHistory) {
            const task = this._taskManager.getTask(taskIdToSaveHistory);
            if (task && task.messages) {
                await this._historyService.saveHistory(editor.document.uri, taskIdToSaveHistory, task.messages);
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'out', 'compiled', 'sidebar.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>RC Book</title>
            </head>
            <body>
                <div id="root">
                    <div style="padding: 20px; text-align: center;">
                        Loading RC Book...
                        <br/><br/>
                        <small style="color: grey;">If this persists, please check Developer Tools for errors.</small>
                    </div>
                </div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                    console.log('RC Book: Webview script initialized');
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    window.onerror = function(message, source, lineno, colno, error) {
                        console.error('RC Book Webview Error:', message, source, lineno, colno, error);
                        // Optional: post message back to extension
                        if (window.vscode) {
                            window.vscode.postMessage({
                                type: 'onError',
                                value: 'Webview JS Error: ' + message
                            });
                        }
                    };
                </script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
