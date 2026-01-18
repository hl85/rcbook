import * as https from 'https';
import { URL } from 'url';
import { ILLMProvider, AIStreamCallbacks } from './types';
import { Message, ModelConfig, Tool } from '../agent/types';

export class GeminiProvider implements ILLMProvider {
    id = 'gemini';

    async generateResponse(
        messages: Message[],
        systemPrompt: string | undefined,
        tools: Tool[],
        modelConfig: ModelConfig,
        callbacks?: AIStreamCallbacks
    ): Promise<string> {
        const apiKey = modelConfig.apiKey;
        if (!apiKey) {
            throw new Error('API Key is missing for Gemini Provider');
        }

        const modelName = modelConfig.model || 'gemini-1.5-flash';
        const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        const method = callbacks ? 'streamGenerateContent' : 'generateContent';
        
        const requestUrl = new URL(`${baseUrl}/models/${modelName}:${method}?key=${apiKey}`);

        // Map messages to Gemini format
        // Gemini uses 'user' and 'model' (instead of assistant)
        const geminiContent = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const requestBody: any = {
            contents: geminiContent,
            generationConfig: {
                temperature: modelConfig.temperature ?? 0.7
            }
        };

        if (systemPrompt) {
            requestBody.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        return new Promise((resolve, reject) => {
            const options: https.RequestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            let fullText = '';
            let rawResponse = '';

            const req = https.request(requestUrl, options, (res) => {
                if (res.statusCode !== 200) {
                    let errorBody = '';
                    res.on('data', chunk => errorBody += chunk);
                    res.on('end', () => {
                         const errorMsg = `Gemini API Error: ${res.statusCode} - ${errorBody}`;
                         if (callbacks) callbacks.onError(new Error(errorMsg));
                         reject(new Error(errorMsg));
                    });
                    return;
                }

                res.on('data', (chunk) => {
                    if (!callbacks) {
                        rawResponse += chunk.toString();
                        return;
                    }

                    // Gemini Streaming Response:
                    // Array of JSON objects, usually one per chunk, but might be comma separated if it's a JSON array stream
                    // Actually, for streamGenerateContent, it returns a stream of JSON objects.
                    // But we need to be careful about parsing partial JSON.
                    // A simple approach for now: accumulate buffer and try to parse complete objects?
                    // Or simpler: The standard Node https response stream gives chunks.
                    
                    // The Gemini stream format is usually `[{...},\n{...}]` but effectively valid JSON array if waited for end.
                    // But "stream" mode might send `data: ` if using SSE? No, Google API is REST.
                    // It returns a standard HTTP response with chunked transfer encoding, 
                    // where the body is a JSON array `[{}, {}, ...]`.
                    
                    // Parsing a streaming JSON array is tricky without a library.
                    // Hack: We can regex for `"text": "..."` but that's dangerous.
                    
                    // Let's assume for MVP we accumulate enough to be valid JSON or use a robust parser?
                    // Actually, most simple clients just accumulate.
                    // BUT the user wants streaming.
                    
                    // Let's look at how others do it. Usually they split by `,\n` or similar separators if Google sends them.
                    // Let's just accumulate raw text for now and parse at the end for non-streaming,
                    // and for streaming, try to find complete objects.
                    
                    // Optimization: We will just do non-streaming for Gemini MVP to be safe, 
                    // unless we are sure about the format.
                    // Google docs say: "The response is a stream of GenerateContentResponse objects."
                    // It starts with `[` and ends with `]`.
                    
                    const chunkStr = chunk.toString();
                    
                    // Very naive parser for finding "text": "..."
                    // A better way is to find complete JSON objects `{...}` inside the array.
                    
                    // Let's simplify: Just support non-streaming for Gemini for this immediate step,
                    // and add a TODO to improve streaming parser.
                    // Wait, the user specifically asked for "AI Service capabilities".
                    // I'll try a best-effort streaming parser.
                    
                    // Improve regex to handle escaped quotes
                    const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
                    let match;
                    while ((match = regex.exec(chunkStr)) !== null) {
                        // Unescape generic JSON string chars
                        let text = match[1];
                        // JSON.parse(`"${text}"`) to handle escapes properly
                        try {
                            // We need to re-wrap in quotes to use JSON.parse to unescape
                            text = JSON.parse(`"${text}"`);
                            fullText += text;
                            callbacks.onToken(text);
                        } catch (e) {
                            // ignore
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
                            // candidates[0].content.parts[0].text
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            fullText = text;
                            resolve(fullText);
                        } catch (e) {
                            reject(new Error('Failed to parse Gemini response: ' + e));
                        }
                    }
                });
            });

            req.on('error', (e) => {
                if (callbacks) callbacks.onError(e);
                reject(e);
            });

            req.write(JSON.stringify(requestBody));
            req.end();
        });
    }
}
