import { IAgent, ILLMProvider, Tool } from './interfaces';
import { AgentProfile, Message } from './types';

export class BaseAgent implements IAgent {
    public profile: AgentProfile;
    protected llmProvider: ILLMProvider;
    protected tools: Tool[];

    constructor(profile: AgentProfile, llmProvider: ILLMProvider) {
        this.profile = profile;
        this.llmProvider = llmProvider;
        this.tools = []; // Initialize with basic tools if needed
    }

    public async chat(messages: Message[]): Promise<string> {
        // Here we would handle context window management, but for MVP we pass all
        return this.llmProvider.generateResponse(
            messages,
            this.profile.systemPrompt,
            this.tools,
            this.profile.defaultModel
        );
    }

    public getTools(): Tool[] {
        return this.tools;
    }

    public registerTool(tool: Tool) {
        this.tools.push(tool);
    }
}
