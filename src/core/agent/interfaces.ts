import { AgentProfile, Message, ModelConfig } from './types';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';

// Minimal Tool definition (compatible with MCP)
export interface Tool {
    name: string;
    description?: string;
    inputSchema: Record<string, any>;
}

export interface ILLMProvider {
    generateResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: Tool[],
        config?: ModelConfig
    ): Promise<string>; // Returns raw content for now
}

export interface IAgent {
    profile: AgentProfile;
    chat(messages: Message[]): Promise<string>;
    getTools(): Tool[];
}
