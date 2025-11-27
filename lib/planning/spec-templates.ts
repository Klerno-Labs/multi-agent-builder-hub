/**
 * Spec Templates - Project specification templates and validation
 */

import { ProjectType } from "../orchestration/pipeline-manager";
import { Requirement } from "../discovery/requirements-elicitation";

export interface ProjectSpec {
  version: string; // Spec version (e.g., "1.0.0")
  projectId: string;
  projectType: ProjectType;
  metadata: {
    name: string;
    description: string;
    author?: string;
    createdAt: string;
    updatedAt: string;
    status: "draft" | "review" | "approved" | "implemented";
  };
  requirements: {
    functional: Requirement[];
    nonFunctional: NFR[];
    business: BusinessRequirement[];
  };
  architecture: {
    style: "monolithic" | "microservices" | "serverless" | "jamstack" | "hybrid";
    layers: ArchitectureLayer[];
    components: Component[];
    integrations: Integration[];
  };
  api: {
    type: "REST" | "GraphQL" | "gRPC" | "WebSocket" | "hybrid";
    version: string;
    baseUrl?: string;
    endpoints?: APIEndpoint[];
    schemas?: Record<string, any>;
  };
  database?: {
    type: "SQL" | "NoSQL" | "Graph" | "Time-series" | "Hybrid";
    provider?: string; // PostgreSQL, MongoDB, etc.
    schema?: DatabaseSchema;
    migrations?: Migration[];
  };
  pages?: PageSpec[];
  workflows?: WorkflowSpec[];
  techStack: TechStack;
  deployment: DeploymentSpec;
  testing: TestingStrategy;
  timeline: Timeline;
  risks: TechnicalRisk[];
  changelog?: ChangelogEntry[];
}

export interface NFR {
  id: string;
  category: "performance" | "security" | "scalability" | "reliability" | "usability" | "maintainability";
  title: string;
  description: string;
  target: string; // Measurable target (e.g., "< 2s page load")
  priority: "must_have" | "should_have" | "could_have";
  validationMethod: string; // How to test/validate
}

export interface BusinessRequirement {
  id: string;
  stakeholder: string;
  goal: string;
  successMetrics: string[];
  constraints?: string[];
}

export interface ArchitectureLayer {
  name: string; // Presentation, Business Logic, Data Access, etc.
  technologies: string[];
  responsibilities: string[];
  components: string[];
}

export interface Component {
  id: string;
  name: string;
  type: "frontend" | "backend" | "database" | "cache" | "queue" | "external";
  description: string;
  dependencies: string[]; // Other component IDs
  interfaces?: {
    input: string[];
    output: string[];
  };
  technology?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: "API" | "Database" | "Auth" | "Payment" | "Email" | "Storage" | "Analytics" | "Other";
  provider: string;
  purpose: string;
  authentication?: string;
  rateLimit?: string;
  cost?: string;
}

export interface APIEndpoint {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description: string;
  auth: boolean;
  requestBody?: {
    schema: Record<string, any>;
    example?: any;
  };
  responses: {
    [statusCode: string]: {
      description: string;
      schema?: Record<string, any>;
      example?: any;
    };
  };
  validation?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: "required" | "email" | "min" | "max" | "pattern" | "custom";
  value?: any;
  message: string;
}

export interface DatabaseSchema {
  tables?: Table[];
  collections?: Collection[];
  relationships?: Relationship[];
}

export interface Table {
  name: string;
  columns: Column[];
  primaryKey: string;
  indexes?: Index[];
  constraints?: Constraint[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  unique?: boolean;
  autoIncrement?: boolean;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface Constraint {
  type: "FOREIGN_KEY" | "CHECK" | "UNIQUE";
  definition: string;
}

export interface Collection {
  name: string;
  schema: Record<string, any>; // JSON Schema
  indexes?: {
    fields: string[];
    unique: boolean;
  }[];
}

export interface Relationship {
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
  foreignKey?: string;
}

export interface Migration {
  version: string;
  description: string;
  up: string; // SQL or migration script
  down: string;
  timestamp: string;
}

export interface PageSpec {
  id: string;
  name: string;
  route: string;
  description: string;
  auth: boolean;
  layout?: string;
  sections: Section[];
  state?: StateDefinition;
  apiCalls?: string[]; // API endpoint paths
}

export interface Section {
  name: string;
  type: "header" | "content" | "sidebar" | "footer" | "form" | "table" | "chart" | "custom";
  components: string[];
  data?: string[]; // Data sources
}

export interface StateDefinition {
  local: string[]; // Component state
  global: string[]; // App-wide state
  derived?: string[]; // Computed values
}

export interface WorkflowSpec {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  errorHandling?: ErrorHandling;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "action" | "condition" | "loop" | "parallel" | "wait";
  description: string;
  nextStep?: string;
  onError?: string;
  note?: string;
}

export interface ErrorHandling {
  strategy: "retry" | "fallback" | "abort" | "compensate";
  maxRetries?: number;
  fallbackAction?: string;
}

export interface TechStack {
  frontend?: {
    framework: string; // React, Vue, Svelte, etc.
    language: string; // TypeScript, JavaScript
    styling: string; // Tailwind, CSS Modules, etc.
    stateManagement?: string; // Zustand, Redux, etc.
    routing?: string;
    testing?: string[];
  };
  backend?: {
    framework: string; // Express, Fastify, NestJS, etc.
    language: string; // Node.js, Python, Go, etc.
    orm?: string; // Prisma, TypeORM, etc.
    validation?: string; // Zod, Joi, etc.
    testing?: string[];
  };
  database?: {
    primary: string;
    cache?: string;
    queue?: string;
  };
  infrastructure?: {
    hosting: string; // Vercel, AWS, Azure, etc.
    cicd?: string;
    monitoring?: string;
    logging?: string;
  };
  web3?: {
    blockchain: string;
    framework: string; // Hardhat, Foundry, Truffle
    library: string; // ethers.js, web3.js, viem
  };
}

export interface DeploymentSpec {
  environments: {
    development: Environment;
    staging?: Environment;
    production: Environment;
  };
  strategy: "blue-green" | "canary" | "rolling" | "recreate";
  cicd?: {
    provider: string;
    pipeline: PipelineStage[];
  };
}

export interface Environment {
  url?: string;
  variables: Record<string, string>;
  resources?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
}

export interface PipelineStage {
  name: string;
  steps: string[];
  condition?: string;
}

export interface TestingStrategy {
  unit: {
    framework: string;
    coverage: number; // Target coverage %
    critical: string[]; // Critical paths to test
  };
  integration?: {
    framework: string;
    scenarios: string[];
  };
  e2e?: {
    framework: string;
    scenarios: string[];
  };
  performance?: {
    tool: string;
    targets: PerformanceTarget[];
  };
}

export interface PerformanceTarget {
  metric: string; // "page_load", "ttfb", "api_response", etc.
  target: string; // "< 2s", "< 200ms", etc.
  measurement: string; // How to measure
}

export interface Timeline {
  phases: Phase[];
  totalWeeks: number;
  milestones: Milestone[];
}

export interface Phase {
  name: string;
  duration: number; // weeks
  deliverables: string[];
  dependencies?: string[];
}

export interface Milestone {
  name: string;
  date?: string;
  criteria: string[];
}

export interface TechnicalRisk {
  id: string;
  category: "technical" | "dependency" | "integration" | "performance" | "security";
  title: string;
  description: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high" | "critical";
  mitigation: string[];
  owner: string; // Which agent handles this
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";
    description: string;
  }[];
  author?: string;
}

/**
 * Generate spec template based on project type
 */
export function generateSpecTemplate(
  projectType: ProjectType,
  projectName: string,
  projectDescription: string
): ProjectSpec {
  const baseSpec: ProjectSpec = {
    version: "1.0.0",
    projectId: `${projectType}_${Date.now()}`,
    projectType,
    metadata: {
      name: projectName,
      description: projectDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
    },
    requirements: {
      functional: [],
      nonFunctional: [],
      business: [],
    },
    architecture: {
      style: getDefaultArchitecture(projectType),
      layers: [],
      components: [],
      integrations: [],
    },
    api: {
      type: "REST",
      version: "v1",
    },
    techStack: getDefaultTechStack(projectType),
    deployment: getDefaultDeployment(projectType),
    testing: getDefaultTestingStrategy(projectType),
    timeline: {
      phases: [],
      totalWeeks: 0,
      milestones: [],
    },
    risks: [],
  };

  // Project-type specific additions
  if (projectType === "web_app" || projectType === "website" || projectType === "mobile_app") {
    baseSpec.pages = [];
    baseSpec.workflows = [];
  }

  if (projectType === "database" || projectType === "web_app" || projectType === "mobile_app") {
    baseSpec.database = {
      type: projectType === "database" ? "SQL" : "SQL",
      schema: { tables: [], relationships: [] },
    };
  }

  if (projectType === "web3_dapp") {
    baseSpec.database = {
      type: "NoSQL",
      provider: "MongoDB",
      schema: { collections: [] },
    };
    baseSpec.api.type = "REST";
    baseSpec.techStack.web3 = {
      blockchain: "Ethereum",
      framework: "Hardhat",
      library: "ethers.js",
    };
  }

  return baseSpec;
}

/**
 * Get default architecture style for project type
 */
function getDefaultArchitecture(projectType: ProjectType): ProjectSpec["architecture"]["style"] {
  switch (projectType) {
    case "website":
      return "jamstack";
    case "web_app":
      return "monolithic";
    case "mobile_app":
      return "monolithic";
    case "database":
      return "monolithic";
    case "web3_dapp":
      return "hybrid"; // Frontend + Smart Contracts
    default:
      return "monolithic";
  }
}

/**
 * Get default tech stack for project type
 */
function getDefaultTechStack(projectType: ProjectType): TechStack {
  const stack: TechStack = {};

  // Frontend defaults
  if (projectType !== "database") {
    stack.frontend = {
      framework: "Next.js",
      language: "TypeScript",
      styling: "Tailwind CSS",
      stateManagement: "Zustand",
      routing: "Next.js Router",
      testing: ["Vitest", "React Testing Library"],
    };
  }

  // Backend defaults
  if (projectType === "web_app" || projectType === "database" || projectType === "web3_dapp") {
    stack.backend = {
      framework: "Express",
      language: "Node.js (TypeScript)",
      orm: "Prisma",
      validation: "Zod",
      testing: ["Vitest", "Supertest"],
    };
  }

  // Database defaults
  if (projectType !== "website") {
    stack.database = {
      primary: projectType === "web3_dapp" ? "MongoDB" : "PostgreSQL",
      cache: "Redis",
    };
  }

  // Infrastructure defaults
  stack.infrastructure = {
    hosting: projectType === "website" ? "Vercel" : "AWS",
    cicd: "GitHub Actions",
    monitoring: "Sentry",
    logging: "Winston",
  };

  return stack;
}

/**
 * Get default deployment spec
 */
function getDefaultDeployment(projectType: ProjectType): DeploymentSpec {
  return {
    environments: {
      development: {
        url: "http://localhost:3000",
        variables: {
          NODE_ENV: "development",
        },
      },
      production: {
        variables: {
          NODE_ENV: "production",
        },
      },
    },
    strategy: "rolling",
    cicd: {
      provider: "GitHub Actions",
      pipeline: [
        {
          name: "Build",
          steps: ["Install dependencies", "Run type check", "Build project"],
        },
        {
          name: "Test",
          steps: ["Run unit tests", "Run integration tests", "Check coverage"],
        },
        {
          name: "Deploy",
          steps: ["Deploy to staging", "Run smoke tests", "Deploy to production"],
          condition: "branch === 'main'",
        },
      ],
    },
  };
}

/**
 * Get default testing strategy
 */
function getDefaultTestingStrategy(projectType: ProjectType): TestingStrategy {
  const strategy: TestingStrategy = {
    unit: {
      framework: "Vitest",
      coverage: 80,
      critical: ["Authentication", "Data validation", "Business logic"],
    },
  };

  if (projectType !== "website") {
    strategy.integration = {
      framework: "Vitest + Supertest",
      scenarios: ["API endpoints", "Database operations", "External integrations"],
    };
  }

  if (projectType === "web_app" || projectType === "web3_dapp") {
    strategy.e2e = {
      framework: "Playwright",
      scenarios: ["User registration", "Core workflows", "Payment flow"],
    };
  }

  if (projectType !== "database") {
    strategy.performance = {
      tool: "Lighthouse",
      targets: [
        { metric: "page_load", target: "< 2s", measurement: "First Contentful Paint" },
        { metric: "interactivity", target: "< 200ms", measurement: "Time to Interactive" },
      ],
    };
  }

  return strategy;
}

/**
 * Validate spec completeness
 */
export function validateSpec(spec: ProjectSpec): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  const maxScore = 20;

  // Required fields
  if (!spec.projectId) errors.push("Missing projectId");
  if (!spec.projectType) errors.push("Missing projectType");
  if (!spec.metadata?.name) errors.push("Missing project name");
  if (!spec.metadata?.description) errors.push("Missing project description");

  // Requirements
  if (spec.requirements.functional.length === 0) {
    errors.push("No functional requirements defined");
  } else {
    score += 3;
  }

  if (spec.requirements.nonFunctional.length === 0) {
    warnings.push("No non-functional requirements defined");
  } else {
    score += 2;
  }

  // Architecture
  if (spec.architecture.components.length === 0) {
    warnings.push("No components defined");
  } else {
    score += 2;
  }

  // API
  if (spec.projectType !== "database" && spec.api.endpoints?.length === 0) {
    warnings.push("No API endpoints defined");
  } else if (spec.api.endpoints && spec.api.endpoints.length > 0) {
    score += 3;
  }

  // Database
  if (spec.database?.schema?.tables?.length === 0 && spec.database?.schema?.collections?.length === 0) {
    if (spec.projectType !== "website") {
      warnings.push("No database schema defined");
    }
  } else {
    score += 2;
  }

  // Pages (for web projects)
  if ((spec.projectType === "web_app" || spec.projectType === "website") && spec.pages?.length === 0) {
    warnings.push("No pages defined");
  } else if (spec.pages && spec.pages.length > 0) {
    score += 2;
  }

  // Tech stack
  if (!spec.techStack.frontend && spec.projectType !== "database") {
    errors.push("Frontend tech stack not defined");
  } else if (spec.techStack.frontend) {
    score += 2;
  }

  // Testing
  if (!spec.testing.unit) {
    warnings.push("No testing strategy defined");
  } else {
    score += 2;
  }

  // Timeline
  if (spec.timeline.phases.length === 0) {
    warnings.push("No timeline phases defined");
  } else {
    score += 2;
  }

  const completeness = Math.round((score / maxScore) * 100);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    completeness,
  };
}

/**
 * Generate NFRs from discovery
 */
export function generateNFRs(
  performanceTarget?: string,
  securityLevel?: string,
  scalabilityTarget?: string
): NFR[] {
  const nfrs: NFR[] = [];
  let nfrId = 1;

  // Performance NFRs
  if (performanceTarget) {
    nfrs.push({
      id: `NFR-${nfrId++}`,
      category: "performance",
      title: `Page Load Performance: ${performanceTarget}`,
      description: "Pages should load within target time",
      target: performanceTarget,
      priority: "must_have",
      validationMethod: "Lighthouse performance audit",
    });

    nfrs.push({
      id: `NFR-${nfrId++}`,
      category: "performance",
      title: "API Response Time",
      description: "API endpoints should respond quickly",
      target: "< 200ms for 95th percentile",
      priority: "should_have",
      validationMethod: "Load testing with k6 or Artillery",
    });
  }

  // Security NFRs
  if (securityLevel) {
    nfrs.push({
      id: `NFR-${nfrId++}`,
      category: "security",
      title: "Data Encryption",
      description: "Sensitive data must be encrypted at rest and in transit",
      target: "AES-256 encryption for data at rest, TLS 1.3 for transit",
      priority: "must_have",
      validationMethod: "Security audit and penetration testing",
    });

    nfrs.push({
      id: `NFR-${nfrId++}`,
      category: "security",
      title: "Authentication Security",
      description: "Secure authentication and session management",
      target: "JWT with refresh tokens, CSRF protection, rate limiting",
      priority: "must_have",
      validationMethod: "OWASP security checklist",
    });
  }

  // Scalability NFRs
  if (scalabilityTarget) {
    nfrs.push({
      id: `NFR-${nfrId++}`,
      category: "scalability",
      title: `Concurrent Users: ${scalabilityTarget}`,
      description: "System should handle target number of concurrent users",
      target: scalabilityTarget,
      priority: "must_have",
      validationMethod: "Load testing with gradual ramp-up",
    });
  }

  // Universal NFRs
  nfrs.push(
    {
      id: `NFR-${nfrId++}`,
      category: "usability",
      title: "Accessibility Compliance",
      description: "Interface should meet WCAG 2.1 Level AA standards",
      target: "100% WCAG 2.1 AA compliance",
      priority: "should_have",
      validationMethod: "axe DevTools and manual testing",
    },
    {
      id: `NFR-${nfrId++}`,
      category: "reliability",
      title: "System Uptime",
      description: "System should maintain high availability",
      target: "99.9% uptime (< 8.76 hours downtime/year)",
      priority: "must_have",
      validationMethod: "Uptime monitoring (UptimeRobot, Pingdom)",
    },
    {
      id: `NFR-${nfrId++}`,
      category: "maintainability",
      title: "Code Quality",
      description: "Code should maintain high quality standards",
      target: "TypeScript strict mode, ESLint, 80%+ test coverage",
      priority: "should_have",
      validationMethod: "CI/CD quality gates",
    }
  );

  return nfrs;
}
