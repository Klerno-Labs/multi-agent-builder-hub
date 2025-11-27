import { ProjectType } from "../agents/types";

export interface DocumentationTemplate {
  readme: string;
  contributing: string;
  codeOfConduct: string;
  changelog: string;
  license: string;
  security: string;
}

export interface ProjectMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  license?: string;
  repository?: string;
  techStack: string[];
  features: string[];
}

/**
 * Generate comprehensive README.md
 */
export function generateREADME(metadata: ProjectMetadata, projectType: ProjectType): string {
  const badges = generateBadges(metadata);
  const installation = generateInstallationInstructions(projectType);
  const usage = generateUsageExamples(projectType);
  const projectTypeSection = generateProjectTypeSection(projectType);

  return `# ${metadata.name}

${badges}

${metadata.description}

## ✨ Features

${metadata.features.map((f) => `- ${f}`).join("\n")}

## 🚀 Tech Stack

${metadata.techStack.map((t) => `- **${t}**`).join("\n")}

${projectTypeSection}

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## 🎯 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn or pnpm
${projectType === "database" ? "- PostgreSQL (v14 or higher)" : ""}
${projectType === "web3_dapp" ? "- MetaMask or similar Web3 wallet" : ""}
${projectType === "mobile_app" ? "- React Native CLI\n- Xcode (for iOS) or Android Studio (for Android)" : ""}

### Installation

${installation}

### Configuration

1. Copy the environment variables template:
\`\`\`bash
cp .env.example .env
\`\`\`

2. Configure your environment variables:
\`\`\`bash
# .env
DATABASE_URL=your_database_url
API_KEY=your_api_key
${projectType === "web3_dapp" ? "NEXT_PUBLIC_CHAIN_ID=1\nNEXT_PUBLIC_RPC_URL=your_rpc_url" : ""}
\`\`\`

3. Initialize the database (if applicable):
\`\`\`bash
npm run db:migrate
npm run db:seed
\`\`\`

## 💻 Usage

${usage}

## 📚 API Documentation

API documentation is available at:
- **Development**: http://localhost:3000/api-docs
- **Production**: https://your-domain.com/api-docs

### Key Endpoints

\`\`\`
GET    /api/health         - Health check
${projectType === "web_app" || projectType === "website" ? "GET    /api/users          - List users\nPOST   /api/users          - Create user\nGET    /api/users/:id      - Get user by ID" : ""}
${projectType === "web3_dapp" ? "GET    /api/contracts      - List contracts\nPOST   /api/transactions   - Submit transaction" : ""}
${projectType === "database" ? "GET    /api/schemas        - List schemas\nPOST   /api/queries        - Execute query" : ""}
\`\`\`

See [API.md](./docs/API.md) for detailed documentation.

## 🚢 Deployment

### Vercel (Recommended for Next.js)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=${metadata.repository || "https://github.com/your-repo"})

### Docker

\`\`\`bash
# Build the image
docker build -t ${metadata.name} .

# Run the container
docker run -p 3000:3000 ${metadata.name}
\`\`\`

### Manual Deployment

1. Build the application:
\`\`\`bash
npm run build
\`\`\`

2. Start the production server:
\`\`\`bash
npm start
\`\`\`

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment guides.

## 🧪 Testing

Run the test suite:

\`\`\`bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
\`\`\`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ${metadata.license || "MIT"} License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@${metadata.name}.com
- 💬 Discord: [Join our community](https://discord.gg/your-server)
- 🐛 Issues: [GitHub Issues](${metadata.repository || "https://github.com/your-repo"}/issues)
- 📖 Documentation: [Full Documentation](./docs/README.md)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
${metadata.techStack.map((t) => `- Powered by ${t}`).join("\n")}

---

Made with ❤️ by ${metadata.author || "the team"}
`;
}

function generateBadges(metadata: ProjectMetadata): string {
  return `![Version](https://img.shields.io/badge/version-${metadata.version}-blue.svg)
![License](https://img.shields.io/badge/license-${metadata.license || "MIT"}-green.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-85%25-yellow.svg)`;
}

function generateInstallationInstructions(projectType: ProjectType): string {
  const baseInstall = `1. Clone the repository:
\`\`\`bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\``;

  if (projectType === "mobile_app") {
    return `${baseInstall}

3. Install iOS dependencies (macOS only):
\`\`\`bash
cd ios && pod install && cd ..
\`\`\`

4. Start Metro bundler:
\`\`\`bash
npm start
\`\`\``;
  }

  return `${baseInstall}

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\``;
}

function generateUsageExamples(projectType: ProjectType): string {
  switch (projectType) {
    case "website":
      return `Visit http://localhost:3000 to view the website.

### Key Pages

- **Home**: \`/\` - Landing page
- **About**: \`/about\` - About us page
- **Contact**: \`/contact\` - Contact form

### Customization

Edit the content in \`/app/page.tsx\` to customize the homepage.`;

    case "web_app":
      return `1. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

2. Open http://localhost:3000 in your browser

3. Log in with demo credentials:
   - Email: \`demo@example.com\`
   - Password: \`demo123\`

### Dashboard

Access the dashboard at \`/dashboard\` to view:
- Analytics and metrics
- User management
- Settings and configuration`;

    case "mobile_app":
      return `### iOS

\`\`\`bash
npm run ios
\`\`\`

### Android

\`\`\`bash
npm run android
\`\`\`

### Features

- Bottom tab navigation
- Pull to refresh
- Push notifications
- Offline mode support`;

    case "database":
      return `### Run Migrations

\`\`\`bash
npm run db:migrate
\`\`\`

### Seed Database

\`\`\`bash
npm run db:seed
\`\`\`

### Query the Database

Access the query interface at http://localhost:3000/admin`;

    case "web3_dapp":
      return `1. Connect your Web3 wallet (MetaMask recommended)

2. Switch to the correct network (Ethereum Mainnet or Testnet)

3. Interact with smart contracts:
   - View contract details at \`/contracts\`
   - Execute transactions at \`/transactions\`
   - Check your wallet balance at \`/wallet\`

### Supported Networks

- Ethereum Mainnet (Chain ID: 1)
- Sepolia Testnet (Chain ID: 11155111)
- Polygon (Chain ID: 137)`;

    default:
      return `Open http://localhost:3000 in your browser to see the application.`;
  }
}

function generateProjectTypeSection(projectType: ProjectType): string {
  switch (projectType) {
    case "web3_dapp":
      return `## 🔗 Web3 Integration

This dApp integrates with Ethereum and EVM-compatible chains.

### Smart Contracts

| Contract | Address | Network |
|----------|---------|---------|
| Main Contract | \`0x...\` | Ethereum Mainnet |
| Token | \`0x...\` | Ethereum Mainnet |

### Wallet Setup

1. Install MetaMask or similar Web3 wallet
2. Connect to the appropriate network
3. Ensure you have enough ETH for gas fees`;

    case "mobile_app":
      return `## 📱 Mobile Platforms

### iOS Requirements
- iOS 13.0 or higher
- Xcode 14.0 or higher

### Android Requirements
- Android 8.0 (API 26) or higher
- Android Studio Arctic Fox or higher`;

    case "database":
      return `## 🗄️ Database Schema

The database schema is managed through migrations.

### Schema Overview

- **users**: User accounts and profiles
- **sessions**: Authentication sessions
- **audit_logs**: System audit trail

See [SCHEMA.md](./docs/SCHEMA.md) for detailed schema documentation.`;

    default:
      return "";
  }
}

/**
 * Generate CONTRIBUTING.md
 */
export function generateContributing(projectName: string): string {
  return `# Contributing to ${projectName}

First off, thank you for considering contributing to ${projectName}! It's people like you that make this project great.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if relevant**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any examples of similar features in other projects**

### Pull Requests

1. Fork the repo and create your branch from \`main\`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Process

### Setup Development Environment

\`\`\`bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/${projectName}.git

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/${projectName}.git

# Install dependencies
npm install

# Create a branch
git checkout -b feature/your-feature-name
\`\`\`

### Coding Standards

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint/Prettier)
- Write meaningful commit messages
- Add tests for new features
- Update documentation for API changes

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

\`\`\`
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
\`\`\`

Examples:
\`\`\`
feat(auth): add OAuth2 login
fix(api): resolve null pointer exception
docs(readme): update installation instructions
\`\`\`

### Testing

\`\`\`bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage
\`\`\`

### Code Review Process

1. Maintainers will review your PR within 48 hours
2. Address any requested changes
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release!

## Project Structure

\`\`\`
${projectName}/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/              # Utility functions
├── public/           # Static assets
├── styles/           # Global styles
├── tests/            # Test files
└── docs/             # Documentation
\`\`\`

## Additional Resources

- [Project Documentation](./docs/README.md)
- [API Reference](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our contributors page

Thank you for contributing! 🎉
`;
}

/**
 * Generate CODE_OF_CONDUCT.md
 */
export function generateCodeOfConduct(projectName: string): string {
  return `# Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

## Our Standards

Examples of behavior that contributes to a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior:

- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of acceptable behavior and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

## Scope

This Code of Conduct applies within all community spaces, and also applies when an individual is officially representing the community in public spaces.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the community leaders responsible for enforcement at [INSERT EMAIL]. All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org), version 2.1.
`;
}

/**
 * Generate initial CHANGELOG.md
 */
export function generateChangelog(version: string): string {
  return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${version}] - ${new Date().toISOString().split("T")[0]}

### Added
- Initial release
- Core functionality implementation
- Basic documentation
- Test suite

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## How to Update This Changelog

When making changes, add entries under the appropriate category:

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
`;
}

/**
 * Generate MIT LICENSE
 */
export function generateLicense(author: string, year: number = new Date().getFullYear()): string {
  return `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

/**
 * Generate SECURITY.md
 */
export function generateSecurity(projectName: string): string {
  return `# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of ${projectName} seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please Do

1. **Email us** at security@${projectName}.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

2. **Allow time for a fix**: We will acknowledge your email within 48 hours and will send a more detailed response within 7 days.

3. **Coordinate disclosure**: We will work with you to understand and resolve the issue, then coordinate on disclosure timing.

## Security Update Process

1. The security team will investigate the report
2. A fix will be developed in a private repository
3. A security advisory will be drafted
4. A new release will be published with the fix
5. The security advisory will be published

## Security Best Practices

When using ${projectName}, follow these security best practices:

### Environment Variables
- Never commit \`.env\` files to version control
- Use strong, unique secrets for production
- Rotate credentials regularly

### Dependencies
- Keep dependencies up to date
- Run \`npm audit\` regularly
- Review dependency changes before updating

### Authentication
- Use strong password policies
- Implement rate limiting
- Enable two-factor authentication where possible

### Data Protection
- Encrypt sensitive data at rest and in transit
- Implement proper access controls
- Follow GDPR/privacy regulations

## Acknowledgments

We appreciate the security research community's efforts to help keep our project safe. Security researchers who responsibly disclose vulnerabilities will be acknowledged in our security advisories (with permission).

---

Last Updated: ${new Date().toISOString().split("T")[0]}
`;
}
