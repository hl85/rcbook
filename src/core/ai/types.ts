export interface AIStreamCallbacks {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: Error) => void;
}

export interface IAIService {
    streamChat(prompt: string, history: { role: string; content: string }[], callbacks: AIStreamCallbacks): Promise<void>;
}
