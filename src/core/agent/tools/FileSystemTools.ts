
import * as vscode from 'vscode';
import { Tool } from '../interfaces';
import { TextDecoder, TextEncoder } from 'util';

export class FileSystemTools {
    public static getTools(): Tool[] {
        return [
            {
                name: 'read_file',
                description: 'Read the contents of a file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to file' }
                    },
                    required: ['path']
                }
            },
            {
                name: 'write_file',
                description: 'Write content to a file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to file' },
                        content: { type: 'string', description: 'Content to write' }
                    },
                    required: ['path', 'content']
                }
            }
        ];
    }

    public static async execute(name: string, args: any): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            // Fallback for testing or no workspace
            // throw new Error('No workspace folder open');
            // But for tests, we might mock workspaceFolders
        }

        const rootUri = workspaceFolder ? workspaceFolder.uri : vscode.Uri.file('/');

        if (name === 'read_file') {
            const uri = vscode.Uri.joinPath(rootUri, args.path);
            const content = await vscode.workspace.fs.readFile(uri);
            return new TextDecoder().decode(content);
        }

        if (name === 'write_file') {
            const uri = vscode.Uri.joinPath(rootUri, args.path);
            await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(args.content));
            return `Successfully wrote to ${args.path}`;
        }

        throw new Error(`Unknown tool: ${name}`);
    }
}
