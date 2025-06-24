/**
 * Database configuration for conversation persistence
 * Using in-memory storage with optional JSON file backup
 */

const fs = require('fs').promises;
const path = require('path');

class ConversationDatabase {
  constructor() {
    this.conversations = new Map();
    this.dataFile = path.join(__dirname, '../../data/conversations.json');
    this.loadConversations();
  }

  async loadConversations() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      const parsedData = JSON.parse(data);
      this.conversations = new Map(Object.entries(parsedData));
      console.log('Conversations loaded from file');
    } catch (error) {
      console.log('No existing conversation data found, starting fresh');
      await this.ensureDataDirectory();
    }
  }

  async ensureDataDirectory() {
    const dataDir = path.dirname(this.dataFile);
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  async saveConversations() {
    try {
      await this.ensureDataDirectory();
      const data = Object.fromEntries(this.conversations);
      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }

  getConversation(sessionId) {
    return this.conversations.get(sessionId) || null;
  }

  saveConversation(sessionId, conversation) {
    this.conversations.set(sessionId, {
      ...conversation,
      lastUpdated: new Date().toISOString()
    });

    // Auto-save every 5 conversations to prevent data loss
    if (this.conversations.size % 5 === 0) {
      this.saveConversations();
    }
  }

  deleteConversation(sessionId) {
    return this.conversations.delete(sessionId);
  }

  getAllConversations(limit = 50) {
    const conversations = Array.from(this.conversations.entries())
      .map(([id, conv]) => ({
        sessionId: id,
        title: conv.title || 'Untitled Conversation',
        lastUpdated: conv.lastUpdated,
        messageCount: conv.messages.length
      }))
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .slice(0, limit);

    return conversations;
  }

  // Cleanup old conversations (older than 30 days)
  async cleanupOldConversations() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let deleted = 0;
    for (const [sessionId, conversation] of this.conversations) {
      const lastUpdated = new Date(conversation.lastUpdated);
      if (lastUpdated < thirtyDaysAgo) {
        this.conversations.delete(sessionId);
        deleted++;
      }
    }

    if (deleted > 0) {
      await this.saveConversations();
      console.log(`Cleaned up ${deleted} old conversations`);
    }
  }
}

module.exports = new ConversationDatabase();
