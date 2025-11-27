import { Project, ProjectSpec } from "../agents/types";

const defaultFeatures: Record<string, string[]> = {
  website: ["Responsive marketing pages", "Contact / lead capture", "Analytics-ready"],
  web_app: [
    "Authenticated user areas",
    "Role-based access",
    "API-driven data",
  ],
  mobile_app: ["Onboarding flow", "Offline-friendly shell", "Push notification hooks"],
  database: ["Normalized schema", "Migrations", "Admin views"],
  web3_dapp: ["Wallet connect", "Smart contract actions", "On-chain events"],
};

const defaultPages: Record<string, string[]> = {
  website: ["Home", "Features", "Pricing", "Contact"],
  web_app: ["Dashboard", "Settings", "Activity", "Help"],
  mobile_app: ["Landing", "Auth", "Primary flow", "Settings"],
  database: ["ERD overview", "Admin panel", "Data audit"],
  web3_dapp: ["Landing", "Connect wallet", "Transactions", "Activity"],
};

const defaultStack: Record<string, string[]> = {
  website: ["Next.js", "Tailwind CSS", "Vercel"],
  web_app: ["Next.js", "Tailwind CSS", "Node API"],
  mobile_app: ["React Native", "Expo", "Backend API"],
  database: ["PostgreSQL", "Prisma", "Drizzle"],
  web3_dapp: ["Next.js", "Ethers.js", "Solidity"],
};

export function buildMockSpec(project: Project): ProjectSpec {
  const answers = project.discoveryAnswers ?? {};
  const features =
    answers.coreFeatures && answers.coreFeatures.length > 0
      ? answers.coreFeatures
      : defaultFeatures[project.type];

  const summary = answers.goals
    ? answers.goals
    : `Build a ${project.type.replace("_", " ")} for modern users.`;

  const pagesOrScreens =
    defaultPages[project.type] ?? ["Home", "Dashboard", "Settings"];

  const techStack =
    defaultStack[project.type] ?? ["Next.js", "Tailwind", "Node.js"];

  const dataModel =
    answers.targetUsers?.length || answers.integrations?.length
      ? [
          "User",
          ...(answers.integrations ? ["Integration"] : []),
          "Activity",
        ]
      : ["User", "Record"];

  const apiRoutes = ["/api/health", "/api/entities", "/api/activity"];

  return {
    summary,
    techStack,
    keyFeatures: features,
    pagesOrScreens,
    dataModel,
    apiRoutes,
    risks: ["Replace mocks with real agent calls", "Security review pending"],
  };
}
