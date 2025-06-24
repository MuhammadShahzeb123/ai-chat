/**
 * Chat Service
 * Handles AI chat interactions with DeepSeek API
 */

const OpenAI = require('openai');
const conversationDB = require('../config/database');
const systemPrompts = require('./systemPrompts');
const { v4: uuidv4 } = require('uuid');

class ChatService {
  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY
    });

    this.maxTokens = 4000;
    this.temperature = 0.7;
    this.maxConversationLength = 50; // Max messages to keep in context
  }

  async createNewConversation(promptId = 'helpful-assistant', userContext = {}) {
    const sessionId = uuidv4();
    const systemMessage = systemPrompts.generateSystemMessage(promptId, userContext);

    const conversation = {
      sessionId,
      title: 'New Conversation',
      promptId,
      messages: [systemMessage],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      userContext
    };

    conversationDB.saveConversation(sessionId, conversation);
    return conversation;
  }

  async sendMessage(sessionId, message, options = {}) {
    try {
      let conversation = conversationDB.getConversation(sessionId);

      if (!conversation) {
        conversation = await this.createNewConversation(options.promptId, options.userContext);
      }

      // Add user message
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      conversation.messages.push(userMessage);

      // Generate title for the conversation if it's the first user message
      if (conversation.messages.filter(m => m.role === 'user').length === 1) {
        conversation.title = this.generateConversationTitle(message);
      }

      // Prepare messages for API (keep recent context)
      const contextMessages = this.prepareContextMessages(conversation.messages);

      // Call DeepSeek API
      const completion = await this.openai.chat.completions.create({
        messages: contextMessages,
        model: options.model || "deepseek-chat",
        temperature: options.temperature || this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        stream: options.stream || false
      });

      const aiResponse = completion.choices[0].message.content;

      // Add AI response to conversation
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        usage: completion.usage
      };

      conversation.messages.push(assistantMessage);
      conversation.lastUpdated = new Date().toISOString();

      // Save updated conversation
      conversationDB.saveConversation(sessionId, conversation);

      return {
        sessionId: conversation.sessionId,
        message: aiResponse,
        conversation: {
          title: conversation.title,
          messageCount: conversation.messages.length,
          lastUpdated: conversation.lastUpdated
        },
        usage: completion.usage
      };

    } catch (error) {
      console.error('Chat service error:', error);
      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  async streamMessage(sessionId, message, options = {}) {
    try {
      let conversation = conversationDB.getConversation(sessionId);

      if (!conversation) {
        conversation = await this.createNewConversation(options.promptId, options.userContext);
      }

      // Add user message
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      conversation.messages.push(userMessage);

      // Generate title for the conversation if it's the first user message
      if (conversation.messages.filter(m => m.role === 'user').length === 1) {
        conversation.title = this.generateConversationTitle(message);
      }

      // Prepare messages for API
      const contextMessages = this.prepareContextMessages(conversation.messages);

      // Return stream
      const stream = await this.openai.chat.completions.create({
        messages: contextMessages,
        model: options.model || "deepseek-chat",
        temperature: options.temperature || this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        stream: true
      });

      return {
        stream,
        conversation,
        sessionId: conversation.sessionId
      };

    } catch (error) {
      console.error('Stream chat service error:', error);
      throw new Error(`Failed to process streaming message: ${error.message}`);
    }
  }

  prepareContextMessages(messages) {
    // Keep system message and recent conversation
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    // Keep recent messages within token limit
    const recentMessages = otherMessages.slice(-this.maxConversationLength);

    return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
  }

  generateConversationTitle(firstMessage) {
    // Generate a short title from the first message
    const words = firstMessage.split(' ').slice(0, 6);
    let title = words.join(' ');

    if (firstMessage.split(' ').length > 6) {
      title += '...';
    }

    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  async getConversation(sessionId) {
    return conversationDB.getConversation(sessionId);
  }

  async getConversationHistory(sessionId, limit = 50) {
    const conversation = conversationDB.getConversation(sessionId);
    if (!conversation) {
      return null;
    }

    const messages = conversation.messages
      .filter(m => m.role !== 'system')
      .slice(-limit)
      .map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }));

    return {
      sessionId: conversation.sessionId,
      title: conversation.title,
      messages,
      promptId: conversation.promptId,
      createdAt: conversation.createdAt,
      lastUpdated: conversation.lastUpdated
    };
  }

  async getAllConversations(limit = 50) {
    return conversationDB.getAllConversations(limit);
  }

  async deleteConversation(sessionId) {
    return conversationDB.deleteConversation(sessionId);
  }

  async updateConversationTitle(sessionId, newTitle) {
    const conversation = conversationDB.getConversation(sessionId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.title = newTitle;
    conversation.lastUpdated = new Date().toISOString();
    conversationDB.saveConversation(sessionId, conversation);

    return conversation;
  }
}

module.exports = new ChatService();
