// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ViewEngine } from './viewEngine';
import { Auth } from './utils/auth';
import { listSessions, createSession, getMessages } from './utils/sessions';
import * as os from 'os';
import AIHandler from './utils/responseHandler/handler';
import { randomUUID } from 'crypto';

class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'taraka-chat-view';

    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;
    private _viewEngine: ViewEngine;

    constructor(private readonly _context: vscode.ExtensionContext, viewEngine: ViewEngine) {
        this._extensionUri = _context.extensionUri;
        this._viewEngine = viewEngine;
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
      try {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

      webviewView.webview.html = '<html><head></head><body style="height: 100vw; width: 100vw; margin: 0; align-items: center; justify-content: center;"><div>Hey There!</div></body></html>';
        webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'login':
                        const success = await Auth.signIn(this._context, message.data.email, message.data.password);
                        if (success) {
                            webviewView.webview.postMessage({ command: 'loginResponse', data: { success: true } });
                        } else {
                            webviewView.webview.postMessage({ command: 'loginResponse', data: { success: false, error: 'Incorrect password' } });
                        }
                        return;
                    case 'getSessions':
                        const sessions = await listSessions(await vscode.env.machineId, os.platform(), vscode.workspace.workspaceFolders?.[0].uri.fsPath || '');
                        webviewView.webview.postMessage({ command: 'sessions', data: sessions });
                        return;
                    case 'createSession':
                        const newSession = await createSession(await vscode.env.machineId, os.platform(), vscode.workspace.workspaceFolders?.[0].uri.fsPath || '');
                        if (newSession) {
                            webviewView.webview.postMessage({ command: 'sessionCreated', data: newSession });
                        }
                        return;
                    case 'getMessages':
                        const messages = await getMessages(message.data.sessionId);
                        webviewView.webview.postMessage({ command: 'messages', data: messages });
                        return;
                    case 'sendMessage':
                        const { message: msg, sessionId, model } = message.data;
                        const handler = new AIHandler(randomUUID(), sessionId, msg, model);
                        handler.on('data', (data) => {
                            webviewView.webview.postMessage({ command: 'aiResponse', data });
                        });
                        handler.on('error', (error) => {
                            webviewView.webview.postMessage({ command: 'aiResponseError', data: { error: error.message } });
                        });
                        return;
                }
            },
            undefined,
            this._context.subscriptions
        );
      } catch (error) {
        console.error('extension error')
        console.error(error)
      }
    }

    private _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        return this._viewEngine.render();
    }
}

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

	const viewEngine = new ViewEngine();

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ChatViewProvider.viewId,

			new ChatViewProvider(context, viewEngine)
		)
	);

	const openChatView = vscode.commands.registerCommand('taraka.openChatView', () => {
		if (ChatViewProvider.viewId) {
			vscode.commands.executeCommand(`${ChatViewProvider.viewId}.focus`);
		}
	});

	context.subscriptions.push(openChatView);
}

// This method is called when your extension is deactivated
export function deactivate() {}
