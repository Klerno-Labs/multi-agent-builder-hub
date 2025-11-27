import { getVectorStore } from "./vector-store";
import { runWithLLM } from "../llm/client";
import { LLMMessage } from "../llm/types";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DiscoveryContext {
  projectType?: string;
  industry?: string;
  techStack?: string[];
  features?: string[];
  budget?: string;
  timeline?: string;
  teamSize?: string;
  userAnswers: Record<string, string>;
}

export interface ConversationalDiscoveryResult {
  message: string;
  isComplete: boolean;
  context: DiscoveryContext;
  suggestedQuestions?: string[];
}

/**
 * RAG-powered conversational discovery system
 */
export class ConversationalDiscovery {
  private vectorStore = getVectorStore();
  private conversationHistory: ConversationMessage[] = [];
  private context: DiscoveryContext = { userAnswers: {} };

  /**
   * Process a user message and generate an intelligent response
   */
  async chat(userMessage: string): Promise<ConversationalDiscoveryResult> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Retrieve relevant knowledge from vector store
    const relevantDocs = await this.vectorStore.search(userMessage, 3);
    const context = relevantDocs.map(doc => doc.document).join("\n\n---\n\n");

    // Build conversation history for LLM
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(context),
      },
      ...this.conversationHistory.map(msg => ({
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      })),
    ];

    // Get LLM response
    const response = await runWithLLM({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    });

    // Parse response and extract context updates
    const assistantMessage = response.output;
    this.updateContext(userMessage, assistantMessage);

    // Add assistant message to history
    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
      timestamp: new Date().toISOString(),
    });

    // Check if discovery is complete
    const isComplete = this.isDiscoveryComplete();

    // Generate suggested follow-up questions
    const suggestedQuestions = isComplete ? undefined : this.generateSuggestions();

    return {
      message: assistantMessage,
      isComplete,
      context: this.context,
      suggestedQuestions,
    };
  }

  /**
   * Serialize conversation state for persistence
   */
  serialize(): { conversationHistory: ConversationMessage[]; context: DiscoveryContext } {
    return {
      conversationHistory: this.conversationHistory,
      context: this.context,
    };
  }

  /**
   * Restore a ConversationalDiscovery instance from serialized state
   */
  static fromSerialized(state: { conversationHistory: ConversationMessage[]; context: DiscoveryContext }): ConversationalDiscovery {
    const c = new ConversationalDiscovery();
    c.conversationHistory = state.conversationHistory || [];
    c.context = state.context || { userAnswers: {} };
    return c;
  }

  /**
   * Build the system prompt with RAG context
   */
  private buildSystemPrompt(ragContext: string): string {
    const missingInfo = this.identifyMissingInformation();

    return `You are Jordan, a professional project discovery specialist. Your ONLY purpose is to gather complete, actionable requirements for software project development.

STRICT RULES - YOU MUST FOLLOW THESE:
1. ONLY discuss the customer's software project - politely redirect any off-topic conversation
2. Ask the MINIMUM questions needed to fully understand their project
3. Each question must extract maximum information
4. Never ask questions you already have answers for
5. NEVER make assumptions - if unclear, ask
6. Be polite, courteous, and professional at all times
7. Use phrases like "My pleasure", "I'd be happy to help", "Thank you for clarifying"
8. Maintain a calm, understanding tone

CRITICAL INFORMATION REQUIRED:
✓ Project Type (web app, website, mobile app, web3 dApp, database)
✓ Core Purpose & Value Proposition (what problem does it solve?)
✓ Target Users (who will use it?)
✓ Essential Features (what must it do?)
✓ Data Requirements (what data will be stored/managed?)
✓ User Actions (what can users do?)
✓ Technical Constraints (if any specific requirements)

MISSING INFORMATION YOU MUST GATHER:
${missingInfo.length > 0 ? missingInfo.join('\n') : 'All critical information collected - ready for final confirmation'}

RELEVANT KNOWLEDGE FROM DATABASE:
${ragContext}

CURRENT UNDERSTANDING:
${JSON.stringify(this.context, null, 2)}

CONVERSATION STRATEGY:
1. If off-topic: "My pleasure to help, but I'd like to stay focused on your project requirements. Let's continue with [next question]."
2. If information is incomplete: Ask ONE specific, targeted question
3. If information is sufficient: Provide a comprehensive summary and ask for confirmation
4. Always acknowledge their input before asking the next question
5. Be warm but professional: "Thank you for that detail" or "I appreciate you sharing that"

YOUR NEXT RESPONSE MUST:
- Acknowledge what they just said (if applicable)
- Either ask ONE critical missing question OR summarize everything for confirmation
- Be concise (2-3 sentences maximum)
- Maintain a professional, courteous tone
- Stay strictly on topic

EXAMPLE GOOD RESPONSES:
"Thank you for that clarification. To ensure I understand correctly, who is your primary target audience for this application?"
"I appreciate those details. My pleasure to help - could you describe the main actions users will perform in this system?"
"Understood. One more thing - what type of data will this application need to store and manage?"

DO NOT:
- Discuss anything unrelated to their project
- Ask multiple questions at once
- Make assumptions about requirements
- Provide technical advice unless directly relevant to gathering requirements
- Use overly casual language
- Skip validation of understanding`;
  }

  /**
   * Identify what critical information is still missing
   */
  private identifyMissingInformation(): string[] {
    const missing: string[] = [];

    if (!this.context.projectType) {
      missing.push('❌ Project Type: Unknown (web app, website, mobile, web3, database)');
    }

    const hasDescription = Object.values(this.context.userAnswers).some(answer =>
      answer.length > 20 && !answer.toLowerCase().includes('yes') && !answer.toLowerCase().includes('no')
    );
    if (!hasDescription) {
      missing.push('❌ Core Purpose: Need detailed description of what the project does');
    }

    if (!this.context.userAnswers['target_users']) {
      missing.push('❌ Target Users: Who will use this application?');
    }

    if (!this.context.features || this.context.features.length === 0) {
      missing.push('❌ Essential Features: What core functionality is required?');
    }

    if (!this.context.userAnswers['data_requirements']) {
      missing.push('❌ Data Requirements: What information needs to be stored?');
    }

    if (!this.context.userAnswers['user_actions']) {
      missing.push('❌ User Actions: What will users be able to do?');
    }

    return missing;
  }

  /**
   * Update context based on conversation - COMPREHENSIVE EXTRACTION
   */
  private updateContext(userMessage: string, assistantMessage: string): void {
    const lowerMessage = userMessage.toLowerCase();

    // 1. DETECT PROJECT TYPE (highest priority)
    if (!this.context.projectType) {
      const projectTypePatterns = [
        { pattern: /web\s*app|saas|platform|dashboard|admin\s*panel/i, type: "web_app" },
        { pattern: /website|landing\s*page|blog|marketing\s*site|portfolio/i, type: "website" },
        { pattern: /mobile\s*app|ios|android|react\s*native|flutter/i, type: "mobile_app" },
        { pattern: /web3|blockchain|dapp|smart\s*contract|nft|defi|dao/i, type: "web3_dapp" },
        { pattern: /database|data\s*warehouse|etl|analytics/i, type: "database" },
      ];

      for (const { pattern, type } of projectTypePatterns) {
        if (pattern.test(userMessage)) {
          this.context.projectType = type as any;
          break;
        }
      }
    }

    // 2. EXTRACT TARGET USERS from user's description
    const targetUserPatterns = [
      /for\s+([\w\s]+)\s+(?:to|who|that)/i,
      /(?:users?|customers?|clients?|audience)(?:\s+are|\s+will\s+be)?\s+([\w\s]+)/i,
      /(businesses|companies|students|teachers|developers|designers|managers)/i,
    ];

    for (const pattern of targetUserPatterns) {
      const match = userMessage.match(pattern);
      if (match && !this.context.userAnswers['target_users']) {
        this.context.userAnswers['target_users'] = match[1] || match[0];
        break;
      }
    }

    // 3. EXTRACT FEATURES mentioned in natural language
    const featureKeywords = [
      "login", "signup", "authentication", "auth",
      "payment", "checkout", "subscription", "billing",
      "dashboard", "analytics", "reports", "charts",
      "search", "filter", "sort",
      "upload", "download", "file", "image",
      "chat", "message", "notification", "email",
      "calendar", "schedule", "booking",
      "comments", "reviews", "ratings",
      "profile", "settings", "account",
      "admin", "moderation", "management",
      "export", "import", "integration",
      "real-time", "live", "websocket"
    ];

    const detectedFeatures: string[] = [];
    featureKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        detectedFeatures.push(keyword);
      }
    });

    if (detectedFeatures.length > 0) {
      if (!this.context.features) this.context.features = [];
      detectedFeatures.forEach(feature => {
        if (!this.context.features!.includes(feature)) {
          this.context.features!.push(feature);
        }
      });
    }

    // 4. DETECT DATA REQUIREMENTS
    const dataPatterns = [
      /(?:store|save|manage|track)\s+([\w\s,]+)/i,
      /data\s+(?:about|for|on)\s+([\w\s,]+)/i,
      /(users?|products?|orders?|customers?|projects?|tasks?|posts?|items?)/i,
    ];

    for (const pattern of dataPatterns) {
      const match = userMessage.match(pattern);
      if (match && !this.context.userAnswers['data_requirements']) {
        this.context.userAnswers['data_requirements'] = match[1] || match[0];
        break;
      }
    }

    // 5. EXTRACT USER ACTIONS (verbs indicating what users do)
    const actionPatterns = [
      /users?\s+(?:can|will|should)\s+([\w\s,]+)/i,
      /(?:create|add|edit|delete|update|view|manage|browse|search|filter|upload|download|share|invite)\s/i,
    ];

    for (const pattern of actionPatterns) {
      const match = userMessage.match(pattern);
      if (match && !this.context.userAnswers['user_actions']) {
        this.context.userAnswers['user_actions'] = match[1] || match[0];
        break;
      }
    }

    // 6. DETECT TECHNICAL STACK MENTIONS
    const techKeywords = {
      "next.js": "Next.js", "nextjs": "Next.js",
      "react": "React", "react native": "React Native",
      "vue": "Vue.js", "angular": "Angular",
      "node": "Node.js", "express": "Express",
      "django": "Django", "rails": "Ruby on Rails", "laravel": "Laravel",
      "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
      "mongodb": "MongoDB", "mongo": "MongoDB",
      "mysql": "MySQL", "sqlite": "SQLite",
      "firebase": "Firebase", "supabase": "Supabase",
      "graphql": "GraphQL", "rest": "REST API",
      "typescript": "TypeScript", "javascript": "JavaScript",
      "python": "Python", "java": "Java", "go": "Go",
      "aws": "AWS", "azure": "Azure", "gcp": "Google Cloud",
      "docker": "Docker", "kubernetes": "Kubernetes",
    };

    Object.entries(techKeywords).forEach(([keyword, tech]) => {
      if (lowerMessage.includes(keyword)) {
        if (!this.context.techStack) this.context.techStack = [];
        if (!this.context.techStack.includes(tech)) {
          this.context.techStack.push(tech);
        }
      }
    });

    // 7. DETECT INDUSTRY/DOMAIN
    const industryKeywords = [
      "ecommerce", "e-commerce", "shop", "store",
      "education", "learning", "course",
      "healthcare", "medical", "health",
      "finance", "fintech", "banking",
      "real estate", "property",
      "social", "network", "community",
      "marketplace", "booking", "reservation"
    ];

    industryKeywords.forEach(industry => {
      if (lowerMessage.includes(industry) && !this.context.industry) {
        this.context.industry = industry;
      }
    });

    // 8. DETECT BUDGET/TIMELINE (optional but helpful)
    const budgetPattern = /budget\s*(?:is|of)?\s*[\$]?([\d,]+)/i;
    const timelinePattern = /(?:in|within|by)\s+(\d+\s+(?:days?|weeks?|months?))/i;

    const budgetMatch = userMessage.match(budgetPattern);
    if (budgetMatch) {
      this.context.budget = budgetMatch[1];
    }

    const timelineMatch = userMessage.match(timelinePattern);
    if (timelineMatch) {
      this.context.timeline = timelineMatch[1];
    }

    // 9. STORE RAW ANSWER with question context
    const turnNumber = Math.floor(this.conversationHistory.length / 2) + 1;
    this.context.userAnswers[`turn_${turnNumber}`] = userMessage;

    // 10. BUILD COMPREHENSIVE DESCRIPTION from all answers
    const allUserMessages = this.conversationHistory
      .filter(m => m.role === "user")
      .map(m => m.content)
      .join(" ");
    this.context.userAnswers['full_description'] = allUserMessages;
  }

  /**
   * Check if discovery is complete - STRICT VALIDATION
   */
  private isDiscoveryComplete(): boolean {
    // CRITICAL REQUIREMENT 1: Project type must be identified
    if (!this.context.projectType) {
      return false;
    }

    // CRITICAL REQUIREMENT 2: Must have substantial description
    const hasDescription = this.context.userAnswers['full_description']?.length > 50;
    if (!hasDescription) {
      return false;
    }

    // CRITICAL REQUIREMENT 3: Must know target users
    if (!this.context.userAnswers['target_users']) {
      return false;
    }

    // CRITICAL REQUIREMENT 4: Must have at least 3 features identified
    const hasFeatures = this.context.features && this.context.features.length >= 3;
    if (!hasFeatures) {
      return false;
    }

    // CRITICAL REQUIREMENT 5: Must know data requirements
    if (!this.context.userAnswers['data_requirements']) {
      return false;
    }

    // CRITICAL REQUIREMENT 6: Must know user actions
    if (!this.context.userAnswers['user_actions']) {
      return false;
    }

    // CRITICAL REQUIREMENT 7: Must have confirmation from assistant
    // Check if the last 2 assistant messages included a summary
    const recentAssistantMessages = this.conversationHistory
      .filter(m => m.role === "assistant")
      .slice(-2)
      .map(m => m.content.toLowerCase());

    const hasSummary = recentAssistantMessages.some(msg =>
      msg.includes("understand") ||
      msg.includes("summary") ||
      msg.includes("confirm") ||
      msg.includes("correct")
    );

    // CRITICAL REQUIREMENT 8: User must have confirmed the summary
    const lastUserMessage = this.conversationHistory
      .filter(m => m.role === "user")
      .slice(-1)[0]?.content.toLowerCase() || "";

    const userConfirmed =
      lastUserMessage.includes("yes") ||
      lastUserMessage.includes("correct") ||
      lastUserMessage.includes("right") ||
      lastUserMessage.includes("perfect") ||
      lastUserMessage.includes("sounds good") ||
      lastUserMessage.includes("that's it") ||
      lastUserMessage.includes("exactly");

    // Only complete if we have everything AND user confirmed
    return hasSummary && userConfirmed;
  }

  /**
   * Generate suggested follow-up questions
   */
  private generateSuggestions(): string[] {
    const suggestions: string[] = [];

    if (!this.context.projectType) {
      suggestions.push("Tell me more about what you want to build");
      suggestions.push("Who will be using this application?");
    } else if (!this.context.features || this.context.features.length === 0) {
      suggestions.push("What are the main features you need?");
      suggestions.push("What will users be able to do?");
    } else {
      suggestions.push("Are there any specific technical requirements?");
      suggestions.push("Do you have a timeline in mind?");
    }

    return suggestions.slice(0, 2);
  }

  /**
   * Get the current discovery context
   */
  getContext(): DiscoveryContext {
    return this.context;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  /**
   * Export discovery answers in the format expected by the pipeline
   */
  exportDiscoveryAnswers(): Record<string, string> {
    return {
      projectType: this.context.projectType || "",
      projectDescription: this.conversationHistory
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join(" "),
      techPreferences: this.context.techStack?.join(", ") || "No specific preferences",
      features: this.context.features?.join(", ") || "To be determined from conversation",
      ...this.context.userAnswers,
    };
  }
}
