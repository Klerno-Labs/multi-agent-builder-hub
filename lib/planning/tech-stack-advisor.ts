/**
 * Tech Stack Advisor - Technology recommendations and Architecture Decision Records
 */

import { ProjectType } from "../orchestration/pipeline-manager";
import { Requirement } from "../discovery/requirements-elicitation";
import { TechStack } from "./spec-templates";

export interface TechRecommendation {
  category: "frontend" | "backend" | "database" | "infrastructure" | "testing" | "devtools";
  options: TechOption[];
  recommended: string; // Name of recommended option
  reasoning: string;
}

export interface TechOption {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  useCases: string[];
  popularity: "high" | "medium" | "low";
  maturity: "stable" | "mature" | "experimental";
  learningCurve: "easy" | "moderate" | "steep";
  performance: "excellent" | "good" | "fair";
  community: "large" | "medium" | "small";
}

export interface ADR {
  id: string;
  title: string;
  date: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
    risks: string[];
  };
  alternatives: Alternative[];
}

export interface Alternative {
  name: string;
  pros: string[];
  cons: string[];
  rejectionReason: string;
}

export interface DependencyAnalysis {
  package: string;
  version: string;
  purpose: string;
  alternatives: string[];
  size: string; // Bundle size impact
  security: {
    vulnerabilities: number;
    lastAudit: string;
  };
  maintenance: {
    lastUpdate: string;
    weeklyDownloads: number;
    openIssues: number;
  };
  recommendation: "use" | "consider_alternative" | "avoid";
}

/**
 * Generate tech stack recommendations based on project requirements
 */
export function generateTechRecommendations(
  projectType: ProjectType,
  requirements: Requirement[],
  constraints?: {
    teamExpertise?: string[];
    budget?: "low" | "medium" | "high";
    timeline?: "fast" | "moderate" | "flexible";
  }
): TechRecommendation[] {
  const recommendations: TechRecommendation[] = [];

  // Frontend recommendations
  if (projectType !== "database") {
    recommendations.push(getFrontendRecommendation(projectType, requirements, constraints));
  }

  // Backend recommendations
  if (projectType !== "website") {
    recommendations.push(getBackendRecommendation(projectType, requirements, constraints));
  }

  // Database recommendations
  if (projectType !== "website") {
    recommendations.push(getDatabaseRecommendation(projectType, requirements, constraints));
  }

  // Infrastructure recommendations
  recommendations.push(getInfrastructureRecommendation(projectType, constraints));

  // Testing recommendations
  recommendations.push(getTestingRecommendation(projectType));

  return recommendations;
}

/**
 * Frontend framework recommendation
 */
function getFrontendRecommendation(
  projectType: ProjectType,
  requirements: Requirement[],
  constraints?: any
): TechRecommendation {
  const options: TechOption[] = [
    {
      name: "Next.js",
      description: "React framework with SSR, SSG, and excellent developer experience",
      pros: [
        "Built-in SSR and SSG",
        "Excellent SEO",
        "File-based routing",
        "API routes included",
        "Great documentation",
        "Vercel deployment optimization",
      ],
      cons: ["Learning curve for advanced features", "Can be overkill for simple sites", "Vendor lock-in to some degree"],
      useCases: ["Web apps", "Marketing sites", "E-commerce", "Dashboards"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "moderate",
      performance: "excellent",
      community: "large",
    },
    {
      name: "Vite + React",
      description: "Lightning-fast build tool with React for SPAs",
      pros: ["Extremely fast HMR", "Simple configuration", "Great DX", "Flexible", "Smaller bundle size"],
      cons: ["No built-in SSR", "Manual routing setup", "Less opinionated", "SEO requires extra work"],
      useCases: ["SPAs", "Internal tools", "Dashboards", "Web apps without SEO needs"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "easy",
      performance: "excellent",
      community: "large",
    },
    {
      name: "Remix",
      description: "Full-stack React framework focused on web fundamentals",
      pros: [
        "Excellent data loading",
        "Progressive enhancement",
        "Great UX",
        "Built-in error boundaries",
        "Fast page transitions",
      ],
      cons: ["Smaller ecosystem", "Newer framework", "Less third-party integrations", "Steeper learning curve"],
      useCases: ["Web apps", "Content-heavy sites", "Forms-heavy applications"],
      popularity: "medium",
      maturity: "stable",
      learningCurve: "steep",
      performance: "excellent",
      community: "medium",
    },
  ];

  // Determine recommendation based on project type
  let recommended = "Next.js";
  let reasoning = "Best balance of features, performance, and developer experience. Excellent for SEO and has built-in API routes.";

  if (projectType === "website") {
    recommended = "Next.js";
    reasoning = "Static site generation and SEO capabilities make Next.js ideal for marketing websites.";
  } else if (projectType === "web_app") {
    const needsSSR = requirements.some((r) => r.title.toLowerCase().includes("seo"));
    if (needsSSR) {
      recommended = "Next.js";
      reasoning = "SSR capabilities are essential for SEO. Next.js provides this out of the box.";
    } else {
      recommended = "Vite + React";
      reasoning = "For SPAs without SEO requirements, Vite offers faster builds and simpler setup.";
    }
  }

  return {
    category: "frontend",
    options,
    recommended,
    reasoning,
  };
}

/**
 * Backend framework recommendation
 */
function getBackendRecommendation(
  projectType: ProjectType,
  requirements: Requirement[],
  constraints?: any
): TechRecommendation {
  const options: TechOption[] = [
    {
      name: "Express",
      description: "Minimal and flexible Node.js web framework",
      pros: ["Simple and unopinionated", "Huge ecosystem", "Easy to learn", "Lightweight", "Great for REST APIs"],
      cons: ["Manual setup for everything", "No built-in structure", "Easy to create messy code", "Missing modern features"],
      useCases: ["REST APIs", "Microservices", "Simple backends", "Prototypes"],
      popularity: "high",
      maturity: "mature",
      learningCurve: "easy",
      performance: "good",
      community: "large",
    },
    {
      name: "Fastify",
      description: "Fast and low-overhead Node.js framework",
      pros: [
        "Excellent performance",
        "Built-in schema validation",
        "Plugin architecture",
        "TypeScript support",
        "Modern async/await",
      ],
      cons: ["Smaller community than Express", "Fewer plugins", "Less learning resources"],
      useCases: ["High-performance APIs", "Microservices", "Real-time applications"],
      popularity: "medium",
      maturity: "stable",
      learningCurve: "moderate",
      performance: "excellent",
      community: "medium",
    },
    {
      name: "NestJS",
      description: "Enterprise-grade Node.js framework with TypeScript",
      pros: [
        "Excellent TypeScript support",
        "Modular architecture",
        "Built-in DI",
        "Great for large teams",
        "Angular-like structure",
        "Comprehensive documentation",
      ],
      cons: ["Steep learning curve", "Verbose", "Overkill for simple projects", "Slower than lightweight frameworks"],
      useCases: ["Enterprise applications", "Large-scale APIs", "Microservices", "GraphQL APIs"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "steep",
      performance: "good",
      community: "large",
    },
  ];

  let recommended = "Express";
  let reasoning = "Simple, flexible, and well-documented. Great for getting started quickly.";

  const isComplex = requirements.length > 15;
  const needsPerformance = requirements.some((r) => r.title.toLowerCase().includes("performance"));
  const isEnterprise = requirements.some((r) => r.title.toLowerCase().includes("enterprise"));

  if (isEnterprise || isComplex) {
    recommended = "NestJS";
    reasoning = "Enterprise-grade architecture with TypeScript support. Scales well for large teams and complex applications.";
  } else if (needsPerformance) {
    recommended = "Fastify";
    reasoning = "Best performance among Node.js frameworks. Built-in validation and modern async handling.";
  }

  return {
    category: "backend",
    options,
    recommended,
    reasoning,
  };
}

/**
 * Database recommendation
 */
function getDatabaseRecommendation(
  projectType: ProjectType,
  requirements: Requirement[],
  constraints?: any
): TechRecommendation {
  const options: TechOption[] = [
    {
      name: "PostgreSQL",
      description: "Advanced open-source relational database",
      pros: [
        "ACID compliance",
        "Excellent performance",
        "JSON support",
        "Rich feature set",
        "Great for complex queries",
        "Strong community",
      ],
      cons: ["More complex setup", "Steeper learning curve", "Requires more resources"],
      useCases: ["Complex data models", "Transactions", "Analytics", "Enterprise apps"],
      popularity: "high",
      maturity: "mature",
      learningCurve: "moderate",
      performance: "excellent",
      community: "large",
    },
    {
      name: "MongoDB",
      description: "Document-oriented NoSQL database",
      pros: [
        "Flexible schema",
        "Easy to scale horizontally",
        "Great for prototyping",
        "JSON-native",
        "Fast development",
        "Good for unstructured data",
      ],
      cons: ["No ACID guarantees (by default)", "Can lead to data inconsistencies", "Not ideal for complex relations"],
      useCases: ["Rapid prototyping", "Unstructured data", "Real-time apps", "Content management"],
      popularity: "high",
      maturity: "mature",
      learningCurve: "easy",
      performance: "good",
      community: "large",
    },
    {
      name: "Prisma + PostgreSQL",
      description: "Type-safe ORM with PostgreSQL",
      pros: [
        "Excellent TypeScript support",
        "Auto-generated types",
        "Great DX",
        "Migration system",
        "Prisma Studio for data viewing",
      ],
      cons: ["Additional abstraction layer", "Performance overhead", "Learning Prisma schema"],
      useCases: ["TypeScript projects", "Type-safe development", "Rapid development"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "moderate",
      performance: "good",
      community: "large",
    },
  ];

  let recommended = "Prisma + PostgreSQL";
  let reasoning = "Best developer experience with TypeScript. Type-safe queries and excellent migration system.";

  if (projectType === "web3_dapp") {
    recommended = "MongoDB";
    reasoning = "Flexible schema is ideal for blockchain data. Easier to adapt to changing contract structures.";
  }

  const needsTransactions = requirements.some((r) => r.title.toLowerCase().includes("payment") || r.title.toLowerCase().includes("transaction"));
  const needsComplexQueries = requirements.some((r) => r.title.toLowerCase().includes("report") || r.title.toLowerCase().includes("analytics"));

  if (needsTransactions || needsComplexQueries) {
    recommended = "Prisma + PostgreSQL";
    reasoning = "ACID compliance and complex query support are essential for transactions and analytics.";
  }

  return {
    category: "database",
    options,
    recommended,
    reasoning,
  };
}

/**
 * Infrastructure recommendation
 */
function getInfrastructureRecommendation(projectType: ProjectType, constraints?: any): TechRecommendation {
  const options: TechOption[] = [
    {
      name: "Vercel",
      description: "Optimized platform for Next.js and frontend frameworks",
      pros: ["Zero-config deployment", "Excellent DX", "Edge functions", "Fast CDN", "Generous free tier", "Great Next.js integration"],
      cons: ["Vendor lock-in", "Can get expensive at scale", "Limited backend capabilities"],
      useCases: ["Next.js apps", "Static sites", "Jamstack apps", "Frontend-focused projects"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "easy",
      performance: "excellent",
      community: "large",
    },
    {
      name: "AWS (ECS + RDS)",
      description: "Full-featured cloud platform",
      pros: ["Complete control", "Scalable", "Rich service ecosystem", "Enterprise-grade", "Cost-effective at scale"],
      cons: ["Complex setup", "Steep learning curve", "Can be expensive for small projects", "Configuration overhead"],
      useCases: ["Enterprise apps", "Complex backends", "High-scale applications", "Custom requirements"],
      popularity: "high",
      maturity: "mature",
      learningCurve: "steep",
      performance: "excellent",
      community: "large",
    },
    {
      name: "Railway / Render",
      description: "Simple PaaS for full-stack applications",
      pros: ["Simple deployment", "Database included", "Good DX", "Reasonable pricing", "Quick setup"],
      cons: ["Less control", "Fewer features than AWS", "Potential vendor lock-in", "Limited customization"],
      useCases: ["Startups", "MVPs", "Small to medium apps", "Quick deployments"],
      popularity: "medium",
      maturity: "stable",
      learningCurve: "easy",
      performance: "good",
      community: "medium",
    },
  ];

  let recommended = "Vercel";
  let reasoning = "Best for Next.js deployment with excellent DX and performance.";

  if (projectType === "website") {
    recommended = "Vercel";
    reasoning = "Perfect for static sites and Next.js. Zero-config deployment and excellent performance.";
  } else if (projectType === "web_app" || projectType === "mobile_app") {
    recommended = "Railway / Render";
    reasoning = "Simple full-stack deployment with database included. Great for MVPs and startups.";
  } else if (projectType === "database") {
    recommended = "AWS (ECS + RDS)";
    reasoning = "Full control over database configuration and scaling. Enterprise-grade reliability.";
  }

  return {
    category: "infrastructure",
    options,
    recommended,
    reasoning,
  };
}

/**
 * Testing framework recommendation
 */
function getTestingRecommendation(projectType: ProjectType): TechRecommendation {
  const options: TechOption[] = [
    {
      name: "Vitest",
      description: "Fast unit testing framework for Vite projects",
      pros: ["Extremely fast", "Jest-compatible API", "Great TypeScript support", "Built-in coverage", "ESM support"],
      cons: ["Newer than Jest", "Smaller ecosystem", "Best with Vite projects"],
      useCases: ["Unit tests", "Integration tests", "Vite/modern projects"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "easy",
      performance: "excellent",
      community: "large",
    },
    {
      name: "Playwright",
      description: "End-to-end testing framework",
      pros: [
        "Multi-browser support",
        "Great debugging",
        "Auto-wait",
        "Parallel execution",
        "Excellent documentation",
        "Visual comparison",
      ],
      cons: ["Slower than unit tests", "More complex setup", "Resource-intensive"],
      useCases: ["E2E tests", "Cross-browser testing", "Visual regression", "User workflows"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "moderate",
      performance: "good",
      community: "large",
    },
    {
      name: "React Testing Library",
      description: "Testing library for React components",
      pros: ["User-centric testing", "Great with Vitest/Jest", "Encourages best practices", "Simple API", "Well-documented"],
      cons: ["React-only", "Can be challenging for complex components", "Requires testing mindset shift"],
      useCases: ["React component tests", "Integration tests", "Accessibility testing"],
      popularity: "high",
      maturity: "stable",
      learningCurve: "moderate",
      performance: "good",
      community: "large",
    },
  ];

  const recommended = "Vitest + React Testing Library + Playwright";
  const reasoning = "Complete testing stack: Vitest for unit/integration, RTL for components, Playwright for E2E.";

  return {
    category: "testing",
    options,
    recommended,
    reasoning,
  };
}

/**
 * Generate Architecture Decision Record
 */
export function generateADR(
  title: string,
  context: string,
  decision: string,
  consequences: { positive: string[]; negative: string[]; risks: string[] },
  alternatives: Alternative[]
): ADR {
  return {
    id: `ADR-${Date.now()}`,
    title,
    date: new Date().toISOString().split("T")[0],
    status: "proposed",
    context,
    decision,
    consequences,
    alternatives,
  };
}

/**
 * Generate ADRs for major tech decisions
 */
export function generateTechStackADRs(techStack: TechStack, projectType: ProjectType): ADR[] {
  const adrs: ADR[] = [];

  // Frontend framework ADR
  if (techStack.frontend) {
    adrs.push(
      generateADR(
        `Frontend Framework: ${techStack.frontend.framework}`,
        `We need a modern frontend framework for our ${projectType} project that provides good developer experience, performance, and maintainability.`,
        `We have decided to use ${techStack.frontend.framework} as our frontend framework.`,
        {
          positive: [
            "Excellent developer experience with TypeScript support",
            "Large community and ecosystem",
            "Good performance out of the box",
            "Well-documented and widely adopted",
          ],
          negative: ["Learning curve for team members unfamiliar with the framework", "Potential vendor lock-in"],
          risks: ["Framework may change significantly in major versions", "Team expertise may need development"],
        },
        [
          {
            name: "Vue.js",
            pros: ["Easier learning curve", "Great documentation", "Flexible"],
            cons: ["Smaller ecosystem", "Less TypeScript support"],
            rejectionReason: "React ecosystem is larger and more mature for our use case",
          },
          {
            name: "Svelte",
            pros: ["Excellent performance", "Simple syntax", "Less boilerplate"],
            cons: ["Smaller ecosystem", "Less enterprise adoption", "Fewer libraries"],
            rejectionReason: "Ecosystem maturity concerns for enterprise application",
          },
        ]
      )
    );
  }

  // Backend framework ADR
  if (techStack.backend) {
    adrs.push(
      generateADR(
        `Backend Framework: ${techStack.backend.framework}`,
        `We need a scalable backend framework that supports our API requirements and integrates well with our chosen database.`,
        `We have decided to use ${techStack.backend.framework} as our backend framework.`,
        {
          positive: ["Proven scalability", "Good TypeScript support", "Rich ecosystem", "Excellent documentation"],
          negative: ["Additional learning required for advanced features", "Setup complexity"],
          risks: ["Performance bottlenecks at high scale may require optimization", "Framework migration would be costly"],
        },
        [
          {
            name: "Python FastAPI",
            pros: ["Excellent performance", "Automatic API docs", "Type safety"],
            cons: ["Different language from frontend", "Team needs Python expertise"],
            rejectionReason: "Preference for JavaScript/TypeScript consistency across stack",
          },
        ]
      )
    );
  }

  // Database ADR
  if (techStack.database) {
    adrs.push(
      generateADR(
        `Database: ${techStack.database.primary}`,
        `We need a reliable database solution that handles our data model and scales with our user base.`,
        `We have decided to use ${techStack.database.primary} as our primary database.`,
        {
          positive: [
            "Excellent reliability and data integrity",
            "Strong query capabilities",
            "Good tooling and ecosystem",
            "Scalable for our needs",
          ],
          negative: ["Setup and maintenance complexity", "Requires database expertise for optimization"],
          risks: ["Scaling may require sharding or read replicas", "Backup and disaster recovery must be configured"],
        },
        []
      )
    );
  }

  return adrs;
}

/**
 * Analyze dependency risk
 */
export function analyzeDependency(packageName: string, purpose: string): DependencyAnalysis {
  // This would normally fetch from npm registry, but we'll provide a template
  return {
    package: packageName,
    version: "latest",
    purpose,
    alternatives: [],
    size: "TBD",
    security: {
      vulnerabilities: 0,
      lastAudit: new Date().toISOString().split("T")[0],
    },
    maintenance: {
      lastUpdate: "TBD",
      weeklyDownloads: 0,
      openIssues: 0,
    },
    recommendation: "use",
  };
}

/**
 * Generate markdown ADR document
 */
export function formatADRAsMarkdown(adr: ADR): string {
  let md = `# ${adr.title}\n\n`;
  md += `**ID**: ${adr.id}\n`;
  md += `**Date**: ${adr.date}\n`;
  md += `**Status**: ${adr.status}\n\n`;

  md += `## Context\n\n${adr.context}\n\n`;

  md += `## Decision\n\n${adr.decision}\n\n`;

  md += `## Consequences\n\n`;
  md += `### Positive\n\n`;
  adr.consequences.positive.forEach((item) => {
    md += `- ${item}\n`;
  });
  md += `\n`;

  md += `### Negative\n\n`;
  adr.consequences.negative.forEach((item) => {
    md += `- ${item}\n`;
  });
  md += `\n`;

  md += `### Risks\n\n`;
  adr.consequences.risks.forEach((item) => {
    md += `- ${item}\n`;
  });
  md += `\n`;

  if (adr.alternatives.length > 0) {
    md += `## Alternatives Considered\n\n`;
    adr.alternatives.forEach((alt) => {
      md += `### ${alt.name}\n\n`;
      md += `**Pros**:\n`;
      alt.pros.forEach((pro) => {
        md += `- ${pro}\n`;
      });
      md += `\n**Cons**:\n`;
      alt.cons.forEach((con) => {
        md += `- ${con}\n`;
      });
      md += `\n**Rejection Reason**: ${alt.rejectionReason}\n\n`;
    });
  }

  return md;
}
