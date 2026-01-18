import { ILLMProvider } from './types';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';
import { GeminiProvider } from './GeminiProvider';
import { ModelConfig } from '../agent/types';

export class AIProviderFactory {
    private static instance: AIProviderFactory;
    private providers: Map<string, ILLMProvider>;

    private constructor() {
        this.providers = new Map();
        this.registerProvider(new OpenAICompatibleProvider());
        this.registerProvider(new GeminiProvider());
    }

    public static getInstance(): AIProviderFactory {
        if (!AIProviderFactory.instance) {
            AIProviderFactory.instance = new AIProviderFactory();
        }
        return AIProviderFactory.instance;
    }

    public registerProvider(provider: ILLMProvider) {
        this.providers.set(provider.id, provider);
    }

    public getProvider(config: ModelConfig): ILLMProvider {
        // 0. Check if provider is directly registered by ID (useful for mocks/extensions)
        if (this.providers.has(config.provider)) {
            return this.providers.get(config.provider)!;
        }

        // Map config.provider to provider implementation
        
        if (['openai', 'deepseek', 'kimi'].includes(config.provider)) {
             return this.providers.get('openai-compatible')!;
        }
        
        if (config.provider === 'gemini') {
            return this.providers.get('gemini')!;
        }
        
        // Fallback for others to OpenAI compatible (might fail if protocol differs)
        if (config.provider === 'anthropic' || config.provider === 'ollama') {
             // For MVP, warn or try OpenAI compatible
             console.warn(`Provider ${config.provider} is not natively supported, trying OpenAI compatible...`);
             return this.providers.get('openai-compatible')!;
        }

        throw new Error(`Provider ${config.provider} not supported`);
    }
}
