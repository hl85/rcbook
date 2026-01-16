import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "rcbook" is now active!');

    const sidebarProvider = new SidebarProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rcbook.openSidebar', () => {
             // Logic to focus the sidebar
             vscode.commands.executeCommand('workbench.view.extension.rcbook-sidebar');
        })
    );
}

export function deactivate() {}
