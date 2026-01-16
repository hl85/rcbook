import React, { useState } from 'react';
import { Task } from '../../core/types';
import { CodeEditor } from './CodeEditor';
import { ChatArea } from './ChatArea';

interface TaskCellProps {
    task: Task;
    isExpanded: boolean;
    onToggle: () => void;
}

export const TaskCell: React.FC<TaskCellProps> = ({ task, isExpanded, onToggle }) => {

    const handleContentChange = (newContent: string) => {
        // ... (unchanged)
    };

    const handleSendMessage = (text: string) => {
        // ... (unchanged)
        if (window.vscode) {
            window.vscode.postMessage({
                type: 'askAI',
                value: {
                    taskId: task.id,
                    prompt: text
                }
            });
        }
    };

    const handleShowDiff = () => {
        if (window.vscode) {
            window.vscode.postMessage({
                type: 'openDiff',
                value: {
                    taskId: task.id
                }
            });
        }
    };

    const handleApplyCode = () => {
        // Extract code from last AI message
        let proposedCode = '';
        const lastAiMsg = task.messages?.filter(m => m.role === 'assistant').pop();
        if (lastAiMsg) {
             const match = lastAiMsg.content.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
             if (match) {
                 proposedCode = match[1];
             } else {
                 proposedCode = lastAiMsg.content;
             }
        }

        if (proposedCode && window.vscode) {
            window.vscode.postMessage({
                type: 'applyCode',
                value: {
                    taskId: task.id,
                    code: proposedCode
                }
            });
        }
    };

    return (
        <div className="task-cell" style={{ border: '1px solid var(--vscode-widget-border)', margin: '10px 0', padding: '10px', borderRadius: '4px', background: 'var(--vscode-editor-background)' }}>
            <div className="task-header" onClick={onToggle} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{task.title || 'Untitled Task'}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '3px', 
                        fontSize: '0.8em',
                        backgroundColor: 'var(--vscode-badge-background)',
                        color: 'var(--vscode-badge-foreground)'
                    }}>{task.status}</span>
                </div>
            </div>
            {isExpanded && (
                <div className="task-body" style={{ marginTop: '10px', borderTop: '1px solid var(--vscode-widget-border)', paddingTop: '10px' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <CodeEditor 
                            value={task.content} 
                            onChange={handleContentChange}
                            language="markdown" // or determine from mode
                        />
                    </div>
                    
                    <div className="task-actions" style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                         <button onClick={handleShowDiff} style={{
                            background: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: 'none',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            borderRadius: '2px',
                            fontSize: '0.9em'
                        }}>Show Diff</button>
                        <button onClick={handleApplyCode} style={{
                            background: 'var(--vscode-button-background)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            borderRadius: '2px',
                            fontSize: '0.9em'
                        }}>Apply Code</button>
                    </div>

                    <ChatArea 
                        taskId={task.id}
                        messages={task.messages || []}
                        onSendMessage={handleSendMessage}
                    />

                    <div className="task-meta" style={{ marginTop: '10px', fontSize: '0.8em', color: 'var(--vscode-descriptionForeground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label>Mode:</label>
                        <select 
                            value={task.mode}
                            onChange={(e) => {
                                if (window.vscode) {
                                    window.vscode.postMessage({
                                        type: 'updateTask',
                                        value: {
                                            taskId: task.id,
                                            mode: e.target.value
                                        }
                                    });
                                }
                            }}
                            style={{
                                background: 'var(--vscode-dropdown-background)',
                                color: 'var(--vscode-dropdown-foreground)',
                                border: '1px solid var(--vscode-dropdown-border)',
                                padding: '2px 4px',
                                borderRadius: '2px'
                            }}
                        >
                            <option value="code">Code</option>
                            <option value="architect">Architect</option>
                            <option value="debug">Debug</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
