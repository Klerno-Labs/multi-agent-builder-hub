/**
 * Knowledge base documents for RAG-powered discovery
 * These documents will be embedded and stored in the vector database
 */

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export const knowledgeBase: KnowledgeDocument[] = [
  // Project Type Guides
  {
    id: "web-app-guide",
    title: "Web Application Best Practices",
    content: `Web applications are full-stack interactive platforms that require frontend, backend, and database layers.

Key characteristics:
- User authentication and authorization required
- Real-time data updates often needed
- Complex state management
- API-driven architecture
- Database for persistent storage

Recommended tech stack:
- Frontend: Next.js 14+ with React, TypeScript, Tailwind CSS
- Backend: Next.js API routes or Express.js
- Database: PostgreSQL with Prisma ORM for relational data, MongoDB for flexible schemas
- Authentication: NextAuth.js, Clerk, or custom JWT implementation
- State Management: React Context, Zustand, or Redux Toolkit

Common features:
- User registration and login
- Dashboard with data visualization
- CRUD operations for main entities
- Real-time notifications
- Search and filtering
- File uploads
- Role-based access control

Example use cases: SaaS platforms, CRM systems, project management tools, social networks`,
    category: "project_types",
    tags: ["web-app", "full-stack", "saas", "database"],
  },

  {
    id: "website-guide",
    title: "Marketing Website Best Practices",
    content: `Marketing websites are content-focused platforms optimized for SEO, performance, and conversion.

Key characteristics:
- Static or semi-static content
- SEO optimization critical
- Fast page load times essential
- Mobile-first responsive design
- Minimal backend logic

Recommended tech stack:
- Framework: Next.js with App Router, Astro, or Remix
- Styling: Tailwind CSS or CSS Modules
- Content: MDX for blog posts, Contentful/Sanity CMS
- Forms: React Hook Form with validation
- Analytics: Vercel Analytics, Google Analytics
- Hosting: Vercel, Netlify, or AWS Amplify

Common features:
- Landing page with hero section
- About/Services pages
- Blog or resources section
- Contact forms
- Newsletter signup
- Testimonials and social proof
- SEO meta tags and sitemap

Example use cases: Company websites, portfolio sites, documentation sites, landing pages`,
    category: "project_types",
    tags: ["website", "marketing", "seo", "static"],
  },

  {
    id: "mobile-app-guide",
    title: "Mobile Application Development Guide",
    content: `Mobile applications for iOS and Android with native-like performance.

Key characteristics:
- Cross-platform or native development
- Offline-first architecture often needed
- Push notifications
- Device feature access (camera, GPS, etc.)
- App store distribution

Recommended tech stack:
- Cross-platform: React Native with Expo
- State Management: Redux Toolkit, Zustand, or React Query
- Navigation: React Navigation
- UI Components: React Native Paper, NativeBase
- Backend: Firebase, Supabase, or custom API
- Authentication: Firebase Auth, Auth0
- Database: SQLite for offline, Firebase/Supabase for cloud

Common features:
- User onboarding flow
- Authentication (biometric, social login)
- Offline mode and data sync
- Push notifications
- In-app navigation
- Camera and media features
- Maps and location services
- App settings and preferences

Example use cases: Social apps, fitness trackers, e-commerce apps, productivity tools`,
    category: "project_types",
    tags: ["mobile", "react-native", "ios", "android"],
  },

  {
    id: "web3-guide",
    title: "Web3 DApp Development Guide",
    content: `Decentralized applications (DApps) built on blockchain technology.

Key characteristics:
- Smart contract integration
- Wallet connectivity
- Blockchain transactions
- Decentralized storage
- Gas optimization important

Recommended tech stack:
- Frontend: Next.js with React, TypeScript
- Web3 Libraries: ethers.js or viem, wagmi
- Smart Contracts: Solidity with Hardhat or Foundry
- Wallet Connection: RainbowKit, ConnectKit, or Web3Modal
- Blockchain: Ethereum, Polygon, Arbitrum, Base
- Storage: IPFS, Arweave
- Indexing: The Graph Protocol

Common features:
- Wallet connection (MetaMask, WalletConnect)
- Token swaps and transfers
- NFT minting and marketplace
- DAO governance
- Staking mechanisms
- Real-time blockchain data
- Transaction history
- Gas estimation and optimization

Security considerations:
- Reentrancy protection
- Integer overflow/underflow checks
- Access control patterns
- Audit-ready code

Example use cases: DEX platforms, NFT marketplaces, DAO tools, DeFi protocols`,
    category: "project_types",
    tags: ["web3", "blockchain", "ethereum", "smart-contracts"],
  },

  // Technology Stack Guides
  {
    id: "nextjs-guide",
    title: "Next.js Framework Guide",
    content: `Next.js is the recommended framework for modern React applications.

When to use Next.js:
- Full-stack web applications
- Marketing websites with SEO needs
- Server-side rendering requirements
- API routes needed
- Static site generation beneficial

Key features:
- App Router (Next.js 14+) for improved performance
- Server Components for better performance
- Built-in API routes
- Image optimization
- SEO-friendly by default
- TypeScript support
- Tailwind CSS integration

Project structure:
- /app - App Router pages and layouts
- /app/api - API routes
- /components - Reusable React components
- /lib - Utility functions and business logic
- /public - Static assets

Performance optimizations:
- Use next/image for automatic image optimization
- Implement lazy loading for components
- Use Server Components where possible
- Enable caching strategies`,
    category: "tech_stack",
    tags: ["nextjs", "react", "framework", "ssr"],
  },

  {
    id: "database-selection-guide",
    title: "Database Selection Guide",
    content: `Choosing the right database for your project.

PostgreSQL (Relational):
- Use for: Complex queries, data integrity, ACID transactions
- Best for: B2B SaaS, financial apps, e-commerce
- ORM: Prisma, Drizzle, TypeORM
- Features: JSONB, full-text search, advanced indexing

MongoDB (Document):
- Use for: Flexible schemas, rapid prototyping, hierarchical data
- Best for: Content management, catalogs, real-time analytics
- ORM: Mongoose, Prisma (beta)
- Features: Flexible schemas, horizontal scaling, aggregation framework

Firebase/Supabase (Backend-as-a-Service):
- Use for: Rapid development, real-time features, mobile apps
- Best for: MVPs, mobile apps, real-time collaboration
- Features: Real-time sync, auth included, file storage, serverless functions

SQLite (Local):
- Use for: Offline-first apps, embedded databases, development
- Best for: Mobile apps, desktop apps, prototypes
- Features: Zero-configuration, serverless, cross-platform

Redis (Cache/Queue):
- Use for: Caching, session storage, pub/sub, queues
- Best for: High-performance caching, real-time features
- Features: In-memory speed, pub/sub, data structures`,
    category: "tech_stack",
    tags: ["database", "postgresql", "mongodb", "firebase"],
  },

  // Feature Implementation Guides
  {
    id: "auth-implementation-guide",
    title: "Authentication Implementation Guide",
    content: `Implementing secure user authentication.

Authentication strategies:

1. Email/Password:
   - Hash passwords with bcrypt (cost factor 10-12)
   - Store hashed passwords, never plaintext
   - Implement password reset flow
   - Email verification recommended
   - Rate limiting on login attempts

2. OAuth/Social Login:
   - Google, GitHub, Facebook integration
   - Use NextAuth.js or Clerk for easy setup
   - Reduce friction for users
   - No password management needed

3. JWT Tokens:
   - Access token (short-lived, 15-60 min)
   - Refresh token (long-lived, 7-30 days)
   - Store refresh tokens securely
   - HttpOnly cookies for web apps

4. Session-based:
   - Server-side session storage
   - Session cookies (httpOnly, secure, sameSite)
   - Good for traditional web apps
   - Easier to revoke access

Security best practices:
- HTTPS only in production
- CSRF protection
- Rate limiting
- Account lockout after failed attempts
- 2FA/MFA for sensitive apps
- Secure password requirements
- Session timeout for inactive users`,
    category: "features",
    tags: ["authentication", "security", "oauth", "jwt"],
  },

  {
    id: "api-design-guide",
    title: "RESTful API Design Guide",
    content: `Designing clean, scalable REST APIs.

RESTful conventions:
- GET /api/users - List all users
- GET /api/users/:id - Get specific user
- POST /api/users - Create new user
- PUT /api/users/:id - Update entire user
- PATCH /api/users/:id - Partial update
- DELETE /api/users/:id - Delete user

Best practices:
1. Use HTTP methods correctly
2. Return appropriate status codes (200, 201, 400, 401, 404, 500)
3. Version your API (/api/v1/...)
4. Implement pagination for lists
5. Use query parameters for filtering/sorting
6. Return consistent error responses
7. Include rate limiting
8. Document with OpenAPI/Swagger

Response format:
{
  "success": true,
  "data": {...},
  "error": null,
  "meta": {
    "page": 1,
    "totalPages": 10,
    "totalItems": 100
  }
}

Error handling:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [...]
  },
  "data": null
}`,
    category: "features",
    tags: ["api", "rest", "backend", "design-patterns"],
  },

  // Common Patterns
  {
    id: "state-management-guide",
    title: "State Management Patterns",
    content: `Choosing the right state management approach.

1. React Context (Built-in):
   - Use for: Simple global state, theme, auth user
   - Pros: No dependencies, simple, built-in
   - Cons: Can cause re-renders, not optimized for frequent updates

2. Zustand (Recommended):
   - Use for: Client-side global state
   - Pros: Simple API, minimal boilerplate, good performance
   - Cons: Less ecosystem than Redux

3. Redux Toolkit:
   - Use for: Complex state, time-travel debugging, large teams
   - Pros: Mature ecosystem, DevTools, predictable
   - Cons: More boilerplate, steeper learning curve

4. React Query/TanStack Query:
   - Use for: Server state, API data
   - Pros: Automatic caching, refetching, optimistic updates
   - Cons: Only for server state

5. Jotai/Recoil:
   - Use for: Atomic state management
   - Pros: Fine-grained reactivity, simple
   - Cons: Smaller ecosystems

Recommendation by project size:
- Small: React Context + React Query
- Medium: Zustand + React Query
- Large: Redux Toolkit + React Query
- Real-time: Zustand + WebSockets/Pusher`,
    category: "patterns",
    tags: ["state-management", "react", "redux", "zustand"],
  },

  // Industry-Specific Guides
  {
    id: "ecommerce-guide",
    title: "E-Commerce Application Guide",
    content: `Building e-commerce platforms.

Essential features:
- Product catalog with search/filter
- Shopping cart (persistent, guest checkout)
- Checkout flow with payment integration
- Order management and tracking
- Inventory management
- Customer accounts
- Reviews and ratings
- Wishlist
- Admin dashboard

Recommended tech stack:
- Frontend: Next.js with TypeScript
- Backend: Next.js API routes or Express
- Database: PostgreSQL with Prisma
- Payments: Stripe, PayPal
- Search: Algolia, Meilisearch
- Images: Cloudinary, Imgix
- Email: SendGrid, Postmark

Data models:
- User (customers, admins)
- Product (name, price, images, inventory)
- Category (hierarchical)
- Cart (items, quantities)
- Order (items, total, status, shipping)
- Payment (transactions, refunds)
- Review (rating, comment, verified purchase)

Payment integration:
- Stripe Checkout for quick setup
- Stripe Elements for custom UI
- PCI compliance handled by Stripe
- Webhook handlers for order confirmation
- Support for multiple currencies

Performance optimizations:
- Image optimization (WebP, lazy loading)
- Product page caching
- Search result caching
- CDN for static assets`,
    category: "industry",
    tags: ["ecommerce", "stripe", "shopping-cart", "payments"],
  },

  {
    id: "saas-guide",
    title: "SaaS Platform Development Guide",
    content: `Building Software-as-a-Service platforms.

Core SaaS features:
- Multi-tenant architecture
- Subscription billing (Stripe)
- User onboarding flow
- Team/workspace management
- Role-based access control
- Usage analytics and billing
- API key management
- Webhook system

Recommended tech stack:
- Frontend: Next.js, React, TypeScript
- Backend: Next.js API routes, tRPC
- Database: PostgreSQL with row-level security
- Auth: NextAuth.js, Clerk
- Billing: Stripe Billing
- Analytics: PostHog, Mixpanel
- Email: Resend, SendGrid
- Queue: BullMQ, Inngest

Subscription models:
- Freemium (free tier + paid upgrades)
- Tiered pricing (starter, pro, enterprise)
- Usage-based (pay per API call, user, etc.)
- Per-seat pricing (per user)

Multi-tenancy strategies:
1. Separate databases (highest isolation)
2. Shared database, separate schemas
3. Shared schema with tenant_id column (most cost-effective)

Security considerations:
- Data isolation between tenants
- API rate limiting per tenant
- Audit logs for compliance
- SSO for enterprise customers
- Data export for GDPR compliance`,
    category: "industry",
    tags: ["saas", "multi-tenant", "subscription", "stripe"],
  },
];
