import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { ILLMProvider, AIStreamCallbacks } from './types';
import { Message, ModelConfig, Tool } from '../agent/types';

export class OpenAICompatibleProvider implements ILLMProvider {
    id = 'openai-compatible';

    async generateResponse(
        messages: Message[],
        systemPrompt: string | undefined,
        tools: Tool[],
        modelConfig: ModelConfig,
        callbacks?: AIStreamCallbacks
    ): Promise<string> {
        const fullMessages = [];
        if (systemPrompt) {
            fullMessages.push({ role: 'system', content: systemPrompt });
        }
        fullMessages.push(...messages.map(m => ({ role: m.role, content: m.content })));

        const requestBody: any = {
            model: modelConfig.model,
            messages: fullMessages,
            stream: !!callbacks,
            temperature: modelConfig.temperature ?? 0.7
        };

        // TODO: Handle Tools mapping here when we support them fully
        
        // Determine Base URL based on provider if not explicitly set
        let baseUrl = modelConfig.baseUrl;
        if (!baseUrl) {
            switch (modelConfig.provider) {
                case 'deepseek':
                    baseUrl = 'https://api.deepseek.com';
                    break;
                case 'kimi':
                    baseUrl = 'https://api.moonshot.cn/v1';
                    break;
                case 'qwencode':
                    baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
                    break;
                case 'glm':
                    baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
                    break;
                case 'openrouter':
                    baseUrl = 'https://openrouter.ai/api/v1';
                    break;
                case 'local':
                    baseUrl = 'http://localhost:11434/v1';
                    break;
                case 'openai':
                default:
                    baseUrl = 'https://api.openai.com/v1';
                    break;
            }
        }
        // Ensure no trailing slash for consistent appending
        if (baseUrl.endsWith('/')) {baseUrl = baseUrl.slice(0, -1);}

        const apiKey = modelConfig.apiKey;
        if (!apiKey && modelConfig.provider !== 'local') {
            throw new Error(`API Key is missing for provider ${modelConfig.provider}`);
        }

        return new Promise((resolve, reject) => {
            let requestUrl: URL;
            try {
                requestUrl = new URL(`${baseUrl}/chat/completions`);
            } catch (_e) {
                reject(new Error(`Invalid Base URL: ${baseUrl}`));
                return;
            }

            const options: https.RequestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey || 'dummy'}` // Some local servers need auth header presence
                }
            };

            let fullText = '';
            let rawResponse = ''; // For non-stream debugging

            const client = requestUrl.protocol === 'http:' ? http : https;

            const req = client.request(requestUrl, options, (res) => {
                if (res.statusCode !== 200) {
                    let errorBody = '';
                    res.on('data', chunk => errorBody += chunk);
                    res.on('end', () => {
                         const errorMsg = `API Error: ${res.statusCode} - ${errorBody}`;
                         if (callbacks) {callbacks.onError(new Error(errorMsg));}
                         reject(new Error(errorMsg));
                    });
                    return;
                }

                res.on('data', (chunk) => {
                    if (!callbacks) {
                        rawResponse += chunk.toString();
                        return;
                    }

                    const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
                    for (const line of lines) {
                        const message = line.replace(/^data: /, '');
                        if (message === '[DONE]') {continue;}
                        try {
                            const parsed = JSON.parse(message);
                            const token = parsed.choices[0]?.delta?.content;
                            if (token) {
                                fullText += token;
                                callbacks.onToken(token);
                            }
                        } catch (_e) {
                            // ignore partial JSON
                        }
                    }
                });

                res.on('end', () => {
                    if (callbacks) {
                        callbacks.onComplete(fullText);
                        resolve(fullText);
                    } else {
                        try {
                            const parsed = JSON.parse(rawResponse);
                            fullText = parsed.choices[0]?.message?.content || '';
                            resolve(fullText);
                        } catch (e) {
                            reject(new Error('Failed to parse response: ' + e));
                        }
                    }
                });
            });

            req.on('error', (e) => {
                if (callbacks) {callbacks.onError(e);}
                reject(e);
            });

            req.write(JSON.stringify(requestBody));
            req.end();
        });
    }
}
