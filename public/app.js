/**
 * Enhanced DeepSeek Chat Application
 * Frontend JavaScript with advanced features
 */

class ChatApp {
  constructor() {
    this.currentSessionId = null;
    this.currentPromptId = 'helpful-assistant';
    this.conversations = [];
    this.personalities = [];
    this.settings = {
      temperature: 0.7,
      maxTokens: 2000,
      darkMode: false,
      autoScroll: true,
      streaming: true
    };

    this.init();
  }

  async init() {
    this.loadSettings();
    this.setupEventListeners();
    await this.loadPersonalities();
    await this.loadConversations();
    this.setupUI();
  }

  loadSettings() {
    const saved = localStorage.getItem('chatapp-settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
    this.applySettings();
  }

  saveSettings() {
    localStorage.setItem('chatapp-settings', JSON.stringify(this.settings));
  }

  applySettings() {
    // Apply dark mode
    document.documentElement.setAttribute('data-theme', this.settings.darkMode ? 'dark' : 'light');

    // Update UI elements
    const darkModeToggle = document.getElementById('darkModeToggle');
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    const streamingToggle = document.getElementById('streamingToggle');
    const temperatureSlider = document.getElementById('temperatureSlider');
    const temperatureValue = document.getElementById('temperatureValue');
    const maxTokensInput = document.getElementById('maxTokensInput');

    if (darkModeToggle) darkModeToggle.checked = this.settings.darkMode;
    if (autoScrollToggle) autoScrollToggle.checked = this.settings.autoScroll;
    if (streamingToggle) streamingToggle.checked = this.settings.streaming;
    if (temperatureSlider) temperatureSlider.value = this.settings.temperature;
    if (temperatureValue) temperatureValue.textContent = this.settings.temperature;
    if (maxTokensInput) maxTokensInput.value = this.settings.maxTokens;
  }

  setupEventListeners() {
    // Message input
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const charCount = document.getElementById('charCount');

    messageInput.addEventListener('input', (e) => {
      const length = e.target.value.length;
      charCount.textContent = length;
      sendBtn.disabled = length === 0 || length > 4000;

      // Auto-resize textarea
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    sendBtn.addEventListener('click', () => this.sendMessage());

    // New chat button
    document.getElementById('newChatBtn').addEventListener('click', () => {
      this.startNewConversation();
    });

    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Settings modal
    document.getElementById('settingsBtn').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.add('active');
    });

    document.getElementById('closeSettingsModal').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.remove('active');
    });

    // Settings controls
    document.getElementById('temperatureSlider').addEventListener('input', (e) => {
      this.settings.temperature = parseFloat(e.target.value);
      document.getElementById('temperatureValue').textContent = this.settings.temperature;
      this.saveSettings();
    });

    document.getElementById('maxTokensInput').addEventListener('change', (e) => {
      this.settings.maxTokens = parseInt(e.target.value);
      this.saveSettings();
    });

    document.getElementById('darkModeToggle').addEventListener('change', (e) => {
      this.settings.darkMode = e.target.checked;
      this.saveSettings();
      this.applySettings();
    });

    document.getElementById('autoScrollToggle').addEventListener('change', (e) => {
      this.settings.autoScroll = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('streamingToggle').addEventListener('change', (e) => {
      this.settings.streaming = e.target.checked;
      this.saveSettings();
    });

    // Clear all data
    document.getElementById('clearAllDataBtn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
        await this.clearAllData();
      }
    });

    // Export chat
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportCurrentChat();
    });

    // Clear current chat
    document.getElementById('clearBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear this conversation?')) {
        this.clearCurrentChat();
      }
    });

    // Custom prompt modal
    document.getElementById('customPromptForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createCustomPrompt();
    });

    document.getElementById('cancelCustomPrompt').addEventListener('click', () => {
      document.getElementById('customPromptModal').classList.remove('active');
    });

    document.getElementById('closeCustomPromptModal').addEventListener('click', () => {
      document.getElementById('customPromptModal').classList.remove('active');
    });

    // Close modals on outside click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
      }
    });
  }

  async loadPersonalities() {
    try {
      const response = await fetch('/api/chat/prompts');
      const data = await response.json();

      if (data.success) {
        this.personalities = data.data;
        this.renderPersonalities();
      }
    } catch (error) {
      console.error('Failed to load personalities:', error);
      this.showError('Failed to load AI personalities');
    }
  }

  renderPersonalities() {
    const grid = document.getElementById('personalitiesGrid');
    grid.innerHTML = '';

    this.personalities.forEach(personality => {
      const card = document.createElement('div');
      card.className = `personality-card ${personality.id === this.currentPromptId ? 'active' : ''}`;
      card.innerHTML = `
        <div class="personality-icon">${personality.icon}</div>
        <div class="personality-name">${personality.name}</div>
      `;

      card.addEventListener('click', () => {
        this.selectPersonality(personality.id);
      });

      grid.appendChild(card);
    });

    // Add create custom personality button
    const createBtn = document.createElement('button');
    createBtn.className = 'create-personality-btn';
    createBtn.innerHTML = `
      <i class="fas fa-plus"></i>
      <span>Create Custom</span>
    `;
    createBtn.addEventListener('click', () => {
      document.getElementById('customPromptModal').classList.add('active');
    });

    grid.appendChild(createBtn);
  }

  selectPersonality(promptId) {
    this.currentPromptId = promptId;

    // Update UI
    document.querySelectorAll('.personality-card').forEach(card => {
      card.classList.remove('active');
    });

    event.target.closest('.personality-card').classList.add('active');

    // Update chat header
    const personality = this.personalities.find(p => p.id === promptId);
    if (personality) {
      document.getElementById('chatTitle').textContent = personality.name;
      document.getElementById('chatSubtitle').textContent = personality.description;
    }

    // Start new conversation with selected personality
    this.startNewConversation();
  }

  async loadConversations() {
    try {
      const response = await fetch('/api/chat/conversations');
      const data = await response.json();

      if (data.success) {
        this.conversations = data.data;
        this.renderConversations();
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  renderConversations() {
    const list = document.getElementById('conversationsList');
    list.innerHTML = '';

    if (this.conversations.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No conversations yet</p>';
      return;
    }

    this.conversations.forEach(conversation => {
      const item = document.createElement('div');
      item.className = `conversation-item ${conversation.sessionId === this.currentSessionId ? 'active' : ''}`;

      const date = new Date(conversation.lastUpdated).toLocaleDateString();
      const time = new Date(conversation.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      item.innerHTML = `
        <div class="conversation-title">${conversation.title}</div>
        <div class="conversation-meta">
          <span>${conversation.messageCount} messages</span>
          <span>${date} ${time}</span>
        </div>
        <div class="conversation-actions">
          <button type="button" class="conversation-action-btn" onclick="event.stopPropagation(); chatApp.deleteConversation('${conversation.sessionId}')" title="Delete conversation">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      item.addEventListener('click', () => {
        this.loadConversation(conversation.sessionId);
      });

      list.appendChild(item);
    });
  }

  async startNewConversation() {
    try {
      const response = await fetch('/api/chat/conversation/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promptId: this.currentPromptId,
          userContext: {}
        })
      });

      const data = await response.json();

      if (data.success) {
        this.currentSessionId = data.data.sessionId;
        this.clearMessages();
        this.hideWelcomeScreen();
        await this.loadConversations();
        this.renderConversations();
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
      this.showError('Failed to start new conversation');
    }
  }

  async loadConversation(sessionId) {
    try {
      this.showLoading();

      const response = await fetch(`/api/chat/conversation/${sessionId}`);
      const data = await response.json();

      if (data.success) {
        this.currentSessionId = sessionId;
        this.currentPromptId = data.data.promptId;

        // Update UI
        this.selectPersonalityUI(this.currentPromptId);
        this.clearMessages();
        this.hideWelcomeScreen();

        // Render messages
        data.data.messages.forEach(message => {
          this.addMessage(message.role, message.content, new Date(message.timestamp));
        });

        // Update conversations list
        this.renderConversations();
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      this.showError('Failed to load conversation');
    } finally {
      this.hideLoading();
    }
  }

  selectPersonalityUI(promptId) {
    // Update personality cards
    document.querySelectorAll('.personality-card').forEach(card => {
      card.classList.remove('active');
    });

    const cards = document.querySelectorAll('.personality-card');
    const targetCard = Array.from(cards).find(card => {
      const name = card.querySelector('.personality-name').textContent;
      return this.personalities.find(p => p.id === promptId && p.name === name);
    });

    if (targetCard) {
      targetCard.classList.add('active');
    }

    // Update chat header
    const personality = this.personalities.find(p => p.id === promptId);
    if (personality) {
      document.getElementById('chatTitle').textContent = personality.name;
      document.getElementById('chatSubtitle').textContent = personality.description;
    }
  }

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('sendBtn').disabled = true;

    // Add user message to UI
    this.addMessage('user', message, new Date());
    this.hideWelcomeScreen();

    if (this.settings.streaming) {
      await this.sendStreamingMessage(message);
    } else {
      await this.sendRegularMessage(message);
    }
  }

  async sendRegularMessage(message) {
    try {
      // Show typing indicator
      this.showTypingIndicator();

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          sessionId: this.currentSessionId,
          promptId: this.currentPromptId,
          options: {
            temperature: this.settings.temperature,
            maxTokens: this.settings.maxTokens
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        this.currentSessionId = data.data.sessionId;
        this.addMessage('assistant', data.data.message, new Date());
        await this.loadConversations();
        this.renderConversations();
      } else {
        this.showError(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      this.showError('Failed to send message');
    } finally {
      this.hideTypingIndicator();
    }
  }

  async sendStreamingMessage(message) {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          sessionId: this.currentSessionId,
          promptId: this.currentPromptId,
          options: {
            temperature: this.settings.temperature,
            maxTokens: this.settings.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error('Streaming request failed');
      }

      // Create assistant message element
      const messageElement = this.createMessageElement('assistant', '', new Date());
      const messageText = messageElement.querySelector('.message-text');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk' && data.content) {
                fullResponse += data.content;
                messageText.textContent = fullResponse;

                if (this.settings.autoScroll) {
                  this.scrollToBottom();
                }
              } else if (data.type === 'done') {
                this.currentSessionId = data.sessionId;
                await this.loadConversations();
                this.renderConversations();
              } else if (data.type === 'error') {
                this.showError(data.error);
                break;
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      this.showError('Failed to stream message');
    }
  }

  addMessage(role, content, timestamp) {
    const messageElement = this.createMessageElement(role, content, timestamp);
    const container = document.getElementById('messagesContainer');
    container.appendChild(messageElement);

    if (this.settings.autoScroll) {
      this.scrollToBottom();
    }
  }

  createMessageElement(role, content, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-role">${role}</span>
          <span class="message-time">${timeStr}</span>
        </div>
        <div class="message-text">${this.formatMessageContent(content)}</div>
      </div>
    `;

    return messageDiv;
  }

  formatMessageContent(content) {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\n/g, '<br>');
  }

  showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;

    document.getElementById('messagesContainer').appendChild(indicator);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }

  clearMessages() {
    document.getElementById('messagesContainer').innerHTML = '';
  }

  hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }
  }

  showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }
  }

  scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
  }

  async deleteConversation(sessionId) {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/conversation/${sessionId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = null;
          this.clearMessages();
          this.showWelcomeScreen();
        }

        await this.loadConversations();
        this.renderConversations();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      this.showError('Failed to delete conversation');
    }
  }

  async clearAllData() {
    try {
      // This would need to be implemented on the backend
      this.conversations = [];
      this.currentSessionId = null;
      this.clearMessages();
      this.showWelcomeScreen();
      this.renderConversations();
      this.showSuccess('All conversations cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      this.showError('Failed to clear all data');
    }
  }

  clearCurrentChat() {
    if (this.currentSessionId) {
      this.deleteConversation(this.currentSessionId);
    }
  }

  exportCurrentChat() {
    if (!this.currentSessionId) {
      this.showError('No conversation to export');
      return;
    }

    const messages = Array.from(document.querySelectorAll('.message')).map(msg => {
      const role = msg.classList.contains('user') ? 'User' : 'Assistant';
      const content = msg.querySelector('.message-text').textContent;
      const time = msg.querySelector('.message-time').textContent;
      return `[${time}] ${role}: ${content}`;
    });

    const exportData = messages.join('\n\n');
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showSuccess('Chat exported successfully');
  }

  async createCustomPrompt() {
    const form = document.getElementById('customPromptForm');
    const formData = new FormData(form);

    const promptData = {
      id: formData.get('promptId'),
      name: formData.get('promptName'),
      description: formData.get('promptDescription'),
      icon: formData.get('promptIcon') || '🎭',
      prompt: formData.get('promptContent')
    };

    try {
      const response = await fetch('/api/chat/prompts/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promptData)
      });

      const data = await response.json();

      if (data.success) {
        document.getElementById('customPromptModal').classList.remove('active');
        form.reset();
        await this.loadPersonalities();
        this.showSuccess('Custom personality created successfully');
      } else {
        this.showError(data.error || 'Failed to create custom personality');
      }
    } catch (error) {
      console.error('Failed to create custom prompt:', error);
      this.showError('Failed to create custom personality');
    }
  }

  setupUI() {
    // Focus on message input
    document.getElementById('messageInput').focus();

    // Show welcome screen initially
    this.showWelcomeScreen();
  }

  showLoading() {
    document.getElementById('loadingSpinner').classList.add('active');
  }

  hideLoading() {
    document.getElementById('loadingSpinner').classList.remove('active');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '6px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10000',
      maxWidth: '300px',
      wordWrap: 'break-word',
      opacity: '0',
      transform: 'translateX(100%)',
      transition: 'all 0.3s ease'
    });

    // Set background color based on type
    const colors = {
      error: '#ef4444',
      success: '#10b981',
      info: '#3b82f6',
      warning: '#f59e0b'
    };

    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new ChatApp();
});

// Global functions for event handlers
window.chatApp = null;
