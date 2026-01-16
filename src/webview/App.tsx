import React, { useState, useEffect } from 'react';
import { TaskList } from './components/TaskList';
import { Task } from '../core/types';

declare global {
    interface Window {
        vscode: any;
    }
}

export default function App() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    useEffect(() => {
        // Handle messages from extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'updateState':
                    if (message.value && message.value.tasks) {
                        setTasks(message.value.tasks);
                    }
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

    return (
        <div className="app">
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>RC Book</h2>
                <button onClick={handleCreateTask} style={{ 
                    background: 'var(--vscode-button-background)', 
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    borderRadius: '2px'
                }}>+ New Task</button>
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
        </div>
    );
}
