import { io, Socket } from 'socket.io-client';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId?: string): void {
    if (this.socket?.connected) return;

    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8001';
    
    this.socket = io(url, {
      transports: ['websocket'],
      auth: {
        userId: userId || 'anonymous',
      },
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }

  // Collaboration events
  joinDocument(documentId: string): void {
    this.socket?.emit('join-document', documentId);
  }

  leaveDocument(documentId: string): void {
    this.socket?.emit('leave-document', documentId);
  }

  sendCursorPosition(documentId: string, position: { line: number; column: number }): void {
    this.socket?.emit('cursor-position', { documentId, position });
  }

  sendTextChange(documentId: string, change: { text: string; position: number }): void {
    this.socket?.emit('text-change', { documentId, change });
  }

  sendComment(documentId: string, comment: { text: string; position: { x: number; y: number } }): void {
    this.socket?.emit('new-comment', { documentId, comment });
  }

  // Event listeners
  onUserJoined(callback: (user: { id: string; name: string }) => void): void {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (userId: string) => void): void {
    this.socket?.on('user-left', callback);
  }

  onCursorPositionUpdate(callback: (data: { userId: string; position: { line: number; column: number } }) => void): void {
    this.socket?.on('cursor-position-update', callback);
  }

  onTextChangeUpdate(callback: (data: { userId: string; change: { text: string; position: number } }) => void): void {
    this.socket?.on('text-change-update', callback);
  }

  onNewComment(callback: (comment: { id: string; text: string; author: string; position: { x: number; y: number } }) => void): void {
    this.socket?.on('comment-added', callback);
  }

  // Graph collaboration events
  onGraphNodeUpdate(callback: (data: { nodeId: string; updates: Record<string, unknown> }) => void): void {
    this.socket?.on('graph-node-update', callback);
  }

  onGraphLinkUpdate(callback: (data: { linkId: string; updates: Record<string, unknown> }) => void): void {
    this.socket?.on('graph-link-update', callback);
  }

  sendGraphNodeUpdate(nodeId: string, updates: Record<string, unknown>): void {
    this.socket?.emit('update-graph-node', { nodeId, updates });
  }

  sendGraphLinkUpdate(linkId: string, updates: Record<string, unknown>): void {
    this.socket?.emit('update-graph-link', { linkId, updates });
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const websocketService = new WebSocketService();