import { Message, ModelConfig, Tool } from '../agent/types';

export interface AIStreamCallbacks {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: Error) => void;
}

export interface ILLMProvider {
    id: string;
    
    generateResponse(
        messages: Message[],
        systemPrompt: string | undefined,
        tools: any[], // TODO: Define strict Tool type
        modelConfig: ModelConfig,
        callbacks?: AIStreamCallbacks
    ): Promise<string>;
}
