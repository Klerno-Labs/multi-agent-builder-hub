/**
 * Integration Testing - Contract tests, E2E tests, and mocking utilities
 */

export interface ContractTest {
  provider: string; // Service providing the API
  consumer: string; // Service consuming the API
  interaction: Interaction;
}

export interface Interaction {
  description: string;
  state?: string; // Provider state (e.g., "user exists")
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, any>;
  };
  expectedResponse: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
  };
}

export interface E2ETest {
  name: string;
  description: string;
  steps: E2EStep[];
  cleanup?: () => Promise<void>;
}

export interface E2EStep {
  name: string;
  action: () => Promise<void>;
  assertions: Array<() => Promise<void> | void>;
}

export interface MockConfig {
  endpoint: string;
  method: string;
  response: {
    status: number;
    body: any;
    delay?: number;
  };
  matcher?: (req: any) => boolean;
}

/**
 * Contract Test Builder
 * Implements consumer-driven contract testing
 */
export class ContractTestBuilder {
  private tests: ContractTest[] = [];

  /**
   * Add contract test
   */
  addContract(provider: string, consumer: string, interaction: Interaction): this {
    this.tests.push({
      provider,
      consumer,
      interaction,
    });
    return this;
  }

  /**
   * Generate contract test file
   */
  generateTestFile(provider: string, consumer: string): string {
    const contracts = this.tests.filter(
      (t) => t.provider === provider && t.consumer === consumer
    );

    let testFile = `/**
 * Contract Tests: ${provider} (Provider) ↔ ${consumer} (Consumer)
 * Generated contract tests following consumer-driven contract testing pattern
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('${provider} ↔ ${consumer} Contract Tests', () => {
`;

    contracts.forEach((contract, index) => {
      testFile += this.generateTestCase(contract, index);
    });

    testFile += `});
`;

    return testFile;
  }

  /**
   * Generate individual test case
   */
  private generateTestCase(contract: ContractTest, index: number): string {
    const { interaction } = contract;

    return `
  it('${interaction.description}', async () => {
    // ${interaction.state ? `Provider State: ${interaction.state}` : "No state required"}

    const response = await axios({
      method: '${interaction.request.method}',
      url: \`\${API_URL}${interaction.request.path}\`,
      ${interaction.request.headers ? `headers: ${JSON.stringify(interaction.request.headers)},` : ""}
      ${interaction.request.body ? `data: ${JSON.stringify(interaction.request.body)},` : ""}
      ${interaction.request.query ? `params: ${JSON.stringify(interaction.request.query)},` : ""}
      validateStatus: () => true, // Don't throw on error status
    });

    // Assertions
    expect(response.status).toBe(${interaction.expectedResponse.status});
    ${this.generateBodyAssertions(interaction.expectedResponse.body)}
  });
`;
  }

  /**
   * Generate body assertions
   */
  private generateBodyAssertions(expectedBody: any): string {
    if (!expectedBody) return "";

    let assertions = "";

    if (typeof expectedBody === "object") {
      Object.entries(expectedBody).forEach(([key, value]) => {
        assertions += `    expect(response.data.${key}).toBeDefined();\n`;
        if (typeof value !== "object") {
          assertions += `    expect(response.data.${key}).toBe(${JSON.stringify(value)});\n`;
        }
      });
    } else {
      assertions = `    expect(response.data).toBe(${JSON.stringify(expectedBody)});`;
    }

    return assertions;
  }

  /**
   * Get all contracts
   */
  getContracts(): ContractTest[] {
    return this.tests;
  }

  /**
   * Export contracts as JSON (for Pact compatibility)
   */
  exportPactFormat(provider: string, consumer: string): any {
    const contracts = this.tests.filter(
      (t) => t.provider === provider && t.consumer === consumer
    );

    return {
      consumer: { name: consumer },
      provider: { name: provider },
      interactions: contracts.map((c) => ({
        description: c.interaction.description,
        providerState: c.interaction.state,
        request: c.interaction.request,
        response: c.interaction.expectedResponse,
      })),
      metadata: {
        pactSpecification: { version: "2.0.0" },
      },
    };
  }
}

/**
 * E2E Test Builder
 */
export class E2ETestBuilder {
  private tests: E2ETest[] = [];

  /**
   * Add E2E test
   */
  addTest(test: E2ETest): this {
    this.tests.push(test);
    return this;
  }

  /**
   * Generate Playwright test file
   */
  generatePlaywrightTest(): string {
    let testFile = `/**
 * End-to-End Tests
 * Generated E2E tests using Playwright
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
`;

    this.tests.forEach((e2eTest) => {
      testFile += `
test.describe('${e2eTest.name}', () => {
  test('${e2eTest.description}', async ({ page }) => {
`;

      e2eTest.steps.forEach((step) => {
        testFile += `    // Step: ${step.name}\n`;
        testFile += `    // (Action implementation needed)\n\n`;
      });

      testFile += `  });
});
`;
    });

    return testFile;
  }

  /**
   * Generate Cypress test file
   */
  generateCypressTest(): string {
    let testFile = `/**
 * End-to-End Tests
 * Generated E2E tests using Cypress
 */

describe('E2E Tests', () => {
`;

    this.tests.forEach((e2eTest) => {
      testFile += `
  describe('${e2eTest.name}', () => {
    it('${e2eTest.description}', () => {
`;

      e2eTest.steps.forEach((step) => {
        testFile += `      // Step: ${step.name}\n`;
      });

      testFile += `    });
  });
`;
    });

    testFile += `});
`;

    return testFile;
  }

  /**
   * Get all tests
   */
  getTests(): E2ETest[] {
    return this.tests;
  }
}

/**
 * Mock Server Builder
 */
export class MockServerBuilder {
  private mocks: MockConfig[] = [];

  /**
   * Add mock endpoint
   */
  addMock(mock: MockConfig): this {
    this.mocks.push(mock);
    return this;
  }

  /**
   * Generate MSW (Mock Service Worker) handlers
   */
  generateMSWHandlers(): string {
    let handlers = `/**
 * Mock Service Worker Handlers
 * Generated API mocks for testing
 */

import { rest } from 'msw';

const baseURL = process.env.API_URL || 'http://localhost:3000';

export const handlers = [
`;

    this.mocks.forEach((mock) => {
      const method = mock.method.toLowerCase();
      handlers += `  rest.${method}(\`\${baseURL}${mock.endpoint}\`, async (req, res, ctx) => {
    ${mock.matcher ? "// Custom matcher logic\n" : ""}
    ${mock.response.delay ? `await ctx.delay(${mock.response.delay});\n` : ""}
    return res(
      ctx.status(${mock.response.status}),
      ctx.json(${JSON.stringify(mock.response.body, null, 2)})
    );
  }),

`;
    });

    handlers += `];
`;

    return handlers;
  }

  /**
   * Generate JSON Server config
   */
  generateJSONServerConfig(): string {
    const db: Record<string, any[]> = {};

    this.mocks.forEach((mock) => {
      if (mock.method === "GET" && Array.isArray(mock.response.body)) {
        const resourceName = mock.endpoint.split("/").filter(Boolean).pop();
        if (resourceName) {
          db[resourceName] = mock.response.body;
        }
      }
    });

    return JSON.stringify(db, null, 2);
  }

  /**
   * Generate Express mock server
   */
  generateExpressMockServer(): string {
    let server = `/**
 * Express Mock Server
 * Development mock server for testing integrations
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.MOCK_PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock endpoints
`;

    this.mocks.forEach((mock) => {
      const method = mock.method.toLowerCase();
      server += `
app.${method}('${mock.endpoint}', ${mock.response.delay ? "async " : ""}(req, res) => {
  ${mock.response.delay ? `await new Promise(resolve => setTimeout(resolve, ${mock.response.delay}));\n  ` : ""}res.status(${mock.response.status}).json(${JSON.stringify(mock.response.body)});
});
`;
    });

    server += `
app.listen(PORT, () => {
  console.log(\`Mock server running on http://localhost:\${PORT}\`);
});
`;

    return server;
  }

  /**
   * Get all mocks
   */
  getMocks(): MockConfig[] {
    return this.mocks;
  }
}

/**
 * Integration Test Fixtures
 */
export class TestFixtures {
  private fixtures: Record<string, any> = {};

  /**
   * Add fixture
   */
  add(name: string, data: any): this {
    this.fixtures[name] = data;
    return this;
  }

  /**
   * Get fixture
   */
  get(name: string): any {
    return this.fixtures[name];
  }

  /**
   * Generate fixture file
   */
  generateFixtureFile(): string {
    return `/**
 * Test Fixtures
 * Shared test data for integration tests
 */

export const fixtures = ${JSON.stringify(this.fixtures, null, 2)};

export function getFixture(name: string): any {
  return fixtures[name];
}
`;
  }
}

/**
 * Database Seeding for Integration Tests
 */
export class DatabaseSeeder {
  private seeds: Record<string, any[]> = {};

  /**
   * Add seed data
   */
  addSeed(table: string, data: any[]): this {
    this.seeds[table] = data;
    return this;
  }

  /**
   * Generate Prisma seed script
   */
  generatePrismaSeed(): string {
    let seed = `/**
 * Database Seed Script (Prisma)
 * Seeds database with test data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

`;

    Object.entries(this.seeds).forEach(([table, data]) => {
      seed += `  // Seed ${table}\n`;
      seed += `  const ${table}Data = ${JSON.stringify(data, null, 2)};\n`;
      seed += `  for (const item of ${table}Data) {
    await prisma.${table}.create({ data: item });
  }
  console.log(\`Seeded \${${table}Data.length} ${table}\`);

`;
    });

    seed += `  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

    return seed;
  }

  /**
   * Generate SQL seed script
   */
  generateSQLSeed(): string {
    let seed = `-- Database Seed Script (SQL)
-- Seeds database with test data

`;

    Object.entries(this.seeds).forEach(([table, data]) => {
      seed += `-- Seed ${table}\n`;
      data.forEach((item) => {
        const columns = Object.keys(item).join(", ");
        const values = Object.values(item)
          .map((v) => (typeof v === "string" ? `'${v}'` : v))
          .join(", ");
        seed += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
      });
      seed += `\n`;
    });

    return seed;
  }
}

/**
 * Smoke Test Generator
 * Quick tests to verify deployment
 */
export class SmokeTestGenerator {
  private endpoints: string[] = [];

  /**
   * Add endpoint to smoke test
   */
  addEndpoint(endpoint: string): this {
    this.endpoints.push(endpoint);
    return this;
  }

  /**
   * Generate smoke test script
   */
  generateSmokeTest(): string {
    let test = `/**
 * Smoke Tests
 * Quick tests to verify deployment is working
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function runSmokeTests() {
  console.log('Running smoke tests...\\n');

  let passed = 0;
  let failed = 0;

`;

    this.endpoints.forEach((endpoint) => {
      test += `  try {
    const response = await axios.get(\`\${BASE_URL}${endpoint}\`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ ${endpoint}');
      passed++;
    } else {
      console.log('❌ ${endpoint} - Status: ' + response.status);
      failed++;
    }
  } catch (error: any) {
    console.log('❌ ${endpoint} - Error: ' + error.message);
    failed++;
  }

`;
    });

    test += `  console.log(\`\\nResults: \${passed} passed, \${failed} failed\`);
  process.exit(failed > 0 ? 1 : 0);
}

runSmokeTests();
`;

    return test;
  }
}

/**
 * Load Test Generator
 * Generate load tests with k6 or Artillery
 */
export class LoadTestGenerator {
  private scenarios: LoadTestScenario[] = [];

  addScenario(scenario: LoadTestScenario): this {
    this.scenarios.push(scenario);
    return this;
  }

  /**
   * Generate k6 load test script
   */
  generateK6Script(): string {
    let script = `/**
 * Load Test Script (k6)
 * Tests system performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '3m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
`;

    this.scenarios.forEach((scenario) => {
      script += `  // Scenario: ${scenario.name}\n`;
      script += `  const response = http.${scenario.method.toLowerCase()}(\`\${BASE_URL}${scenario.endpoint}\`);\n`;
      script += `  check(response, {
    'status is ${scenario.expectedStatus}': (r) => r.status === ${scenario.expectedStatus},
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);

`;
    });

    script += `}
`;

    return script;
  }
}

export interface LoadTestScenario {
  name: string;
  endpoint: string;
  method: string;
  expectedStatus: number;
}
