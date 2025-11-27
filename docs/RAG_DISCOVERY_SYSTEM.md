# RAG-Powered Conversational Discovery System

The Multi-Agent Builder Hub now features an intelligent RAG (Retrieval-Augmented Generation) system that powers conversational project discovery.

## Overview

Instead of basic form questions, the system uses:
- **Vector Database**: ChromaDB for semantic search
- **Embeddings**: OpenAI `text-embedding-3-small` for document vectors
- **LLM**: GPT-4o-mini for natural conversations
- **Knowledge Base**: Comprehensive project examples, tech stack guides, and best practices

## Architecture

```
User Message
    ↓
Vector Search (ChromaDB)
    ↓
Retrieve Relevant Knowledge
    ↓
LLM with RAG Context
    ↓
Intelligent Response
```

## Components

### 1. Vector Store ([lib/rag/vector-store.ts](../lib/rag/vector-store.ts))
- ChromaDB client wrapper
- OpenAI embedding generation
- Document indexing and search
- Singleton pattern for performance

### 2. Knowledge Base ([lib/rag/knowledge-base.ts](../lib/rag/knowledge-base.ts))
Contains expert knowledge on:
- **Project Types**: Web apps, websites, mobile apps, Web3 DApps
- **Tech Stacks**: Next.js, React, databases, frameworks
- **Features**: Authentication, payments, API design
- **Industry Guides**: E-commerce, SaaS platforms
- **Best Practices**: State management, security, performance

### 3. Conversational Engine ([lib/rag/conversational-discovery.ts](../lib/rag/conversational-discovery.ts))
- Natural dialogue management
- Context tracking
- Automatic project type detection
- Smart follow-up questions
- Export to pipeline format

### 4. API Endpoint ([app/api/discovery/chat/route.ts](../app/api/discovery/chat/route.ts))
- POST `/api/discovery/chat` - Send messages
- GET `/api/discovery/chat?sessionId=...` - Get conversation state
- PUT `/api/discovery/chat` - Complete discovery

## Setup Instructions

### 1. Install ChromaDB

**Option A: Python (Recommended)**
```bash
pip install chromadb
```

**Option B: Docker**
```bash
docker pull chromadb/chroma
docker run -p 8000:8000 chromadb/chroma
```

### 2. Start ChromaDB Server

**Linux/Mac:**
```bash
chmod +x scripts/start-chroma.sh
./scripts/start-chroma.sh
```

**Windows:**
```bash
chroma run --path ./chroma_data --port 8000
```

**Docker:**
```bash
docker run -p 8000:8000 -v ./chroma_data:/chroma/chroma chromadb/chroma
```

### 3. Configure Environment

Add to `.env.local`:
```bash
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=your_openai_key_here
```

### 4. Start the Application

```bash
npm run dev
```

The knowledge base will be automatically indexed on first request.

## Usage Example

### Starting a Conversation

```typescript
POST /api/discovery/chat
{
  "sessionId": "user-123-session",
  "message": "I want to build an e-commerce platform"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "That's exciting! An e-commerce platform has many moving parts. To help you build the right solution, I'd like to understand more. What type of products will you be selling?",
    "isComplete": false,
    "context": {
      "projectType": "web_app",
      "userAnswers": {...}
    },
    "suggestedQuestions": [
      "What are the main features you need?",
      "Do you have a timeline in mind?"
    ]
  }
}
```

### Continuing the Conversation

```typescript
POST /api/discovery/chat
{
  "sessionId": "user-123-session",
  "message": "I'll be selling handmade jewelry"
}
```

**Jordan will:**
1. Search the knowledge base for e-commerce best practices
2. Retrieve relevant information about product catalogs, payments, inventory
3. Ask intelligent follow-up questions about:
   - Inventory management needs
   - Payment processing preferences
   - Shipping requirements
   - Image/media handling

### Completing Discovery

```typescript
PUT /api/discovery/chat
{
  "sessionId": "user-123-session"
}
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "discoveryAnswers": {
      "projectType": "web_app",
      "projectDescription": "E-commerce platform for handmade jewelry...",
      "techPreferences": "Next.js, PostgreSQL, Stripe",
      "features": "Product catalog, shopping cart, payment processing, ..."
    }
  }
}
```

## Knowledge Base Categories

### Project Types
- Web Applications (SaaS, dashboards, platforms)
- Marketing Websites (landing pages, blogs)
- Mobile Applications (iOS/Android)
- Web3 DApps (blockchain, smart contracts)

### Tech Stack Guides
- Frontend: Next.js, React, TypeScript
- Backend: Node.js, Express, API design
- Databases: PostgreSQL, MongoDB, Firebase
- Authentication: OAuth, JWT, sessions

### Feature Implementations
- User authentication and authorization
- Payment processing (Stripe, PayPal)
- Real-time features (WebSockets, SSE)
- File uploads and media handling
- Search and filtering

### Industry-Specific
- E-commerce (Stripe, product catalogs, checkout)
- SaaS (multi-tenancy, subscriptions)
- Social (feeds, notifications, messaging)
- Fintech (compliance, security)

## How It Works

### 1. User Sends Message
```
"I need a web app for managing tasks"
```

### 2. Semantic Search
The system generates an embedding for the message and searches for relevant knowledge:
- "Web Application Best Practices" (distance: 0.15)
- "SaaS Platform Development Guide" (distance: 0.22)
- "API Design Guide" (distance: 0.31)

### 3. Context Injection
Retrieved knowledge is injected into the LLM prompt:
```
You are Jordan, an expert project discovery assistant.

RELEVANT KNOWLEDGE:
[Web Application Best Practices guide]
[SaaS Platform Development Guide]
[API Design Guide]

CONVERSATION HISTORY:
User: I need a web app for managing tasks

Respond naturally...
```

### 4. Intelligent Response
```
Great! A task management web app is a perfect project. Based on best practices,
I'd recommend Next.js with PostgreSQL for this type of application.

Before we dive in, who will be using this - is it for personal use, teams,
or will you be offering it as a SaaS product to other companies?
```

## Advantages Over Traditional Forms

| Traditional Forms | RAG-Powered Discovery |
|-------------------|----------------------|
| Fixed questions | Adaptive questioning |
| No context | Understands domain |
| Generic | Industry-specific |
| Linear | Conversational |
| Limited guidance | Expert suggestions |
| One-size-fits-all | Personalized |

## Extending the Knowledge Base

### Add Custom Documents

```typescript
import { addCustomDocument } from "@/lib/rag/indexer";

await addCustomDocument(
  "Custom Integration Guide",
  "How to integrate with Shopify APIs...",
  "integrations",
  ["shopify", "e-commerce", "api"]
);
```

### Add to Knowledge Base File

Edit `lib/rag/knowledge-base.ts`:

```typescript
{
  id: "my-custom-guide",
  title: "My Custom Guide",
  content: `Detailed content here...`,
  category: "custom",
  tags: ["custom", "tag1", "tag2"],
}
```

## Monitoring and Debugging

### Check Knowledge Base Status

```bash
curl http://localhost:8000/api/v1/collections/discovery_knowledge
```

### View Indexed Documents

```typescript
const vectorStore = getVectorStore();
const count = await vectorStore.count();
console.log(`Indexed documents: ${count}`);
```

### Test Retrieval

```typescript
const results = await vectorStore.search("e-commerce best practices", 5);
console.log(results);
```

## Performance Considerations

- **Embedding caching**: Embeddings are generated once during indexing
- **Vector search**: Sub-100ms response times with ChromaDB
- **LLM calls**: ~1-3s for intelligent responses
- **Session management**: In-memory storage (use Redis for production)

## Production Deployment

### Recommended Setup

1. **ChromaDB**: Deploy as separate service
   - Docker container or managed service
   - Persistent volume for data

2. **Session Storage**: Use Redis instead of in-memory Map
   ```typescript
   import Redis from "ioredis";
   const redis = new Redis(process.env.REDIS_URL);
   ```

3. **Scaling**: Horizontal scaling with session affinity
   - Load balancer with sticky sessions
   - Or shared Redis for session storage

4. **Monitoring**:
   - Track conversation completion rates
   - Monitor average conversation length
   - Log failed retrievals

## Security

- Rate limiting on API endpoints
- Session validation and expiration
- Input sanitization for user messages
- No PII stored in vector database
- Secure API keys in environment variables

## Cost Optimization

- **Embeddings**: ~$0.0001 per 1K tokens (one-time indexing cost)
- **Vector Store**: Free with self-hosted ChromaDB
- **LLM Calls**: ~$0.0001-0.0003 per message (GPT-4o-mini)
- **Estimated Cost**: <$0.01 per complete discovery session

## Troubleshooting

### ChromaDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```
**Solution**: Ensure ChromaDB server is running on port 8000

### Embeddings Generation Failed
```
Error: OPENAI_API_KEY is not set
```
**Solution**: Add valid OpenAI API key to `.env.local`

### Knowledge Base Not Indexed
**Solution**: Delete collection and restart server
```typescript
await vectorStore.deleteCollection();
await indexKnowledgeBase();
```

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Image-based project examples
- [ ] Integration with design tools
- [ ] Auto-save and resume conversations
- [ ] Analytics dashboard
- [ ] A/B testing different prompts
- [ ] Fine-tuned embedding model

## Related Documentation

- [Agent System Overview](./AGENT_SYSTEM.md)
- [Pipeline Execution](./PIPELINE.md)
- [API Documentation](./API.md)
