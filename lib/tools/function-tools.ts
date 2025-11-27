/**
 * OpenAI Function Calling tool definitions for the multi-agent system
 * This module provides function schemas and tool assignments for different agents
 */

/**
 * Function definition for OpenAI function calling
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Complete set of agent tools for function calling
 */
export const agentTools: Record<string, FunctionDefinition> = {
  // Code validation tool
  validate_code: {
    name: 'validate_code',
    description: 'Validates TypeScript or JavaScript code using the TypeScript compiler API and formats it with Prettier. Returns syntax errors, type errors, warnings, and formatted code.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The TypeScript or JavaScript source code to validate',
        },
        filePath: {
          type: 'string',
          description: 'The file path including extension (.ts, .tsx, .js, .jsx) to determine the file type',
        },
      },
      required: ['code', 'filePath'],
    },
  },

  // JSON validation tool
  validate_json: {
    name: 'validate_json',
    description: 'Validates JSON syntax and structure. Returns whether the JSON is valid, any syntax errors, and a formatted version of the JSON.',
    parameters: {
      type: 'object',
      properties: {
        jsonString: {
          type: 'string',
          description: 'The JSON string to validate',
        },
      },
      required: ['jsonString'],
    },
  },

  // SQL validation tool
  validate_sql: {
    name: 'validate_sql',
    description: 'Validates SQL query syntax and checks for dangerous patterns like DROP statements, DELETE/UPDATE without WHERE clauses, and SQL injection risks. Returns validation errors and security warnings.',
    parameters: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'The SQL query to validate',
        },
      },
      required: ['sql'],
    },
  },

  // Package resolution tool
  resolve_package: {
    name: 'resolve_package',
    description: 'Fetches package information from the npm registry including version, dependencies, license, and deprecation status. Useful for validating package availability and getting metadata.',
    parameters: {
      type: 'object',
      properties: {
        packageName: {
          type: 'string',
          description: 'The npm package name (e.g., "express", "@types/node")',
        },
        version: {
          type: 'string',
          description: 'Optional version specifier (e.g., "latest", "1.2.3", "^1.0.0"). Defaults to "latest"',
        },
      },
      required: ['packageName'],
    },
  },

  // Multiple packages resolution tool
  resolve_packages: {
    name: 'resolve_packages',
    description: 'Resolves multiple npm packages in parallel. Returns information about all requested packages including their versions, dependencies, and any errors or warnings.',
    parameters: {
      type: 'object',
      properties: {
        packages: {
          type: 'array',
          description: 'Array of package specifications to resolve',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The npm package name',
              },
              version: {
                type: 'string',
                description: 'Optional version specifier',
              },
              dev: {
                type: 'boolean',
                description: 'Whether this is a dev dependency',
              },
            },
            required: ['name'],
          },
        },
      },
      required: ['packages'],
    },
  },

  // Package security check tool
  check_package_security: {
    name: 'check_package_security',
    description: 'Checks an npm package for security issues including deprecation warnings, missing license information, and suspicious characteristics.',
    parameters: {
      type: 'object',
      properties: {
        packageName: {
          type: 'string',
          description: 'The npm package name to check',
        },
        version: {
          type: 'string',
          description: 'The version to check for security issues',
        },
      },
      required: ['packageName', 'version'],
    },
  },

  // Shell execution tool
  execute_shell: {
    name: 'execute_shell',
    description: 'Execute shell commands in a sandboxed workspace with optional approval flow. Supports running multiple commands sequentially. Dangerous commands require user approval.',
    parameters: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          description: 'Array of shell commands to execute sequentially',
          items: {
            type: 'string',
          },
        },
        workingDirectory: {
          type: 'string',
          description: 'Optional working directory relative to workspace root',
        },
        timeout: {
          type: 'number',
          description: 'Optional timeout in milliseconds (default: 30000)',
        },
      },
      required: ['commands'],
    },
  },

  // File editing tool
  apply_patch: {
    name: 'apply_patch',
    description: 'Create, edit, or delete files using unified diff format. Supports creating new files, editing existing files with precise changes, or deleting files. Changes require approval.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to workspace root',
        },
        diff: {
          type: 'string',
          description: 'Unified diff format patch to apply. For create operations, use + lines. For edits, include context lines and +/- changes.',
        },
        operation: {
          type: 'string',
          enum: ['create', 'edit', 'delete'],
          description: 'Type of file operation to perform',
        },
      },
      required: ['path', 'operation'],
    },
  },

  // Web search tool
  web_search: {
    name: 'web_search',
    description: 'Search the web for real-time information. Returns search results with titles, URLs, snippets, and an AI-generated summary. Useful for finding current information, documentation, examples, and best practices.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
        freshness: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          description: 'How recent the results should be',
        },
      },
      required: ['query'],
    },
  },

  // Context7 MCP documentation tool
  query_docs: {
    name: 'query_docs',
    description: 'Query up-to-date documentation for popular libraries and frameworks using Context7 MCP. Returns official documentation, code examples, and best practices for Next.js, React, TypeScript, Prisma, Tailwind, Express, and more.',
    parameters: {
      type: 'object',
      properties: {
        library: {
          type: 'string',
          description: 'The library or framework name (e.g., "Next.js", "React", "TypeScript", "Prisma")',
        },
        topic: {
          type: 'string',
          description: 'Optional specific topic to search for (e.g., "routing", "hooks", "server components")',
        },
        version: {
          type: 'string',
          description: 'Optional version number for version-specific documentation',
        },
      },
      required: ['library'],
    },
  },
};

/**
 * Agent ID type for type safety - matches the actual agent registry
 */
export type AgentId =
  | 'mia'      // Orchestrator
  | 'jordan'   // Discovery
  | 'riley'    // Spec Architect - JSON configs
  | 'ava'      // Product Designer
  | 'liam'     // Frontend Developer - TypeScript/React
  | 'noah'     // Backend Developer - TypeScript/Node
  | 'sophia'   // Database Specialist - SQL
  | 'kai'      // Web3 Specialist
  | 'iris'     // Asset Generator
  | 'nova'     // Infrastructure Engineer
  | 'ethan'    // QA Engineer - Code validation
  | 'grace'    // Security Auditor - All validation tools
  | 'owen'     // Integration Specialist - All tools
  | 'chloe';   // Documentation Specialist - JSON/Code

/**
 * Agent tool assignments mapping
 * Defines which tools each agent has access to based on their role
 */
export const agentToolAssignments: Record<AgentId, string[]> = {
  // Mia - Orchestrator: Validates configs
  mia: [
    'validate_json',
  ],

  // Jordan - Discovery: No tools needed (just asking questions)
  jordan: [],

  // Riley - Spec Architect: Validates project spec JSON
  riley: [
    'validate_json',
  ],

  // Ava - Product Designer: No code validation needed
  ava: [],

  // Liam - Frontend Developer: Validates React/TypeScript code and resolves frontend packages
  liam: [
    'validate_code',
    'resolve_package',
    'resolve_packages',
    'check_package_security',
    'web_search',
    'apply_patch',
    'query_docs',
  ],

  // Noah - Backend Developer: Validates Node/TypeScript code and resolves backend packages
  noah: [
    'validate_code',
    'resolve_package',
    'resolve_packages',
    'check_package_security',
    'web_search',
    'apply_patch',
    'execute_shell',
    'query_docs',
  ],

  // Sophia - Database Specialist: Validates SQL queries
  sophia: [
    'validate_sql',
  ],

  // Kai - Web3 Specialist: Validates Solidity/TypeScript and checks Web3 packages
  kai: [
    'validate_code',
    'resolve_package',
    'check_package_security',
    'web_search',
    'apply_patch',
    'query_docs',
  ],

  // Iris - Asset Generator: No tools needed (generates images/assets)
  iris: [],

  // Nova - Infrastructure Engineer: Validates configs and checks package security
  nova: [
    'validate_json',
    'validate_code',
    'resolve_package',
    'check_package_security',
    'execute_shell',
    'apply_patch',
  ],

  // Ethan - QA Engineer: Validates code quality across the stack
  ethan: [
    'validate_code',
    'validate_json',
    'validate_sql',
    'execute_shell',
  ],

  // Grace - Security Auditor: Has ALL validation and security tools
  grace: [
    'validate_code',
    'validate_json',
    'validate_sql',
    'check_package_security',
  ],

  // Owen - Integration Specialist: Has access to all tools for integrations
  owen: [
    'validate_code',
    'validate_json',
    'resolve_package',
    'resolve_packages',
    'check_package_security',
    'execute_shell',
    'apply_patch',
    'web_search',
    'query_docs',
  ],

  // Chloe - Documentation Specialist: Validates code examples and config files
  chloe: [
    'validate_code',
    'validate_json',
    'web_search',
    'query_docs',
  ],
};

/**
 * Returns the appropriate function tools for a specific agent
 *
 * @param agentId - The ID of the agent requesting tools
 * @returns Array of FunctionDefinition objects for the agent's available tools
 */
export function getToolsForAgent(agentId: string): FunctionDefinition[] {
  // Normalize agent ID to lowercase for case-insensitive matching
  const normalizedId = agentId.toLowerCase() as AgentId;

  // Check if the agent ID is valid
  if (!agentToolAssignments[normalizedId]) {
    console.warn(`Unknown agent ID: ${agentId}, returning empty tool set`);
    return [];
  }

  // Get the tool names for this agent
  const toolNames = agentToolAssignments[normalizedId];

  // Map tool names to their definitions
  const tools = toolNames
    .map(toolName => agentTools[toolName])
    .filter(Boolean); // Filter out any undefined tools

  return tools;
}

/**
 * Returns all available tools (useful for testing or admin interfaces)
 *
 * @returns Array of all FunctionDefinition objects
 */
export function getAllTools(): FunctionDefinition[] {
  return Object.values(agentTools);
}

/**
 * Checks if an agent has access to a specific tool
 *
 * @param agentId - The ID of the agent
 * @param toolName - The name of the tool to check
 * @returns boolean indicating if the agent has access to the tool
 */
export function agentHasTool(agentId: string, toolName: string): boolean {
  const normalizedId = agentId.toLowerCase() as AgentId;

  if (!agentToolAssignments[normalizedId]) {
    return false;
  }

  return agentToolAssignments[normalizedId].includes(toolName);
}

/**
 * Returns a list of all agent IDs and their assigned tools
 * Useful for documentation or admin interfaces
 *
 * @returns Record mapping agent IDs to their tool assignments
 */
export function getAgentToolSummary(): Record<AgentId, { tools: string[]; count: number }> {
  const summary: Record<string, { tools: string[]; count: number }> = {};

  Object.entries(agentToolAssignments).forEach(([agentId, tools]) => {
    summary[agentId] = {
      tools,
      count: tools.length,
    };
  });

  return summary as Record<AgentId, { tools: string[]; count: number }>;
}

/**
 * Validates a function call response to ensure it matches the expected format
 *
 * @param toolName - The name of the tool that was called
 * @param response - The response object to validate
 * @returns boolean indicating if the response is valid
 */
export function validateToolResponse(toolName: string, response: any): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // All tool responses should have a 'success' boolean field
  if (typeof response.success !== 'boolean') {
    return false;
  }

  // Tool-specific validation
  switch (toolName) {
    case 'validate_code':
    case 'validate_json':
    case 'validate_sql':
      // Validation tools should have errors/warnings arrays if unsuccessful
      return true;

    case 'resolve_package':
      // Should have package info if successful
      return !response.success || response.package !== undefined;

    case 'resolve_packages':
      // Should have packages array if successful
      return !response.success || Array.isArray(response.packages);

    case 'check_package_security':
      // Should have packageName and version
      return response.packageName !== undefined && response.version !== undefined;

    case 'execute_shell':
      // Should have outputs array
      return !response.success || Array.isArray(response.outputs);

    case 'apply_patch':
      // Should have output string
      return !response.success || typeof response.output === 'string';

    case 'web_search':
      // Should have results array and query
      return response.query !== undefined && Array.isArray(response.results);

    case 'query_docs':
      // Should have library and content
      return response.library !== undefined && response.content !== undefined;

    default:
      return true;
  }
}
