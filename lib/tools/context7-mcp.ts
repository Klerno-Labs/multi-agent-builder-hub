/**
 * Context7 MCP (Model Context Protocol) Integration
 * Provides access to up-to-date documentation for popular frameworks and libraries
 */

export interface DocumentationQuery {
  library: string;
  topic?: string;
  version?: string;
}

export interface DocumentationResult {
  success: boolean;
  library: string;
  content: string;
  url?: string;
  lastUpdated?: string;
  error?: string;
}

/**
 * Context7 MCP tool for accessing documentation
 * Currently simulates MCP responses - can be extended to use actual MCP server
 */
export class Context7MCP {
  private mcpEndpoint?: string;

  constructor(mcpEndpoint?: string) {
    this.mcpEndpoint = mcpEndpoint || process.env.CONTEXT7_MCP_ENDPOINT;
  }

  /**
   * Query documentation for a library/framework
   */
  async queryDocs(query: DocumentationQuery): Promise<DocumentationResult> {
    try {
      if (this.mcpEndpoint) {
        // Use actual MCP server if endpoint is configured
        return await this.queryMCPServer(query);
      } else {
        // Fallback to simulated documentation
        return await this.getSimulatedDocs(query);
      }
    } catch (error) {
      return {
        success: false,
        library: query.library,
        content: '',
        error: error instanceof Error ? error.message : 'Documentation lookup failed',
      };
    }
  }

  /**
   * Query actual MCP server (when configured)
   */
  private async queryMCPServer(query: DocumentationQuery): Promise<DocumentationResult> {
    if (!this.mcpEndpoint) {
      throw new Error('MCP endpoint not configured');
    }

    const response = await fetch(this.mcpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'docs/query',
        params: query,
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      success: true,
      library: query.library,
      content: data.result.content,
      url: data.result.url,
      lastUpdated: data.result.lastUpdated,
    };
  }

  /**
   * Get simulated documentation (fallback when MCP not configured)
   */
  private async getSimulatedDocs(query: DocumentationQuery): Promise<DocumentationResult> {
    const library = query.library.toLowerCase();
    const topic = query.topic?.toLowerCase();

    // Common documentation snippets
    const docs: Record<string, string> = {
      'next.js': `# Next.js Documentation

## Getting Started
Next.js is a React framework for building full-stack web applications.

## Key Features:
- **App Router**: File-based routing system
- **Server Components**: React Server Components by default
- **API Routes**: Built-in API endpoints
- **Image Optimization**: Automatic image optimization
- **TypeScript**: First-class TypeScript support

## Installation:
\`\`\`bash
npx create-next-app@latest my-app
cd my-app
npm run dev
\`\`\`

## Basic Page:
\`\`\`tsx
export default function Page() {
  return <h1>Hello, Next.js!</h1>
}
\`\`\`

Learn more: https://nextjs.org/docs`,

      'react': `# React Documentation

## Overview
React is a JavaScript library for building user interfaces.

## Core Concepts:
- **Components**: Reusable UI pieces
- **JSX**: JavaScript + XML syntax
- **Props**: Component inputs
- **State**: Component data that changes
- **Hooks**: useState, useEffect, useContext

## Example Component:
\`\`\`tsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
\`\`\`

Learn more: https://react.dev`,

      'typescript': `# TypeScript Documentation

## Overview
TypeScript is a typed superset of JavaScript.

## Key Features:
- **Static Typing**: Catch errors at compile time
- **Interfaces**: Define object shapes
- **Generics**: Reusable type-safe code
- **Type Inference**: Automatic type detection

## Basic Types:
\`\`\`typescript
let name: string = "Alice"
let age: number = 30
let active: boolean = true
let items: string[] = ["a", "b", "c"]

interface User {
  id: number
  name: string
  email: string
}
\`\`\`

Learn more: https://www.typescriptlang.org/docs`,

      'prisma': `# Prisma Documentation

## Overview
Prisma is a next-generation ORM for Node.js and TypeScript.

## Key Features:
- **Type-safe queries**: Auto-generated types
- **Migrations**: Database schema versioning
- **Prisma Studio**: Visual database browser

## Schema Example:
\`\`\`prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
\`\`\`

## Usage:
\`\`\`typescript
const user = await prisma.user.create({
  data: { email: "alice@example.com", name: "Alice" }
})
\`\`\`

Learn more: https://www.prisma.io/docs`,

      'tailwind': `# Tailwind CSS Documentation

## Overview
Tailwind is a utility-first CSS framework.

## Core Concepts:
- **Utility Classes**: Pre-built CSS classes
- **Responsive Design**: Mobile-first breakpoints
- **Dark Mode**: Built-in dark mode support

## Example:
\`\`\`html
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
    Hello World
  </h1>
  <p class="mt-2 text-gray-600 dark:text-gray-300">
    Welcome to Tailwind CSS
  </p>
</div>
\`\`\`

Learn more: https://tailwindcss.com/docs`,

      'express': `# Express.js Documentation

## Overview
Express is a minimal web framework for Node.js.

## Basic Server:
\`\`\`typescript
import express from 'express'

const app = express()
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' })
})

app.post('/users', async (req, res) => {
  // Create user
  res.status(201).json({ user: req.body })
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
\`\`\`

Learn more: https://expressjs.com`,
    };

    // Find matching documentation
    let content = docs[library];

    if (!content) {
      // Generic fallback
      content = `# ${query.library} Documentation

Documentation for ${query.library} is available online.

## Recommended Resources:
- Official documentation
- GitHub repository
- Community tutorials
- Stack Overflow

**Note:** For detailed documentation, please search online or use the web_search tool.`;
    }

    // Filter by topic if specified
    if (topic && content) {
      const sections = content.split('\n##');
      const matching = sections.find(s => s.toLowerCase().includes(topic));
      if (matching) {
        content = '##' + matching;
      }
    }

    return {
      success: true,
      library: query.library,
      content,
      url: docs[library] ? `https://docs.${library.replace('.', '')}.com` : undefined,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * List available documentation libraries
   */
  async listAvailableDocs(): Promise<string[]> {
    return [
      'Next.js',
      'React',
      'TypeScript',
      'Prisma',
      'Tailwind CSS',
      'Express',
      'Node.js',
      'PostgreSQL',
      'MongoDB',
      'GraphQL',
      'Jest',
      'Vitest',
      'Playwright',
      'Docker',
      'Kubernetes',
    ];
  }
}

/**
 * Create Context7 MCP instance
 */
export function createContext7MCP(endpoint?: string): Context7MCP {
  return new Context7MCP(endpoint);
}

/**
 * Quick documentation lookup
 */
export async function queryDocumentation(
  library: string,
  topic?: string
): Promise<DocumentationResult> {
  const mcp = createContext7MCP();
  return mcp.queryDocs({ library, topic });
}
