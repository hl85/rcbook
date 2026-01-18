import { IAgent, ILLMProvider, Tool } from './interfaces';
import { AgentProfile, Message } from './types';
import { MCPService } from './MCPService';

export class BaseAgent implements IAgent {
    public profile: AgentProfile;
    protected llmProvider: ILLMProvider;
    protected tools: Tool[];
    protected mcpService?: MCPService;

    protected localHandlers: Map<string, (args: any) => Promise<string>>;

    constructor(profile: AgentProfile, llmProvider: ILLMProvider, mcpService?: MCPService) {
        this.profile = profile;
        this.llmProvider = llmProvider;
        this.mcpService = mcpService;
        this.tools = []; 
        this.localHandlers = new Map();
        
        // Auto-register tools from MCP if available
        if (this.mcpService) {
            this.refreshTools();
        }
    }

    public async refreshTools() {
        if (this.mcpService) {
            const mcpTools = await this.mcpService.getAllTools();
            // Merge tools, avoiding duplicates
            const existingNames = new Set(this.tools.map(t => t.name));
            for (const tool of mcpTools) {
                if (!existingNames.has(tool.name)) {
                    this.tools.push(tool);
                }
            }
        }
    }

    public async chat(messages: Message[]): Promise<{ response: string, history: Message[] }> {
        const currentMessages = [...messages];
        let turns = 0;
        const maxTurns = 5;
        let finalResponse = "";

        while (turns < maxTurns) {
            turns++;
            
            const response = await this.llmProvider.generateResponse(
                currentMessages,
                this.profile.systemPrompt,
                this.tools,
                this.profile.defaultModel
            );

            // 1. Try to parse as Tool Call
            const toolCall = this.parseToolCall(response);
            
            if (toolCall) {
                // 2. Execute Tool
                // Add assistant message with tool call
                currentMessages.push({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });

                try {
                    const result = await this.executeTool(toolCall.name, toolCall.args);
                    
                    // 3. Add tool result to history
                    currentMessages.push({
                        role: 'user', // Or 'tool' role if supported
                        content: `Tool '${toolCall.name}' Output:\n${result}`,
                        timestamp: Date.now()
                    });
                    
                    // Loop continues
                } catch (error: any) {
                    currentMessages.push({
                        role: 'user',
                        content: `Tool '${toolCall.name}' Error: ${error.message}`,
                        timestamp: Date.now()
                    });
                }
            } else {
                // No tool call, just return the response
                finalResponse = response;
                currentMessages.push({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });
                break;
            }
        }

        if (turns >= maxTurns) {
            finalResponse = "Agent stopped after maximum turns.";
             currentMessages.push({
                role: 'assistant',
                content: finalResponse,
                timestamp: Date.now()
            });
        }

        return { response: finalResponse, history: currentMessages };
    }

    private parseToolCall(response: string): { name: string, args: any } | null {
        // Simple JSON block detection for MVP
        // Look for ```json { "tool": ... } ``` or just { "tool": ... }
        try {
            const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
                const json = JSON.parse(jsonMatch[1]);
                if (json.tool && json.args) {
                    return { name: json.tool, args: json.args };
                }
            }
        } catch (_e) {
            // Not a JSON tool call
        }
        return null;
    }

    private async executeTool(name: string, args: any): Promise<string> {
        // Check local tools
        if (this.localHandlers.has(name)) {
            try {
                return await this.localHandlers.get(name)!(args);
            } catch (e: any) {
                return `Error executing local tool ${name}: ${e.message}`;
            }
        }

        // Check MCP tools
        const tool = this.tools.find(t => t.name === name);
        if (!tool) { throw new Error(`Tool ${name} not found`); }

        if (tool.serverId && this.mcpService) {
            return await this.mcpService.callTool(tool.serverId, name, args);
        }

        return "Tool execution not implemented for this tool.";
    }

    public getTools(): Tool[] {
        return this.tools;
    }

    public registerTool(tool: Tool) {
        this.tools.push(tool);
    }

    public registerLocalTool(tool: Tool, handler: (args: any) => Promise<string>) {
        // Avoid duplicate registration
        if (!this.tools.find(t => t.name === tool.name)) {
            this.tools.push(tool);
        }
        this.localHandlers.set(tool.name, handler);
    }
}
