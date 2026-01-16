import { IAIService, AIStreamCallbacks } from './types';

export class MockAIService implements IAIService {
    async streamChat(prompt: string, history: { role: string; content: string }[], callbacks: AIStreamCallbacks): Promise<void> {
        const mockResponse = `I received your request: "${prompt}".\n\nHere is a mock response simulating an AI thinking process.`;
        const tokens = mockResponse.split(/(?=\s)/); // Split by words but keep whitespace

        for (const token of tokens) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network latency
            callbacks.onToken(token);
        }

        callbacks.onComplete(mockResponse);
    }
}
