/**
 * Test Strategy - Comprehensive testing strategy and test generation patterns
 */

export type TestLevel = "unit" | "integration" | "e2e" | "performance" | "visual" | "accessibility";
export type TestFramework = "jest" | "vitest" | "playwright" | "cypress" | "k6";

export interface TestStrategy {
  projectType: "web_app" | "mobile_app" | "api" | "web3_dapp";
  coverage: {
    unit: number;
    integration: number;
    e2e: number;
  };
  frameworks: {
    unit: string;
    integration: string;
    e2e: string;
  };
  priorities: TestPriority[];
}

export interface TestPriority {
  feature: string;
  risk: "critical" | "high" | "medium" | "low";
  testLevels: TestLevel[];
  effort: number; // hours
}

/**
 * Test Pyramid Strategy
 */
export const testPyramidStrategy = {
  description: "Standard test pyramid for balanced test coverage",

  /**
   * Test distribution
   */
  distribution: {
    unit: {
      percentage: 70,
      description: "Fast, isolated tests for individual functions/components",
      tools: ["Jest", "Vitest", "React Testing Library"],
      examples: [
        "Pure function logic",
        "Component rendering",
        "State management",
        "Utility functions",
        "Validation logic",
      ],
    },

    integration: {
      percentage: 20,
      description: "Tests for interactions between modules",
      tools: ["Jest", "Supertest", "React Testing Library"],
      examples: [
        "API endpoint tests",
        "Database interactions",
        "Component interactions",
        "Service integration",
        "Authentication flows",
      ],
    },

    e2e: {
      percentage: 10,
      description: "Full user journey tests",
      tools: ["Playwright", "Cypress", "Puppeteer"],
      examples: [
        "User registration flow",
        "Checkout process",
        "Critical user paths",
        "Cross-browser testing",
        "Mobile responsive tests",
      ],
    },
  },

  /**
   * Coverage targets
   */
  coverageTargets: {
    overall: {
      minimum: 80,
      target: 85,
      excellent: 90,
    },
    critical: {
      minimum: 95,
      target: 98,
      excellent: 100,
    },
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
};

/**
 * Risk-based test prioritization
 */
export const riskBasedPrioritization = {
  /**
   * Risk assessment matrix
   */
  matrix: [
    {
      feature: "User Authentication",
      businessImpact: "critical",
      technicalComplexity: "high",
      changeFrequency: "low",
      riskScore: 9,
      testStrategy: ["unit", "integration", "e2e", "security"],
      coverageTarget: 100,
    },
    {
      feature: "Payment Processing",
      businessImpact: "critical",
      technicalComplexity: "high",
      changeFrequency: "medium",
      riskScore: 10,
      testStrategy: ["unit", "integration", "e2e", "security"],
      coverageTarget: 100,
    },
    {
      feature: "Data Display",
      businessImpact: "medium",
      technicalComplexity: "low",
      changeFrequency: "high",
      riskScore: 5,
      testStrategy: ["unit", "integration"],
      coverageTarget: 80,
    },
    {
      feature: "Admin Dashboard",
      businessImpact: "high",
      technicalComplexity: "medium",
      changeFrequency: "medium",
      riskScore: 7,
      testStrategy: ["unit", "integration", "e2e"],
      coverageTarget: 90,
    },
  ],

  /**
   * Risk calculation formula
   */
  calculateRisk: `function calculateRiskScore(
  businessImpact: 1-5,
  technicalComplexity: 1-5,
  changeFrequency: 1-5
): number {
  // Risk = (Business Impact * 0.5) + (Technical Complexity * 0.3) + (Change Frequency * 0.2)
  return (businessImpact * 0.5) + (technicalComplexity * 0.3) + (changeFrequency * 0.2);
}

// Risk scores:
// 9-10: Critical (100% coverage, all test types)
// 7-8: High (90% coverage, unit + integration + e2e)
// 5-6: Medium (80% coverage, unit + integration)
// 3-4: Low (70% coverage, unit tests)
// 1-2: Minimal (60% coverage, basic unit tests)`,
};

/**
 * Unit test patterns
 */
export const unitTestPatterns = {
  /**
   * Jest/Vitest basic setup
   */
  jestSetup: `// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // or 'node' for backend
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\\\.(css|less|scss)$': 'identity-obj-proxy',
  },
};`,

  /**
   * React component test
   */
  reactComponentTest: `import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Loading...');
  });
});`,

  /**
   * Pure function test
   */
  pureFunctionTest: `import { calculateTotal, formatCurrency } from './utils';

describe('calculateTotal', () => {
  it('calculates total for single item', () => {
    const items = [{ price: 10, quantity: 2 }];
    expect(calculateTotal(items)).toBe(20);
  });

  it('calculates total for multiple items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ];
    expect(calculateTotal(items)).toBe(35);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('handles decimal prices correctly', () => {
    const items = [{ price: 10.99, quantity: 3 }];
    expect(calculateTotal(items)).toBeCloseTo(32.97);
  });
});

describe('formatCurrency', () => {
  it('formats USD currency', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('formats EUR currency', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});`,

  /**
   * Async function test
   */
  asyncFunctionTest: `import { fetchUser, createUser } from './api';

describe('fetchUser', () => {
  it('fetches user successfully', async () => {
    const user = await fetchUser(1);
    expect(user).toEqual({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('throws error for invalid user ID', async () => {
    await expect(fetchUser(999)).rejects.toThrow('User not found');
  });
});

describe('createUser', () => {
  it('creates user and returns ID', async () => {
    const userData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
    };

    const userId = await createUser(userData);
    expect(userId).toBeGreaterThan(0);
  });

  it('validates required fields', async () => {
    const invalidData = { name: 'Jane' };
    await expect(createUser(invalidData)).rejects.toThrow('Email is required');
  });
});`,

  /**
   * Hook test
   */
  hookTest: `import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('resets count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(5);
  });
});`,
};

/**
 * Integration test patterns
 */
export const integrationTestPatterns = {
  /**
   * API endpoint test
   */
  apiEndpointTest: `import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('POST /api/users', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(response.body.password).toBeUndefined();
  });

  it('returns 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'invalid-email',
        name: 'Test User',
        password: 'Password123!',
      })
      .expect(400);

    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toContainEqual({
      field: 'email',
      message: expect.stringContaining('email'),
    });
  });

  it('returns 409 for duplicate email', async () => {
    // Create first user
    await request(app)
      .post('/api/users')
      .send({
        email: 'duplicate@example.com',
        name: 'User 1',
        password: 'Password123!',
      });

    // Try to create duplicate
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'duplicate@example.com',
        name: 'User 2',
        password: 'Password123!',
      })
      .expect(409);

    expect(response.body.error).toContain('already exists');
  });
});`,

  /**
   * Database integration test
   */
  databaseTest: `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('User Repository', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$executeRaw\`CREATE SCHEMA IF NOT EXISTS test\`;
  });

  beforeEach(async () => {
    // Clear data before each test
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates user with hashed password', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
      },
    });

    expect(user.password).not.toBe('plain_password');
    expect(user.password).toHaveLength(60); // bcrypt hash length
  });

  it('fetches user with posts', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        posts: {
          create: [
            { title: 'Post 1', content: 'Content 1' },
            { title: 'Post 2', content: 'Content 2' },
          ],
        },
      },
      include: {
        posts: true,
      },
    });

    expect(user.posts).toHaveLength(2);
    expect(user.posts[0]).toMatchObject({
      title: 'Post 1',
      userId: user.id,
    });
  });

  it('deletes user and cascades to posts', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        posts: {
          create: [{ title: 'Post 1', content: 'Content 1' }],
        },
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const posts = await prisma.post.findMany({
      where: { userId: user.id },
    });
    expect(posts).toHaveLength(0);
  });
});`,

  /**
   * Authentication flow test
   */
  authFlowTest: `import request from 'supertest';
import { app } from '../app';

describe('Authentication Flow', () => {
  let authToken: string;

  it('registers new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('logs in with correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      })
      .expect(200);

    authToken = response.body.accessToken;
    expect(authToken).toBeTruthy();
  });

  it('returns 401 for incorrect password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      })
      .expect(401);
  });

  it('accesses protected route with token', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', \`Bearer \${authToken}\`)
      .expect(200);

    expect(response.body).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  it('returns 401 for missing token', async () => {
    await request(app).get('/api/profile').expect(401);
  });

  it('refreshes access token', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      });

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: loginResponse.body.refreshToken,
      })
      .expect(200);

    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.accessToken).not.toBe(loginResponse.body.accessToken);
  });
});`,
};

/**
 * E2E test patterns
 */
export const e2eTestPatterns = {
  /**
   * Playwright setup
   */
  playwrightSetup: `// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});`,

  /**
   * User journey test
   */
  userJourneyTest: `import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('completes full registration', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Fill in form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'Password123!');
    await page.fill('[name="name"]', 'Test User');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify welcome message
    await expect(page.locator('h1')).toContainText('Welcome, Test User');

    // Verify user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('shows validation errors', async ({ page }) => {
    await page.goto('/register');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Check for error messages
    await expect(page.locator('.error')).toContainText('Email is required');
    await expect(page.locator('.error')).toContainText('Password is required');
  });

  test('prevents duplicate registration', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'Password123!');
    await page.fill('[name="name"]', 'Existing User');

    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('Email already exists');
  });
});`,

  /**
   * Checkout flow test
   */
  checkoutFlowTest: `import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('completes purchase', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/1');
    await page.click('[data-testid="add-to-cart"]');

    // Verify cart badge
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');

    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page).toHaveURL('/cart');

    // Verify cart contents
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);

    // Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    await expect(page).toHaveURL('/checkout');

    // Fill shipping info
    await page.fill('[name="address"]', '123 Main St');
    await page.fill('[name="city"]', 'New York');
    await page.fill('[name="zipCode"]', '10001');

    // Fill payment info (test card)
    await page.fill('[name="cardNumber"]', '4242424242424242');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvc"]', '123');

    // Complete purchase
    await page.click('[data-testid="place-order"]');

    // Wait for success page
    await page.waitForURL('/order-confirmation');

    // Verify order confirmation
    await expect(page.locator('h1')).toContainText('Order Confirmed');
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
  });
});`,
};

/**
 * Test best practices
 */
export const testBestPractices = {
  general: [
    "Follow AAA pattern: Arrange, Act, Assert",
    "One assertion per test (when possible)",
    "Use descriptive test names",
    "Keep tests independent and isolated",
    "Don't test implementation details",
    "Use beforeEach/afterEach for setup/teardown",
  ],

  naming: [
    "Use 'describe' for grouping related tests",
    "Use 'it' or 'test' for individual test cases",
    "Name tests: 'it should [expected behavior] when [condition]'",
    "Be specific: 'calculates total for empty cart' not 'works'",
  ],

  dataManagement: [
    "Use factories for test data",
    "Use Faker.js for realistic fake data",
    "Clear database between tests",
    "Use transactions for database tests",
    "Mock external dependencies",
  ],

  performance: [
    "Run unit tests in parallel",
    "Limit E2E tests (expensive)",
    "Use test.only during development",
    "Skip slow tests locally with test.skip",
    "Set appropriate timeouts",
  ],

  maintenance: [
    "Refactor tests along with code",
    "Remove obsolete tests",
    "Fix flaky tests immediately",
    "Keep tests DRY with helpers",
    "Update tests when requirements change",
  ],
};

/**
 * Generate test strategy
 */
export function generateTestStrategy(projectType: string): TestStrategy {
  const strategies: Record<string, TestStrategy> = {
    web_app: {
      projectType: "web_app",
      coverage: {
        unit: 80,
        integration: 70,
        e2e: 60,
      },
      frameworks: {
        unit: "Vitest + React Testing Library",
        integration: "Vitest + Supertest",
        e2e: "Playwright",
      },
      priorities: [
        {
          feature: "Authentication",
          risk: "critical",
          testLevels: ["unit", "integration", "e2e"],
          effort: 8,
        },
        {
          feature: "Core User Flows",
          risk: "critical",
          testLevels: ["unit", "integration", "e2e"],
          effort: 16,
        },
        {
          feature: "API Endpoints",
          risk: "high",
          testLevels: ["unit", "integration"],
          effort: 12,
        },
      ],
    },

    api: {
      projectType: "api",
      coverage: {
        unit: 85,
        integration: 80,
        e2e: 50,
      },
      frameworks: {
        unit: "Jest",
        integration: "Supertest",
        e2e: "Postman/Newman",
      },
      priorities: [
        {
          feature: "Authentication & Authorization",
          risk: "critical",
          testLevels: ["unit", "integration"],
          effort: 8,
        },
        {
          feature: "CRUD Operations",
          risk: "high",
          testLevels: ["unit", "integration"],
          effort: 12,
        },
        {
          feature: "Data Validation",
          risk: "high",
          testLevels: ["unit", "integration"],
          effort: 6,
        },
      ],
    },
  };

  return strategies[projectType] || strategies.web_app;
}
