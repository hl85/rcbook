import { z } from 'zod';

// --- Cell Types ---

export type CellType = 'plan' | 'task';

export interface BaseCell {
    id: string;
    type: CellType;
}

export interface PlanStep {
    id: string;
    title: string;
    description: string;
    agent: AgentRole;
    status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface PlanCell extends BaseCell {
    type: 'plan';
    content: string; // User Requirement
    planData?: {
        steps: PlanStep[];
    };
    status: 'draft' | 'approved';
}

export interface TaskCell extends BaseCell {
    type: 'task';
    stepId: string; // Links back to PlanStep
    agentType: AgentRole;
    modelConfig: ModelConfig;
    chatHistory: Message[];
    status: 'pending' | 'running' | 'reviewing' | 'completed' | 'failed';
}

export type Cell = PlanCell | TaskCell;

// --- Agent & Model Types ---

export type AgentRole = 'architect' | 'coder' | 'reviewer';

export interface ModelConfig {
    provider: 'openai' | 'anthropic' | 'ollama';
    model: string;
    temperature?: number;
}

export interface AgentProfile {
    role: AgentRole;
    name: string;
    description: string;
    defaultModel: ModelConfig;
    systemPrompt: string;
}

// --- Chat Types ---

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

// --- Zod Schemas (for validation) ---

export const ModelConfigSchema = z.object({
    provider: z.enum(['openai', 'anthropic', 'ollama']),
    model: z.string(),
    temperature: z.number().optional(),
});

export const AgentProfileSchema = z.object({
    role: z.enum(['architect', 'coder', 'reviewer']),
    name: z.string(),
    description: z.string(),
    defaultModel: ModelConfigSchema,
    systemPrompt: z.string(),
});
