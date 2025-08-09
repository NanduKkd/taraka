const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    const mentionDropdown = document.getElementById('mention-dropdown');
    const sendBtn = document.getElementById('send-btn');
    const sessionDropdown = document.getElementById('session-dropdown');
    const newSessionBtn = document.getElementById('new-session-btn');
    const modelDropdown = document.getElementById('model-dropdown');
    const yoloModeCheckbox = document.getElementById('yolo-mode');
    const chatView = document.getElementById('chat-view');

    // Get initial data from the extension
    vscode.postMessage({ command: 'getSessions' });
    vscode.postMessage({ command: 'getMessages', data: { sessionId: sessionDropdown.value } });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'sessions':
                sessionDropdown.innerHTML = '';
                message.data.forEach(session => {
                    const option = document.createElement('option');
                    option.value = session.id;
                    option.textContent = session.name;
                    sessionDropdown.appendChild(option);
                });
                break;
            case 'sessionCreated':
                const option = document.createElement('option');
                option.value = message.data.id;
                option.textContent = message.data.name;
                sessionDropdown.appendChild(option);
                sessionDropdown.value = message.data.id;
                vscode.postMessage({ command: 'getMessages', data: { sessionId: sessionDropdown.value } });
                break;
            case 'messages':
                chatView.innerHTML = '';
                message.data.forEach(msg => {
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message', msg.type);
                    messageElement.innerHTML = `<p>${msg.content}</p>`;
                    chatView.appendChild(messageElement);
                });
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