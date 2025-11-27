/**
 * Test Data Management - Test data generation, factories, and mocking patterns
 */

import type { TestLevel } from './test-strategy';

export interface FactoryDefinition {
  name: string;
  fields: FactoryField[];
  traits?: Record<string, Partial<Record<string, any>>>;
}

export interface FactoryField {
  name: string;
  generator: string;
  defaultValue?: any;
}

/**
 * Test data generation with Faker
 */
export const fakerPatterns = {
  /**
   * Setup
   */
  setup: `import { faker } from '@faker-js/faker';

// Set seed for reproducible tests
faker.seed(123);

// Generate consistent data in tests
const user = {
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  avatar: faker.image.avatar(),
  createdAt: faker.date.past(),
};`,

  /**
   * User data
   */
  userData: `import { faker } from '@faker-js/faker';

export function generateUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    username: faker.internet.userName(),
    password: faker.internet.password(),
    avatar: faker.image.avatar(),
    bio: faker.lorem.paragraph(),
    role: faker.helpers.arrayElement(['user', 'admin', 'moderator']),
    isActive: faker.datatype.boolean(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

// Usage
const user = generateUser({ role: 'admin', isActive: true });`,

  /**
   * Product data
   */
  productData: `import { faker } from '@faker-js/faker';

export function generateProduct(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price()),
    category: faker.commerce.department(),
    sku: faker.string.alphanumeric(8).toUpperCase(),
    stock: faker.number.int({ min: 0, max: 1000 }),
    images: faker.helpers.multiple(() => faker.image.url(), { count: 3 }),
    rating: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
    reviews: faker.number.int({ min: 0, max: 500 }),
    inStock: faker.datatype.boolean(),
    ...overrides,
  };
}`,

  /**
   * Address data
   */
  addressData: `import { faker } from '@faker-js/faker';

export function generateAddress(overrides = {}) {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),
    ...overrides,
  };
}`,

  /**
   * Array of data
   */
  arrayData: `import { faker } from '@faker-js/faker';

// Generate array of users
const users = faker.helpers.multiple(generateUser, {
  count: { min: 5, max: 10 },
});

// Generate exact number
const products = Array.from({ length: 20 }, () => generateProduct());`,
};

/**
 * Factory pattern
 */
export const factoryPatterns = {
  /**
   * Basic factory
   */
  basicFactory: `// userFactory.ts
import { faker } from '@faker-js/faker';

class UserFactory {
  private defaults = {
    id: () => faker.string.uuid(),
    email: () => faker.internet.email(),
    name: () => faker.person.fullName(),
    role: 'user',
    isActive: true,
  };

  build(overrides = {}) {
    const user = {};
    for (const [key, value] of Object.entries(this.defaults)) {
      user[key] = typeof value === 'function' ? value() : value;
    }
    return { ...user, ...overrides };
  }

  buildMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  async create(overrides = {}) {
    const user = this.build(overrides);
    return await prisma.user.create({ data: user });
  }

  async createMany(count: number, overrides = {}) {
    const users = this.buildMany(count, overrides);
    return await prisma.user.createMany({ data: users });
  }
}

export const userFactory = new UserFactory();

// Usage
const user = userFactory.build({ role: 'admin' });
const users = userFactory.buildMany(5);
const savedUser = await userFactory.create({ email: 'test@example.com' });`,

  /**
   * Factory with traits
   */
  factoryWithTraits: `// postFactory.ts
import { faker } from '@faker-js/faker';

class PostFactory {
  private defaults = {
    id: () => faker.string.uuid(),
    title: () => faker.lorem.sentence(),
    content: () => faker.lorem.paragraphs(3),
    published: false,
    views: 0,
    userId: null,
  };

  private traits = {
    published: {
      published: true,
      publishedAt: () => faker.date.past(),
    },
    popular: {
      views: () => faker.number.int({ min: 1000, max: 10000 }),
      likes: () => faker.number.int({ min: 100, max: 1000 }),
    },
    withUser: {
      userId: () => faker.string.uuid(),
    },
  };

  build(overrides = {}, traitNames: string[] = []) {
    let data = {};

    // Apply defaults
    for (const [key, value] of Object.entries(this.defaults)) {
      data[key] = typeof value === 'function' ? value() : value;
    }

    // Apply traits
    for (const traitName of traitNames) {
      const trait = this.traits[traitName];
      if (trait) {
        for (const [key, value] of Object.entries(trait)) {
          data[key] = typeof value === 'function' ? value() : value;
        }
      }
    }

    // Apply overrides
    return { ...data, ...overrides };
  }
}

export const postFactory = new PostFactory();

// Usage
const draft = postFactory.build();
const published = postFactory.build({}, ['published']);
const popularPost = postFactory.build({}, ['published', 'popular']);`,

  /**
   * Factory with relations
   */
  factoryWithRelations: `// Factories with relationships
class OrderFactory {
  build(overrides = {}) {
    return {
      id: faker.string.uuid(),
      userId: userFactory.build().id,
      items: orderItemFactory.buildMany(3),
      total: faker.number.float({ min: 10, max: 1000, precision: 0.01 }),
      status: faker.helpers.arrayElement(['pending', 'processing', 'completed']),
      ...overrides,
    };
  }

  async create(overrides = {}) {
    // Create user first
    const user = await userFactory.create();

    // Create order with items
    const order = await prisma.order.create({
      data: {
        ...this.build({ userId: user.id }),
        ...overrides,
      },
    });

    return order;
  }
}`,
};

/**
 * Mock Service Worker (MSW) patterns
 */
export const mswPatterns = {
  /**
   * MSW setup
   */
  setup: `// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // GET /api/users
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Doe', email: 'jane@example.com' },
        ],
      })
    );
  }),

  // GET /api/users/:id
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;

    if (id === '999') {
      return res(
        ctx.status(404),
        ctx.json({ error: 'User not found' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        id: Number(id),
        name: 'John Doe',
        email: 'john@example.com',
      })
    );
  }),

  // POST /api/users
  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        id: Math.floor(Math.random() * 1000),
        ...body,
      })
    );
  }),

  // Error simulation
  rest.get('/api/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    );
  }),
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// jest.setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());`,

  /**
   * Dynamic response
   */
  dynamicResponse: `import { rest } from 'msw';

// Paginated response
rest.get('/api/posts', (req, res, ctx) => {
  const page = req.url.searchParams.get('page') || '1';
  const limit = req.url.searchParams.get('limit') || '10';

  const posts = postFactory.buildMany(Number(limit));

  return res(
    ctx.status(200),
    ctx.json({
      data: posts,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: 100,
      },
    })
  );
});

// Delayed response (simulate slow network)
rest.get('/api/slow', (req, res, ctx) => {
  return res(
    ctx.delay(2000),
    ctx.status(200),
    ctx.json({ message: 'Slow response' })
  );
});

// Conditional response
rest.post('/api/login', async (req, res, ctx) => {
  const { email, password } = await req.json();

  if (email === 'test@example.com' && password === 'password') {
    return res(
      ctx.status(200),
      ctx.json({
        accessToken: 'mock-jwt-token',
        user: { id: 1, email },
      })
    );
  }

  return res(
    ctx.status(401),
    ctx.json({ error: 'Invalid credentials' })
  );
});`,

  /**
   * Override handler in test
   */
  overrideHandler: `import { server } from './mocks/server';
import { rest } from 'msw';

test('handles API error', async () => {
  // Override handler for this test
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(
        ctx.status(500),
        ctx.json({ error: 'Server error' })
      );
    })
  );

  // Test error handling
  const { getByText } = render(<UserList />);
  await waitFor(() => {
    expect(getByText('Failed to load users')).toBeInTheDocument();
  });
});`,
};

/**
 * Test fixtures
 */
export const testFixtures = {
  /**
   * JSON fixtures
   */
  jsonFixtures: `// fixtures/users.json
{
  "users": [
    {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin"
    },
    {
      "id": 2,
      "email": "user@example.com",
      "name": "Regular User",
      "role": "user"
    }
  ]
}

// Load in test
import users from './fixtures/users.json';

test('displays user list', () => {
  render(<UserList users={users.users} />);
  expect(screen.getByText('Admin User')).toBeInTheDocument();
});`,

  /**
   * Database fixtures
   */
  databaseFixtures: `// fixtures/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase() {
  // Clear existing data
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      name: 'User 1',
      password: 'hashed_password',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      name: 'User 2',
      password: 'hashed_password',
    },
  });

  // Create posts
  await prisma.post.createMany({
    data: [
      {
        title: 'Post 1',
        content: 'Content 1',
        userId: user1.id,
        published: true,
      },
      {
        title: 'Post 2',
        content: 'Content 2',
        userId: user2.id,
        published: false,
      },
    ],
  });
}

export async function clearDatabase() {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}

// In tests
beforeEach(async () => {
  await seedDatabase();
});

afterEach(async () => {
  await clearDatabase();
});`,

  /**
   * Snapshot fixtures
   */
  snapshotFixtures: `// Component snapshot test
import { render } from '@testing-library/react';
import { UserCard } from './UserCard';

test('matches snapshot', () => {
  const user = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.jpg',
  };

  const { container } = render(<UserCard user={user} />);
  expect(container.firstChild).toMatchSnapshot();
});

// Update snapshots: jest --updateSnapshot`,
};

/**
 * Custom test utilities
 */
export const customTestUtilities = {
  /**
   * Custom render with providers
   */
  customRender: `// test-utils.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

export function renderWithProviders(ui: React.ReactElement, options = {}) {
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Usage
import { renderWithProviders } from './test-utils';

test('renders component', () => {
  renderWithProviders(<MyComponent />);
});`,

  /**
   * Custom matchers
   */
  customMatchers: `// custom-matchers.ts
import { expect } from '@jest/globals';

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          \`expected \${received} not to be within range \${floor} - \${ceiling}\`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          \`expected \${received} to be within range \${floor} - \${ceiling}\`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      message: () =>
        pass
          ? \`expected \${received} not to be a valid email\`
          : \`expected \${received} to be a valid email\`,
      pass,
    };
  },
});

// Usage
test('validates email', () => {
  expect('user@example.com').toBeValidEmail();
  expect(42).toBeWithinRange(40, 50);
});`,

  /**
   * Wait helpers
   */
  waitHelpers: `import { waitFor } from '@testing-library/react';

// Wait for element to appear
export async function waitForElement(getElement: () => HTMLElement, timeout = 3000) {
  await waitFor(() => {
    expect(getElement()).toBeInTheDocument();
  }, { timeout });
}

// Wait for loading to complete
export async function waitForLoading() {
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
}

// Wait for API call
export async function waitForApiCall(mockFn: jest.Mock) {
  await waitFor(() => {
    expect(mockFn).toHaveBeenCalled();
  });
}

// Usage
test('loads data', async () => {
  render(<UserList />);
  await waitForLoading();
  await waitForElement(() => screen.getByText('John Doe'));
});`,
};

/**
 * Test data best practices
 */
export const testDataBestPractices = {
  generation: [
    "Use Faker.js for realistic fake data",
    "Set seed for reproducible tests",
    "Use factories for complex objects",
    "Create traits for common variations",
    "Generate data close to production shape",
  ],

  fixtures: [
    "Keep fixtures small and focused",
    "Use JSON fixtures for static data",
    "Seed database for integration tests",
    "Clear data between tests",
    "Version control fixtures",
  ],

  mocking: [
    "Use MSW for API mocking",
    "Mock at the network level, not implementation",
    "Simulate errors and edge cases",
    "Test loading states with delays",
    "Reset mocks between tests",
  ],

  maintenance: [
    "Update test data when models change",
    "Remove unused fixtures",
    "Keep factories in sync with schemas",
    "Document special test cases",
    "Review and refactor regularly",
  ],
};

/**
 * Generate factory
 */
export function generateFactory(definition: FactoryDefinition): string {
  return `import { faker } from '@faker-js/faker';

class ${capitalize(definition.name)}Factory {
  private defaults = {
${definition.fields.map(field => `    ${field.name}: ${field.generator},`).join('\n')}
  };

  ${definition.traits ? `private traits = ${JSON.stringify(definition.traits, null, 2)};` : ''}

  build(overrides = {}) {
    const obj = {};
    for (const [key, value] of Object.entries(this.defaults)) {
      obj[key] = typeof value === 'function' ? value() : value;
    }
    return { ...obj, ...overrides };
  }

  buildMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}

export const ${definition.name}Factory = new ${capitalize(definition.name)}Factory();
`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
