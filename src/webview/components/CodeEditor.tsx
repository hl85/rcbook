import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language = 'markdown', height = '200px' }) => {
    const handleEditorChange = (value: string | undefined) => {
        onChange(value || '');
    };

    return (
        <div style={{ border: '1px solid var(--vscode-widget-border)', borderRadius: '4px', overflow: 'hidden' }}>
            <Editor
                height={height}
                defaultLanguage={language}
                value={value}
                onChange={handleEditorChange}
                theme="vs-dark" // We should ideally detect theme, but dark is safe for VS Code default
                options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    lineNumbers: 'off',
                    folding: false,
                    wordWrap: 'on'
                }}
            />
        </div>
    );
};
