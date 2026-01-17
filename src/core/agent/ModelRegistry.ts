import { AgentProfile, AgentRole, ModelConfig } from './types';

export class ModelRegistry {
    private static instance: ModelRegistry;
    private profiles: Map<AgentRole, AgentProfile>;

    private constructor() {
        this.profiles = new Map();
        this.initializeDefaults();
    }

    public static getInstance(): ModelRegistry {
        if (!ModelRegistry.instance) {
            ModelRegistry.instance = new ModelRegistry();
        }
        return ModelRegistry.instance;
    }

    private initializeDefaults() {
        // Default Architect
        this.registerProfile({
            role: 'architect',
            name: 'System Architect',
            description: 'Analyzes requirements and designs system architecture.',
            defaultModel: {
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20240620'
            },
            systemPrompt: 'You are an expert system architect...'
        });

        // Default Coder
        this.registerProfile({
            role: 'coder',
            name: 'Senior Developer',
            description: 'Writes high-quality, tested code.',
            defaultModel: {
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20240620' // Or DeepSeek if available
            },
            systemPrompt: 'You are an expert software developer...'
        });

        // Default Reviewer
        this.registerProfile({
            role: 'reviewer',
            name: 'Code Reviewer',
            description: 'Reviews code for best practices and bugs.',
            defaultModel: {
                provider: 'openai',
                model: 'gpt-4o'
            },
            systemPrompt: 'You are an expert code reviewer...'
        });
    }

    public registerProfile(profile: AgentProfile) {
        this.profiles.set(profile.role, profile);
    }

    public getProfile(role: AgentRole): AgentProfile | undefined {
        return this.profiles.get(role);
    }

    public updateModelConfig(role: AgentRole, config: ModelConfig) {
        const profile = this.profiles.get(role);
        if (!profile) {
            throw new Error(`Agent profile for role ${role} not found.`);
        }
        profile.defaultModel = config;
        this.profiles.set(role, profile);
    }

    // For testing purposes
    public reset() {
        this.profiles.clear();
        this.initializeDefaults();
    }
}
