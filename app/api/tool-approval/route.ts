import { NextRequest, NextResponse } from 'next/server';
import { getApprovalStorage } from '@/lib/redis/client';

/**
 * API endpoint for tool approval requests
 * Allows agents to request user approval for dangerous operations
 * Uses Redis for persistent storage with automatic fallback to in-memory
 */

interface ApprovalRequest {
  agentId: string;
  toolName: string;
  operation: string;
  details: unknown;
  timestamp: string;
}

interface ApprovalResponse {
  approved: boolean;
  reason?: string;
}

// Get storage adapter (Redis or in-memory)
const storage = getApprovalStorage();

/**
 * POST /api/tool-approval - Request approval for a tool operation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, toolName, operation, details } = body;

    if (!agentId || !toolName || !operation) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, toolName, operation' },
        { status: 400 }
      );
    }

    const requestId = `${agentId}-${toolName}-${Date.now()}`;
    const approvalRequest: ApprovalRequest = {
      agentId,
      toolName,
      operation,
      details,
      timestamp: new Date().toISOString(),
    };

    await storage.setApproval(requestId, approvalRequest, 3600); // 1 hour TTL

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Approval request created. Waiting for user response.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tool-approval - Get pending approval requests
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (requestId) {
      // Get specific approval request status
      const result = await storage.getResult(requestId);
      if (result) {
        return NextResponse.json({
          success: true,
          approved: result.approved,
          reason: result.reason,
        });
      }

      const pending = await storage.getApproval(requestId);
      if (pending) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          request: pending,
        });
      }

      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      );
    }

    // Get all pending approvals
    const allApprovals = await storage.getAllApprovals();
    const pending = Object.entries(allApprovals).map(([id, req]) => ({
      requestId: id,
      ...req,
    }));

    return NextResponse.json({
      success: true,
      pending,
      count: pending.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tool-approval - Approve or reject a tool operation
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, approved, reason } = body;

    if (!requestId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, approved' },
        { status: 400 }
      );
    }

    const request = await storage.getApproval(requestId);
    if (!request) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      );
    }

    // Store the approval result
    await storage.setResult(requestId, { approved, reason }, 3600); // 1 hour TTL
    await storage.deleteApproval(requestId);

    return NextResponse.json({
      success: true,
      approved,
      message: approved ? 'Operation approved' : 'Operation rejected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tool-approval - Cancel a pending approval request
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing requestId parameter' },
        { status: 400 }
      );
    }

    const request = await storage.getApproval(requestId);
    if (!request) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      );
    }

    await storage.deleteApproval(requestId);

    return NextResponse.json({
      success: true,
      message: 'Approval request cancelled',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
