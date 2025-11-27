import { ProjectType } from "../agents/types";

/**
 * Generate Docusaurus configuration
 */
export function generateDocusaurusConfig(projectName: string): string {
  return `// docusaurus.config.js
const config = {
  title: '${projectName}',
  tagline: 'Comprehensive documentation',
  url: 'https://your-docusaurus-site.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'your-org',
  projectName: '${projectName}',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/your-org/${projectName}/tree/main/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/your-org/${projectName}/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: '${projectName}',
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Documentation',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/your-org/${projectName}',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Getting Started', to: '/docs/intro'},
            {label: 'API Reference', to: '/docs/api'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Discord', href: 'https://discord.gg/your-server'},
            {label: 'Twitter', href: 'https://twitter.com/your-handle'},
          ],
        },
      ],
    },
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
    },
  },
};

module.exports = config;`;
}

/**
 * Generate JSDoc comments for function
 */
export function generateJSDoc(functionName: string, params: string[], returns: string): string {
  return `/**
 * ${functionName} - Function description
 *
${params.map((p) => ` * @param {type} ${p} - Parameter description`).join("\n")}
 * @returns {${returns}} Description of return value
 *
 * @example
 * const result = ${functionName}(${params.join(", ")});
 * console.log(result);
 */`;
}

/**
 * Generate API documentation
 */
export function generateAPIDocumentation(endpoints: { method: string; path: string; description: string }[]): string {
  return `# API Reference

Base URL: \`https://api.yourapp.com/v1\`

## Authentication

All API requests require authentication using a Bearer token:

\`\`\`bash
Authorization: Bearer YOUR_API_TOKEN
\`\`\`

## Endpoints

${endpoints
  .map(
    (ep) => `### ${ep.method} ${ep.path}

${ep.description}

**Request:**
\`\`\`bash
curl -X ${ep.method} https://api.yourapp.com/v1${ep.path} \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json"
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\``
  )
  .join("\n\n")}

## Error Handling

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

**Error Response Format:**
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
\`\`\``;
}

/**
 * Generate deployment guide
 */
export function generateDeploymentGuide(projectType: ProjectType): string {
  return `# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Access to deployment platform
${projectType === "database" ? "- PostgreSQL database configured" : ""}
${projectType === "web3_dapp" ? "- RPC endpoint configured" : ""}

## Environment Variables

Create a \`.env.production\` file:

\`\`\`bash
NODE_ENV=production
DATABASE_URL=your_production_database_url
API_URL=https://api.yourapp.com
${projectType === "web3_dapp" ? "NEXT_PUBLIC_CHAIN_ID=1\nNEXT_PUBLIC_RPC_URL=your_rpc_url" : ""}
\`\`\`

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Option 2: Docker

Build and run with Docker:

\`\`\`bash
# Build image
docker build -t myapp .

# Run container
docker run -p 3000:3000 --env-file .env.production myapp
\`\`\`

### Option 3: Traditional Server

\`\`\`bash
# Build the application
npm run build

# Start production server
npm start
\`\`\`

## Post-Deployment

1. Verify deployment: \`curl https://yourapp.com/api/health\`
2. Run database migrations: \`npm run db:migrate\`
3. Monitor logs for errors
4. Set up monitoring and alerts

## Rollback Procedure

If deployment fails:

1. Revert to previous version
2. Check error logs
3. Fix issues
4. Re-deploy

## Performance Optimization

- Enable caching
- Configure CDN
- Optimize images
- Enable compression`;
}

/**
 * Generate testing documentation
 */
export function generateTestingDocumentation(): string {
  return `# Testing Guide

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/components/Button.test.tsx

# Watch mode
npm test -- --watch
\`\`\`

## Test Structure

\`\`\`typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { ... };

    // Act
    render(<ComponentName {...props} />);

    // Assert
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
\`\`\`

## E2E Testing

\`\`\`bash
# Run Playwright tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed
\`\`\`

## Coverage Requirements

- Unit tests: 80% minimum
- Integration tests: 70% minimum
- E2E tests: Critical paths covered`;
}

/**
 * Generate incident response playbook
 */
export function generateIncidentPlaybook(): string {
  return `# Incident Response Playbook

## Severity Levels

### P0 - Critical
- Complete service outage
- Data breach
- Response time: Immediate

### P1 - High
- Major feature broken
- Significant performance degradation
- Response time: < 1 hour

### P2 - Medium
- Minor feature issue
- Non-critical bug
- Response time: < 4 hours

### P3 - Low
- Cosmetic issue
- Enhancement request
- Response time: < 24 hours

## Response Process

### 1. Detection
- Monitor alerts in PagerDuty/DataDog
- Check error tracking (Sentry)
- Review user reports

### 2. Triage
- Assess severity level
- Page on-call engineer
- Create incident ticket

### 3. Investigation
- Check recent deployments
- Review error logs
- Identify root cause

### 4. Mitigation
- Roll back if needed
- Deploy hotfix
- Communicate with stakeholders

### 5. Resolution
- Verify fix in production
- Update status page
- Close incident ticket

### 6. Post-Mortem
- Document timeline
- Identify improvements
- Update runbooks

## Contact List

- On-Call Engineer: +1-XXX-XXX-XXXX
- Eng Manager: manager@company.com
- Status Page: status.yourapp.com`;
}

/**
 * Generate monitoring setup guide
 */
export function generateMonitoringGuide(): string {
  return `# Monitoring & Observability

## Metrics to Monitor

### Application Metrics
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active users

### Infrastructure Metrics
- CPU usage
- Memory usage
- Disk I/O
- Network bandwidth

### Business Metrics
- Sign-ups
- Conversions
- Revenue
- Active subscriptions

## Alerting Rules

\`\`\`yaml
# Example Prometheus alerting rules
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "95th percentile response time > 2s"
\`\`\`

## Dashboards

### Key Dashboards
1. **Overview Dashboard**: System health at a glance
2. **Application Dashboard**: API metrics, errors
3. **Infrastructure Dashboard**: Server resources
4. **Business Dashboard**: KPIs and conversions

## Log Aggregation

All logs are centralized in Elasticsearch/CloudWatch.

**Query examples:**
\`\`\`
# Find errors in last hour
level:error AND timestamp:>now-1h

# Search by user ID
userId:"user-123" AND timestamp:>now-24h
\`\`\``;
}

/**
 * Generate issue templates
 */
export function generateIssueTemplates(): {
  bugReport: string;
  featureRequest: string;
} {
  return {
    bugReport: `---
name: Bug Report
about: Report a bug to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.`,

    featureRequest: `---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.`,
  };
}

/**
 * Generate PR template
 */
export function generatePRTemplate(): string {
  return `## Description

Please include a summary of the changes and the related issue.

Fixes # (issue)

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable):

Add screenshots to help explain your changes.`;
}

/**
 * Generate troubleshooting FAQ
 */
export function generateTroubleshootingFAQ(projectType: ProjectType): string {
  const common = `# Troubleshooting FAQ

## Common Issues

### Installation Problems

**Q: npm install fails with EACCES error**
\`\`\`bash
# Fix: Use nvm or fix permissions
sudo chown -R $(whoami) ~/.npm
\`\`\`

**Q: Port 3000 already in use**
\`\`\`bash
# Fix: Kill the process or use different port
PORT=3001 npm run dev
\`\`\`

### Development Issues

**Q: Changes not reflecting in browser**
- Clear browser cache
- Restart dev server
- Check if files are saved

**Q: TypeScript errors**
\`\`\`bash
# Regenerate types
npm run typecheck
\`\`\``;

  const projectSpecific: Record<ProjectType, string> = {
    web3_dapp: `

### Web3 Specific

**Q: Wallet not connecting**
- Ensure MetaMask is installed
- Check if correct network selected
- Refresh page and try again

**Q: Transaction failing**
- Check gas fees
- Verify contract address
- Ensure sufficient balance`,

    mobile_app: `

### Mobile Specific

**Q: iOS build fails**
\`\`\`bash
cd ios && pod install && cd ..
\`\`\`

**Q: Android emulator not starting**
- Check Android Studio configuration
- Verify ANDROID_HOME environment variable`,

    database: `

### Database Specific

**Q: Migration failed**
\`\`\`bash
npm run db:rollback
npm run db:migrate
\`\`\`

**Q: Cannot connect to database**
- Verify DATABASE_URL in .env
- Check database is running
- Verify firewall rules`,

    website: "",
    web_app: "",
  };

  return common + (projectSpecific[projectType] || "");
}
