
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialConfig: any;
    onSave: (config: any) => void;
}

const PROVIDERS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'qwencode', label: 'Qwen Code' },
    { value: 'glm', label: 'GLM' },
    { value: 'kimi', label: 'Kimi' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'local', label: 'Local Model (e.g. Ollama)' },
    { value: 'custom', label: 'Custom' }
];

const getProviderUrl = (provider: string) => {
    switch (provider) {
        case 'openai': return 'https://platform.openai.com/api-keys';
        case 'anthropic': return 'https://console.anthropic.com/settings/keys';
        case 'gemini': return 'https://makersuite.google.com/app/apikey';
        case 'deepseek': return 'https://platform.deepseek.com/api_keys';
        case 'openrouter': return 'https://openrouter.ai/keys';
        default: return null;
    }
};

const getProviderPlaceholder = (provider: string) => {
     switch (provider) {
        case 'openai': return 'sk-...';
        case 'anthropic': return 'sk-ant-...';
        case 'gemini': return 'AIza...';
        default: return 'API Key';
    }
};

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
        // Flattened keys are used in config state
        setConfig({ ...config, [key]: value });
    };

    const currentProvider = config['rcbook.ai.provider'] || 'openai';
    const isConfigured = !!config['rcbook.ai.apiKey'] || currentProvider === 'local';

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
                            {!isConfigured && (
                                <div style={{ 
                                    marginBottom: '20px', 
                                    padding: '12px', 
                                    background: 'var(--vscode-editor-inactiveSelectionBackground)', 
                                    borderRadius: '4px',
                                    borderLeft: '4px solid var(--vscode-textLink-foreground)'
                                }}>
                                    <h4 style={{ margin: '0 0 8px 0' }}>Configure LLM Provider</h4>
                                    <p style={{ margin: 0, fontSize: '13px' }}>
                                        RC Book needs an LLM provider to work. Choose one to start using, you can add more later.
                                    </p>
                                </div>
                            )}

                            <label style={labelStyle}>Provider</label>
                            <select 
                                style={inputStyle}
                                value={currentProvider}
                                onChange={(e) => handleChange('rcbook.ai.provider', e.target.value)}
                            >
                                {PROVIDERS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                            
                            {!isConfigured && getProviderUrl(currentProvider) && (
                                <div style={{ marginBottom: '10px' }}>
                                    <a href={getProviderUrl(currentProvider)!} target="_blank" rel="noreferrer" style={{ color: 'var(--vscode-textLink-foreground)', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '4px' }}>Get {PROVIDERS.find(p => p.value === currentProvider)?.label} API Key</span>
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M8.6 3.2l4.2 4.2-4.2 4.2-1.4-1.4 1.8-1.8H3v-2h6L7.2 4.6l1.4-1.4z"/>
                                        </svg>
                                    </a>
                                </div>
                            )}

                            <label style={labelStyle}>Base URL (Optional)</label>
                            <input 
                                style={inputStyle}
                                type="text" 
                                value={config['rcbook.ai.baseUrl'] || ''}
                                onChange={(e) => handleChange('rcbook.ai.baseUrl', e.target.value)}
                                placeholder="https://api.openai.com/v1"
                            />

                            <label style={labelStyle}>API Key</label>
                            <input 
                                style={{
                                    ...inputStyle, 
                                    borderColor: !config['rcbook.ai.apiKey'] && currentProvider !== 'local' ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'
                                }}
                                type="password" 
                                value={config['rcbook.ai.apiKey'] || ''}
                                onChange={(e) => handleChange('rcbook.ai.apiKey', e.target.value)}
                                placeholder={getProviderPlaceholder(currentProvider)}
                            />
                            {!config['rcbook.ai.apiKey'] && currentProvider !== 'local' && (
                                <div style={{ color: 'var(--vscode-inputValidation-errorForeground)', fontSize: '11px', marginTop: '-8px', marginBottom: '10px' }}>
                                    You must provide a valid API key.
                                </div>
                            )}

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
                                    } catch (_err) {
                                        // Allow typing invalid JSON temporarily
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
