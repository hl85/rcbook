import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present and active', async () => {
        // Use the ID from package.json (name) + default publisher if not set
        // Or find by name
		const extension = vscode.extensions.getExtension('undefined_publisher.rcbook');
		assert.ok(extension, 'Extension not found');
        
        if (!extension.isActive) {
            await extension.activate();
        }
        assert.ok(extension.isActive, 'Extension should be active');
	});

    test('Sidebar command should be registered', async () => {
        const commands = await vscode.commands.getCommands(true); // true to include internal commands if needed, but default is fine
        // Debug: print commands related to rcbook
        const rcCommands = commands.filter(c => c.includes('rcbook'));
        console.log('RCBook Commands:', rcCommands);
        
        assert.ok(rcCommands.includes('rcbook.openSidebar'), 'rcbook.openSidebar command should be registered');
    });
});
