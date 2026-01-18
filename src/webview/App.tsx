import React, { useState, useEffect } from 'react';
import { TaskList } from './components/TaskList';
import { SettingsModal } from './components/SettingsModal';
import { Task } from '../core/types';

declare global {
    interface Window {
        vscode: any;
    }
}

export default function App() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [config, setConfig] = useState<any>({});

    useEffect(() => {
        // Handle messages from extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'updateState':
                    if (message.value && message.value.tasks) {
                        setTasks(message.value.tasks);
                    }
                    if (message.value && message.value.config) {
                        setConfig(message.value.config);
                    }
                    break;
                case 'updateConfig':
                    setConfig(message.value);
                    break;
                case 'onAIStream': {
                    const { taskId, token } = message.value;
                    setTasks(prevTasks => {
                        return prevTasks.map(t => {
                            if (t.id === taskId) {
                                // Find last assistant message and append token
                                const msgs = [...(t.messages || [])];
                                const lastMsg = msgs[msgs.length - 1];
                                if (lastMsg && lastMsg.role === 'assistant') {
                                    msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + token };
                                } else {
                                    // Should ideally be handled by full sync, but for stream visual:
                                    msgs.push({ role: 'assistant', content: token });
                                }
                                return { ...t, messages: msgs };
                            }
                            return t;
                        });
                    });
                    break;
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // Signal that we are ready
        if (window.vscode) {
            window.vscode.postMessage({ type: 'webviewReady' });
            // Request initial config
            window.vscode.postMessage({ type: 'getConfig' });
        }

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleCreateTask = () => {
        if (window.vscode) {
            window.vscode.postMessage({
                type: 'createTask',
                value: {
                    title: 'New Task',
                    content: 'Describe your task here...'
                }
            });
        }
    };

    const handleToggleTask = (taskId: string) => {
        setExpandedTaskId(prev => prev === taskId ? null : taskId);
    };

    const handleSaveSettings = (newConfig: any) => {
        setConfig(newConfig);
        if (window.vscode) {
            window.vscode.postMessage({
                type: 'saveConfig',
                value: newConfig
            });
        }
    };

    return (
        <div className="app">
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>RC Book</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        title="Settings"
                        style={{
                            background: 'transparent',
                            color: 'var(--vscode-foreground)',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {/* Gear Icon SVG */}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M9.1 14.4l-1.3.4-.6-1.5c-.3-.1-.6-.2-.9-.4l-1.4 1-.9-1 1-1.3c-.2-.3-.3-.6-.4-.9l-1.5-.6.4-1.3 1.5-.6c.1-.3.2-.6.4-.9l-1-1.4 1-.9 1.3 1c.3-.2.6-.3.9-.4l.6-1.5 1.3.4.6 1.5c.3.1.6.2.9.4l1.4-1 .9 1-1 1.3c.2.3.3.6.4.9l1.5.6-.4 1.3-1.5.6c-.1.3-.2.6-.4.9l1 1.4-1 .9-1.3-1c-.3.2-.6.3-.9.4l-.6 1.5zM6.5 8c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5S10.4 5.5 9 5.5 6.5 6.6 6.5 8z"/>
                        </svg>
                    </button>
                    <button onClick={handleCreateTask} style={{ 
                        background: 'var(--vscode-button-background)', 
                        color: 'var(--vscode-button-foreground)',
                        border: 'none',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        borderRadius: '2px'
                    }}>+ New Task</button>
                </div>
            </div>
            
            <TaskList 
                tasks={tasks} 
                expandedTaskId={expandedTaskId}
                onToggleTask={handleToggleTask}
            />
            
            {tasks.length === 0 && (
                <div className="empty-state" style={{ textAlign: 'center', padding: '20px', color: 'var(--vscode-descriptionForeground)' }}>
                    No tasks yet. Create one to get started.
                </div>
            )}

            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                initialConfig={config}
                onSave={handleSaveSettings}
            />
        </div>
    );
}
