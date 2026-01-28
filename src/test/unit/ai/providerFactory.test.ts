
import { AIProviderFactory } from '../../../core/ai/AIProviderFactory';
import { ModelConfig } from '../../../core/agent/types';

describe('AIProviderFactory', () => {
    let factory: AIProviderFactory;

    beforeEach(() => {
        factory = AIProviderFactory.getInstance();
    });

    test('should return OpenAICompatibleProvider for supported providers', () => {
        const providers = ['openai', 'deepseek', 'kimi', 'qwencode', 'glm', 'openrouter', 'local', 'custom'];
        
        providers.forEach(p => {
            const config: ModelConfig = {
                provider: p as any,
                model: 'test-model'
            };
            const provider = factory.getProvider(config);
            expect(provider).toBeDefined();
            expect(provider.id).toBe('openai-compatible');
        });
    });

    test('should return GeminiProvider for gemini', () => {
        const config: ModelConfig = {
            provider: 'gemini',
            model: 'gemini-pro'
        };
        const provider = factory.getProvider(config);
        expect(provider).toBeDefined();
        expect(provider.id).toBe('gemini');
    });
    
    test('should fallback to OpenAICompatible for anthropic', () => {
         const config: ModelConfig = {
            provider: 'anthropic',
            model: 'claude-3'
        };
        const provider = factory.getProvider(config);
        expect(provider).toBeDefined();
        expect(provider.id).toBe('openai-compatible');
    });
});
