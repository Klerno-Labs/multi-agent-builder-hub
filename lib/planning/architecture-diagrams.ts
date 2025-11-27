/**
 * Architecture Diagrams - C4 model and architecture diagram generation
 */

import { Component, Integration, WorkflowSpec, PageSpec } from "./spec-templates";
import { ProjectType } from "../orchestration/pipeline-manager";

/**
 * C4 Model Levels:
 * 1. Context - System in environment with external actors
 * 2. Container - High-level technology containers (apps, databases, etc.)
 * 3. Component - Components within a container
 * 4. Code - Classes and interfaces (usually in code)
 */

export interface C4ContextDiagram {
  system: {
    name: string;
    description: string;
  };
  actors: Actor[];
  externalSystems: ExternalSystem[];
  relationships: Relationship[];
}

export interface Actor {
  id: string;
  name: string;
  type: "person" | "organization";
  description: string;
}

export interface ExternalSystem {
  id: string;
  name: string;
  description: string;
  technology?: string;
}

export interface Relationship {
  from: string;
  to: string;
  description: string;
  technology?: string;
  protocol?: string;
}

export interface C4ContainerDiagram {
  containers: Container[];
  relationships: Relationship[];
}

export interface Container {
  id: string;
  name: string;
  type: "web_app" | "mobile_app" | "spa" | "api" | "database" | "cache" | "queue" | "file_storage";
  technology: string;
  description: string;
}

export interface C4ComponentDiagram {
  containerId: string;
  components: ComponentDetail[];
  relationships: Relationship[];
}

export interface ComponentDetail {
  id: string;
  name: string;
  type: "controller" | "service" | "repository" | "component" | "utility" | "middleware";
  technology: string;
  description: string;
  responsibilities: string[];
}

export interface ERDiagram {
  entities: Entity[];
  relationships: EntityRelationship[];
}

export interface Entity {
  name: string;
  attributes: Attribute[];
  primaryKey: string;
  indexes?: string[];
}

export interface Attribute {
  name: string;
  type: string;
  nullable: boolean;
  unique?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface EntityRelationship {
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
  fromLabel?: string;
  toLabel?: string;
}

export interface SequenceDiagram {
  title: string;
  participants: Participant[];
  interactions: Interaction[];
}

export interface Participant {
  id: string;
  name: string;
  type: "actor" | "system" | "component" | "database";
}

export interface Interaction {
  from: string;
  to: string;
  message: string;
  type: "sync" | "async" | "response";
  note?: string;
}

/**
 * Generate C4 Context Diagram in Mermaid syntax
 */
export function generateC4Context(
  projectName: string,
  projectDescription: string,
  integrations: Integration[],
  projectType: ProjectType
): string {
  let diagram = `graph TB\n`;
  diagram += `  %% C4 Context Diagram\n\n`;

  // System (main project)
  diagram += `  System["${projectName}<br/><small>${projectDescription}</small>"]\n`;
  diagram += `  style System fill:#1168bd,stroke:#0b4884,color:#ffffff\n\n`;

  // Actors
  diagram += `  User["User<br/><small>End user of the system</small>"]\n`;
  diagram += `  style User fill:#08427b,stroke:#052e56,color:#ffffff\n\n`;

  if (projectType === "web3_dapp") {
    diagram += `  Trader["Trader<br/><small>DeFi user making transactions</small>"]\n`;
    diagram += `  style Trader fill:#08427b,stroke:#052e56,color:#ffffff\n\n`;
  }

  // External systems
  integrations.forEach((integration, index) => {
    const id = `Ext${index + 1}`;
    diagram += `  ${id}["${integration.name}<br/><small>${integration.provider}</small>"]\n`;
    diagram += `  style ${id} fill:#999999,stroke:#6b6b6b,color:#ffffff\n\n`;
  });

  // Relationships
  diagram += `  User -->|Uses| System\n`;

  if (projectType === "web3_dapp") {
    diagram += `  Trader -->|Executes trades| System\n`;
  }

  integrations.forEach((integration, index) => {
    const id = `Ext${index + 1}`;
    diagram += `  System -->|${integration.purpose}| ${id}\n`;
  });

  return diagram;
}

/**
 * Generate C4 Container Diagram in Mermaid syntax
 */
export function generateC4Container(
  projectType: ProjectType,
  techStack: any,
  includeDatabase: boolean
): string {
  let diagram = `graph TB\n`;
  diagram += `  %% C4 Container Diagram\n\n`;

  // User
  diagram += `  User["User"]\n`;
  diagram += `  style User fill:#08427b,stroke:#052e56,color:#ffffff\n\n`;

  // Frontend container
  if (projectType !== "database") {
    const frontend = techStack?.frontend?.framework || "Next.js";
    diagram += `  Frontend["Web Application<br/><small>${frontend}</small>"]\n`;
    diagram += `  style Frontend fill:#438dd5,stroke:#2e6295,color:#ffffff\n\n`;
  }

  // Backend container
  if (projectType !== "website") {
    const backend = techStack?.backend?.framework || "Express";
    diagram += `  Backend["API Application<br/><small>${backend}</small>"]\n`;
    diagram += `  style Backend fill:#438dd5,stroke:#2e6295,color:#ffffff\n\n`;
  }

  // Database container
  if (includeDatabase) {
    const db = techStack?.database?.primary || "PostgreSQL";
    diagram += `  Database["Database<br/><small>${db}</small>"]\n`;
    diagram += `  style Database fill:#438dd5,stroke:#2e6295,color:#ffffff\n\n`;
  }

  // Cache
  if (techStack?.database?.cache) {
    diagram += `  Cache["Cache<br/><small>${techStack.database.cache}</small>"]\n`;
    diagram += `  style Cache fill:#438dd5,stroke:#2e6295,color:#ffffff\n\n`;
  }

  // Web3 specific
  if (projectType === "web3_dapp") {
    diagram += `  Blockchain["Smart Contracts<br/><small>Ethereum/Solidity</small>"]\n`;
    diagram += `  style Blockchain fill:#438dd5,stroke:#2e6295,color:#ffffff\n\n`;
  }

  // Relationships
  if (projectType !== "database") {
    diagram += `  User -->|HTTPS| Frontend\n`;
  }

  if (projectType === "web_app" || projectType === "mobile_app") {
    diagram += `  Frontend -->|API calls| Backend\n`;
  }

  if (includeDatabase && projectType !== "website") {
    diagram += `  Backend -->|Read/Write| Database\n`;
  }

  if (techStack?.database?.cache) {
    diagram += `  Backend -->|Cache| Cache\n`;
  }

  if (projectType === "web3_dapp") {
    diagram += `  Frontend -->|Web3.js/Ethers.js| Blockchain\n`;
    diagram += `  Backend -->|Query events| Blockchain\n`;
  }

  return diagram;
}

/**
 * Generate Component Diagram for backend
 */
export function generateComponentDiagram(components: Component[]): string {
  let diagram = `graph TB\n`;
  diagram += `  %% Component Diagram\n\n`;

  // Add components
  components.forEach((component) => {
    const id = component.id.replace(/[^a-zA-Z0-9]/g, "_");
    diagram += `  ${id}["${component.name}<br/><small>${component.type}</small>"]\n`;

    // Style by type
    if (component.type === "frontend") {
      diagram += `  style ${id} fill:#85bbf0,stroke:#5d82a8\n`;
    } else if (component.type === "backend") {
      diagram += `  style ${id} fill:#438dd5,stroke:#2e6295\n`;
    } else if (component.type === "database") {
      diagram += `  style ${id} fill:#1168bd,stroke:#0b4884\n`;
    }
  });

  diagram += `\n`;

  // Add dependencies
  components.forEach((component) => {
    const fromId = component.id.replace(/[^a-zA-Z0-9]/g, "_");
    component.dependencies.forEach((depId) => {
      const toId = depId.replace(/[^a-zA-Z0-9]/g, "_");
      diagram += `  ${fromId} --> ${toId}\n`;
    });
  });

  return diagram;
}

/**
 * Generate ERD in Mermaid syntax
 */
export function generateERD(entities: Entity[]): string {
  let diagram = `erDiagram\n`;

  // Add entities with attributes
  entities.forEach((entity) => {
    diagram += `  ${entity.name} {\n`;
    entity.attributes.forEach((attr) => {
      const pk = attr.name === entity.primaryKey ? "PK" : "";
      const fk = attr.foreignKey ? "FK" : "";
      const key = pk || fk;
      diagram += `    ${attr.type} ${attr.name} ${key}\n`;
    });
    diagram += `  }\n\n`;
  });

  // Add relationships
  // Note: Need to extract relationships from foreign keys
  entities.forEach((entity) => {
    entity.attributes.forEach((attr) => {
      if (attr.foreignKey) {
        diagram += `  ${entity.name} }o--|| ${attr.foreignKey.table} : "references"\n`;
      }
    });
  });

  return diagram;
}

/**
 * Generate Sequence Diagram for workflow
 */
export function generateSequenceDiagram(workflow: WorkflowSpec): string {
  let diagram = `sequenceDiagram\n`;
  diagram += `  title ${workflow.name}\n\n`;

  // Extract participants from workflow steps
  const participants = new Set<string>(["User"]);
  workflow.steps.forEach((step) => {
    // Infer participants from step descriptions
    if (step.description.toLowerCase().includes("api")) participants.add("API");
    if (step.description.toLowerCase().includes("database")) participants.add("Database");
    if (step.description.toLowerCase().includes("payment")) participants.add("Payment Gateway");
    if (step.description.toLowerCase().includes("email")) participants.add("Email Service");
  });

  // Add participants
  participants.forEach((p) => {
    diagram += `  participant ${p.replace(/\s/g, "")}\n`;
  });

  diagram += `\n`;

  // Add interactions from workflow steps
  let currentActor = "User";
  workflow.steps.forEach((step, index) => {
    const target = inferTarget(step.description);
    diagram += `  ${currentActor}->>${target.replace(/\s/g, "")}: ${step.name}\n`;

    if (step.type === "action") {
      diagram += `  activate ${target.replace(/\s/g, "")}\n`;
      diagram += `  ${target.replace(/\s/g, "")}-->>User: ${step.description}\n`;
      diagram += `  deactivate ${target.replace(/\s/g, "")}\n`;
    }

    if (step.note) {
      diagram += `  Note over ${currentActor},${target.replace(/\s/g, "")}: ${step.note}\n`;
    }
  });

  return diagram;
}

/**
 * Infer target system from step description
 */
function inferTarget(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("api") || lower.includes("server") || lower.includes("backend")) return "API";
  if (lower.includes("database") || lower.includes("store") || lower.includes("save")) return "Database";
  if (lower.includes("payment") || lower.includes("checkout")) return "Payment Gateway";
  if (lower.includes("email") || lower.includes("notification")) return "Email Service";
  return "System";
}

/**
 * Generate deployment diagram
 */
export function generateDeploymentDiagram(
  projectType: ProjectType,
  hosting: string
): string {
  let diagram = `graph TB\n`;
  diagram += `  %% Deployment Diagram\n\n`;

  // Cloud provider
  diagram += `  subgraph Cloud["${hosting}"]\n`;

  if (projectType === "website" || projectType === "web_app") {
    diagram += `    CDN["CDN<br/>(CloudFront/Vercel Edge)"]\n`;
    diagram += `    Frontend["Frontend Server<br/>(Next.js)"]\n`;
  }

  if (projectType !== "website") {
    diagram += `    Backend["Backend Server<br/>(Node.js)"]\n`;
    diagram += `    Database["Database<br/>(RDS/MongoDB Atlas)"]\n`;
  }

  diagram += `  end\n\n`;

  // Users
  diagram += `  Users["Users<br/>(Web/Mobile)"]\n`;
  diagram += `  style Users fill:#08427b,stroke:#052e56,color:#ffffff\n\n`;

  // Relationships
  if (projectType === "website" || projectType === "web_app") {
    diagram += `  Users -->|HTTPS| CDN\n`;
    diagram += `  CDN -->|Cache miss| Frontend\n`;
  }

  if (projectType !== "website") {
    diagram += `  Frontend -->|API calls| Backend\n`;
    diagram += `  Backend -->|Query| Database\n`;
  }

  return diagram;
}

/**
 * Generate user flow diagram for page navigation
 */
export function generateUserFlowDiagram(pages: PageSpec[]): string {
  let diagram = `graph TD\n`;
  diagram += `  %% User Flow Diagram\n\n`;

  // Start node
  diagram += `  Start([Start])\n`;
  diagram += `  style Start fill:#90EE90,stroke:#006400\n\n`;

  // Add pages
  pages.forEach((page) => {
    const id = page.id.replace(/[^a-zA-Z0-9]/g, "_");
    const shape = page.auth ? `{${page.name}}` : `[${page.name}]`;
    diagram += `  ${id}${shape}\n`;

    if (page.auth) {
      diagram += `  style ${id} fill:#FFB6C1,stroke:#C71585\n`;
    }
  });

  diagram += `\n`;

  // Connect pages (simple linear flow for now)
  diagram += `  Start --> ${pages[0]?.id.replace(/[^a-zA-Z0-9]/g, "_")}\n`;

  for (let i = 0; i < pages.length - 1; i++) {
    const fromId = pages[i].id.replace(/[^a-zA-Z0-9]/g, "_");
    const toId = pages[i + 1].id.replace(/[^a-zA-Z0-9]/g, "_");
    diagram += `  ${fromId} --> ${toId}\n`;
  }

  // End node
  diagram += `  End([End])\n`;
  diagram += `  style End fill:#FFB6C1,stroke:#C71585\n`;
  diagram += `  ${pages[pages.length - 1]?.id.replace(/[^a-zA-Z0-9]/g, "_")} --> End\n`;

  return diagram;
}

/**
 * Generate system architecture overview
 */
export function generateArchitectureOverview(
  projectType: ProjectType,
  techStack: any,
  components: Component[],
  integrations: Integration[]
): string {
  let diagram = `graph TB\n`;
  diagram += `  %% System Architecture Overview\n\n`;

  // Frontend layer
  if (projectType !== "database") {
    diagram += `  subgraph Frontend["Presentation Layer"]\n`;
    diagram += `    UI["UI Components<br/>${techStack?.frontend?.framework || "React"}"]\n`;
    diagram += `    State["State Management<br/>${techStack?.frontend?.stateManagement || "Zustand"}"]\n`;
    diagram += `  end\n\n`;
  }

  // Backend layer
  if (projectType !== "website") {
    diagram += `  subgraph Backend["Application Layer"]\n`;
    diagram += `    API["API Routes<br/>${techStack?.backend?.framework || "Express"}"]\n`;
    diagram += `    Logic["Business Logic"]\n`;
    diagram += `    Validation["Validation<br/>${techStack?.backend?.validation || "Zod"}"]\n`;
    diagram += `  end\n\n`;
  }

  // Data layer
  if (projectType !== "website") {
    diagram += `  subgraph Data["Data Layer"]\n`;
    diagram += `    ORM["ORM<br/>${techStack?.backend?.orm || "Prisma"}"]\n`;
    diagram += `    DB["Database<br/>${techStack?.database?.primary || "PostgreSQL"}"]\n`;
    if (techStack?.database?.cache) {
      diagram += `    Cache["Cache<br/>${techStack.database.cache}"]\n`;
    }
    diagram += `  end\n\n`;
  }

  // External integrations
  if (integrations.length > 0) {
    diagram += `  subgraph External["External Services"]\n`;
    integrations.forEach((integration, index) => {
      diagram += `    Ext${index + 1}["${integration.name}"]\n`;
    });
    diagram += `  end\n\n`;
  }

  // Connections
  if (projectType !== "database") {
    diagram += `  UI --> State\n`;
    diagram += `  State --> API\n`;
  }

  if (projectType !== "website") {
    diagram += `  API --> Logic\n`;
    diagram += `  Logic --> Validation\n`;
    diagram += `  Validation --> ORM\n`;
    diagram += `  ORM --> DB\n`;
    if (techStack?.database?.cache) {
      diagram += `  Logic --> Cache\n`;
    }
  }

  integrations.forEach((integration, index) => {
    diagram += `  Logic --> Ext${index + 1}\n`;
  });

  return diagram;
}

/**
 * Generate state machine diagram for component states
 */
export function generateStateDiagram(states: string[], transitions: { from: string; to: string; event: string }[]): string {
  let diagram = `stateDiagram-v2\n`;
  diagram += `  [*] --> ${states[0]}\n\n`;

  transitions.forEach((transition) => {
    diagram += `  ${transition.from} --> ${transition.to}: ${transition.event}\n`;
  });

  diagram += `  ${states[states.length - 1]} --> [*]\n`;

  return diagram;
}
