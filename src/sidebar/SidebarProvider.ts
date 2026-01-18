import * as vscode from 'vscode';
import { TaskManager } from '../core/taskManager';
import { RcnbFile, Task } from '../core/types';
import { RcnbParser } from '../core/parser';
import { HistoryService } from '../core/historyService';
import { BaseAgent } from '../core/agent/BaseAgent';
import { ModelRegistry } from '../core/agent/ModelRegistry';
import { AgentRole } from '../core/agent/types';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'rcbook.sidebarView';
    private _view?: vscode.WebviewView;
    private _rcnbFile: RcnbFile = { metadata: {}, tasks: [] };
    private _taskManager: TaskManager = new TaskManager(this._rcnbFile);
    private _parser = new RcnbParser();
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

        // Initialize AI Configuration
        this._initAIService();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('rcbook.ai')) {
                this._initAIService();
            }
        });
    }

    private _initAIService() {
        const config = vscode.workspace.getConfiguration('rcbook.ai');
        const provider = config.get<string>('provider') || 'openai';
        const apiKey = config.get<string>('apiKey');
        const model = config.get<string>('model');
        const baseUrl = config.get<string>('baseUrl');

        console.log(`RC Book: Initializing AI Service with provider=${provider}, model=${model}`);

        const registry = ModelRegistry.getInstance();
        ['architect', 'coder', 'reviewer'].forEach(role => {
            const profile = registry.getProfile(role as any);
            if (profile) {
                const newConfig = { ...profile.defaultModel };
                if (provider) newConfig.provider = provider as any;
                if (model) newConfig.model = model;
                if (apiKey) newConfig.apiKey = apiKey;
                if (baseUrl) newConfig.baseUrl = baseUrl;
                
                registry.updateModelConfig(role as any, newConfig);
            }
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._context.extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'onInfo': {
                    if (!data.value) return;
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case 'onError': {
                    if (!data.value) return;
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
                case 'createTask': {
                    const task = this._taskManager.createTask(data.value.title);
                    task.content = data.value.content;
                    this._updateWebview();
                    await this._saveToFile();
                    break;
                }
                case 'updateTask': {
                    // Handle task updates (e.g. mode change)
                    const { taskId, mode } = data.value;
                    const task = this._taskManager.getTask(taskId);
                    if (task) {
                        task.mode = mode;
                        await this._saveToFile();
                    }
                    break;
                }
                case 'askAI': {
                    const { taskId, prompt } = data.value;
                    const task = this._taskManager.getTask(taskId);
                    if (!task) return;

                    // Add user message
                    this._taskManager.addMessage(taskId, {
                        role: 'user',
                        content: prompt,
                        timestamp: Date.now()
                    });
                    this._updateWebview();

                    // Determine Agent Role
                    let role: AgentRole = 'coder';
                    if (task.mode === 'architect') role = 'architect';
                    if (task.mode === 'debug') role = 'reviewer';

                    const profile = ModelRegistry.getInstance().getProfile(role);
                    if (!profile) {
                        vscode.window.showErrorMessage(`No agent profile found for role ${role}`);
                        return;
                    }

                    try {
                        const agent = new BaseAgent(profile);
                        
                        let aiResponse = '';
                        await agent.stream(task.messages || [], {
                            onToken: (token) => {
                                aiResponse += token;
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
                                this._saveToFile(taskId);
                            },
                            onError: (error) => {
                                console.error(error);
                                vscode.window.showErrorMessage(`AI Error: ${error.message}`);
                                this._view?.webview.postMessage({
                                    type: 'onAIError',
                                    value: { taskId, error: error.message }
                                });
                            }
                        });
                    } catch (e) {
                         vscode.window.showErrorMessage(`Failed to start AI agent: ${e}`);
                    }
                    break;
                }
                case 'openDiff': {
                    const { taskId } = data.value;
                    const task = this._taskManager.getTask(taskId);
                    if (!task) return;

                    let proposedCode = '';
                    const lastAiMsg = task.messages?.filter(m => m.role === 'assistant').pop();
                    if (lastAiMsg) {
                         const match = lastAiMsg.content.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
                         if (match) {
                             proposedCode = match[1];
                         } else {
                             proposedCode = lastAiMsg.content;
                         }
                    }

                    if (!proposedCode) {
                        vscode.window.showInformationMessage('No AI code found to diff.');
                        return;
                    }
                    
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
                    if (!task) return;

                    task.content = code;
                    this._updateWebview();
                    await this._saveToFile(taskId);
                    vscode.window.showInformationMessage('Code applied successfully!');
                    break;
                }
                case 'webviewReady': {
                    this._updateFromFile();
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
        if (!text.trim()) return;

        try {
            const file = this._parser.parse(text);
            this._rcnbFile = file;

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
                <div id="root"></div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
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
