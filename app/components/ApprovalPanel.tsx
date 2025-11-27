'use client';

import { useState, useEffect } from 'react';

interface ApprovalRequest {
  requestId: string;
  agentId: string;
  toolName: string;
  operation: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export default function ApprovalPanel() {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Poll for pending approvals
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        const response = await fetch('/api/tool-approval');
        if (response.ok) {
          const data = await response.json();
          setPendingApprovals(data.pending || []);
        }
      } catch (error) {
        console.error('Failed to fetch pending approvals:', error);
      }
    };

    fetchPendingApprovals();
    const interval = setInterval(fetchPendingApprovals, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (requestId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tool-approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, approved: true }),
      });

      if (response.ok) {
        setPendingApprovals(prev => prev.filter(r => r.requestId !== requestId));
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (requestId: string, reason?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tool-approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, approved: false, reason }),
      });

      if (response.ok) {
        setPendingApprovals(prev => prev.filter(r => r.requestId !== requestId));
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await fetch(`/api/tool-approval?requestId=${requestId}`, {
        method: 'DELETE',
      });
      setPendingApprovals(prev => prev.filter(r => r.requestId !== requestId));
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'execute_shell':
        return '⚙️';
      case 'apply_patch':
        return '📝';
      case 'web_search':
        return '🔍';
      default:
        return '🔧';
    }
  };

  const getSeverityColor = (toolName: string) => {
    switch (toolName) {
      case 'execute_shell':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'apply_patch':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  if (pendingApprovals.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white shadow-2xl rounded-lg border-2 border-gray-300 z-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 rounded-t-lg">
        <h3 className="font-bold text-lg flex items-center">
          <span className="mr-2">⚠️</span>
          Approval Required ({pendingApprovals.length})
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {pendingApprovals.map((request) => (
          <div
            key={request.requestId}
            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
              selectedRequest?.requestId === request.requestId ? 'bg-blue-50' : ''
            }`}
            onClick={() => setSelectedRequest(request)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{getToolIcon(request.toolName)}</span>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {request.agentId.toUpperCase()} - {request.toolName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className={`text-sm px-2 py-1 rounded border inline-block ${getSeverityColor(request.toolName)}`}>
                  {request.operation}
                </div>

                {selectedRequest?.requestId === request.requestId && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm">
                      <strong>Details:</strong>
                      <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(request.details, null, 2)}
                      </pre>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(request.requestId);
                        }}
                        disabled={isLoading}
                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(request.requestId, 'User rejected');
                        }}
                        disabled={isLoading}
                        className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 font-medium"
                      >
                        ✗ Reject
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(request.requestId);
                        }}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
