
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialConfig: any;
    onSave: (config: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialConfig, onSave }) => {
    const [config, setConfig] = useState(initialConfig);
    const [activeTab, setActiveTab] = useState('llm');

    useEffect(() => {
        if (isOpen) {
            setConfig(initialConfig);
        }
    }, [isOpen, initialConfig]);

    if (!isOpen) { return null; }

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    const handleChange = (key: string, value: any) => {
        const keys = key.split('.');
        if (keys.length === 1) {
            setConfig({ ...config, [key]: value });
        } else if (keys.length === 2) {
             // Handle simple nested object update if needed, but flattened keys are easier for now
             // Assuming config structure matches package.json properties structure (flattened)
             setConfig({ ...config, [key]: value });
        }
    };

    // Helper for input styles
    const inputStyle = {
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        background: 'var(--vscode-input-background)',
        color: 'var(--vscode-input-foreground)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '2px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '4px',
        color: 'var(--vscode-foreground)',
        fontSize: '12px'
    };

    const tabStyle = (tab: string) => ({
        padding: '8px 12px',
        cursor: 'pointer',
        borderBottom: activeTab === tab ? '2px solid var(--vscode-activityBar-activeBorder)' : 'none',
        color: activeTab === tab ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)',
        fontWeight: activeTab === tab ? 'bold' : 'normal'
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <div style={{
                background: 'var(--vscode-editor-background)',
                width: '80%',
                maxWidth: '500px',
                maxHeight: '80vh',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--vscode-widget-border)'
            }}>
                {/* Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--vscode-widget-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Settings</h3>
                    <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '18px' }}>×</span>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--vscode-widget-border)', padding: '0 16px' }}>
                    <div style={tabStyle('llm')} onClick={() => setActiveTab('llm')}>LLM Provider</div>
                    <div style={tabStyle('mcp')} onClick={() => setActiveTab('mcp')}>MCP Servers</div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                    {activeTab === 'llm' && (
                        <div>
                            <label style={labelStyle}>Provider</label>
                            <select 
                                style={inputStyle}
                                value={config['rcbook.ai.provider'] || 'openai'}
                                onChange={(e) => handleChange('rcbook.ai.provider', e.target.value)}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="custom">Custom</option>
                            </select>

                            <label style={labelStyle}>Base URL</label>
                            <input 
                                style={inputStyle}
                                type="text" 
                                value={config['rcbook.ai.baseUrl'] || ''}
                                onChange={(e) => handleChange('rcbook.ai.baseUrl', e.target.value)}
                                placeholder="https://api.openai.com/v1"
                            />

                            <label style={labelStyle}>API Key</label>
                            <input 
                                style={inputStyle}
                                type="password" 
                                value={config['rcbook.ai.apiKey'] || ''}
                                onChange={(e) => handleChange('rcbook.ai.apiKey', e.target.value)}
                                placeholder="sk-..."
                            />

                            <label style={labelStyle}>Model Name</label>
                            <input 
                                style={inputStyle}
                                type="text" 
                                value={config['rcbook.ai.model'] || ''}
                                onChange={(e) => handleChange('rcbook.ai.model', e.target.value)}
                                placeholder="gpt-3.5-turbo"
                            />

                            <label style={labelStyle}>Temperature</label>
                            <input 
                                style={inputStyle}
                                type="number" 
                                step="0.1"
                                min="0"
                                max="1"
                                value={config['rcbook.ai.temperature'] || 0.7}
                                onChange={(e) => handleChange('rcbook.ai.temperature', parseFloat(e.target.value))}
                            />
                        </div>
                    )}

                    {activeTab === 'mcp' && (
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                                Configure Model Context Protocol (MCP) servers here.
                                (JSON configuration is used for now)
                            </p>
                            <textarea
                                style={{ ...inputStyle, height: '200px', fontFamily: 'monospace' }}
                                value={JSON.stringify(config['rcbook.mcp.servers'] || [], null, 2)}
                                onChange={(e) => {
                                    try {
                                        const parsed = JSON.parse(e.target.value);
                                        handleChange('rcbook.mcp.servers', parsed);
                                    } catch (err) {
                                        // Allow typing invalid JSON temporarily? 
                                        // For simplicity in this v1, maybe just warn or rely on final save
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px', borderTop: '1px solid var(--vscode-widget-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        color: 'var(--vscode-button-secondaryForeground)',
                        border: '1px solid var(--vscode-button-border)',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        borderRadius: '2px'
                    }}>Cancel</button>
                    <button onClick={handleSave} style={{
                        background: 'var(--vscode-button-background)',
                        color: 'var(--vscode-button-foreground)',
                        border: 'none',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        borderRadius: '2px'
                    }}>Save Settings</button>
                </div>
            </div>
        </div>
    );
};
