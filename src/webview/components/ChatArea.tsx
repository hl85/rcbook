import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../core/types';

interface ChatAreaProps {
    taskId: string;
    messages: Message[];
    onSendMessage: (text: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ taskId, messages, onSendMessage }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) { return; }
        onSendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-area" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="messages-list" style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        backgroundColor: msg.role === 'user' ? 'var(--vscode-button-background)' : 'var(--vscode-editor-inactiveSelectionBackground)',
                        color: msg.role === 'user' ? 'var(--vscode-button-foreground)' : 'var(--vscode-editor-foreground)',
                        fontSize: '0.9em'
                    }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.8em', marginBottom: '4px', opacity: 0.8 }}>
                            {msg.role === 'user' ? 'You' : 'AI'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="chat-input" style={{ display: 'flex', gap: '8px' }}>
                <textarea 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI..."
                    style={{
                        flex: 1,
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '2px',
                        padding: '6px',
                        resize: 'vertical',
                        minHeight: '32px'
                    }}
                />
                <button onClick={handleSend} style={{
                    background: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '2px',
                    padding: '0 12px',
                    cursor: 'pointer'
                }}>Send</button>
            </div>
        </div>
    );
};
