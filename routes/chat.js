/**
 * Enhanced Chat Routes
 * Provides powerful chat functionality with conversation management
 */

const express = require('express');
const chatService = require('../src/services/chatService');
const systemPrompts = require('../src/services/systemPrompts');
const router = express.Router();

// Send a message to AI
router.post('/message', async (req, res) => {
  try {
    const {
      message,
      sessionId,
      promptId = 'helpful-assistant',
      userContext = {},
      options = {}
    } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    const response = await chatService.sendMessage(sessionId, message, {
      promptId,
      userContext,
      ...options
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message,
      code: 'CHAT_ERROR'
    });
  }
});

// Start a new conversation
router.post('/conversation/new', async (req, res) => {
  try {
    const {
      promptId = 'helpful-assistant',
      userContext = {}
    } = req.body;

    const conversation = await chatService.createNewConversation(promptId, userContext);

    res.json({
      success: true,
      data: {
        sessionId: conversation.sessionId,
        title: conversation.title,
        promptId: conversation.promptId,
        createdAt: conversation.createdAt
      }
    });

  } catch (error) {
    console.error('New conversation error:', error);
    res.status(500).json({
      error: 'Failed to create new conversation',
      message: error.message,
      code: 'NEW_CONVERSATION_ERROR'
    });
  }
});

// Get conversation history
router.get('/conversation/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    const conversation = await chatService.getConversationHistory(sessionId, parseInt(limit));

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: conversation
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation',
      message: error.message,
      code: 'GET_CONVERSATION_ERROR'
    });
  }
});

// Get all conversations list
router.get('/conversations', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const conversations = await chatService.getAllConversations(parseInt(limit));

    res.json({
      success: true,
      data: conversations
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversations',
      message: error.message,
      code: 'GET_CONVERSATIONS_ERROR'
    });
  }
});

// Update conversation title
router.put('/conversation/:sessionId/title', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        error: 'Title is required',
        code: 'MISSING_TITLE'
      });
    }

    const conversation = await chatService.updateConversationTitle(sessionId, title.trim());

    res.json({
      success: true,
      data: {
        sessionId: conversation.sessionId,
        title: conversation.title,
        lastUpdated: conversation.lastUpdated
      }
    });

  } catch (error) {
    console.error('Update title error:', error);
    res.status(500).json({
      error: 'Failed to update conversation title',
      message: error.message,
      code: 'UPDATE_TITLE_ERROR'
    });
  }
});

// Delete conversation
router.delete('/conversation/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = await chatService.deleteConversation(sessionId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      message: error.message,
      code: 'DELETE_CONVERSATION_ERROR'
    });
  }
});

// Get available system prompts
router.get('/prompts', async (req, res) => {
  try {
    const prompts = systemPrompts.getAvailablePrompts();

    res.json({
      success: true,
      data: prompts
    });

  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({
      error: 'Failed to retrieve system prompts',
      message: error.message,
      code: 'GET_PROMPTS_ERROR'
    });
  }
});

// Create custom system prompt
router.post('/prompts/custom', async (req, res) => {
  try {
    const { id, name, description, prompt, icon } = req.body;

    if (!id || !name || !prompt) {
      return res.status(400).json({
        error: 'ID, name, and prompt are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const customPrompt = systemPrompts.createCustomPrompt(id, {
      name,
      description,
      prompt,
      icon
    });

    res.json({
      success: true,
      data: { id, ...customPrompt }
    });

  } catch (error) {
    console.error('Create custom prompt error:', error);
    res.status(500).json({
      error: 'Failed to create custom prompt',
      message: error.message,
      code: 'CREATE_PROMPT_ERROR'
    });
  }
});

// Stream chat (for real-time responses)
router.post('/stream', async (req, res) => {
  try {
    const {
      message,
      sessionId,
      promptId = 'helpful-assistant',
      userContext = {},
      options = {}
    } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    const { stream, conversation } = await chatService.streamMessage(sessionId, message, {
      promptId,
      userContext,
      ...options
    });

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let fullResponse = '';

    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`);
        }
      }

      // Save the complete response to conversation
      conversation.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString()
      });

      conversation.lastUpdated = new Date().toISOString();
      require('../src/config/database').saveConversation(conversation.sessionId, conversation);

      res.write(`data: ${JSON.stringify({ type: 'done', sessionId: conversation.sessionId })}\n\n`);
      res.end();

    } catch (streamError) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Stream chat error:', error);
    res.status(500).json({
      error: 'Failed to process streaming chat',
      message: error.message,
      code: 'STREAM_ERROR'
    });
  }
});

module.exports = router;