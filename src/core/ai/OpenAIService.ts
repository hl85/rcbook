import { IAIService, AIStreamCallbacks } from './types';
import * as https from 'https';
import { URL } from 'url';

export class OpenAIService implements IAIService {
    constructor(
        private apiKey: string,
        private model: string,
        private baseUrl: string
    ) {}

    async streamChat(prompt: string, history: { role: string; content: string }[], callbacks: AIStreamCallbacks): Promise<void> {
        const messages = [
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: prompt }
        ];

        const requestBody = JSON.stringify({
            model: this.model,
            messages: messages,
            stream: true
        });

        const url = new URL(`${this.baseUrl}/chat/completions`);
        const options: https.RequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                if (res.statusCode !== 200) {
                    callbacks.onError(new Error(`API Error: ${res.statusCode}`));
                    res.resume(); // Consume response to free memory
                    return;
                }

                res.on('data', (chunk) => {
                    const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
                    for (const line of lines) {
                        const message = line.replace(/^data: /, '');
                        if (message === '[DONE]') {
                            return; 
                        }
                        try {
                            const parsed = JSON.parse(message);
                            const token = parsed.choices[0]?.delta?.content;
                            if (token) {
                                callbacks.onToken(token);
                            }
                        } catch (_e) {
                            // console.error('Error parsing stream chunk', e);
                        }
                    }
                });

                res.on('end', () => {
                    callbacks.onComplete('');
                    resolve(undefined);
                });
            });

            req.on('error', (e) => {
                callbacks.onError(e);
                reject(e);
            });

            req.write(requestBody);
            req.end();
        }).then(() => {
            // We need to pass full text. Since we didn't track it above, let's fix that.
            // Actually, for streaming, the SidebarProvider is accumulating.
            // But to satisfy interface, let's modify SidebarProvider to not rely on this arg if it's redundant,
            // OR track it here.
            // Let's track it here.
        });
    }
}
