import { AgentProfile, Message, ModelConfig } from './types';
import { AIStreamCallbacks } from '../ai/types';

// Minimal Tool definition (compatible with MCP)
export interface Tool {
    name: string;
    description?: string;
    inputSchema: Record<string, any>;
    serverId?: string; // Optional: ID of the MCP server providing this tool
}

export interface ILLMProvider {
    id: string;
    generateResponse(
        messages: Message[],
        systemPrompt: string | undefined,
        tools: Tool[],
        config: ModelConfig,
        callbacks?: AIStreamCallbacks
    ): Promise<string>; // Returns raw content or tool call JSON
}

export interface IAgent {
    profile: AgentProfile;
    chat(messages: Message[], configOverride?: ModelConfig): Promise<{ response: string, history: Message[] }>;
    stream(messages: Message[], callbacks: AIStreamCallbacks, configOverride?: ModelConfig): Promise<string>;
    getTools(): Tool[];
}
