'use client';

import { useState, useEffect } from 'react';
import { X, Edit3, Link, Calendar, User, Tag, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { NodeDetailsPanelProps, Claim, Evidence, ReasoningChain, GraphNode } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/utils';
import { formatDistanceToNow } from 'date-fns';

export function NodeDetailsPanel({ nodeId, onClose, onEdit, onConnect }: NodeDetailsPanelProps) {
  const { graphData, claims } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);

  const node = graphData.nodes.find(n => n.id === nodeId);
  
  if (!nodeId || !node) {
    return null;
  }

  const nodeData = node.data;
  const nodeType = node.type;

  // Get connected nodes
  const connections = graphData.links
    .filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return sourceId === nodeId || targetId === nodeId;
    })
    .map(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const connectedNodeId = sourceId === nodeId ? targetId : sourceId;
      const connectedNode = graphData.nodes.find(n => n.id === connectedNodeId);
      return {
        link,
        node: connectedNode,
        direction: sourceId === nodeId ? 'outgoing' : 'incoming'
      };
    })
    .filter(conn => conn.node);

  const renderClaimDetails = (claim: Claim) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Claim</h3>
        <p className="text-gray-700 leading-relaxed">{claim.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium text-gray-500">Type</span>
          <p className="mt-1 capitalize text-sm text-gray-900">{claim.type}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">Confidence</span>
          <div className="mt-1 flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  claim.confidence > 0.7 ? "bg-green-500" :
                  claim.confidence > 0.4 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${claim.confidence * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {Math.round(claim.confidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {claim.tags.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-500">Tags</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {claim.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {claim.author && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>Created by {claim.author}</span>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>Created {formatDistanceToNow(new Date(claim.createdAt))} ago</span>
      </div>

      {claim.evidence.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Evidence ({claim.evidence.length})</h4>
          <div className="space-y-2">
            {claim.evidence.slice(0, 3).map((evidence) => (
              <div key={evidence.id} className="p-2 bg-gray-50 rounded border-l-4 border-gray-300">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    evidence.type === 'supporting' ? "bg-green-100 text-green-800" :
                    evidence.type === 'contradicting' ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  )}>
                    {evidence.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    Reliability: {Math.round(evidence.reliability * 100)}%
                  </span>
                </div>
                <p className="text-sm text-gray-700">{evidence.text}</p>
                {evidence.source && (
                  <p className="text-xs text-gray-500 mt-1">Source: {evidence.source}</p>
                )}
              </div>
            ))}
            {claim.evidence.length > 3 && (
              <p className="text-xs text-gray-500">
                ... and {claim.evidence.length - 3} more evidence items
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderEvidenceDetails = (evidence: Evidence) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Evidence</h3>
        <p className="text-gray-700 leading-relaxed">{evidence.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium text-gray-500">Type</span>
          <div className="mt-1">
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              evidence.type === 'supporting' ? "bg-green-100 text-green-800" :
              evidence.type === 'contradicting' ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-800"
            )}>
              {evidence.type === 'supporting' ? <CheckCircle className="w-3 h-3 mr-1" /> :
               evidence.type === 'contradicting' ? <AlertCircle className="w-3 h-3 mr-1" /> :
               null}
              {evidence.type}
            </span>
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">Reliability</span>
          <div className="mt-1 flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  evidence.reliability > 0.7 ? "bg-green-500" :
                  evidence.reliability > 0.4 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${evidence.reliability * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {Math.round(evidence.reliability * 100)}%
            </span>
          </div>
        </div>
      </div>

      {evidence.source && (
        <div>
          <span className="text-sm font-medium text-gray-500">Source</span>
          <p className="mt-1 text-sm text-gray-900">{evidence.source}</p>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>Created {formatDistanceToNow(new Date(evidence.createdAt))} ago</span>
      </div>
    </div>
  );

  const renderReasoningDetails = (reasoning: ReasoningChain) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Reasoning Chain</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Type</span>
            <p className="mt-1 capitalize text-sm text-gray-900">{reasoning.type}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Steps</span>
            <p className="mt-1 text-sm text-gray-900">{reasoning.steps.length}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Reasoning Steps</h4>
        <div className="space-y-3">
          {reasoning.steps
            .sort((a, b) => a.order - b.order)
            .map((step, index) => (
              <div key={step.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    step.type === 'premise' ? "bg-blue-100 text-blue-800" :
                    step.type === 'inference' ? "bg-purple-100 text-purple-800" :
                    "bg-green-100 text-green-800"
                  )}>
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {step.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(step.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{step.text}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {reasoning.author && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>Created by {reasoning.author}</span>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>Created {formatDistanceToNow(new Date(reasoning.createdAt))} ago</span>
      </div>
    </div>
  );

  const renderNodeContent = () => {
    switch (nodeType) {
      case 'claim':
        return renderClaimDetails(nodeData as Claim);
      case 'evidence':
        return renderEvidenceDetails(nodeData as Evidence);
      case 'reasoning':
        return renderReasoningDetails(nodeData as ReasoningChain);
      default:
        return <div>Unknown node type</div>;
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            nodeType === 'claim' ? "bg-blue-500" :
            nodeType === 'evidence' ? "bg-green-500" :
            "bg-purple-500"
          )} />
          <h2 className="text-lg font-semibold text-gray-900 capitalize">
            {nodeType} Details
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(nodeId)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onConnect && (
            <button
              onClick={() => setConnectionMode(!connectionMode)}
              className={cn(
                "p-2 rounded-md",
                connectionMode
                  ? "text-blue-600 bg-blue-100"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              <Link className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderNodeContent()}

        {/* Connections */}
        {connections.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Connections ({connections.length})
            </h4>
            <div className="space-y-2">
              {connections.map(({ link, node: connectedNode, direction }, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    // Could trigger navigation to connected node
                  }}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    connectedNode?.type === 'claim' ? "bg-blue-500" :
                    connectedNode?.type === 'evidence' ? "bg-green-500" :
                    "bg-purple-500"
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        link.type === 'supports' ? "bg-green-100 text-green-800" :
                        link.type === 'contradicts' ? "bg-red-100 text-red-800" :
                        link.type === 'relates' ? "bg-gray-100 text-gray-800" :
                        "bg-purple-100 text-purple-800"
                      )}>
                        {direction === 'outgoing' ? '→' : '←'} {link.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 truncate mt-1">
                      {connectedNode?.label}
                    </p>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {Math.round(link.strength * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {connectionMode && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Click on another node in the graph to create a connection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}