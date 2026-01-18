
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();
const mockJoinPath = jest.fn((base, ...paths) => ({ fsPath: `${base.fsPath}/${paths.join('/')}` }));

const vscode = {
    workspace: {
        fs: {
            writeFile: mockWriteFile,
            readFile: mockReadFile
        },
        workspaceFolders: [{ uri: { fsPath: '/root' } }]
    },
    Uri: {
        file: (path: string) => ({ fsPath: path }),
        joinPath: mockJoinPath
    },
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn()
    }
};

export = vscode;
