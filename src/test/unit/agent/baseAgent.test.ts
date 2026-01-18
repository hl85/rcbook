import { BaseAgent } from '../../../core/agent/BaseAgent';
import { ILLMProvider, Tool } from '../../../core/agent/interfaces';
import { AgentProfile, Message } from '../../../core/agent/types';

// Mock LLM Provider
class MockLLMProvider implements ILLMProvider {
    async generateResponse(
        messages: Message[],
        _systemPrompt: string,
        _tools?: Tool[],
        _config?: any
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
        const result = await agent.chat(messages);
        expect(result.response).toBe('Hello there!');
        expect(result.history).toHaveLength(2); // user + assistant
    });

    test('should include system prompt in LLM call', async () => {
        // We can spy on the provider to verify arguments
        const spy = jest.spyOn(mockProvider, 'generateResponse');
        const messages: Message[] = [
            { role: 'user', content: 'test', timestamp: Date.now() }
        ];
        
        await agent.chat(messages);
        
        // Check the first call arguments
        const firstCallArgs = spy.mock.calls[0];
        expect(firstCallArgs[1]).toBe(profile.systemPrompt);
        expect(firstCallArgs[3]).toEqual(profile.defaultModel);
        
        // Check messages content (ignoring mutations that happened after)
        // Since currentMessages is mutated, we can't rely on strict equality of the array state at call time
        // unless we deep copy in the implementation or test differently.
        // However, we can check that the first message is what we expect.
        const passedMessages = firstCallArgs[0] as Message[];
        expect(passedMessages[0].content).toBe('test');
    });

    test('should return registered tools', () => {
        const tools = agent.getTools();
        expect(Array.isArray(tools)).toBe(true);
        expect(tools).toHaveLength(0); // Initially empty
    });

    // --- Added Tests ---

    test('should register a new tool', () => {
        const tool: Tool = {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: { type: 'object' }
        };
        agent.registerTool(tool);
        
        const tools = agent.getTools();
        expect(tools).toHaveLength(1);
        expect(tools[0]).toBe(tool);
    });

    test('should pass registered tools to LLM provider', async () => {
        const tool: Tool = { name: 'my_tool', inputSchema: {} };
        agent.registerTool(tool);
        
        const spy = jest.spyOn(mockProvider, 'generateResponse');
        await agent.chat([{ role: 'user', content: 'hi', timestamp: Date.now() }]);
        
        expect(spy).toHaveBeenCalledWith(
            expect.any(Array),
            expect.any(String),
            expect.arrayContaining([tool]),
            expect.any(Object)
        );
    });
});
