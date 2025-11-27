/**
 * Requirements Elicitation - Tools for gathering and structuring project requirements
 */

import { ProjectType } from "../orchestration/pipeline-manager";
import { Answer } from "./question-framework";

export interface Requirement {
  id: string;
  type: "functional" | "non_functional" | "business" | "technical" | "design";
  priority: "must_have" | "should_have" | "could_have" | "wont_have"; // MoSCoW
  title: string;
  description: string;
  acceptanceCriteria: string[];
  source: string; // Which question/interview led to this
  dependencies?: string[]; // Other requirement IDs
  risks?: string[];
  estimatedEffort?: "XS" | "S" | "M" | "L" | "XL";
}

export interface UserStory {
  id: string;
  role: string; // As a [role]
  goal: string; // I want to [goal]
  benefit: string; // So that [benefit]
  acceptanceCriteria: string[]; // Given/When/Then
  priority: "must_have" | "should_have" | "could_have";
  estimatedPoints?: number; // Story points
}

export interface Persona {
  name: string;
  role: string;
  demographics?: {
    age?: string;
    location?: string;
    occupation?: string;
  };
  goals: string[];
  painPoints: string[];
  technicalProficiency: "beginner" | "intermediate" | "advanced";
  devices: string[];
  frequency: "daily" | "weekly" | "monthly" | "occasional";
}

export interface AcceptanceCriteria {
  scenario: string;
  given: string[];
  when: string;
  then: string[];
}

/**
 * Generate user stories from answers
 */
export function generateUserStories(answers: Map<string, Answer>): UserStory[] {
  const stories: UserStory[] = [];
  let storyId = 1;

  // Extract primary user goal
  const userJourney = answers.get("usr_004")?.value as string;
  const features = answers.get("feat_001")?.value as string;

  if (userJourney) {
    // Parse user journey into stories
    const steps = userJourney.split(/\d+\.|step|then|next/i).filter((s) => s.trim());

    steps.forEach((step, index) => {
      if (step.trim().length > 10) {
        stories.push({
          id: `US${storyId++}`,
          role: "user",
          goal: step.trim(),
          benefit: "complete my task efficiently",
          acceptanceCriteria: [
            `Given I am on the ${index === 0 ? "home" : "previous step"} page`,
            `When I ${step.trim()}`,
            `Then I should see confirmation and be able to continue`,
          ],
          priority: index < 3 ? "must_have" : "should_have",
        });
      }
    });
  }

  // Extract feature-based stories
  if (features) {
    const featureList = features.split(/\n|,|;|\d+\./).filter((f) => f.trim().length > 5);

    featureList.forEach((feature, index) => {
      stories.push({
        id: `US${storyId++}`,
        role: "user",
        goal: feature.trim(),
        benefit: "use the core functionality",
        acceptanceCriteria: [
          `Given the feature is implemented`,
          `When I use ${feature.trim()}`,
          `Then it should work as expected`,
        ],
        priority: index < 3 ? "must_have" : "should_have",
      });
    });
  }

  // Add authentication story if needed
  const needsAuth = answers.get("usr_005")?.value;
  if (needsAuth === "Yes - required" || needsAuth === "Yes - optional") {
    stories.push({
      id: `US${storyId++}`,
      role: "user",
      goal: "create an account and log in",
      benefit: "access personalized features",
      acceptanceCriteria: [
        "Given I am on the signup page",
        "When I provide valid credentials",
        "Then my account should be created",
        "And I should be logged in automatically",
      ],
      priority: "must_have",
    });
  }

  // Add payment story if needed
  const needsPayment = answers.get("feat_006")?.value;
  if (needsPayment && needsPayment !== "No") {
    stories.push({
      id: `US${storyId++}`,
      role: "user",
      goal: "make a payment securely",
      benefit: "complete my purchase",
      acceptanceCriteria: [
        "Given I am ready to checkout",
        "When I enter payment details",
        "Then the payment should be processed securely",
        "And I should receive confirmation",
      ],
      priority: "must_have",
    });
  }

  return stories;
}

/**
 * Generate personas from answers
 */
export function generatePersonas(answers: Map<string, Answer>): Persona[] {
  const personas: Persona[] = [];

  const primaryUsers = answers.get("usr_001")?.value as string;
  const devices = answers.get("usr_003")?.value as string;

  if (!primaryUsers) return personas;

  // Parse primary users into personas
  const userTypes = primaryUsers.split(/,|and|&/).filter((u) => u.trim());

  userTypes.forEach((userType) => {
    const persona: Persona = {
      name: userType.trim(),
      role: userType.trim(),
      goals: [],
      painPoints: [],
      technicalProficiency: "intermediate",
      devices: devices ? [devices] : ["Desktop/laptop"],
      frequency: "weekly",
    };

    // Infer goals from business goal
    const businessGoal = answers.get("bus_001")?.value as string;
    if (businessGoal) {
      persona.goals.push(businessGoal.substring(0, 100));
    }

    // Infer pain points
    if (userType.toLowerCase().includes("enterprise") || userType.toLowerCase().includes("business")) {
      persona.painPoints.push("Complex workflows", "Need for efficiency");
      persona.technicalProficiency = "intermediate";
    } else if (userType.toLowerCase().includes("consumer") || userType.toLowerCase().includes("customer")) {
      persona.painPoints.push("Ease of use", "Quick access");
      persona.technicalProficiency = "beginner";
    } else if (userType.toLowerCase().includes("developer") || userType.toLowerCase().includes("technical")) {
      persona.painPoints.push("API documentation", "Integration complexity");
      persona.technicalProficiency = "advanced";
    }

    personas.push(persona);
  });

  return personas;
}

/**
 * Generate acceptance criteria in BDD format
 */
export function generateAcceptanceCriteria(requirement: Requirement): AcceptanceCriteria[] {
  const criteria: AcceptanceCriteria[] = [];

  // Generate scenarios based on requirement type
  if (requirement.type === "functional") {
    criteria.push({
      scenario: `${requirement.title} - Happy Path`,
      given: ["User is authenticated", "System is operational"],
      when: `User performs ${requirement.title}`,
      then: ["Action completes successfully", "User sees confirmation", "Data is persisted"],
    });

    criteria.push({
      scenario: `${requirement.title} - Error Handling`,
      given: ["User is authenticated", "Invalid input provided"],
      when: `User attempts ${requirement.title}`,
      then: ["Validation error is shown", "User is guided to fix", "No data corruption occurs"],
    });
  }

  if (requirement.type === "non_functional") {
    if (requirement.title.toLowerCase().includes("performance")) {
      criteria.push({
        scenario: "Performance Requirements",
        given: ["System is under normal load"],
        when: "User performs action",
        then: ["Response time is < 2 seconds", "UI remains responsive"],
      });
    }

    if (requirement.title.toLowerCase().includes("security")) {
      criteria.push({
        scenario: "Security Requirements",
        given: ["Security measures are in place"],
        when: "Unauthorized access is attempted",
        then: ["Access is denied", "Attempt is logged", "User sees appropriate error"],
      });
    }
  }

  return criteria;
}

/**
 * Prioritize requirements using MoSCoW method
 */
export function prioritizeRequirements(requirements: Requirement[]): {
  mustHave: Requirement[];
  shouldHave: Requirement[];
  couldHave: Requirement[];
  wontHave: Requirement[];
} {
  return {
    mustHave: requirements.filter((r) => r.priority === "must_have"),
    shouldHave: requirements.filter((r) => r.priority === "should_have"),
    couldHave: requirements.filter((r) => r.priority === "could_have"),
    wontHave: requirements.filter((r) => r.priority === "wont_have"),
  };
}

/**
 * Extract requirements from discovery answers
 */
export function extractRequirements(answers: Map<string, Answer>, projectType: ProjectType): Requirement[] {
  const requirements: Requirement[] = [];
  let reqId = 1;

  // Functional requirements from features
  const features = answers.get("feat_001")?.value as string;
  if (features) {
    const featureList = features.split(/\n|;/).filter((f) => f.trim());

    featureList.forEach((feature, index) => {
      requirements.push({
        id: `REQ-F-${reqId++}`,
        type: "functional",
        priority: index < 3 ? "must_have" : "should_have",
        title: feature.trim(),
        description: `Implement ${feature.trim()}`,
        acceptanceCriteria: [
          "Feature is implemented according to spec",
          "Feature is tested and works correctly",
          "Feature is accessible and user-friendly",
        ],
        source: "feat_001",
      });
    });
  }

  // Authentication requirement
  const needsAuth = answers.get("usr_005")?.value;
  if (needsAuth === "Yes - required") {
    const authMethods = answers.get("usr_005_a")?.value as string | string[];
    requirements.push({
      id: `REQ-F-${reqId++}`,
      type: "functional",
      priority: "must_have",
      title: "User Authentication",
      description: `Implement authentication with: ${Array.isArray(authMethods) ? authMethods.join(", ") : authMethods || "email/password"}`,
      acceptanceCriteria: [
        "Users can sign up with valid credentials",
        "Users can log in with correct credentials",
        "Invalid credentials are rejected",
        "Sessions are managed securely",
      ],
      source: "usr_005",
    });
  }

  // Search requirement
  const needsSearch = answers.get("feat_003")?.value;
  if (needsSearch && needsSearch !== "No") {
    requirements.push({
      id: `REQ-F-${reqId++}`,
      type: "functional",
      priority: "should_have",
      title: `Search Functionality (${needsSearch})`,
      description: "Implement search feature",
      acceptanceCriteria: [
        "Users can search for content",
        "Search returns relevant results",
        "Search is performant (< 1s)",
      ],
      source: "feat_003",
    });
  }

  // File upload requirement
  const needsUpload = answers.get("feat_004")?.value;
  if (needsUpload && needsUpload !== "No") {
    requirements.push({
      id: `REQ-F-${reqId++}`,
      type: "functional",
      priority: "should_have",
      title: `File Upload (${needsUpload})`,
      description: "Implement file upload functionality",
      acceptanceCriteria: [
        "Users can upload files",
        "File type validation works",
        "File size limits are enforced",
        "Uploads are secure",
      ],
      source: "feat_004",
    });
  }

  // Payment requirement
  const needsPayment = answers.get("feat_006")?.value;
  if (needsPayment && needsPayment !== "No") {
    requirements.push({
      id: `REQ-F-${reqId++}`,
      type: "functional",
      priority: "must_have",
      title: `Payment Processing (${needsPayment})`,
      description: "Implement secure payment processing",
      acceptanceCriteria: [
        "Payments are processed securely",
        "PCI compliance is maintained",
        "Payment failures are handled gracefully",
        "Users receive confirmation",
      ],
      source: "feat_006",
      risks: ["PCI compliance required", "Payment provider integration complexity"],
    });
  }

  // Non-functional requirements
  const performance = answers.get("tech_004")?.value;
  if (performance) {
    requirements.push({
      id: `REQ-NF-${reqId++}`,
      type: "non_functional",
      priority: "must_have",
      title: `Performance: ${performance}`,
      description: "Meet performance requirements",
      acceptanceCriteria: ["Performance targets are met", "Load testing passes"],
      source: "tech_004",
    });
  }

  const security = answers.get("tech_005")?.value as string;
  if (security) {
    const securityLevel = security.toLowerCase().includes("maximum") ? "maximum" : security.toLowerCase().includes("enterprise") ? "high" : "standard";

    requirements.push({
      id: `REQ-NF-${reqId++}`,
      type: "non_functional",
      priority: "must_have",
      title: `Security Level: ${security}`,
      description: `Implement ${securityLevel} security measures`,
      acceptanceCriteria: [
        "Security audit passes",
        "Vulnerabilities are addressed",
        "Data is encrypted",
        "Access control is enforced",
      ],
      source: "tech_005",
    });
  }

  // Web3-specific requirements
  if (projectType === "web3_dapp") {
    const blockchain = answers.get("web3_001")?.value as string;
    if (blockchain) {
      requirements.push({
        id: `REQ-F-${reqId++}`,
        type: "functional",
        priority: "must_have",
        title: `Blockchain Integration: ${blockchain}`,
        description: "Deploy smart contracts and integrate with blockchain",
        acceptanceCriteria: [
          "Smart contracts deploy successfully",
          "Wallet connection works",
          "Transactions are processed",
          "Gas optimization is implemented",
        ],
        source: "web3_001",
      });
    }
  }

  // Mobile-specific requirements
  if (projectType === "mobile_app") {
    const platforms = answers.get("mobile_001")?.value as string;
    if (platforms) {
      requirements.push({
        id: `REQ-T-${reqId++}`,
        type: "technical",
        priority: "must_have",
        title: `Mobile Platforms: ${platforms}`,
        description: "Support specified mobile platforms",
        acceptanceCriteria: [
          "App runs on target platforms",
          "Platform-specific features work",
          "App passes app store review",
        ],
        source: "mobile_001",
      });
    }
  }

  return requirements;
}

/**
 * Generate requirements traceability matrix
 */
export function generateTraceabilityMatrix(
  requirements: Requirement[],
  userStories: UserStory[]
): Array<{
  requirement: string;
  userStories: string[];
  testCases: string[];
  implementationFiles: string[];
}> {
  const matrix: Array<{
    requirement: string;
    userStories: string[];
    testCases: string[];
    implementationFiles: string[];
  }> = [];

  requirements.forEach((req) => {
    // Match requirements to user stories by keywords
    const relatedStories = userStories.filter((story) => {
      const reqKeywords = req.title.toLowerCase().split(" ");
      const storyText = (story.goal + " " + story.benefit).toLowerCase();
      return reqKeywords.some((keyword) => keyword.length > 3 && storyText.includes(keyword));
    });

    matrix.push({
      requirement: req.id,
      userStories: relatedStories.map((s) => s.id),
      testCases: [], // To be populated by Ethan (QA)
      implementationFiles: [], // To be populated by Liam/Noah
    });
  });

  return matrix;
}

/**
 * Estimate project complexity and effort
 */
export function estimateComplexity(requirements: Requirement[]): {
  complexity: "low" | "medium" | "high" | "very_high";
  estimatedWeeks: number;
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  // Count requirements by type
  const functional = requirements.filter((r) => r.type === "functional").length;
  const nonFunctional = requirements.filter((r) => r.type === "non_functional").length;

  score += functional * 2;
  score += nonFunctional * 1;

  // Check for complex features
  const hasAuth = requirements.some((r) => r.title.toLowerCase().includes("auth"));
  const hasPayment = requirements.some((r) => r.title.toLowerCase().includes("payment"));
  const hasRealtime = requirements.some((r) => r.title.toLowerCase().includes("real-time"));
  const hasWeb3 = requirements.some((r) => r.title.toLowerCase().includes("blockchain"));

  if (hasAuth) {
    score += 5;
    factors.push("Authentication system");
  }
  if (hasPayment) {
    score += 10;
    factors.push("Payment processing");
  }
  if (hasRealtime) {
    score += 8;
    factors.push("Real-time features");
  }
  if (hasWeb3) {
    score += 15;
    factors.push("Blockchain integration");
  }

  // Determine complexity
  let complexity: "low" | "medium" | "high" | "very_high";
  let estimatedWeeks: number;

  if (score < 15) {
    complexity = "low";
    estimatedWeeks = 2;
  } else if (score < 30) {
    complexity = "medium";
    estimatedWeeks = 4;
  } else if (score < 50) {
    complexity = "high";
    estimatedWeeks = 8;
  } else {
    complexity = "very_high";
    estimatedWeeks = 12;
  }

  return { complexity, estimatedWeeks, factors };
}
