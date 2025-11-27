import { ProjectType } from "../agents/types";

/**
 * Generate Mermaid architecture diagram
 */
export function generateArchitectureDiagram(projectType: ProjectType, components: string[]): string {
  switch (projectType) {
    case "web_app":
    case "website":
      return `\`\`\`mermaid
graph TB
    Client[Web Browser]
    NextJS[Next.js App]
    API[API Routes]
    DB[(Database)]
    Cache[(Redis Cache)]

    Client -->|HTTP/HTTPS| NextJS
    NextJS -->|Server Actions| API
    API -->|Query| DB
    API -->|Cache| Cache
    NextJS -->|SSR/SSG| Client

    subgraph "Frontend"
        NextJS
    end

    subgraph "Backend"
        API
        DB
        Cache
    end
\`\`\``;

    case "web3_dapp":
      return `\`\`\`mermaid
graph TB
    User[User Browser]
    Wallet[Web3 Wallet]
    Frontend[Next.js Frontend]
    Backend[API Server]
    Blockchain[Blockchain Network]
    Smart[Smart Contracts]

    User -->|Connect| Wallet
    User -->|Browse| Frontend
    Wallet -->|Sign| Blockchain
    Frontend -->|Read| Backend
    Frontend -->|Interact| Wallet
    Wallet -->|Transactions| Smart
    Smart -->|Events| Backend
    Backend -->|Index| Frontend

    subgraph "Client Side"
        User
        Wallet
        Frontend
    end

    subgraph "Decentralized"
        Blockchain
        Smart
    end
\`\`\``;

    case "mobile_app":
      return `\`\`\`mermaid
graph TB
    Mobile[Mobile App]
    API[REST API]
    Push[Push Notifications]
    DB[(Database)]
    Storage[Cloud Storage]

    Mobile -->|HTTP/HTTPS| API
    API -->|Query| DB
    API -->|Store| Storage
    Push -->|Notify| Mobile
    API -->|Trigger| Push

    subgraph "Mobile Client"
        Mobile
    end

    subgraph "Backend Services"
        API
        DB
        Storage
        Push
    end
\`\`\``;

    case "database":
      return `\`\`\`mermaid
graph LR
    App[Application]
    Query[Query Engine]
    Schema[Schema Manager]
    Migration[Migrations]
    DB[(PostgreSQL)]

    App -->|Execute| Query
    App -->|Manage| Schema
    Query -->|SQL| DB
    Schema -->|DDL| DB
    Migration -->|Update| DB

    subgraph "Application Layer"
        App
        Query
        Schema
    end

    subgraph "Data Layer"
        Migration
        DB
    end
\`\`\``;

    default:
      return `\`\`\`mermaid
graph TB
    ${components.map((c, i) => `C${i}[${c}]`).join("\n    ")}
    ${components.map((c, i) => i < components.length - 1 ? `C${i} --> C${i + 1}` : "").filter(Boolean).join("\n    ")}
\`\`\``;
  }
}

/**
 * Generate database ERD diagram
 */
export function generateERDDiagram(tables: { name: string; fields: string[] }[]): string {
  return `\`\`\`mermaid
erDiagram
${tables
  .map(
    (table) => `    ${table.name.toUpperCase()} {
${table.fields.map((f) => `        string ${f}`).join("\n")}
    }`
  )
  .join("\n")}

    USER ||--o{ POST : creates
    USER ||--o{ COMMENT : writes
    POST ||--o{ COMMENT : has
\`\`\``;
}

/**
 * Generate sequence diagram for authentication flow
 */
export function generateAuthSequenceDiagram(): string {
  return `\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant DB as Database
    participant S as Session Store

    U->>F: Enter credentials
    F->>A: POST /api/auth/login
    A->>DB: Verify credentials
    DB-->>A: User found
    A->>S: Create session
    S-->>A: Session ID
    A-->>F: Set cookie + JWT
    F-->>U: Redirect to dashboard

    Note over U,S: User is authenticated

    U->>F: Request protected resource
    F->>A: GET /api/protected (with JWT)
    A->>S: Validate session
    S-->>A: Session valid
    A-->>F: Return protected data
    F-->>U: Display data
\`\`\``;
}

/**
 * Generate deployment flow diagram
 */
export function generateDeploymentDiagram(): string {
  return `\`\`\`mermaid
graph LR
    Dev[Developer]
    Git[GitHub]
    CI[CI/CD Pipeline]
    Test[Run Tests]
    Build[Build App]
    Deploy[Deploy to Production]
    Prod[Production Server]

    Dev -->|Push| Git
    Git -->|Trigger| CI
    CI -->|Execute| Test
    Test -->|Pass| Build
    Build -->|Success| Deploy
    Deploy -->|Update| Prod

    Test -->|Fail| Dev
    Build -->|Fail| Dev
\`\`\``;
}

/**
 * Generate data flow diagram
 */
export function generateDataFlowDiagram(projectType: ProjectType): string {
  if (projectType === "web3_dapp") {
    return `\`\`\`mermaid
graph TD
    User[User Action]
    Frontend[Frontend Validation]
    Wallet[Wallet Signature]
    Contract[Smart Contract]
    Event[Blockchain Event]
    Indexer[Event Indexer]
    DB[(Database)]
    UI[Update UI]

    User -->|Input| Frontend
    Frontend -->|Request| Wallet
    Wallet -->|Sign & Send| Contract
    Contract -->|Emit| Event
    Event -->|Listen| Indexer
    Indexer -->|Store| DB
    DB -->|Query| UI
    UI -->|Display| User
\`\`\``;
  }

  return `\`\`\`mermaid
graph TD
    Input[User Input]
    Valid[Validation]
    Process[Processing]
    Store[Data Storage]
    Response[Generate Response]
    Output[User Output]

    Input -->|Submit| Valid
    Valid -->|Valid| Process
    Valid -->|Invalid| Output
    Process -->|Save| Store
    Store -->|Confirm| Response
    Response -->|Display| Output
\`\`\``;
}

/**
 * Generate component hierarchy diagram
 */
export function generateComponentHierarchy(components: { name: string; children?: string[] }[]): string {
  const renderNode = (comp: { name: string; children?: string[] }, indent = "    "): string => {
    let result = `${indent}${comp.name}\n`;
    if (comp.children && comp.children.length > 0) {
      result += comp.children.map((child) => `${indent}    ${child}`).join("\n") + "\n";
    }
    return result;
  };

  return `\`\`\`mermaid
graph TD
${components.map((c) => renderNode(c)).join("")}
\`\`\``;
}

/**
 * Generate state machine diagram
 */
export function generateStateMachineDiagram(feature: string): string {
  return `\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: Start
    Loading --> Success: Data Loaded
    Loading --> Error: Failed
    Success --> Idle: Reset
    Error --> Idle: Retry
    Success --> [*]: Complete
\`\`\``;
}

/**
 * Generate Git workflow diagram
 */
export function generateGitWorkflowDiagram(): string {
  return `\`\`\`mermaid
gitGraph
    commit id: "Initial commit"
    branch develop
    checkout develop
    commit id: "Add feature A"
    branch feature/new-feature
    checkout feature/new-feature
    commit id: "Implement new feature"
    commit id: "Add tests"
    checkout develop
    merge feature/new-feature
    checkout main
    merge develop tag: "v1.0.0"
    checkout develop
    commit id: "Continue development"
\`\`\``;
}

/**
 * Generate class diagram
 */
export function generateClassDiagram(classes: { name: string; methods: string[]; properties: string[] }[]): string {
  return `\`\`\`mermaid
classDiagram
${classes
  .map(
    (cls) => `    class ${cls.name} {
${cls.properties.map((p) => `        ${p}`).join("\n")}
${cls.methods.map((m) => `        ${m}()`).join("\n")}
    }`
  )
  .join("\n")}
\`\`\``;
}

/**
 * Generate user journey diagram
 */
export function generateUserJourneyDiagram(projectType: ProjectType): string {
  const journeys: Record<ProjectType, string> = {
    website: `\`\`\`mermaid
journey
    title User Journey: First Visit to Conversion
    section Discovery
      Land on homepage: 5: User
      Read about features: 4: User
      Watch demo video: 4: User
    section Evaluation
      Compare pricing: 3: User
      Read testimonials: 4: User
      Check FAQ: 3: User
    section Conversion
      Sign up for trial: 5: User
      Receive welcome email: 5: System
      Complete onboarding: 4: User
\`\`\``,
    web_app: `\`\`\`mermaid
journey
    title User Journey: Daily Dashboard Usage
    section Login
      Open app: 5: User
      Enter credentials: 4: User
      2FA verification: 3: User
    section Work
      View dashboard: 5: User
      Check notifications: 4: User
      Update settings: 3: User
    section Collaboration
      Create new item: 5: User
      Share with team: 4: User
      Receive feedback: 4: Team
\`\`\``,
    mobile_app: `\`\`\`mermaid
journey
    title User Journey: Mobile App Session
    section Launch
      Open app: 5: User
      Load cached data: 5: App
      Sync latest data: 4: App
    section Browse
      View feed: 5: User
      Like content: 4: User
      Leave comment: 4: User
    section Action
      Create post: 4: User
      Upload photo: 3: User
      Share to friends: 5: User
\`\`\``,
    database: `\`\`\`mermaid
journey
    title Admin Journey: Database Management
    section Access
      Login to admin: 5: Admin
      View schema: 5: Admin
    section Management
      Create migration: 4: Admin
      Run migration: 3: Admin
      Verify changes: 4: Admin
    section Monitoring
      Check performance: 4: Admin
      Review logs: 3: Admin
      Optimize queries: 3: Admin
\`\`\``,
    web3_dapp: `\`\`\`mermaid
journey
    title User Journey: Web3 dApp Interaction
    section Connect
      Visit dApp: 5: User
      Connect wallet: 4: User
      Switch network: 3: User
    section Transaction
      Initiate action: 5: User
      Review transaction: 4: User
      Sign with wallet: 4: Wallet
    section Confirmation
      Wait for confirmation: 3: User
      Transaction confirmed: 5: Blockchain
      View updated balance: 5: User
\`\`\``,
  };

  return journeys[projectType] || journeys.web_app;
}

/**
 * Generate PlantUML architecture diagram (alternative to Mermaid)
 */
export function generatePlantUMLDiagram(projectType: ProjectType): string {
  return `\`\`\`plantuml
@startuml
!define RECTANGLE class

package "Frontend" {
  [Web UI] as UI
  [React Components] as Components
}

package "Backend" {
  [API Server] as API
  [Business Logic] as Logic
  [Data Access] as DAO
}

package "Data Layer" {
  database "PostgreSQL" as DB
  database "Redis Cache" as Cache
}

UI --> Components
Components --> API
API --> Logic
Logic --> DAO
DAO --> DB
Logic --> Cache

@enduml
\`\`\``;
}

/**
 * Generate network topology diagram
 */
export function generateNetworkTopology(): string {
  return `\`\`\`mermaid
graph TB
    Internet[Internet]
    LB[Load Balancer]
    Web1[Web Server 1]
    Web2[Web Server 2]
    App1[App Server 1]
    App2[App Server 2]
    DB1[(Primary DB)]
    DB2[(Replica DB)]
    Cache[Redis Cluster]

    Internet --> LB
    LB --> Web1
    LB --> Web2
    Web1 --> App1
    Web2 --> App2
    App1 --> DB1
    App2 --> DB1
    DB1 -.->|Replication| DB2
    App1 --> Cache
    App2 --> Cache

    style Internet fill:#e1f5ff
    style LB fill:#fff4e1
    style DB1 fill:#ffe1e1
    style Cache fill:#f0ffe1
\`\`\``;
}
