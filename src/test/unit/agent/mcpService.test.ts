
import { MCPService } from '../../../core/agent/MCPService';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => {
    return {
        Client: jest.fn().mockImplementation(() => ({
            connect: jest.fn().mockResolvedValue(undefined),
            listTools: jest.fn().mockResolvedValue({
                tools: [
                    {
                        name: 'read_file',
                        description: 'Read a file',
                        inputSchema: { type: 'object' }
                    }
                ]
            }),
            callTool: jest.fn().mockResolvedValue({
                content: [{ type: 'text', text: 'file content' }]
            })
        }))
    };
});

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
    return {
        StdioClientTransport: jest.fn().mockImplementation(() => ({}))
    };
});

describe('MCPService', () => {
    let service: MCPService;

    beforeEach(() => {
        service = new MCPService();
    });

    test('should connect to a stdio server', async () => {
        await service.connectStdio('test-server', 'node', ['server.js']);
        const tools = await service.getAllTools();
        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('read_file');
    });

    test('should call a tool on a specific server', async () => {
        await service.connectStdio('test-server', 'node', ['server.js']);
        const result = await service.callTool('test-server', 'read_file', { path: 'test.txt' });
        expect(result).toBe('file content');
    });
});
