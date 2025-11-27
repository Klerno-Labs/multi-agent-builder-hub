/**
 * Performance & Load Testing - Patterns for performance benchmarking and load testing
 */

export interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

export interface LoadTestConfig {
  vus: number; // Virtual users
  duration: string;
  rampUp: string;
  thresholds: Record<string, string[]>;
}

/**
 * Lighthouse CI patterns
 */
export const lighthouseCIPatterns = {
  /**
   * Lighthouse CI configuration
   */
  config: `// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/about',
        'http://localhost:3000/products',
      ],
      settings: {
        preset: 'desktop',
        // or 'mobile'
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Specific metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Bundle size
        'total-byte-weight': ['error', { maxNumericValue: 500000 }], // 500KB
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        'unused-css': ['warn', { maxNumericValue: 20000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

// Run: lhci autorun`,

  /**
   * GitHub Actions integration
   */
  githubActions: `# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: \${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci/`,

  /**
   * Custom Lighthouse run
   */
  customRun: `import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runLighthouse(url: string) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  const options = {
    port: chrome.port,
    output: 'html',
    onlyCategories: ['performance', 'accessibility'],
  };

  const runnerResult = await lighthouse(url, options);

  await chrome.kill();

  // Extract scores
  const { lhr } = runnerResult;
  const performanceScore = lhr.categories.performance.score * 100;
  const accessibilityScore = lhr.categories.accessibility.score * 100;

  console.log('Performance Score:', performanceScore);
  console.log('Accessibility Score:', accessibilityScore);

  // Assert thresholds
  if (performanceScore < 90) {
    throw new Error(\`Performance score \${performanceScore} is below 90\`);
  }

  return runnerResult;
}`,
};

/**
 * Web Vitals monitoring
 */
export const webVitalsPatterns = {
  /**
   * Web Vitals setup
   */
  setup: `import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry);  // Cumulative Layout Shift
    getFID(onPerfEntry);  // First Input Delay
    getFCP(onPerfEntry);  // First Contentful Paint
    getLCP(onPerfEntry);  // Largest Contentful Paint
    getTTFB(onPerfEntry); // Time to First Byte
  }
}

// Usage in Next.js
export function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export function reportWebVitals(metric: any) {
  console.log(metric);

  // Send to analytics
  if (process.env.NODE_ENV === 'production') {
    // Send to Google Analytics, DataDog, etc.
    sendToAnalytics(metric);
  }
}`,

  /**
   * Send to analytics
   */
  analytics: `function sendToAnalytics(metric: any) {
  const { name, value, id, delta } = metric;

  // Send to Google Analytics
  if (window.gtag) {
    window.gtag('event', name, {
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      metric_id: id,
      metric_value: value,
      metric_delta: delta,
      non_interaction: true,
    });
  }

  // Send to custom analytics
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: name,
      value,
      timestamp: Date.now(),
    }),
  });
}`,

  /**
   * Performance Observer
   */
  performanceObserver: `// Monitor performance entries
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance entry:', {
      name: entry.name,
      type: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
    });

    // Alert on slow resources
    if (entry.duration > 1000) {
      console.warn('Slow resource:', entry.name, entry.duration);
    }
  }
});

// Observe different entry types
observer.observe({ entryTypes: ['resource', 'navigation', 'paint', 'measure'] });

// Mark custom timing
performance.mark('feature-start');
// ... code to measure ...
performance.mark('feature-end');
performance.measure('feature-duration', 'feature-start', 'feature-end');`,
};

/**
 * Bundle size monitoring
 */
export const bundleSizeMonitoring = {
  /**
   * Bundlewatch configuration
   */
  bundlewatch: `// package.json
{
  "bundlewatch": {
    "files": [
      {
        "path": "build/static/js/*.js",
        "maxSize": "200kb"
      },
      {
        "path": "build/static/css/*.css",
        "maxSize": "50kb"
      }
    ],
    "ci": {
      "trackBranches": ["main"],
      "repoBranchBase": "main"
    }
  }
}

// Run: npx bundlewatch`,

  /**
   * Webpack Bundle Analyzer
   */
  webpackAnalyzer: `// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // ... other config
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'static' : 'disabled',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),
  ],
};

// Run: ANALYZE=true npm run build`,

  /**
   * Next.js bundle analysis
   */
  nextJsAnalyzer: `// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... your Next.js config
});

// Run: ANALYZE=true npm run build`,

  /**
   * Import cost tracking
   */
  importCost: `// Track import sizes in your editor
// VSCode extension: Import Cost

// Good: Tree-shakeable imports
import { debounce } from 'lodash-es';

// Bad: Imports entire library
import _ from 'lodash';

// Good: Specific import
import debounce from 'lodash/debounce';`,
};

/**
 * Load testing with k6
 */
export const k6LoadTesting = {
  /**
   * Basic load test
   */
  basicTest: `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s', // Run for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

// Run: k6 run load-test.js`,

  /**
   * Staged load test (ramp up/down)
   */
  stagedTest: `import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 },   // Stay at 10 users for 5 minutes
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  http.get('https://api.example.com/users');
}`,

  /**
   * Stress test
   */
  stressTest: `import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Fast ramp-up to a high point
    { duration: '5m', target: 100 },  // Stay at peak for a while
    { duration: '2m', target: 200 },  // Increase to breaking point
    { duration: '5m', target: 200 },  // Stay at breaking point
    { duration: '2m', target: 0 },    // Ramp down to zero
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // 99% of requests must complete below 2s
  },
};

export default function () {
  http.get('https://api.example.com/users');
}`,

  /**
   * Spike test
   */
  spikeTest: `import http from 'k6/http';

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Normal traffic
    { duration: '10s', target: 1000 }, // Sudden spike
    { duration: '10s', target: 10 },   // Back to normal
  ],
};

export default function () {
  http.get('https://api.example.com/users');
}`,

  /**
   * API load test with authentication
   */
  apiWithAuth: `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
};

let authToken;

export function setup() {
  // Login once before test starts
  const loginRes = http.post('https://api.example.com/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  authToken = loginRes.json('accessToken');
  return { token: authToken };
}

export default function (data) {
  const params = {
    headers: {
      'Authorization': \`Bearer \${data.token}\`,
      'Content-Type': 'application/json',
    },
  };

  // Test authenticated endpoints
  const res = http.get('https://api.example.com/users/profile', params);

  check(res, {
    'authenticated successfully': (r) => r.status === 200,
    'response contains user data': (r) => r.json('user.id') !== undefined,
  });
}`,

  /**
   * Multi-scenario test
   */
  multiScenario: `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      exec: 'readScenario',
    },
    write_heavy: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'writeScenario',
    },
  },
  thresholds: {
    'http_req_duration{scenario:read_heavy}': ['p(95)<200'],
    'http_req_duration{scenario:write_heavy}': ['p(95)<500'],
  },
};

export function readScenario() {
  http.get('https://api.example.com/posts');
}

export function writeScenario() {
  http.post('https://api.example.com/posts', JSON.stringify({
    title: 'Test Post',
    content: 'Content',
  }));
}`,
};

/**
 * Performance testing best practices
 */
export const performanceTestingBestPractices = {
  metrics: [
    "Monitor Core Web Vitals (LCP, FID, CLS)",
    "Track Time to First Byte (TTFB)",
    "Measure First Contentful Paint (FCP)",
    "Monitor bundle size regularly",
    "Track API response times",
    "Measure database query performance",
  ],

  benchmarking: [
    "Set performance budgets",
    "Run tests on every PR",
    "Test on production-like environment",
    "Use consistent test data",
    "Run multiple iterations for accuracy",
    "Compare against baseline",
  ],

  loadTesting: [
    "Test expected peak load (2-3x normal)",
    "Test breaking point (stress test)",
    "Simulate sudden spikes",
    "Test different user scenarios",
    "Monitor server resources during tests",
    "Test autoscaling behavior",
  ],

  optimization: [
    "Optimize images (WebP, lazy loading)",
    "Code split and lazy load",
    "Minimize bundle size",
    "Enable compression (gzip, brotli)",
    "Use CDN for static assets",
    "Implement caching strategies",
  ],

  monitoring: [
    "Set up Real User Monitoring (RUM)",
    "Track synthetic tests continuously",
    "Alert on performance regressions",
    "Monitor 95th/99th percentiles",
    "Track error rates during load",
    "Analyze performance by region",
  ],
};

/**
 * Performance budget
 */
export const performanceBudget = {
  /**
   * Recommended budgets
   */
  budgets: {
    web_app: {
      lcp: 2500,          // Largest Contentful Paint (ms)
      fid: 100,           // First Input Delay (ms)
      cls: 0.1,           // Cumulative Layout Shift
      fcp: 1800,          // First Contentful Paint (ms)
      ttfb: 600,          // Time to First Byte (ms)
      totalBundle: 200,   // Total JS bundle size (KB)
      mainBundle: 150,    // Main bundle size (KB)
      cssBundle: 50,      // Total CSS size (KB)
      images: 500,        // Total images size (KB)
    },

    mobile_optimized: {
      lcp: 2000,
      fid: 50,
      cls: 0.05,
      fcp: 1500,
      ttfb: 500,
      totalBundle: 150,
      mainBundle: 100,
      cssBundle: 30,
      images: 300,
    },
  },

  /**
   * Lighthouse budget config
   */
  lighthouseBudget: `// budget.json
[
  {
    "path": "/*",
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 200
      },
      {
        "resourceType": "stylesheet",
        "budget": 50
      },
      {
        "resourceType": "image",
        "budget": 500
      },
      {
        "resourceType": "total",
        "budget": 1000
      }
    ],
    "resourceCounts": [
      {
        "resourceType": "third-party",
        "budget": 10
      }
    ],
    "timings": [
      {
        "metric": "interactive",
        "budget": 3000
      },
      {
        "metric": "first-contentful-paint",
        "budget": 1800
      }
    ]
  }
]`,
};

/**
 * Generate load test
 */
export function generateLoadTest(config: LoadTestConfig): string {
  return `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: ${config.vus},
  duration: '${config.duration}',
  thresholds: ${JSON.stringify(config.thresholds, null, 2)},
};

export default function () {
  const res = http.get('https://api.example.com/endpoint');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
`;
}

/**
 * Generate performance test report
 */
export function generatePerformanceReport(metrics: PerformanceMetrics): string {
  const gradeMetric = (value: number, good: number, needsImprovement: number): string => {
    if (value <= good) return '✅ Good';
    if (value <= needsImprovement) return '⚠️ Needs Improvement';
    return '❌ Poor';
  };

  return `# Performance Test Report
Generated: ${new Date().toISOString()}

## Core Web Vitals

### Largest Contentful Paint (LCP)
- **Value**: ${metrics.lcp}ms
- **Grade**: ${gradeMetric(metrics.lcp, 2500, 4000)}
- **Target**: ≤ 2.5s (Good), ≤ 4.0s (Needs Improvement)

### First Input Delay (FID)
- **Value**: ${metrics.fid}ms
- **Grade**: ${gradeMetric(metrics.fid, 100, 300)}
- **Target**: ≤ 100ms (Good), ≤ 300ms (Needs Improvement)

### Cumulative Layout Shift (CLS)
- **Value**: ${metrics.cls}
- **Grade**: ${gradeMetric(metrics.cls, 0.1, 0.25)}
- **Target**: ≤ 0.1 (Good), ≤ 0.25 (Needs Improvement)

### First Contentful Paint (FCP)
- **Value**: ${metrics.fcp}ms
- **Grade**: ${gradeMetric(metrics.fcp, 1800, 3000)}
- **Target**: ≤ 1.8s (Good), ≤ 3.0s (Needs Improvement)

### Time to First Byte (TTFB)
- **Value**: ${metrics.ttfb}ms
- **Grade**: ${gradeMetric(metrics.ttfb, 600, 1800)}
- **Target**: ≤ 600ms (Good), ≤ 1800ms (Needs Improvement)

## Recommendations

${metrics.lcp > 2500 ? '- Optimize LCP: Reduce server response time, optimize images, remove render-blocking resources\n' : ''}
${metrics.fid > 100 ? '- Optimize FID: Break up long tasks, optimize JavaScript execution\n' : ''}
${metrics.cls > 0.1 ? '- Optimize CLS: Set size attributes on images/videos, avoid inserting content above existing content\n' : ''}
${metrics.fcp > 1800 ? '- Optimize FCP: Eliminate render-blocking resources, minify CSS\n' : ''}
${metrics.ttfb > 600 ? '- Optimize TTFB: Use CDN, optimize server processing, implement caching\n' : ''}
`;
}
