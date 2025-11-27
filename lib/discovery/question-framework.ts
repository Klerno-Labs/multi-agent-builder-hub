/**
 * Question Framework - Intelligent questioning system for requirements discovery
 */

import { ProjectType } from "../orchestration/pipeline-manager";

export type QuestionType = "open" | "closed" | "multiple_choice" | "scale" | "priority";
export type QuestionCategory = "business" | "technical" | "users" | "constraints" | "integrations" | "features" | "design";

export interface Question {
  id: string;
  category: QuestionCategory;
  type: QuestionType;
  text: string;
  context?: string;
  required: boolean;
  dependsOn?: string; // Question ID this depends on
  options?: string[]; // For multiple choice
  followUp?: Question[]; // Follow-up questions based on answer
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type: "min_length" | "max_length" | "pattern" | "required" | "numeric" | "email" | "url";
  value?: any;
  errorMessage: string;
}

export interface Answer {
  questionId: string;
  value: string | string[] | number;
  timestamp: Date;
  confidence?: number; // 0-1, how confident the user is
}

export interface DiscoverySession {
  projectId: string;
  projectType?: ProjectType;
  questions: Question[];
  answers: Map<string, Answer>;
  completeness: number; // 0-100
  nextQuestion?: Question;
}

/**
 * Core question bank organized by category
 */
export const QUESTION_BANK: Record<QuestionCategory, Question[]> = {
  business: [
    {
      id: "bus_001",
      category: "business",
      type: "open",
      text: "What is the primary business goal or problem this project solves?",
      context: "Understanding the core business objective helps align all technical decisions",
      required: true,
      validationRules: [
        { type: "min_length", value: 20, errorMessage: "Please provide more detail (at least 20 characters)" },
      ],
    },
    {
      id: "bus_002",
      category: "business",
      type: "open",
      text: "Who are the primary stakeholders for this project?",
      context: "E.g., CEO, Marketing team, End users, Investors",
      required: true,
    },
    {
      id: "bus_003",
      category: "business",
      type: "multiple_choice",
      text: "What is the expected timeline for this project?",
      required: true,
      options: ["1-2 weeks (MVP)", "1 month", "2-3 months", "3-6 months", "6+ months", "No deadline"],
    },
    {
      id: "bus_004",
      category: "business",
      type: "multiple_choice",
      text: "What is the budget range for this project?",
      required: false,
      options: ["< $10k", "$10k-$50k", "$50k-$100k", "$100k-$500k", "$500k+", "Not specified"],
    },
    {
      id: "bus_005",
      category: "business",
      type: "open",
      text: "What defines success for this project? (e.g., user count, revenue, KPIs)",
      required: true,
      validationRules: [
        { type: "min_length", value: 15, errorMessage: "Please provide specific success metrics" },
      ],
    },
    {
      id: "bus_006",
      category: "business",
      type: "multiple_choice",
      text: "Is there a competitive product or reference you want to emulate?",
      required: false,
      options: ["Yes - I'll describe it", "Yes - but we want to be different", "No - this is unique", "Unsure"],
      followUp: [
        {
          id: "bus_006_a",
          category: "business",
          type: "open",
          text: "Please describe the competitive product or provide a URL",
          required: false,
        },
      ],
    },
  ],

  users: [
    {
      id: "usr_001",
      category: "users",
      type: "open",
      text: "Who are the primary users/audience for this product?",
      context: "E.g., Enterprise customers, Consumers, Internal team, Developers",
      required: true,
    },
    {
      id: "usr_002",
      category: "users",
      type: "scale",
      text: "How many users do you expect in the first 3 months?",
      required: false,
      options: ["< 100", "100-1,000", "1,000-10,000", "10,000-100,000", "100,000+"],
    },
    {
      id: "usr_003",
      category: "users",
      type: "multiple_choice",
      text: "What devices will users primarily use?",
      required: true,
      options: ["Desktop/laptop", "Mobile (iOS)", "Mobile (Android)", "Tablet", "All devices"],
    },
    {
      id: "usr_004",
      category: "users",
      type: "open",
      text: "What is the primary user journey or use case?",
      context: "Describe step-by-step what a typical user will do",
      required: true,
      validationRules: [
        { type: "min_length", value: 30, errorMessage: "Please provide a detailed user journey" },
      ],
    },
    {
      id: "usr_005",
      category: "users",
      type: "multiple_choice",
      text: "Will users need accounts/authentication?",
      required: true,
      options: ["Yes - required", "Yes - optional", "No - public access only", "Unsure"],
      followUp: [
        {
          id: "usr_005_a",
          category: "users",
          type: "multiple_choice",
          text: "What authentication methods should be supported?",
          required: true,
          options: [
            "Email/Password",
            "Social login (Google, Facebook, etc.)",
            "Single Sign-On (SSO)",
            "Multi-factor authentication (MFA)",
            "Passwordless (magic link)",
          ],
        },
      ],
    },
    {
      id: "usr_006",
      category: "users",
      type: "multiple_choice",
      text: "Are there different user roles with different permissions?",
      required: true,
      options: ["Yes - multiple roles", "No - all users equal", "Admin only", "Unsure"],
      followUp: [
        {
          id: "usr_006_a",
          category: "users",
          type: "open",
          text: "Please describe the different user roles and their permissions",
          required: true,
        },
      ],
    },
  ],

  features: [
    {
      id: "feat_001",
      category: "features",
      type: "open",
      text: "What are the top 3-5 must-have features for this project?",
      context: "Focus on core functionality that delivers the most value",
      required: true,
      validationRules: [
        { type: "min_length", value: 50, errorMessage: "Please describe each feature in detail" },
      ],
    },
    {
      id: "feat_002",
      category: "features",
      type: "open",
      text: "Are there any nice-to-have features that could be added later?",
      required: false,
    },
    {
      id: "feat_003",
      category: "features",
      type: "multiple_choice",
      text: "Will the project need search functionality?",
      required: false,
      options: ["Yes - basic search", "Yes - advanced/filtered search", "Yes - full-text search", "No"],
    },
    {
      id: "feat_004",
      category: "features",
      type: "multiple_choice",
      text: "Will users need to upload files or media?",
      required: false,
      options: ["Yes - images only", "Yes - documents (PDF, etc.)", "Yes - any file type", "No"],
    },
    {
      id: "feat_005",
      category: "features",
      type: "multiple_choice",
      text: "Does the project need real-time features? (e.g., live updates, chat, notifications)",
      required: false,
      options: ["Yes - real-time chat", "Yes - live notifications", "Yes - collaborative editing", "No"],
    },
    {
      id: "feat_006",
      category: "features",
      type: "multiple_choice",
      text: "Will the project need payment processing?",
      required: false,
      options: ["Yes - one-time payments", "Yes - subscriptions", "Yes - both", "No"],
      followUp: [
        {
          id: "feat_006_a",
          category: "features",
          type: "multiple_choice",
          text: "Which payment providers should be supported?",
          required: true,
          options: ["Stripe", "PayPal", "Square", "Cryptocurrency", "Other"],
        },
      ],
    },
  ],

  technical: [
    {
      id: "tech_001",
      category: "technical",
      type: "multiple_choice",
      text: "Do you have a preference for the technology stack?",
      required: false,
      options: [
        "Use latest/best practices (recommended)",
        "I have specific requirements",
        "Match existing infrastructure",
        "No preference",
      ],
      followUp: [
        {
          id: "tech_001_a",
          category: "technical",
          type: "open",
          text: "Please specify your technology preferences (e.g., React, Node.js, PostgreSQL)",
          required: false,
        },
      ],
    },
    {
      id: "tech_002",
      category: "technical",
      type: "multiple_choice",
      text: "Where will this project be hosted/deployed?",
      required: false,
      options: ["Vercel", "AWS", "Google Cloud", "Azure", "Heroku", "Self-hosted", "Undecided"],
    },
    {
      id: "tech_003",
      category: "technical",
      type: "multiple_choice",
      text: "What database type is needed?",
      required: false,
      options: ["SQL (PostgreSQL, MySQL)", "NoSQL (MongoDB)", "Both", "No database needed", "Undecided"],
    },
    {
      id: "tech_004",
      category: "technical",
      type: "multiple_choice",
      text: "Are there any specific performance requirements?",
      required: false,
      options: [
        "Fast page loads (< 2s)",
        "Handle high traffic (10k+ concurrent users)",
        "Real-time responsiveness",
        "Large file handling",
        "Standard performance",
      ],
    },
    {
      id: "tech_005",
      category: "technical",
      type: "multiple_choice",
      text: "What level of security is required?",
      required: true,
      options: [
        "Standard (HTTPS, basic auth)",
        "Enhanced (MFA, encryption)",
        "Enterprise (SOC 2, GDPR compliance)",
        "Maximum (Financial/healthcare grade)",
      ],
    },
  ],

  constraints: [
    {
      id: "con_001",
      category: "constraints",
      type: "open",
      text: "Are there any technical constraints or limitations we should know about?",
      context: "E.g., Must work offline, Must integrate with legacy system, Limited bandwidth",
      required: false,
    },
    {
      id: "con_002",
      category: "constraints",
      type: "open",
      text: "Are there any regulatory or compliance requirements?",
      context: "E.g., GDPR, HIPAA, PCI-DSS, SOC 2",
      required: false,
    },
    {
      id: "con_003",
      category: "constraints",
      type: "multiple_choice",
      text: "What browsers/devices must be supported?",
      required: false,
      options: [
        "Modern browsers only (Chrome, Firefox, Safari, Edge)",
        "Include IE 11",
        "Mobile browsers",
        "All browsers",
        "No specific requirements",
      ],
    },
    {
      id: "con_004",
      category: "constraints",
      type: "open",
      text: "Are there any accessibility requirements?",
      context: "E.g., WCAG 2.1 AA compliance, screen reader support",
      required: false,
    },
  ],

  integrations: [
    {
      id: "int_001",
      category: "integrations",
      type: "multiple_choice",
      text: "Does this project need to integrate with any third-party services?",
      required: false,
      options: ["Yes - I'll list them", "No integrations needed", "Unsure yet"],
      followUp: [
        {
          id: "int_001_a",
          category: "integrations",
          type: "open",
          text: "Please list the third-party services and APIs to integrate",
          context: "E.g., Stripe, Twilio, SendGrid, Google Maps, CRM systems",
          required: true,
        },
      ],
    },
    {
      id: "int_002",
      category: "integrations",
      type: "multiple_choice",
      text: "Will this need analytics or tracking?",
      required: false,
      options: ["Google Analytics", "Mixpanel", "Segment", "Custom analytics", "No tracking"],
    },
    {
      id: "int_003",
      category: "integrations",
      type: "multiple_choice",
      text: "Will this need email functionality?",
      required: false,
      options: [
        "Transactional emails (password reset, etc.)",
        "Marketing emails (newsletters)",
        "Both",
        "No email needed",
      ],
    },
  ],

  design: [
    {
      id: "des_001",
      category: "design",
      type: "multiple_choice",
      text: "Do you have existing brand guidelines or design assets?",
      required: false,
      options: ["Yes - I'll provide them", "No - need full design", "Partial - some branding exists"],
    },
    {
      id: "des_002",
      category: "design",
      type: "multiple_choice",
      text: "What is the desired design style?",
      required: false,
      options: ["Modern/minimalist", "Bold/colorful", "Professional/corporate", "Playful/creative", "No preference"],
    },
    {
      id: "des_003",
      category: "design",
      type: "open",
      text: "Are there any design inspirations or examples you like?",
      context: "Please provide URLs or descriptions",
      required: false,
    },
    {
      id: "des_004",
      category: "design",
      type: "multiple_choice",
      text: "Should the design support dark mode?",
      required: false,
      options: ["Yes - required", "Yes - nice to have", "No - light mode only"],
    },
  ],
};

/**
 * Get questions for specific project type
 */
export function getQuestionsForProjectType(projectType: ProjectType): Question[] {
  const baseQuestions = [
    ...QUESTION_BANK.business,
    ...QUESTION_BANK.users,
    ...QUESTION_BANK.features,
    ...QUESTION_BANK.technical,
    ...QUESTION_BANK.constraints,
    ...QUESTION_BANK.integrations,
    ...QUESTION_BANK.design,
  ];

  // Add project-type specific questions
  const specificQuestions: Question[] = [];

  if (projectType === "web3_dapp") {
    specificQuestions.push({
      id: "web3_001",
      category: "technical",
      type: "multiple_choice",
      text: "Which blockchain network will this deploy to?",
      required: true,
      options: ["Ethereum Mainnet", "Polygon", "BSC", "Solana", "Testnet only", "Multiple chains"],
    });
    specificQuestions.push({
      id: "web3_002",
      category: "features",
      type: "open",
      text: "What smart contract functionality is needed?",
      context: "E.g., Token creation, NFT minting, Staking, DEX, Governance",
      required: true,
    });
  }

  if (projectType === "mobile_app") {
    specificQuestions.push({
      id: "mobile_001",
      category: "technical",
      type: "multiple_choice",
      text: "Which mobile platforms should be supported?",
      required: true,
      options: ["iOS only", "Android only", "Both iOS and Android", "Cross-platform (React Native)"],
    });
    specificQuestions.push({
      id: "mobile_002",
      category: "features",
      type: "multiple_choice",
      text: "Will the app need push notifications?",
      required: false,
      options: ["Yes - essential", "Yes - nice to have", "No"],
    });
  }

  if (projectType === "database") {
    specificQuestions.push({
      id: "db_001",
      category: "technical",
      type: "open",
      text: "What data will the database store?",
      context: "Describe the main entities and their relationships",
      required: true,
    });
  }

  return [...baseQuestions, ...specificQuestions];
}

/**
 * Calculate completeness of discovery session
 */
export function calculateCompleteness(session: DiscoverySession): number {
  const requiredQuestions = session.questions.filter((q) => q.required);
  const answeredRequired = requiredQuestions.filter((q) => session.answers.has(q.id));

  const requiredScore = (answeredRequired.length / requiredQuestions.length) * 80; // 80% weight
  const optionalScore = ((session.answers.size - answeredRequired.length) / (session.questions.length - requiredQuestions.length)) * 20; // 20% weight

  return Math.min(100, Math.round(requiredScore + optionalScore));
}

/**
 * Get next question based on answered questions
 */
export function getNextQuestion(session: DiscoverySession): Question | undefined {
  // Find first unanswered required question
  for (const question of session.questions) {
    if (question.required && !session.answers.has(question.id)) {
      // Check dependencies
      if (question.dependsOn && !session.answers.has(question.dependsOn)) {
        continue;
      }
      return question;
    }
  }

  // Find first unanswered optional question
  for (const question of session.questions) {
    if (!session.answers.has(question.id)) {
      if (question.dependsOn && !session.answers.has(question.dependsOn)) {
        continue;
      }
      return question;
    }
  }

  return undefined;
}

/**
 * Validate answer against question rules
 */
export function validateAnswer(question: Question, value: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!question.validationRules) {
    return { valid: true, errors };
  }

  for (const rule of question.validationRules) {
    switch (rule.type) {
      case "required":
        if (!value || (typeof value === "string" && value.trim() === "")) {
          errors.push(rule.errorMessage);
        }
        break;

      case "min_length":
        if (typeof value === "string" && value.length < rule.value) {
          errors.push(rule.errorMessage);
        }
        break;

      case "max_length":
        if (typeof value === "string" && value.length > rule.value) {
          errors.push(rule.errorMessage);
        }
        break;

      case "pattern":
        if (typeof value === "string" && !new RegExp(rule.value).test(value)) {
          errors.push(rule.errorMessage);
        }
        break;

      case "email":
        if (typeof value === "string" && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push(rule.errorMessage);
        }
        break;

      case "url":
        try {
          new URL(value);
        } catch {
          errors.push(rule.errorMessage);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate follow-up questions based on answer
 */
export function generateFollowUps(question: Question, answer: Answer): Question[] {
  if (!question.followUp) return [];

  // For now, return all follow-ups
  // In more advanced version, could filter based on answer value
  return question.followUp;
}
