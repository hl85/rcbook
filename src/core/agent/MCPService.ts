
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool } from './interfaces';

export class MCPService {
    private clients: Map<string, Client>;

    constructor() {
        this.clients = new Map();
    }

    public async connectStdio(serverId: string, command: string, args: string[] = []): Promise<void> {
        const transport = new StdioClientTransport({
            command,
            args,
        });

        const client = new Client(
            {
                name: "rcbook-client",
                version: "1.0.0",
            },
            {
                capabilities: {
                    sampling: {},
                },
            }
        );

        await client.connect(transport);
        this.clients.set(serverId, client);
    }

    public async getAllTools(): Promise<Tool[]> {
        const allTools: Tool[] = [];
        for (const [serverId, client] of this.clients.entries()) {
            const result = await client.listTools();
            const tools = result.tools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema as Record<string, any>,
                serverId // Optional: track which server provided the tool
            }));
            allTools.push(...tools);
        }
        return allTools;
    }

    public async callTool(serverId: string, toolName: string, args: any): Promise<any> {
        const client = this.clients.get(serverId);
        if (!client) {
            throw new Error(`MCP Server ${serverId} not found`);
        }

        const result = await client.callTool({
            name: toolName,
            arguments: args
        });

        // Basic handling of result content
        // MCP results can be mixed content (text, image, resource)
        // For now, we join text content
        if (result.content && Array.isArray(result.content)) {
            return result.content
                .filter(c => c.type === 'text')
                .map(c => (c as any).text)
                .join('\n');
        }

        return result;
    }
}
