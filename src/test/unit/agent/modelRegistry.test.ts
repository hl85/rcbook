import { ModelRegistry } from '../../../core/agent/ModelRegistry';
import { AgentProfile, AgentRole } from '../../../core/agent/types';

describe('ModelRegistry', () => {
    let registry: ModelRegistry;

    beforeEach(() => {
        // Reset singleton for testing if possible, or just get instance
        // For simple singleton, we might just use getInstance
        registry = ModelRegistry.getInstance();
        // Ideally we should have a method to clear state for testing
        registry.reset(); 
    });

    test('should be a singleton', () => {
        const registry2 = ModelRegistry.getInstance();
        expect(registry).toBe(registry2);
    });

    test('should register and retrieve an agent profile', () => {
        const profile: AgentProfile = {
            role: 'coder',
            name: 'Test Coder',
            description: 'A test coder',
            defaultModel: {
                provider: 'openai',
                model: 'gpt-4'
            },
            systemPrompt: 'You are a coder.'
        };

        registry.registerProfile(profile);
        const retrieved = registry.getProfile('coder');
        
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('Test Coder');
        expect(retrieved?.defaultModel.model).toBe('gpt-4');
    });

    test('should return default profiles if not registered', () => {
        // Assuming we have defaults initialized
        const architect = registry.getProfile('architect');
        expect(architect).toBeDefined();
        expect(architect?.role).toBe('architect');
    });

    test('should update model config for an agent', () => {
        registry.updateModelConfig('architect', {
            provider: 'anthropic',
            model: 'claude-3-opus'
        });

        const architect = registry.getProfile('architect');
        expect(architect?.defaultModel.provider).toBe('anthropic');
        expect(architect?.defaultModel.model).toBe('claude-3-opus');
    });

    test('should throw error when updating non-existent agent', () => {
        expect(() => {
            registry.updateModelConfig('non-existent' as AgentRole, {
                provider: 'openai',
                model: 'gpt-3.5'
            });
        }).toThrow();
    });
});
