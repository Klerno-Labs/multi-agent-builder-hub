/**
 * Visual & Accessibility Testing - Patterns for visual regression and a11y testing
 */

export interface VisualTestConfig {
  threshold: number; // 0-1, percentage of pixels that can differ
  browsers: string[];
  viewports: Viewport[];
}

export interface Viewport {
  width: number;
  height: number;
  name: string;
}

export interface A11yTestConfig {
  wcagLevel: "A" | "AA" | "AAA";
  rules: string[];
  exclude: string[];
}

/**
 * Visual regression testing patterns
 */
export const visualRegressionPatterns = {
  /**
   * Playwright visual comparison
   */
  playwrightVisual: `import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage looks correct', async ({ page }) => {
    await page.goto('/');

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow some difference
    });
  });

  test('matches on different viewports', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-desktop.png');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('homepage-tablet.png');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });

  test('component in different states', async ({ page }) => {
    await page.goto('/components/button');

    // Default state
    await expect(page.locator('.button')).toHaveScreenshot('button-default.png');

    // Hover state
    await page.locator('.button').hover();
    await expect(page.locator('.button')).toHaveScreenshot('button-hover.png');

    // Disabled state
    await page.click('[data-testid="toggle-disabled"]');
    await expect(page.locator('.button')).toHaveScreenshot('button-disabled.png');
  });

  test('hides dynamic content', async ({ page }) => {
    await page.goto('/dashboard');

    // Mask dynamic content
    await expect(page).toHaveScreenshot('dashboard.png', {
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="random-quote"]'),
      ],
    });
  });
});`,

  /**
   * Percy visual testing
   */
  percyVisual: `import percySnapshot from '@percy/playwright';
import { test } from '@playwright/test';

test.describe('Percy Visual Tests', () => {
  test('captures homepage', async ({ page }) => {
    await page.goto('/');
    await percySnapshot(page, 'Homepage');
  });

  test('captures with different widths', async ({ page }) => {
    await page.goto('/products');
    await percySnapshot(page, 'Product Page', {
      widths: [375, 768, 1024, 1920],
    });
  });

  test('captures component library', async ({ page }) => {
    await page.goto('/storybook');

    // Capture all button variants
    await percySnapshot(page, 'Buttons - Default');

    await page.click('[data-variant="primary"]');
    await percySnapshot(page, 'Buttons - Primary');

    await page.click('[data-variant="danger"]');
    await percySnapshot(page, 'Buttons - Danger');
  });

  test('captures with custom Percy CSS', async ({ page }) => {
    await page.goto('/dashboard');

    await percySnapshot(page, 'Dashboard', {
      percyCSS: \`
        [data-testid="timestamp"] { display: none; }
        [data-testid="avatar"] { visibility: hidden; }
      \`,
    });
  });
});`,

  /**
   * Chromatic with Storybook
   */
  chromaticStorybook: `// .storybook/main.ts
export default {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: '@storybook/react',
};

// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    chromatic: {
      viewports: [320, 768, 1024, 1920],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Click me',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading',
  },
};

// Run Chromatic
// npx chromatic --project-token=<your-token>`,

  /**
   * Storybook interaction tests
   */
  storybookInteraction: `// Button.stories.tsx
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export const WithInteraction: Story = {
  args: {
    children: 'Click me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find button
    const button = canvas.getByRole('button');

    // Verify initial state
    expect(button).toBeInTheDocument();

    // Simulate click
    await userEvent.click(button);

    // Verify result
    expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};`,
};

/**
 * Accessibility testing patterns
 */
export const accessibilityTestPatterns = {
  /**
   * axe-core with Jest
   */
  axeJest: `import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('checks specific WCAG rules', async () => {
    const { container } = render(<Button>Click me</Button>);

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'button-name': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('excludes certain elements', async () => {
    const { container } = render(<Dashboard />);

    const results = await axe(container, {
      exclude: [['.third-party-widget']],
    });

    expect(results).toHaveNoViolations();
  });
});`,

  /**
   * Playwright accessibility
   */
  playwrightA11y: `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('checks WCAG 2.1 Level AA', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('excludes third-party content', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .exclude('#ads-container')
      .exclude('.social-media-widgets')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('includes only specific regions', async ({ page }) => {
    await page.goto('/checkout');

    const results = await new AxeBuilder({ page })
      .include('#payment-form')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});`,

  /**
   * Keyboard navigation testing
   */
  keyboardNavigation: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Keyboard Navigation', () => {
  it('navigates form with Tab key', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    // Start at email input
    emailInput.focus();
    expect(emailInput).toHaveFocus();

    // Tab to password
    await user.tab();
    expect(passwordInput).toHaveFocus();

    // Tab to submit button
    await user.tab();
    expect(submitButton).toHaveFocus();

    // Shift+Tab back to password
    await user.tab({ shift: true });
    expect(passwordInput).toHaveFocus();
  });

  it('opens modal with Enter key', async () => {
    const user = userEvent.setup();
    render(<ModalButton />);

    const button = screen.getByRole('button');
    button.focus();

    // Press Enter
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes modal with Escape key', async () => {
    const user = userEvent.setup();
    render(<Modal open onClose={jest.fn()} />);

    // Press Escape
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates menu with arrow keys', async () => {
    const user = userEvent.setup();
    render(<Dropdown />);

    const trigger = screen.getByRole('button', { name: 'Menu' });
    await user.click(trigger);

    const menuItems = screen.getAllByRole('menuitem');

    // First item should be focused
    expect(menuItems[0]).toHaveFocus();

    // Arrow down
    await user.keyboard('{ArrowDown}');
    expect(menuItems[1]).toHaveFocus();

    // Arrow up
    await user.keyboard('{ArrowUp}');
    expect(menuItems[0]).toHaveFocus();
  });
});`,

  /**
   * Screen reader testing
   */
  screenReaderTest: `import { render, screen } from '@testing-library/react';

describe('Screen Reader Compatibility', () => {
  it('has proper ARIA labels', () => {
    render(<SearchForm />);

    const searchInput = screen.getByLabelText('Search');
    expect(searchInput).toHaveAttribute('aria-label', 'Search');
  });

  it('announces form errors', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const errorMessage = screen.getByText('Invalid email');

    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });

  it('has proper heading hierarchy', () => {
    render(<ArticlePage />);

    const h1 = screen.getByRole('heading', { level: 1 });
    const h2s = screen.getAllByRole('heading', { level: 2 });
    const h3s = screen.getAllByRole('heading', { level: 3 });

    expect(h1).toBeInTheDocument();
    expect(h2s.length).toBeGreaterThan(0);
    // h3 should only appear after h2
  });

  it('provides alt text for images', () => {
    render(<ProductCard product={mockProduct} />);

    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
  });

  it('marks decorative images properly', () => {
    render(<Hero />);

    const decorativeImage = screen.getByRole('img', { hidden: true });
    expect(decorativeImage).toHaveAttribute('alt', '');
  });

  it('has live region for dynamic updates', () => {
    render(<NotificationCenter />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});`,

  /**
   * Color contrast testing
   */
  colorContrastTest: `import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

describe('Color Contrast', () => {
  it('passes WCAG AA contrast requirements', async () => {
    const { container } = render(<Button>Click me</Button>);

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results.violations).toHaveLength(0);
  });

  it('passes WCAG AAA contrast requirements', async () => {
    const { container } = render(<Text>Important text</Text>);

    const results = await axe(container, {
      rules: {
        'color-contrast-enhanced': { enabled: true },
      },
    });

    expect(results.violations).toHaveLength(0);
  });
});

// Manual contrast calculation
function calculateContrastRatio(color1: string, color2: string): number {
  // Convert hex to RGB
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Calculate contrast ratio
  const l1 = getLuminance(...hexToRgb(color1));
  const l2 = getLuminance(...hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA requires 4.5:1 for normal text, 3:1 for large text
// WCAG AAA requires 7:1 for normal text, 4.5:1 for large text`,
};

/**
 * Cross-browser testing
 */
export const crossBrowserTesting = {
  /**
   * Playwright cross-browser config
   */
  playwrightConfig: `// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
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
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'] },
    },
  ],
});

// Run specific browser: npx playwright test --project=firefox`,

  /**
   * BrowserStack integration
   */
  browserStack: `// BrowserStack configuration
const browserStackConfig = {
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  capabilities: [
    {
      browserName: 'Chrome',
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '11',
    },
    {
      browserName: 'Safari',
      browserVersion: 'latest',
      os: 'OS X',
      osVersion: 'Monterey',
    },
    {
      browserName: 'Edge',
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '11',
    },
  ],
};`,
};

/**
 * Visual/A11y testing best practices
 */
export const visualA11yBestPractices = {
  visual: [
    "Run visual tests on every PR",
    "Test across multiple viewports",
    "Mask dynamic content (dates, random data)",
    "Set appropriate diff thresholds",
    "Review visual diffs in CI",
    "Use Storybook for component isolation",
  ],

  accessibility: [
    "Run axe-core on every component",
    "Test keyboard navigation",
    "Verify ARIA labels and roles",
    "Check color contrast (WCAG AA minimum)",
    "Test with screen readers",
    "Ensure proper heading hierarchy",
  ],

  crossBrowser: [
    "Test on Chrome, Firefox, Safari, Edge",
    "Test on mobile browsers (iOS Safari, Chrome)",
    "Check responsive breakpoints",
    "Verify CSS Grid and Flexbox behavior",
    "Test forms and inputs across browsers",
  ],

  workflow: [
    "Integrate visual tests in CI/CD",
    "Approve visual changes before merge",
    "Document accessibility requirements",
    "Train team on a11y best practices",
    "Regular accessibility audits",
  ],
};

/**
 * Generate accessibility test
 */
export function generateA11yTest(componentName: string): string {
  return `import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ${componentName} } from './${componentName}';

expect.extend(toHaveNoViolations);

describe('${componentName} Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<${componentName} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('is keyboard accessible', async () => {
    const { getByRole } = render(<${componentName} />);
    const element = getByRole('button'); // Adjust role as needed

    element.focus();
    expect(element).toHaveFocus();
  });

  it('has proper ARIA attributes', () => {
    const { getByRole } = render(<${componentName} />);
    const element = getByRole('button');

    expect(element).toHaveAttribute('aria-label');
    // Add more ARIA checks as needed
  });
});
`;
}

/**
 * Generate visual regression test
 */
export function generateVisualTest(pageName: string): string {
  return `import { test, expect } from '@playwright/test';

test.describe('${pageName} Visual Tests', () => {
  test('matches screenshot on desktop', async ({ page }) => {
    await page.goto('/${pageName.toLowerCase()}');
    await expect(page).toHaveScreenshot('${pageName.toLowerCase()}-desktop.png', {
      fullPage: true,
    });
  });

  test('matches screenshot on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/${pageName.toLowerCase()}');
    await expect(page).toHaveScreenshot('${pageName.toLowerCase()}-mobile.png', {
      fullPage: true,
    });
  });
});
`;
}
