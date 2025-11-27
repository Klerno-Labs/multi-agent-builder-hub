// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { ConversationalDiscovery } from "@/lib/rag/conversational-discovery";
import { indexKnowledgeBase } from "@/lib/rag/indexer";

// Conversation storage: use Redis when REDIS_URL is set and ioredis is available, otherwise in-memory Map
let useRedis = false;
let RedisClient: any = null;
let redis: any = null;
try {
  if (process.env.REDIS_URL) {
    // attempt to require ioredis dynamically
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis');
    redis = new IORedis(process.env.REDIS_URL);
    useRedis = true;
    console.log('Discovery chat: using Redis for conversation storage');
  }
} catch (err) {
  // fallback to in-memory
  useRedis = false;
}

const conversations = new Map<string, ConversationalDiscovery>();

/**
 * Initialize knowledge base on server start
 */
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    try {
      await indexKnowledgeBase();
      initialized = true;
    } catch (error) {
      console.error("Failed to initialize knowledge base:", error);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInitialized();

    const body = await req.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "Missing sessionId or message" },
        { status: 400 }
      );
    }

    // Get or create conversation for this session
    let conversation: ConversationalDiscovery | null = null;
    if (useRedis) {
      const key = `discovery:session:${sessionId}`;
      const state = await redis.get(key);
      if (state) {
        try {
          const parsed = JSON.parse(state);
          conversation = ConversationalDiscovery.fromSerialized(parsed);
        } catch {
          conversation = null;
        }
      }
      if (!conversation) {
        conversation = new ConversationalDiscovery();
      }
      // after processing we'll persist back to redis
    } else {
      conversation = conversations.get(sessionId) ?? new ConversationalDiscovery();
      conversations.set(sessionId, conversation);
    }

    // Process the message
    const result = await conversation.chat(message);

    // persist if using redis
    if (useRedis) {
      const key = `discovery:session:${sessionId}`;
      try {
        await redis.set(key, JSON.stringify(conversation.serialize()), 'EX', 60 * 60 * 24);
      } catch (err) {
        console.error('Failed to persist conversation to Redis', err && err.message ? err.message : err);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Discovery chat error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get conversation state
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const conversation = conversations.get(sessionId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        context: conversation.getContext(),
        history: conversation.getHistory(),
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Complete discovery and export answers
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const conversation = conversations.get(sessionId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const discoveryAnswers = conversation.exportDiscoveryAnswers();

    // Clean up conversation from memory
    conversations.delete(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        discoveryAnswers,
        message: "Discovery completed successfully",
      },
    });
  } catch (error) {
    console.error("Complete discovery error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
// @ts-nocheck
