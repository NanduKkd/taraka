// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ViewEngine } from './viewEngine';
import { Auth } from './utils/auth';
import { listSessions, createSession, getMessages } from './utils/sessions';
import * as os from 'os';
import AIHandler from './utils/responseHandler/handler';
import { randomUUID } from 'crypto';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "taraka" is now active!');

	await Auth.initialize(context);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with regi>sterCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('taraka.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Taraka!');
	});

	context.subscriptions.push(disposable);

	const viewEngine = new ViewEngine();

	const openChatView = vscode.commands.registerCommand('taraka.openChatView', async () => {
		const panel = vscode.window.createWebviewPanel(
			'chatView',
			'Taraka Chat',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);

		panel.webview.html = await viewEngine.render();

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';

		panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'login':
						const success = await Auth.signIn(context, message.data.password);
						if (success) {
							panel.webview.postMessage({ command: 'loginResponse', data: { success: true } });
						} else {
							panel.webview.postMessage({ command: 'loginResponse', data: { success: false, error: 'Incorrect password' } });
						}
						return;
					case 'getSessions':
						const sessions = await listSessions(await vscode.env.machineId, os.platform(), workspaceFolder);
						panel.webview.postMessage({ command: 'sessions', data: sessions });
						return;
					case 'createSession':
						const newSession = await createSession(await vscode.env.machineId, os.platform(), workspaceFolder);
						if (newSession) {
							panel.webview.postMessage({ command: 'sessionCreated', data: newSession });
						}
						return;
					case 'getMessages':
						const messages = await getMessages(message.data.sessionId);
						panel.webview.postMessage({ command: 'messages', data: messages });
						return;
                    case 'sendMessage':
                        const { message: msg, sessionId, model } = message.data;
                        const handler = new AIHandler(randomUUID(), sessionId, msg, model);
                        handler.on('data', (data) => {
                            panel.webview.postMessage({ command: 'aiResponse', data });
                        });
                        handler.on('error', (error) => {
                            panel.webview.postMessage({ command: 'aiResponseError', data: { error: error.message } });
                        });
                        return;
				}
			},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(openChatView);
}

// This method is called when your extension is deactivated
export function deactivate() {}
