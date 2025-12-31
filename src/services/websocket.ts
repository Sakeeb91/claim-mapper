import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/store/useAppStore';
import { logger } from '@/utils/logger';
import { LOG_COMPONENTS, LOG_ACTIONS } from '@/constants/logging';

// Create child logger for WebSocket service
const wsLogger = logger.child({ component: LOG_COMPONENTS.WEBSOCKET });

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupEventListeners();
  }

  connect(token: string, url: string = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001') {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupSocketEventListeners();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      wsLogger.warn('Socket not connected, cannot emit event', { event });
    }
  }

  private setupEventListeners() {
    if (typeof window !== 'undefined') {
      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handlePageHidden();
        } else {
          this.handlePageVisible();
        }
      });

      // Handle window focus/blur
      window.addEventListener('focus', this.handlePageVisible.bind(this));
      window.addEventListener('blur', this.handlePageHidden.bind(this));

      // Handle beforeunload
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  private setupSocketEventListeners() {
    if (!this.socket) return;

    const store = useAppStore.getState();

    // Connection events
    this.socket.on('connect', () => {
      wsLogger.info('Connected', { action: LOG_ACTIONS.CONNECT });
      this.reconnectAttempts = 0;
      store.setConnectionStatus(true, false);
    });

    this.socket.on('disconnect', (reason) => {
      wsLogger.info('Disconnected', { action: LOG_ACTIONS.DISCONNECT, reason });
      store.setConnectionStatus(false, false);

      if (reason === 'io client disconnect') {
        // Manual disconnect, don't reconnect
        return;
      }

      // Auto-reconnect logic
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      wsLogger.error('Connection error', {
        action: LOG_ACTIONS.CONNECTION_ERROR,
        error: error instanceof Error ? error : String(error),
      });
      store.setConnectionStatus(false, false);
      this.handleReconnection();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      wsLogger.info('Reconnected', {
        action: LOG_ACTIONS.RECONNECT,
        attemptNumber,
      });
      this.reconnectAttempts = 0;
      store.setConnectionStatus(true, false);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      wsLogger.info('Reconnection attempt', {
        action: LOG_ACTIONS.RECONNECT_ATTEMPT,
        attemptNumber,
      });
      store.setConnectionStatus(false, true);
    });

    this.socket.on('reconnect_failed', () => {
      wsLogger.error('Reconnection failed after max attempts', {
        action: LOG_ACTIONS.RECONNECT_ATTEMPT,
        maxAttempts: this.maxReconnectAttempts,
      });
      store.setConnectionStatus(false, false);
      store.setError('Connection lost. Please refresh the page.');
    });

    // Application-specific events
    this.setupApplicationEventListeners();
  }

  private setupApplicationEventListeners() {
    if (!this.socket) return;

    const store = useAppStore.getState();

    // User presence events
    this.socket.on('user_joined_project', (data) => {
      const userPresence = {
        userId: data.userId,
        user: data.user,
        lastUpdate: new Date(data.timestamp),
        activity: 'viewing' as const
      };
      
      const currentUsers = store.activeUsers.filter(u => u.userId !== data.userId);
      store.setActiveUsers([...currentUsers, userPresence]);
    });

    this.socket.on('user_left_project', (data) => {
      store.removeUser(data.userId);
    });

    this.socket.on('cursor_update', (data) => {
      store.updateUserPresence(data.userId, {
        cursor: {
          x: data.position.x,
          y: data.position.y,
          elementId: data.elementId,
          selection: data.selection
        },
        lastUpdate: new Date()
      });
    });

    // Claim editing events
    this.socket.on('claim_edit_started', (data) => {
      store.addNotification({
        id: `edit_${data.claimId}_${Date.now()}`,
        type: 'system',
        title: 'Claim Being Edited',
        message: `${data.user.name} started editing a claim`,
        userId: data.userId,
        read: false,
        createdAt: new Date(),
        priority: 'low'
      });

      // Update user activity
      store.updateUserPresence(data.userId, {
        activity: 'editing',
        lastUpdate: new Date()
      });
    });

    this.socket.on('claim_edit_update', (data) => {
      // Handle real-time claim updates
      store.updateClaim(data.claimId, data.changes);
      
      store.addChangeEvent({
        id: `change_${Date.now()}`,
        type: 'update',
        entityType: 'claim',
        entityId: data.claimId,
        userId: data.userId,
        user: data.user,
        changes: data.changes,
        timestamp: new Date()
      });
    });

    this.socket.on('claim_edit_ended', (data) => {
      store.updateUserPresence(data.userId, {
        activity: 'viewing',
        lastUpdate: new Date()
      });

      if (data.forced) {
        store.addNotification({
          id: `edit_end_${data.claimId}_${Date.now()}`,
          type: 'system',
          title: 'Edit Session Ended',
          message: `Edit session for claim ended: ${data.reason || 'User disconnected'}`,
          userId: data.userId,
          read: false,
          createdAt: new Date(),
          priority: 'medium'
        });
      }
    });

    this.socket.on('claim_edit_conflict', (data) => {
      store.addConflict({
        id: `conflict_${Date.now()}`,
        conflictType: 'concurrent_edit',
        entityId: data.claimId,
        conflictingUsers: [data.currentEditor],
        proposedResolution: 'manual_review',
        status: 'pending',
        createdAt: new Date()
      });

      store.addNotification({
        id: `conflict_${data.claimId}_${Date.now()}`,
        type: 'conflict',
        title: 'Edit Conflict',
        message: data.message,
        userId: data.currentEditor,
        read: false,
        createdAt: new Date(),
        priority: 'high'
      });
    });

    // Comment events
    this.socket.on('comment_added', (data) => {
      store.addComment(data.comment);
      
      store.addNotification({
        id: `comment_${data.comment.id}_${Date.now()}`,
        type: 'comment',
        title: 'New Comment',
        message: `${data.comment.author.name} added a comment`,
        userId: data.comment.author.id,
        read: false,
        createdAt: new Date(),
        priority: 'medium'
      });
    });

    this.socket.on('comment_updated', (data) => {
      store.updateComment(data.comment.id, data.comment);
    });

    this.socket.on('comment_resolved', (data) => {
      store.resolveComment(data.commentId);
    });

    // Validation events
    this.socket.on('validation_submitted', (data) => {
      store.updateValidationResult(data.claimId, data.validationResult);
      
      store.addNotification({
        id: `validation_${data.claimId}_${Date.now()}`,
        type: 'validation',
        title: 'New Validation',
        message: `${data.validator.name} submitted a validation`,
        userId: data.validator.id,
        read: false,
        createdAt: new Date(),
        priority: 'medium'
      });
    });

    // Session events
    this.socket.on('session_joined', (data) => {
      store.setActiveUsers(data.activeUsers);
    });

    this.socket.on('session_chat', (data) => {
      // Handle chat messages if needed
      wsLogger.debug('Chat message received', { messageId: data?.id });
    });

    // Error handling
    this.socket.on('error', (data) => {
      wsLogger.error('WebSocket error', {
        error: data?.message || 'Unknown error',
        code: data?.code,
      });
      store.setError(data.message || 'An error occurred');
    });

    // Ping/pong for connection health
    this.socket.on('pong', (data) => {
      // Connection is healthy
      wsLogger.debug('Pong received', { latency: data?.latency });
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      wsLogger.error('Max reconnection attempts reached', {
        action: LOG_ACTIONS.RECONNECT_ATTEMPT,
        maxAttempts: this.maxReconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    wsLogger.info('Scheduling reconnection attempt', {
      action: LOG_ACTIONS.RECONNECT_ATTEMPT,
      delayMs: delay,
      attempt: this.reconnectAttempts,
    });

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  private handlePageHidden() {
    // Reduce activity when page is hidden
    if (this.socket?.connected) {
      this.socket.emit('activity_update', {
        type: 'page_hidden',
        details: { timestamp: new Date() }
      });
    }
  }

  private handlePageVisible() {
    // Resume activity when page becomes visible
    if (this.socket?.connected) {
      this.socket.emit('activity_update', {
        type: 'page_visible',
        details: { timestamp: new Date() }
      });
    }
  }

  // Public methods for specific actions
  public joinProject(projectId: string) {
    this.emit('join_project', { projectId });
  }

  public leaveProject(projectId: string) {
    this.emit('leave_project', { projectId });
  }

  public startEditingClaim(claimId: string, projectId: string) {
    this.emit('claim_edit_start', { claimId, projectId });
  }

  public updateClaimEdit(claimId: string, projectId: string, changes: any, cursorPosition?: number) {
    this.emit('claim_edit_update', {
      claimId,
      projectId,
      changes,
      cursorPosition
    });
  }

  public stopEditingClaim(claimId: string, projectId: string, save: boolean = true) {
    this.emit('claim_edit_end', { claimId, projectId, save });
  }

  public updateCursor(projectId: string, elementId: string, position: { x: number; y: number }, selection?: { start: number; end: number }) {
    this.emit('cursor_update', {
      projectId,
      elementId,
      position,
      selection
    });
  }

  public sendChatMessage(sessionId: string, message: string) {
    this.emit('session_chat', { sessionId, message });
  }

  // Document collaboration methods
  public joinDocument(documentId: string) {
    this.emit('join_document', { documentId });
  }

  public leaveDocument(documentId: string) {
    this.emit('leave_document', { documentId });
  }

  public sendCursorPosition(documentId: string, position: { line: number; column: number }) {
    this.emit('cursor_position', { documentId, position });
  }

  public sendTextChange(documentId: string, change: { text: string; position: number }) {
    this.emit('text_change', { documentId, change });
  }

  public sendComment(documentId: string, comment: { text: string; position: { x: number; y: number } }) {
    this.emit('comment', { documentId, comment });
  }

  // Event handler placeholders
  public onUserJoined(callback: (data: any) => void) {
    this.socket?.on('user_joined', callback);
  }

  public onUserLeft(callback: (data: any) => void) {
    this.socket?.on('user_left', callback);
  }

  public onCursorPositionUpdate(callback: (data: any) => void) {
    this.socket?.on('cursor_position_update', callback);
  }

  public onTextChangeUpdate(callback: (data: any) => void) {
    this.socket?.on('text_change_update', callback);
  }

  public onNewComment(callback: (data: any) => void) {
    this.socket?.on('new_comment', callback);
  }

  public pingServer() {
    this.emit('ping', {});
  }

  // Start periodic ping to keep connection alive
  public startHealthCheck(interval: number = 30000) {
    setInterval(() => {
      if (this.socket?.connected) {
        this.pingServer();
      }
    }, interval);
  }
}

// Singleton instance
export const websocketService = new WebSocketService();