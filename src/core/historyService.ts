import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Message } from './types';

export class HistoryService {
    private _getHistoryDir(rcnbUri: vscode.Uri): string {
        const dir = path.dirname(rcnbUri.fsPath);
        const filename = path.basename(rcnbUri.fsPath);
        // Assuming filename is something.rcnb, directory should be .something.rcnbhistory? 
        // Or generic .rcnbhistory folder?
        // TDD said: ".rcnbhistory directory". Let's assume a single hidden directory per project or per file location.
        // Let's go with a sibling folder named ".rcnbhistory".
        return path.join(dir, '.rcnbhistory');
    }

    private _getHistoryFile(rcnbUri: vscode.Uri, taskId: string): string {
        const historyDir = this._getHistoryDir(rcnbUri);
        return path.join(historyDir, `${taskId}.json`);
    }

    async loadHistory(rcnbUri: vscode.Uri, taskId: string): Promise<Message[]> {
        const filePath = this._getHistoryFile(rcnbUri, taskId);
        if (!fs.existsSync(filePath)) {
            return [];
        }

        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return JSON.parse(content) as Message[];
        } catch (e) {
            console.error(`Failed to load history for task ${taskId}`, e);
            return [];
        }
    }

    async saveHistory(rcnbUri: vscode.Uri, taskId: string, messages: Message[]): Promise<void> {
        const historyDir = this._getHistoryDir(rcnbUri);
        
        if (!fs.existsSync(historyDir)) {
            await fs.promises.mkdir(historyDir, { recursive: true });
        }

        const filePath = this._getHistoryFile(rcnbUri, taskId);
        try {
            await fs.promises.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf-8');
        } catch (e) {
            console.error(`Failed to save history for task ${taskId}`, e);
        }
    }
}
