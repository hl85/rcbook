
import * as vscode from 'vscode';
import { Tool } from '../../../../core/agent/interfaces';
import { FileSystemTools } from '../../../../core/agent/tools/FileSystemTools';

describe('FileSystemTools', () => {
    let tools: Tool[];
    
    // Get references to mocks from the global mock object
    const mockWriteFile = vscode.workspace.fs.writeFile as jest.Mock;
    const mockReadFile = vscode.workspace.fs.readFile as jest.Mock;

    beforeEach(() => {
        tools = FileSystemTools.getTools();
        mockWriteFile.mockClear();
        mockReadFile.mockClear();
    });

    test('should provide read_file and write_file tools', () => {
        const toolNames = tools.map(t => t.name);
        expect(toolNames).toContain('read_file');
        expect(toolNames).toContain('write_file');
    });

    test('write_file should call vscode.workspace.fs.writeFile', async () => {
        await FileSystemTools.execute('write_file', { path: 'test.txt', content: 'hello' });
        expect(mockWriteFile).toHaveBeenCalled();
    });

    test('read_file should call vscode.workspace.fs.readFile', async () => {
        mockReadFile.mockResolvedValue(Buffer.from('content'));
        const content = await FileSystemTools.execute('read_file', { path: 'test.txt' });
        expect(mockReadFile).toHaveBeenCalled();
        expect(content).toBe('content');
    });
});
