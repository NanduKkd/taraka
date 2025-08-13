const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const emailInput = document.getElementById('email-input');
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

  let currentAiMessage = null, lastContent = null;
  const toolCallCards = {};

  function processMessageContent(content) {
    if(content.type==='tool') {
      return { type: 'tool', toolCallData: { id: content.toolCallId, name: content.name, args: content.args } };
    } else if(content.type==='tool_result') {
      return { type: 'tool_response', toolResponse: content.toolCallResponse };
    }
    return content;
  }

  function renderMsgContent (content, isAi=true) {
    switch(content.type) {
      case 'text':
      case 'thinking': {
        if(!currentAiMessage) {
          currentAiMessage = chatView.appendChild(document.createElement('div'));
          currentAiMessage.classList.add('message', isAi?'ai-message':'user-message');
          lastContent = null;
        }
        if(!lastContent?.classList.contains(content.type==='text' ? 'text-content' : 'thinking-message')) {
          lastContent = currentAiMessage.appendChild(document.createElement('p'))
          lastContent.classList.add(content.type==='text' ? 'text-content' : 'thinking-message');
        }
        lastContent.innerHTML = marked.parse(content.text || content.thinking);
        break;
      }
      case 'tool_start': {
        currentAiMessage = null;
        lastContent = null;
        const toolCallElement = document.createElement('div');
        toolCallElement.classList.add('tool-call-card');
        toolCallElement.id = `tool-call-${content.toolCallData.id}`;
        toolCallElement.innerHTML = `
          <div class="tool-call-title">Tool Call: ${content.toolCallData.name}</div>
          <div class="tool-call-subtitle">ID: ${content.toolCallData.id}</div>
          `;
        chatView.appendChild(toolCallElement);
        toolCallCards[content.toolCallData.id] = toolCallElement
        break;
      }
      case 'tool': {
        lastContent = null;
        currentAiMessage = null;
        let card = toolCallCards[content.toolCallData.id];
        if (!card) {
          const toolCallElement = document.createElement('div');
          toolCallElement.classList.add('tool-call-card');
          toolCallElement.id = `tool-call-${content.toolCallData.id}`;
          toolCallElement.innerHTML = `
            <div class="tool-call-title">Tool Call: ${content.toolCallData.name}</div>
            <div class="tool-call-subtitle">ID: ${content.toolCallData.id}</div>
            `;
          chatView.appendChild(toolCallElement);
          card = toolCallCards[content.toolCallData.id] = toolCallElement;
        }
        const argsElement = document.createElement('div');
        argsElement.classList.add('tool-call-args');
        argsElement.textContent = JSON.stringify(content.toolCallData.args, null, 2);
        card.appendChild(argsElement);
        break;
      }
      case 'tool_response': {
        currentAiMessage = null;
        lastContent = null;
        const responseElement = document.createElement('div');
        responseElement.classList.add('tool-response-card', `tool-response-${content.toolResponse.status}`);
        responseElement.innerHTML = `
          <div class="tool-response-header">
            <div class="tool-response-title">Tool Response: ${content.toolResponse.status}</div>
            <span class="toggle-icon">+</span>
          </div>
          <div class="collapsible-content hidden">
            <div class="tool-response-content">${JSON.stringify(content.toolResponse, null, 2)}</div>
          </div>
          `;
        chatView.appendChild(responseElement);
        // Add event listener to the header
        responseElement.querySelector('.tool-response-header').addEventListener('click', (e) => {
          const contentDiv = responseElement.querySelector('.collapsible-content');
          const icon = responseElement.querySelector('.toggle-icon');
          contentDiv.classList.toggle('collapsed');
          icon.textContent = contentDiv.classList.contains('collapsed') ? '+' : '-';
        });
        break;
      }
    };
  }

  loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (email && password) {
      loginContainer.classList.add('hidden');
      loader.classList.remove('hidden');
      vscode.postMessage({ command: 'login', data: { email, password } });
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
          // vscode.postMessage({ command: 'getMessages', data: { sessionId: sessionDropdown.value } });
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
        if(message.data.length) {
          sessionDropdown.value = message.data[0].id;
          vscode.postMessage({ command: 'getMessages', data: { sessionId: sessionDropdown.value } });
        }
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
          /*
          const messageElement = document.createElement('div');
          messageElement.classList.add('message', `${msg.role}-message`);
          messageElement.innerHTML = `<p>${msg.content.text}</p>`;
          chatView.appendChild(messageElement);
          */
          currentAiMessage = null;
          lastContent = null;
          msg.content.forEach(c => renderMsgContent(processMessageContent(c), msg.role!=='user'));
          // renderMsgContent(msg);
        });
        break;
      case 'aiResponse':
        const data = message.data;
        switch (data.type) {
          case 'thinking':
          case 'text':
          case 'tool_start':
          case 'tool':
          case 'tool_response':
            renderMsgContent(message.data);
            break;
          case 'end':
            currentAiMessage = null;
            lastContent = null;
            break;
        }
        break;
      case 'aiResponseError':
        const errorElement = document.createElement('div');
        errorElement.classList.add('message', 'error-message');
        errorElement.innerHTML = `<p>Error: ${message.data.error}</p>`;
        chatView.appendChild(errorElement);
        currentAiMessage = null;
        lastContent = null;
        break;
    }
  });

  newSessionBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'createSession' });
  });

  sessionDropdown.addEventListener('change', () => {
    if(sessionDropdown.value)
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
    currentAiMessage = null;
    lastContent = null;

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
