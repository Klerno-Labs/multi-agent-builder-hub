/**
 * Risk Assessment - Identify and assess project risks during discovery
 */

import { ProjectType } from "../orchestration/pipeline-manager";
import { Requirement } from "./requirements-elicitation";
import { Answer } from "./question-framework";

export type RiskCategory = "technical" | "business" | "timeline" | "resource" | "security" | "compliance" | "integration";
export type RiskProbability = "low" | "medium" | "high";
export type RiskImpact = "low" | "medium" | "high" | "critical";

export interface Risk {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  score: number; // 1-25 (probability × impact)
  mitigationStrategy: string[];
  contingencyPlan?: string;
  owner?: string;
  status: "identified" | "mitigated" | "accepted" | "avoided";
}

export interface RiskMatrix {
  critical: Risk[]; // High probability × High impact
  high: Risk[]; // Medium/High probability × High impact OR High probability × Medium impact
  medium: Risk[]; // Various medium combinations
  low: Risk[]; // Low probability or Low impact
}

/**
 * Calculate risk score
 */
export function calculateRiskScore(probability: RiskProbability, impact: RiskImpact): number {
  const probScores = { low: 1, medium: 3, high: 5 };
  const impactScores = { low: 1, medium: 3, high: 5, critical: 5 };

  return probScores[probability] * impactScores[impact];
}

/**
 * Identify risks from discovery answers
 */
export function identifyRisks(
  answers: Map<string, Answer>,
  requirements: Requirement[],
  projectType: ProjectType
): Risk[] {
  const risks: Risk[] = [];
  let riskId = 1;

  // Timeline risks
  const timeline = answers.get("bus_003")?.value as string;
  if (timeline === "1-2 weeks (MVP)" || timeline === "1 month") {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "timeline",
      title: "Aggressive Timeline",
      description: `Timeline of ${timeline} may be too aggressive for the scope`,
      probability: "high",
      impact: "high",
      score: 25,
      mitigationStrategy: [
        "Prioritize must-have features only",
        "Use pre-built components and templates",
        "Allocate additional resources if needed",
        "Set clear scope boundaries",
      ],
      contingencyPlan: "Extend timeline or reduce scope if blockers occur",
      status: "identified",
    });
  }

  // Budget risks
  const budget = answers.get("bus_004")?.value as string;
  if (budget === "< $10k" || budget === "Not specified") {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "resource",
      title: "Limited Budget",
      description: "Budget may be insufficient for full scope",
      probability: "medium",
      impact: "high",
      score: 15,
      mitigationStrategy: [
        "Use open-source solutions",
        "Leverage free tiers of services",
        "Minimize third-party integrations",
        "Focus on MVP features",
      ],
      status: "identified",
    });
  }

  // Authentication complexity
  const needsAuth = answers.get("usr_005")?.value;
  const authMethods = answers.get("usr_005_a")?.value as string | string[];
  if (needsAuth === "Yes - required" && Array.isArray(authMethods) && authMethods.length > 2) {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "technical",
      title: "Complex Authentication Requirements",
      description: `Multiple auth methods (${authMethods.join(", ")}) increase complexity`,
      probability: "medium",
      impact: "medium",
      score: 9,
      mitigationStrategy: [
        "Use authentication service (Auth0, Firebase)",
        "Implement in phases (basic auth first)",
        "Allocate extra testing time",
        "Plan for OAuth provider changes",
      ],
      status: "identified",
    });
  }

  // Payment processing risks
  const needsPayment = answers.get("feat_006")?.value;
  if (needsPayment && needsPayment !== "No") {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "compliance",
      title: "PCI Compliance Requirements",
      description: "Payment processing requires PCI-DSS compliance",
      probability: "high",
      impact: "critical",
      score: 25,
      mitigationStrategy: [
        "Use certified payment gateway (Stripe, PayPal)",
        "Never store card details directly",
        "Use tokenization for recurring payments",
        "Implement secure HTTPS everywhere",
        "Regular security audits",
      ],
      contingencyPlan: "Use hosted payment pages to offload compliance burden",
      status: "identified",
    });
  }

  // Performance risks
  const expectedUsers = answers.get("usr_002")?.value as string;
  if (expectedUsers === "100,000+" || expectedUsers === "10,000-100,000") {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "technical",
      title: "Scalability Requirements",
      description: `High user volume (${expectedUsers}) requires careful architecture`,
      probability: "high",
      impact: "high",
      score: 25,
      mitigationStrategy: [
        "Design for horizontal scaling from start",
        "Implement caching strategy (Redis)",
        "Use CDN for static assets",
        "Database read replicas",
        "Load testing before launch",
        "Auto-scaling infrastructure",
      ],
      status: "identified",
    });
  }

  // Real-time feature risks
  const needsRealtime = answers.get("feat_005")?.value;
  if (needsRealtime && needsRealtime !== "No") {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "technical",
      title: "Real-time Implementation Complexity",
      description: `Real-time features (${needsRealtime}) add complexity`,
      probability: "medium",
      impact: "medium",
      score: 9,
      mitigationStrategy: [
        "Use managed real-time service (Pusher, Ably)",
        "Implement WebSocket fallbacks",
        "Plan for connection recovery",
        "Load test concurrent connections",
      ],
      status: "identified",
    });
  }

  // Integration risks
  const needsIntegrations = answers.get("int_001")?.value;
  if (needsIntegrations === "Yes - I'll list them") {
    const integrationList = answers.get("int_001_a")?.value as string;
    const integrationCount = integrationList ? integrationList.split(/,|;|\n/).length : 0;

    if (integrationCount > 3) {
      risks.push({
        id: `RISK-${riskId++}`,
        category: "integration",
        title: "Multiple Third-Party Dependencies",
        description: `${integrationCount} integrations create dependency and maintenance risks`,
        probability: "high",
        impact: "medium",
        score: 15,
        mitigationStrategy: [
          "Create abstraction layers for integrations",
          "Implement circuit breakers for API calls",
          "Plan for API changes and versioning",
          "Have fallback mechanisms",
          "Monitor third-party service status",
        ],
        status: "identified",
      });
    }
  }

  // Security level risks
  const securityLevel = answers.get("tech_005")?.value as string;
  if (securityLevel?.toLowerCase().includes("maximum") || securityLevel?.toLowerCase().includes("enterprise")) {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "security",
      title: "High Security Requirements",
      description: `${securityLevel} security requires additional measures and audits`,
      probability: "medium",
      impact: "critical",
      score: 15,
      mitigationStrategy: [
        "Engage security expert early",
        "Plan for security audits",
        "Implement security monitoring (SIEM)",
        "Use security scanning tools",
        "Regular penetration testing",
        "Security training for team",
      ],
      status: "identified",
    });
  }

  // Compliance risks
  const compliance = answers.get("con_002")?.value as string;
  if (compliance && compliance.trim().length > 0) {
    const complianceItems = compliance.split(/,|;|\n/).filter((c) => c.trim());

    complianceItems.forEach((item) => {
      risks.push({
        id: `RISK-${riskId++}`,
        category: "compliance",
        title: `${item.trim()} Compliance`,
        description: `Must comply with ${item.trim()} regulations`,
        probability: "high",
        impact: "critical",
        score: 25,
        mitigationStrategy: [
          "Consult compliance expert",
          "Implement required controls",
          "Document compliance measures",
          "Regular compliance audits",
          "Staff training on regulations",
        ],
        contingencyPlan: "Allocate budget for compliance consulting",
        status: "identified",
      });
    });
  }

  // Web3-specific risks
  if (projectType === "web3_dapp") {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "security",
      title: "Smart Contract Vulnerabilities",
      description: "Smart contracts are immutable and vulnerable to exploits",
      probability: "medium",
      impact: "critical",
      score: 15,
      mitigationStrategy: [
        "Professional smart contract audit (Trail of Bits, OpenZeppelin)",
        "Extensive testing with Hardhat/Foundry",
        "Fuzzing tests for edge cases",
        "Bug bounty program before mainnet",
        "Gradual rollout with limits",
        "Emergency pause functionality",
      ],
      contingencyPlan: "Insurance for smart contract bugs (Nexus Mutual)",
      status: "identified",
    });

    risks.push({
      id: `RISK-${riskId++}`,
      category: "technical",
      title: "Gas Price Volatility",
      description: "High gas prices can make the DApp unusable",
      probability: "high",
      impact: "high",
      score: 25,
      mitigationStrategy: [
        "Optimize contracts for gas efficiency",
        "Consider Layer 2 solutions (Polygon, Arbitrum)",
        "Implement gas price monitoring",
        "Batch transactions where possible",
        "User education on gas costs",
      ],
      status: "identified",
    });
  }

  // Mobile-specific risks
  if (projectType === "mobile_app") {
    const platforms = answers.get("mobile_001")?.value as string;

    if (platforms === "Both iOS and Android") {
      risks.push({
        id: `RISK-${riskId++}`,
        category: "timeline",
        title: "Multi-Platform Development",
        description: "Supporting both iOS and Android doubles effort",
        probability: "high",
        impact: "medium",
        score: 15,
        mitigationStrategy: [
          "Use cross-platform framework (React Native, Flutter)",
          "Share business logic between platforms",
          "Parallel development teams",
          "Prioritize one platform for MVP",
        ],
        status: "identified",
      });
    }

    risks.push({
      id: `RISK-${riskId++}`,
      category: "compliance",
      title: "App Store Review Process",
      description: "App store rejections can delay launch",
      probability: "medium",
      impact: "medium",
      score: 9,
      mitigationStrategy: [
        "Follow app store guidelines strictly",
        "Test on actual devices",
        "Prepare all required metadata early",
        "Plan for review time (1-2 weeks)",
        "Have appeal process ready",
      ],
      status: "identified",
    });
  }

  // No existing tech stack (greenfield risk)
  const techPreference = answers.get("tech_001")?.value as string;
  if (techPreference === "Use latest/best practices (recommended)") {
    // Lower risk - good choice
  } else if (techPreference === "Match existing infrastructure") {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "technical",
      title: "Legacy System Integration",
      description: "Integrating with existing infrastructure may require compromises",
      probability: "medium",
      impact: "medium",
      score: 9,
      mitigationStrategy: [
        "Document existing infrastructure thoroughly",
        "Create abstraction layers",
        "Plan for data migration carefully",
        "Gradual migration strategy",
      ],
      status: "identified",
    });
  }

  // Undefined success metrics
  const successMetrics = answers.get("bus_005")?.value as string;
  if (!successMetrics || successMetrics.length < 15) {
    risks.push({
      id: `RISK-${riskId++}`,
      category: "business",
      title: "Unclear Success Criteria",
      description: "Without clear metrics, project success is subjective",
      probability: "high",
      impact: "medium",
      score: 15,
      mitigationStrategy: [
        "Define SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)",
        "Establish KPIs early",
        "Implement analytics from day 1",
        "Regular stakeholder alignment",
      ],
      status: "identified",
    });
  }

  return risks;
}

/**
 * Categorize risks into risk matrix
 */
export function categorizeRisks(risks: Risk[]): RiskMatrix {
  const matrix: RiskMatrix = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  risks.forEach((risk) => {
    if (risk.score >= 20) {
      matrix.critical.push(risk);
    } else if (risk.score >= 12) {
      matrix.high.push(risk);
    } else if (risk.score >= 6) {
      matrix.medium.push(risk);
    } else {
      matrix.low.push(risk);
    }
  });

  return matrix;
}

/**
 * Generate risk register document
 */
export function generateRiskRegister(risks: Risk[]): string {
  const matrix = categorizeRisks(risks);

  let register = "# Risk Register\n\n";

  register += `**Total Risks**: ${risks.length}\n`;
  register += `- Critical: ${matrix.critical.length}\n`;
  register += `- High: ${matrix.high.length}\n`;
  register += `- Medium: ${matrix.medium.length}\n`;
  register += `- Low: ${matrix.low.length}\n\n`;

  register += "---\n\n";

  const sections = [
    { title: "🔴 Critical Risks", risks: matrix.critical },
    { title: "🟠 High Risks", risks: matrix.high },
    { title: "🟡 Medium Risks", risks: matrix.medium },
    { title: "🟢 Low Risks", risks: matrix.low },
  ];

  sections.forEach((section) => {
    if (section.risks.length > 0) {
      register += `## ${section.title}\n\n`;

      section.risks.forEach((risk) => {
        register += `### ${risk.id}: ${risk.title}\n\n`;
        register += `**Category**: ${risk.category}\n`;
        register += `**Probability**: ${risk.probability} | **Impact**: ${risk.impact} | **Score**: ${risk.score}/25\n\n`;
        register += `**Description**: ${risk.description}\n\n`;

        register += `**Mitigation Strategy**:\n`;
        risk.mitigationStrategy.forEach((strategy) => {
          register += `- ${strategy}\n`;
        });
        register += "\n";

        if (risk.contingencyPlan) {
          register += `**Contingency Plan**: ${risk.contingencyPlan}\n\n`;
        }

        register += `**Status**: ${risk.status}\n\n`;
        register += "---\n\n";
      });
    }
  });

  return register;
}

/**
 * Generate risk probability-impact matrix (visual)
 */
export function generateRiskMatrix(risks: Risk[]): string {
  let matrix = "# Risk Probability-Impact Matrix\n\n";
  matrix += "```\n";
  matrix += "Impact →\n";
  matrix += "Probability ↓  Low    Medium   High    Critical\n";
  matrix += "───────────────────────────────────────────────\n";

  const grid = {
    high: { low: 0, medium: 0, high: 0, critical: 0 },
    medium: { low: 0, medium: 0, high: 0, critical: 0 },
    low: { low: 0, medium: 0, high: 0, critical: 0 },
  };

  risks.forEach((risk) => {
    if (risk.impact === "critical") {
      grid[risk.probability].critical++;
    } else {
      grid[risk.probability][risk.impact]++;
    }
  });

  Object.entries(grid).forEach(([prob, impacts]) => {
    matrix += `${prob.padEnd(13)} `;
    matrix += `${String(impacts.low).padEnd(7)}`;
    matrix += `${String(impacts.medium).padEnd(9)}`;
    matrix += `${String(impacts.high).padEnd(8)}`;
    matrix += `${impacts.critical || ""}\n`;
  });

  matrix += "```\n\n";
  matrix += "**Legend**: Numbers represent count of risks in each category\n";

  return matrix;
}

/**
 * Prioritize risks for immediate attention
 */
export function getTopRisks(risks: Risk[], count: number = 5): Risk[] {
  return risks.sort((a, b) => b.score - a.score).slice(0, count);
}

/**
 * Generate risk mitigation plan
 */
export function generateMitigationPlan(risks: Risk[]): {
  immediate: Risk[];
  shortTerm: Risk[];
  ongoing: Risk[];
} {
  const matrix = categorizeRisks(risks);

  return {
    immediate: matrix.critical, // Address before project starts
    shortTerm: matrix.high, // Address in first sprint
    ongoing: [...matrix.medium, ...matrix.low], // Monitor throughout project
  };
}

/**
 * Calculate overall project risk score
 */
export function calculateOverallRisk(risks: Risk[]): {
  score: number; // 0-100
  level: "low" | "medium" | "high" | "critical";
  recommendation: string;
} {
  if (risks.length === 0) {
    return {
      score: 0,
      level: "low",
      recommendation: "No significant risks identified. Proceed with confidence.",
    };
  }

  // Weight by severity
  const totalScore = risks.reduce((sum, risk) => sum + risk.score, 0);
  const avgScore = totalScore / risks.length;
  const maxPossibleAvg = 25;

  const normalizedScore = Math.round((avgScore / maxPossibleAvg) * 100);

  let level: "low" | "medium" | "high" | "critical";
  let recommendation: string;

  if (normalizedScore < 25) {
    level = "low";
    recommendation = "Low overall risk. Standard project management practices should suffice.";
  } else if (normalizedScore < 50) {
    level = "medium";
    recommendation = "Medium risk level. Implement recommended mitigation strategies and monitor closely.";
  } else if (normalizedScore < 75) {
    level = "high";
    recommendation = "High risk level. Prioritize risk mitigation before starting development. Consider reducing scope or extending timeline.";
  } else {
    level = "critical";
    recommendation = "Critical risk level. Strongly recommend project reassessment. Consider phased approach or significant scope reduction.";
  }

  return { score: normalizedScore, level, recommendation };
}
