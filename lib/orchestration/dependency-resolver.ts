/**
 * Dependency Resolver - Handles agent dependency graph and execution order
 */

import { AgentName, AGENT_CONFIGS } from "./pipeline-manager";

export interface DependencyNode {
  agent: AgentName;
  dependencies: AgentName[];
  dependents: AgentName[];
  depth: number;
  canRunInParallel: AgentName[];
}

export interface DependencyGraph {
  nodes: Map<AgentName, DependencyNode>;
  roots: AgentName[];
  leaves: AgentName[];
  maxDepth: number;
}

/**
 * Build complete dependency graph
 */
export function buildDependencyGraph(activeAgents: AgentName[]): DependencyGraph {
  const nodes = new Map<AgentName, DependencyNode>();

  // Initialize nodes
  activeAgents.forEach((agent) => {
    const config = AGENT_CONFIGS[agent];
    nodes.set(agent, {
      agent,
      dependencies: config.dependencies.filter((dep) => activeAgents.includes(dep)),
      dependents: [],
      depth: 0,
      canRunInParallel: [],
    });
  });

  // Build dependents (reverse dependencies)
  nodes.forEach((node) => {
    node.dependencies.forEach((dep) => {
      const depNode = nodes.get(dep);
      if (depNode) {
        depNode.dependents.push(node.agent);
      }
    });
  });

  // Calculate depths (topological levels)
  const calculateDepth = (agent: AgentName, visited = new Set<AgentName>()): number => {
    if (visited.has(agent)) return 0; // Circular dependency protection
    visited.add(agent);

    const node = nodes.get(agent)!;
    if (node.dependencies.length === 0) {
      node.depth = 0;
      return 0;
    }

    const maxDepDist = Math.max(...node.dependencies.map((dep) => calculateDepth(dep, new Set(visited))));
    node.depth = maxDepDist + 1;
    return node.depth;
  };

  nodes.forEach((_, agent) => calculateDepth(agent));

  // Find roots (no dependencies) and leaves (no dependents)
  const roots: AgentName[] = [];
  const leaves: AgentName[] = [];
  let maxDepth = 0;

  nodes.forEach((node) => {
    if (node.dependencies.length === 0) roots.push(node.agent);
    if (node.dependents.length === 0) leaves.push(node.agent);
    maxDepth = Math.max(maxDepth, node.depth);
  });

  // Find agents that can run in parallel
  nodes.forEach((node) => {
    const parallelCandidates = Array.from(nodes.values())
      .filter(
        (other) =>
          other.agent !== node.agent &&
          other.depth === node.depth &&
          !node.dependencies.includes(other.agent) &&
          !node.dependents.includes(other.agent)
      )
      .map((n) => n.agent);

    node.canRunInParallel = parallelCandidates;
  });

  return { nodes, roots, leaves, maxDepth };
}

/**
 * Get topological execution order (sequential)
 */
export function getTopologicalOrder(activeAgents: AgentName[]): AgentName[] {
  const graph = buildDependencyGraph(activeAgents);
  const order: AgentName[] = [];
  const visited = new Set<AgentName>();

  const visit = (agent: AgentName) => {
    if (visited.has(agent)) return;
    visited.add(agent);

    const node = graph.nodes.get(agent)!;
    node.dependencies.forEach(visit);
    order.push(agent);
  };

  activeAgents.forEach(visit);
  return order;
}

/**
 * Get parallel execution levels (agents grouped by depth)
 */
export function getParallelExecutionLevels(activeAgents: AgentName[]): AgentName[][] {
  const graph = buildDependencyGraph(activeAgents);
  const levels: AgentName[][] = [];

  for (let depth = 0; depth <= graph.maxDepth; depth++) {
    const agentsAtDepth = Array.from(graph.nodes.values())
      .filter((node) => node.depth === depth)
      .map((node) => node.agent);

    if (agentsAtDepth.length > 0) {
      levels.push(agentsAtDepth);
    }
  }

  return levels;
}

/**
 * Get critical path (longest dependency chain)
 */
export function getCriticalPath(activeAgents: AgentName[]): {
  path: AgentName[];
  estimatedDuration: number;
} {
  const graph = buildDependencyGraph(activeAgents);

  // Find leaf with maximum depth
  let longestPath: AgentName[] = [];
  let maxDuration = 0;

  graph.leaves.forEach((leaf) => {
    const path: AgentName[] = [];
    const durations: number[] = [];
    let current: AgentName | undefined = leaf;

    while (current) {
      path.unshift(current);
      durations.unshift(AGENT_CONFIGS[current].timeout);

      const node: DependencyNode = graph.nodes.get(current)!;
      // Choose dependency with maximum depth
      current = node.dependencies.reduce((max: AgentName | undefined, dep) => {
        const depNode = graph.nodes.get(dep)!;
        const maxNode = max ? graph.nodes.get(max)! : null;
        return !maxNode || depNode.depth > maxNode.depth ? dep : max;
      }, undefined);
    }

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    if (totalDuration > maxDuration) {
      maxDuration = totalDuration;
      longestPath = path;
    }
  });

  return { path: longestPath, estimatedDuration: maxDuration };
}

/**
 * Detect circular dependencies
 */
export function detectCircularDependencies(activeAgents: AgentName[]): {
  hasCycle: boolean;
  cycles: AgentName[][];
} {
  const cycles: AgentName[][] = [];
  const visited = new Set<AgentName>();
  const recursionStack: AgentName[] = [];

  const dfs = (agent: AgentName): boolean => {
    if (recursionStack.includes(agent)) {
      // Found cycle
      const cycleStart = recursionStack.indexOf(agent);
      cycles.push([...recursionStack.slice(cycleStart), agent]);
      return true;
    }

    if (visited.has(agent)) return false;

    visited.add(agent);
    recursionStack.push(agent);

    const config = AGENT_CONFIGS[agent];
    const hasCycle = config.dependencies
      .filter((dep) => activeAgents.includes(dep))
      .some((dep) => dfs(dep));

    recursionStack.pop();
    return hasCycle;
  };

  activeAgents.forEach((agent) => {
    if (!visited.has(agent)) {
      dfs(agent);
    }
  });

  return { hasCycle: cycles.length > 0, cycles };
}

/**
 * Find agents that can be parallelized
 */
export function findParallelizableAgents(activeAgents: AgentName[]): Map<AgentName, AgentName[]> {
  const graph = buildDependencyGraph(activeAgents);
  const parallelMap = new Map<AgentName, AgentName[]>();

  graph.nodes.forEach((node) => {
    parallelMap.set(node.agent, node.canRunInParallel);
  });

  return parallelMap;
}

/**
 * Optimize execution order for maximum parallelism
 */
export function optimizeExecutionOrder(activeAgents: AgentName[]): {
  optimizedLevels: AgentName[][];
  parallelizationScore: number;
  estimatedDuration: number;
} {
  const levels = getParallelExecutionLevels(activeAgents);

  // Calculate parallelization score (average agents per level)
  const parallelizationScore =
    levels.reduce((sum, level) => sum + level.length, 0) / levels.length;

  // Calculate estimated duration (sum of max timeout per level)
  const estimatedDuration = levels.reduce((sum, level) => {
    const maxTimeout = Math.max(...level.map((agent) => AGENT_CONFIGS[agent].timeout));
    return sum + maxTimeout;
  }, 0);

  return {
    optimizedLevels: levels,
    parallelizationScore: Math.round(parallelizationScore * 100) / 100,
    estimatedDuration,
  };
}

/**
 * Get agents that must run before a specific agent
 */
export function getPrerequisites(agent: AgentName, activeAgents: AgentName[]): AgentName[] {
  const prerequisites = new Set<AgentName>();

  const collectDeps = (current: AgentName) => {
    const config = AGENT_CONFIGS[current];
    config.dependencies
      .filter((dep) => activeAgents.includes(dep))
      .forEach((dep) => {
        if (!prerequisites.has(dep)) {
          prerequisites.add(dep);
          collectDeps(dep);
        }
      });
  };

  collectDeps(agent);
  return Array.from(prerequisites);
}

/**
 * Get agents that depend on a specific agent
 */
export function getDependents(agent: AgentName, activeAgents: AgentName[]): AgentName[] {
  const dependents = new Set<AgentName>();

  const collectDependents = (current: AgentName) => {
    activeAgents.forEach((candidate) => {
      const config = AGENT_CONFIGS[candidate];
      if (config.dependencies.includes(current) && !dependents.has(candidate)) {
        dependents.add(candidate);
        collectDependents(candidate);
      }
    });
  };

  collectDependents(agent);
  return Array.from(dependents);
}

/**
 * Calculate impact of agent failure
 */
export function calculateFailureImpact(agent: AgentName, activeAgents: AgentName[]): {
  blockedAgents: AgentName[];
  impactPercentage: number;
  canContinue: boolean;
} {
  const blockedAgents = getDependents(agent, activeAgents);
  const impactPercentage = Math.round((blockedAgents.length / activeAgents.length) * 100);

  const config = AGENT_CONFIGS[agent];
  const canContinue = config.optional;

  return { blockedAgents, impactPercentage, canContinue };
}

/**
 * Suggest alternative execution paths if agent fails
 */
export function suggestAlternativePath(
  failedAgent: AgentName,
  activeAgents: AgentName[]
): {
  canContinue: boolean;
  remainingAgents: AgentName[];
  alternativePath: AgentName[][];
} {
  const config = AGENT_CONFIGS[failedAgent];

  if (!config.optional) {
    return {
      canContinue: false,
      remainingAgents: [],
      alternativePath: [],
    };
  }

  // Remove failed agent and its dependents
  const blockedAgents = new Set([failedAgent, ...getDependents(failedAgent, activeAgents)]);
  const remainingAgents = activeAgents.filter((agent) => !blockedAgents.has(agent));

  const alternativePath = getParallelExecutionLevels(remainingAgents);

  return {
    canContinue: true,
    remainingAgents,
    alternativePath,
  };
}

/**
 * Validate dependency configuration
 */
export function validateDependencies(activeAgents: AgentName[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check circular dependencies
  const { hasCycle, cycles } = detectCircularDependencies(activeAgents);
  if (hasCycle) {
    cycles.forEach((cycle) => {
      errors.push(`Circular dependency: ${cycle.join(" -> ")}`);
    });
  }

  // Check for missing dependencies
  activeAgents.forEach((agent) => {
    const config = AGENT_CONFIGS[agent];
    config.dependencies.forEach((dep) => {
      if (!activeAgents.includes(dep)) {
        warnings.push(`${agent} depends on ${dep}, but ${dep} is not active`);
      }
    });
  });

  // Check for orphaned agents (no dependencies and no dependents)
  const graph = buildDependencyGraph(activeAgents);
  graph.nodes.forEach((node) => {
    if (node.dependencies.length === 0 && node.dependents.length === 0 && activeAgents.length > 1) {
      warnings.push(`${node.agent} has no dependencies or dependents (orphaned)`);
    }
  });

  // Suggest parallelization opportunities
  const parallelizable = findParallelizableAgents(activeAgents);
  parallelizable.forEach((parallel, agent) => {
    if (parallel.length > 0) {
      suggestions.push(`${agent} can run in parallel with: ${parallel.join(", ")}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Generate visual dependency graph (Mermaid format)
 */
export function generateDependencyDiagram(activeAgents: AgentName[]): string {
  const graph = buildDependencyGraph(activeAgents);

  let mermaid = "graph TD\n";

  // Add all nodes with styling by phase
  graph.nodes.forEach((node) => {
    const config = AGENT_CONFIGS[node.agent];
    const phaseColors: Record<string, string> = {
      discovery: "#E3F2FD",
      planning: "#F3E5F5",
      design: "#FFF3E0",
      development: "#E8F5E9",
      testing: "#FFF9C4",
      security: "#FFEBEE",
      infrastructure: "#E0F2F1",
      integration: "#F1F8E9",
      documentation: "#FCE4EC",
    };

    const color = phaseColors[config.phase] || "#F5F5F5";
    mermaid += `  ${node.agent}[${node.agent}]:::${config.phase}\n`;
  });

  // Add dependencies as edges
  graph.nodes.forEach((node) => {
    node.dependencies.forEach((dep) => {
      mermaid += `  ${dep} --> ${node.agent}\n`;
    });
  });

  // Add styling
  mermaid += "\n";
  mermaid += "classDef discovery fill:#E3F2FD,stroke:#1976D2\n";
  mermaid += "classDef planning fill:#F3E5F5,stroke:#7B1FA2\n";
  mermaid += "classDef design fill:#FFF3E0,stroke:#F57C00\n";
  mermaid += "classDef development fill:#E8F5E9,stroke:#388E3C\n";
  mermaid += "classDef testing fill:#FFF9C4,stroke:#F9A825\n";
  mermaid += "classDef security fill:#FFEBEE,stroke:#D32F2F\n";
  mermaid += "classDef infrastructure fill:#E0F2F1,stroke:#00796B\n";
  mermaid += "classDef integration fill:#F1F8E9,stroke:#689F38\n";
  mermaid += "classDef documentation fill:#FCE4EC,stroke:#C2185B\n";

  return mermaid;
}
