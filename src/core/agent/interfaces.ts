import { AgentProfile, Message, ModelConfig } from './types';

// Minimal Tool definition (compatible with MCP)
export interface Tool {
    name: string;
    description?: string;
    inputSchema: Record<string, any>;
    serverId?: string; // Optional: ID of the MCP server providing this tool
}

export interface ILLMProvider {
    generateResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: Tool[],
        config?: ModelConfig
    ): Promise<string>; // Returns raw content or tool call JSON
}

export interface IAgent {
    profile: AgentProfile;
    chat(messages: Message[]): Promise<{ response: string, history: Message[] }>;
    getTools(): Tool[];
}
