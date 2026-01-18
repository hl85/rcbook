import { IAgent, Tool } from './interfaces';
import { AgentProfile, Message, ModelConfig } from './types';
import { AIProviderFactory } from '../ai/AIProviderFactory';
import { AIStreamCallbacks } from '../ai/types';

export class BaseAgent implements IAgent {
    public profile: AgentProfile;
    protected tools: Tool[];

    constructor(profile: AgentProfile) {
        this.profile = profile;
        this.tools = [];
    }

    public async chat(messages: Message[], configOverride?: ModelConfig): Promise<string> {
        const config = configOverride || this.profile.defaultModel;
        const provider = AIProviderFactory.getInstance().getProvider(config);
        
        return provider.generateResponse(
            messages,
            this.profile.systemPrompt,
            this.tools,
            config
        );
    }

    public async stream(
        messages: Message[],
        callbacks: AIStreamCallbacks,
        configOverride?: ModelConfig
    ): Promise<string> {
        const config = configOverride || this.profile.defaultModel;
        const provider = AIProviderFactory.getInstance().getProvider(config);
        
        return provider.generateResponse(
            messages,
            this.profile.systemPrompt,
            this.tools,
            config,
            callbacks
        );
    }

    public getTools(): Tool[] {
        return this.tools;
    }

    public registerTool(tool: Tool) {
        this.tools.push(tool);
    }
}
