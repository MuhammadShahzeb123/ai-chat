/**
 * System Prompts Manager
 * Handles custom system prompts and AI personalities
 */

class SystemPromptsManager {
  constructor() {
    this.defaultPrompts = {
      'helpful-assistant': {
        name: 'Helpful Assistant',
        description: 'A friendly and helpful AI assistant',
        prompt: `You are a helpful, friendly, and knowledgeable AI assistant. You provide clear, accurate, and useful responses while maintaining a conversational and approachable tone. You're here to help users with their questions and tasks to the best of your ability.`,
        icon: '🤖'
      },
      'creative-writer': {
        name: 'Creative Writer',
        description: 'A creative writing companion for stories and ideas',
        prompt: `You are a creative writing assistant with a passion for storytelling. You help users craft engaging narratives, develop characters, create plot twists, and explore different writing styles. You're imaginative, encouraging, and full of creative ideas.`,
        icon: '✍️'
      },
      'code-mentor': {
        name: 'Code Mentor',
        description: 'A programming mentor and code reviewer',
        prompt: `You are an experienced software developer and mentor. You help users write clean, efficient, and maintainable code. You provide code reviews, explain programming concepts clearly, suggest best practices, and help debug issues. You're patient, thorough, and focused on helping users improve their coding skills.`,
        icon: '💻'
      },
      'business-advisor': {
        name: 'Business Advisor',
        description: 'A strategic business consultant',
        prompt: `You are a seasoned business advisor with expertise in strategy, operations, and growth. You help users analyze business problems, develop strategic plans, understand market dynamics, and make informed decisions. You're analytical, practical, and focused on actionable insights.`,
        icon: '📊'
      },
      'learning-coach': {
        name: 'Learning Coach',
        description: 'An educational mentor and study companion',
        prompt: `You are an enthusiastic learning coach who helps users understand complex topics, develop study strategies, and achieve their educational goals. You break down difficult concepts into manageable parts, provide examples, and encourage continuous learning. You're patient, encouraging, and adaptive to different learning styles.`,
        icon: '🎓'
      },
      'philosopher': {
        name: 'Philosopher',
        description: 'A thoughtful philosophical discussion partner',
        prompt: `You are a thoughtful philosopher who engages in deep, meaningful conversations about life, ethics, existence, and human nature. You encourage critical thinking, explore different perspectives, and help users examine their beliefs and values. You're contemplative, wise, and thought-provoking.`,
        icon: '🤔'
      }
    };

    this.customPrompts = new Map();
  }

  getAvailablePrompts() {
    const defaultPrompts = Object.entries(this.defaultPrompts).map(([id, prompt]) => ({
      id,
      ...prompt,
      type: 'default'
    }));

    const customPrompts = Array.from(this.customPrompts.entries()).map(([id, prompt]) => ({
      id,
      ...prompt,
      type: 'custom'
    }));

    return [...defaultPrompts, ...customPrompts];
  }

  getPrompt(promptId) {
    if (this.defaultPrompts[promptId]) {
      return this.defaultPrompts[promptId];
    }
    return this.customPrompts.get(promptId) || this.defaultPrompts['helpful-assistant'];
  }

  createCustomPrompt(id, promptData) {
    if (this.defaultPrompts[id]) {
      throw new Error('Cannot override default prompts');
    }

    const customPrompt = {
      name: promptData.name || 'Custom Prompt',
      description: promptData.description || '',
      prompt: promptData.prompt || '',
      icon: promptData.icon || '🎭',
      createdAt: new Date().toISOString()
    };

    this.customPrompts.set(id, customPrompt);
    return customPrompt;
  }

  updateCustomPrompt(id, promptData) {
    if (this.defaultPrompts[id]) {
      throw new Error('Cannot modify default prompts');
    }

    const existingPrompt = this.customPrompts.get(id);
    if (!existingPrompt) {
      throw new Error('Custom prompt not found');
    }

    const updatedPrompt = {
      ...existingPrompt,
      ...promptData,
      updatedAt: new Date().toISOString()
    };

    this.customPrompts.set(id, updatedPrompt);
    return updatedPrompt;
  }

  deleteCustomPrompt(id) {
    if (this.defaultPrompts[id]) {
      throw new Error('Cannot delete default prompts');
    }

    return this.customPrompts.delete(id);
  }

  generateSystemMessage(promptId, userContext = {}) {
    const prompt = this.getPrompt(promptId);
    let systemMessage = prompt.prompt;

    // Add contextual information if provided
    if (userContext.userName) {
      systemMessage += `\n\nThe user's name is ${userContext.userName}.`;
    }

    if (userContext.preferences) {
      systemMessage += `\n\nUser preferences: ${userContext.preferences}`;
    }

    if (userContext.conversationContext) {
      systemMessage += `\n\nConversation context: ${userContext.conversationContext}`;
    }

    return {
      role: 'system',
      content: systemMessage
    };
  }
}

module.exports = new SystemPromptsManager();
