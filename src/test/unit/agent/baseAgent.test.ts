import { BaseAgent } from '../../../core/agent/BaseAgent';
import { ILLMProvider, Tool } from '../../../core/agent/interfaces';
import { AgentProfile, Message } from '../../../core/agent/types';

// Mock LLM Provider
class MockLLMProvider implements ILLMProvider {
    async generateResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: Tool[]
    ): Promise<string> {
        // Simple mock response based on last message
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.content.includes('hello')) {
            return 'Hello there!';
        }
        return 'Mock response';
    }
}

describe('BaseAgent', () => {
    let agent: BaseAgent;
    let mockProvider: MockLLMProvider;
    let profile: AgentProfile;

    beforeEach(() => {
        mockProvider = new MockLLMProvider();
        profile = {
            role: 'coder',
            name: 'Test Coder',
            description: 'Test',
            defaultModel: { provider: 'openai', model: 'gpt-4' },
            systemPrompt: 'You are a test coder.'
        };
        agent = new BaseAgent(profile, mockProvider);
    });

    test('should initialize with profile', () => {
        expect(agent.profile).toEqual(profile);
    });

    test('should send messages to LLM and get response', async () => {
        const messages: Message[] = [
            { role: 'user', content: 'hello', timestamp: Date.now() }
        ];
        const response = await agent.chat(messages);
        expect(response).toBe('Hello there!');
    });

    test('should include system prompt in LLM call', async () => {
        // We can spy on the provider to verify arguments
        const spy = jest.spyOn(mockProvider, 'generateResponse');
        const messages: Message[] = [
            { role: 'user', content: 'test', timestamp: Date.now() }
        ];
        
        await agent.chat(messages);
        
        expect(spy).toHaveBeenCalledWith(
            messages,
            profile.systemPrompt,
            expect.any(Array), // tools
            profile.defaultModel
        );
    });

    test('should return registered tools', () => {
        const tools = agent.getTools();
        expect(Array.isArray(tools)).toBe(true);
    });
});
