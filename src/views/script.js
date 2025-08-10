const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');

    const messageInput = document.getElementById('message-input');
    const mentionDropdown = document.getElementById('mention-dropdown');
    const sendBtn = document.getElementById('send-btn');
    const sessionDropdown = document.getElementById('session-dropdown');
    const newSessionBtn = document.getElementById('new-session-btn');
    const modelDropdown = document.getElementById('model-dropdown');
    const yoloModeCheckbox = document.getElementById('yolo-mode');
    const chatView = document.getElementById('chat-view');

    let currentAiMessage = null;
    const toolCallCards = {};

    loginBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        if (password) {
            loginContainer.classList.add('hidden');
            loader.classList.remove('hidden');
            vscode.postMessage({ command: 'login', data: { password } });
        }
    });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'loginResponse':
                loader.classList.add('hidden');
                if (message.data.success) {
                    mainContent.classList.remove('hidden');
                    // Get initial data from the extension
                    vscode.postMessage({ command: 'getSessions' });
                    vscode.postMessage({ command: 'getMessages', data: { sessionId: sessionDropdown.value } });
                } else {
                    loginContainer.classList.remove('hidden');
                    errorMessage.textContent = message.data.error;
                    errorMessage.classList.remove('hidden');
                }
                break;
            case 'sessions':
                sessionDropdown.innerHTML = '';
                message.data.forEach(session => {
                    const option = document.createElement('option');
                    option.value = session.id;
                    option.textContent = session.title || `Session ${session.id}`;
                    sessionDropdown.appendChild(option);
                });
                break;
            case 'sessionCreated':
                const option = document.createElement('option');
                option.value = message.data.id;
                option.textContent = message.data.title || `Session ${message.data.id}`;
                sessionDropdown.appendChild(option);
                sessionDropdown.value = message.data.id;
                vscode.postMessage({ command: 'getMessages', data: { sessionId: sessionDropdown.value } });
                break;
            case 'messages':
                chatView.innerHTML = '';
                message.data.forEach(msg => {
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message', `${msg.role}-message`);
                    messageElement.innerHTML = `<p>${msg.content.text}</p>`;
                    chatView.appendChild(messageElement);
                });
                break;
            case 'aiResponse':
                const data = message.data;
                switch (data.type) {
                    case 'thinking':
                        if (!currentAiMessage) {
                            currentAiMessage = document.createElement('div');
                            currentAiMessage.classList.add('message', 'ai-message');
                            chatView.appendChild(currentAiMessage);
                        }
                        currentAiMessage.innerHTML = '<p class="thinking-message">Thinking...</p>';
                        break;
                    case 'text':
                        if (currentAiMessage) {
                            currentAiMessage.innerHTML = `<p>${data.text}</p>`;
                        }
                        break;
                    case 'tool_start':
                        const toolCallElement = document.createElement('div');
                        toolCallElement.classList.add('tool-call-card');
                        toolCallElement.id = `tool-call-${data.toolCallData.id}`;
                        toolCallElement.innerHTML = `
                            <div class="tool-call-title">Tool Call: ${data.toolCallData.name}</div>
                            <div class="tool-call-subtitle">ID: ${data.toolCallData.id}</div>
                        `;
                        chatView.appendChild(toolCallElement);
                        toolCallCards[data.toolCallData.id] = toolCallElement;
                        break;
                    case 'tool':
                        const card = toolCallCards[data.toolCallData.id];
                        if (card) {
                            const argsElement = document.createElement('div');
                            argsElement.classList.add('tool-call-args');
                            argsElement.textContent = JSON.stringify(data.toolCallData.args, null, 2);
                            card.appendChild(argsElement);
                        }
                        break;
                    case 'tool_response':
                        const responseElement = document.createElement('div');
                        responseElement.classList.add('tool-response-card', `tool-response-${data.toolResponse.status}`);
                        responseElement.innerHTML = `
                            <div class="tool-response-title">Tool Response: ${data.toolResponse.status}</div>
                            <div class="tool-response-content">${JSON.stringify(data.toolResponse, null, 2)}</div>
                        `;
                        chatView.appendChild(responseElement);
                        break;
                    case 'end':
                        currentAiMessage = null;
                        break;
                }
                break;
            case 'aiResponseError':
                const errorElement = document.createElement('div');
                errorElement.classList.add('message', 'error-message');
                errorElement.innerHTML = `<p>Error: ${message.data.error}</p>`;
                chatView.appendChild(errorElement);
                currentAiMessage = null;
                break;
        }
    });

    newSessionBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'createSession' });
    });

    sessionDropdown.addEventListener('change', () => {
        vscode.postMessage({ command: 'getMessages', data: { sessionId: sessionDropdown.value } });
    });

    messageInput.addEventListener('input', (e) => {
        const text = e.target.value;
        const lastChar = text.slice(-1);

        if (lastChar === '@') {
            // In a real implementation, you would call the workspaceInterface to get files
            const files = [{ name: 'file1.txt' }, { name: 'file2.js' }, { name: 'document.pdf' }];
            mentionDropdown.innerHTML = files.map(file => `<div class="dropdown-item">${file.name}</div>`).join('');
            mentionDropdown.classList.add('show');
        } else if (text.slice(-1) === ' ' || e.key === 'Escape') {
            mentionDropdown.classList.remove('show');
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            messageInput.value += e.target.textContent;
            mentionDropdown.classList.remove('show');
        } else if (!mentionDropdown.contains(e.target) && e.target !== messageInput) {
            mentionDropdown.classList.remove('show');
        }
    });

    sendBtn.addEventListener('click', () => {
        const message = messageInput.value;
        const selectedSession = sessionDropdown.value;
        const selectedModel = modelDropdown.value;
        const yoloMode = yoloModeCheckbox.checked;

        if (message.trim() === '') return;

        const userMessage = document.createElement('div');
        userMessage.classList.add('message', 'user-message');
        userMessage.innerHTML = `<p>${message}</p>`;
        chatView.appendChild(userMessage);

        vscode.postMessage({
            command: 'sendMessage',
            data: {
                message,
                sessionId: selectedSession,
                model: selectedModel,
                yoloMode
            }
        });

        messageInput.value = '';
    });
});