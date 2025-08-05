import { useEffect, useRef } from 'react';
import { websocketService } from '@/services/websocket';

export function useWebSocket(userId?: string) {
  const isConnected = useRef(false);

  useEffect(() => {
    if (!isConnected.current) {
      websocketService.connect(userId || 'anonymous');
      isConnected.current = true;
    }

    return () => {
      if (isConnected.current) {
        websocketService.disconnect();
        isConnected.current = false;
      }
    };
  }, [userId]);

  return websocketService;
}

export function useDocumentCollaboration(documentId: string) {
  const ws = useWebSocket();

  useEffect(() => {
    if (documentId) {
      ws.joinDocument(documentId);
      
      return () => {
        ws.leaveDocument(documentId);
      };
    }
  }, [documentId, ws]);

  return {
    sendCursorPosition: (position: { line: number; column: number }) => 
      ws.sendCursorPosition(documentId, position),
    
    sendTextChange: (change: { text: string; position: number }) => 
      ws.sendTextChange(documentId, change),
    
    sendComment: (comment: { text: string; position: { x: number; y: number } }) => 
      ws.sendComment(documentId, comment),
    
    onUserJoined: ws.onUserJoined.bind(ws),
    onUserLeft: ws.onUserLeft.bind(ws),
    onCursorPositionUpdate: ws.onCursorPositionUpdate.bind(ws),
    onTextChangeUpdate: ws.onTextChangeUpdate.bind(ws),
    onNewComment: ws.onNewComment.bind(ws),
  };
}