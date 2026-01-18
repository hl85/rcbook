import { AgentProfile, Message, Tool } from './types';
import { ILLMProvider } from '../ai/types';
import { AIStreamCallbacks } from '../ai/types';

export { ILLMProvider, Tool };

export interface IAgent {
    profile: AgentProfile;
    chat(messages: Message[]): Promise<string>;
    stream(messages: Message[], callbacks: AIStreamCallbacks): Promise<string>;
    getTools(): Tool[];
}
