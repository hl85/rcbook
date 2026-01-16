import * as vscode from 'vscode';
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

        if (apiKey) {
            this._aiService = new OpenAIService(apiKey, model, baseUrl);
            console.log('RC Book: Switched to OpenAIService');
        } else {
            this._aiService = new MockAIService();
            console.log('RC Book: Using MockAIService');
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

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
                    const task = this._taskManager.createTask(data.value.title);
                    task.content = data.value.content;
                    this._updateWebview();
                    await this._saveToFile();
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

                    // Call AI Service
                    let aiResponse = '';
                    await this._aiService.streamChat(prompt, task.messages || [], {
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
                    if (!task) return;

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
                    if (!task) return;

                    // Update task content with new code
                    task.content = code;
                    this._updateWebview();
                    
                    // Save to file
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
        if (!text.trim()) return; // Don't parse empty file yet

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
