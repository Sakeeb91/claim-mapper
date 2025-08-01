import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Session from '../models/Session';
import Project from '../models/Project';
import redisManager from '../config/redis';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
  currentSession?: string;
  currentProject?: string;
}

export function setupWebSocketHandlers(io: SocketIOServer) {
  // Authentication middleware for WebSocket
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET || 'claim-mapper-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Get user from database
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      
      logger.info(`WebSocket authenticated: ${user.email}`);
      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle connection
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`WebSocket connected: ${socket.userId}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Send connection confirmation
    socket.emit('connected', {
      userId: socket.userId,
      timestamp: new Date(),
    });

    // Handle joining a project room
    socket.on('join_project', async (data: { projectId: string }) => {
      try {
        const { projectId } = data;
        
        // Verify project access
        const project = await Project.findById(projectId);
        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        const hasAccess = project.owner.toString() === socket.userId ||
          project.collaborators.some(c => c.user.toString() === socket.userId) ||
          project.visibility === 'public';

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to project' });
          return;
        }

        // Leave previous project room if any
        if (socket.currentProject) {
          socket.leave(`project:${socket.currentProject}`);
          socket.to(`project:${socket.currentProject}`).emit('user_left_project', {
            userId: socket.userId,
            user: socket.user,
            timestamp: new Date(),
          });
        }

        // Join new project room
        socket.join(`project:${projectId}`);
        socket.currentProject = projectId;

        // Notify others in the project
        socket.to(`project:${projectId}`).emit('user_joined_project', {
          userId: socket.userId,
          user: socket.user,
          timestamp: new Date(),
        });

        // Send project status
        const activeUsers = await getActiveUsersInProject(io, projectId);
        socket.emit('project_joined', {
          projectId,
          activeUsers,
          timestamp: new Date(),
        });

        // Track activity
        await redisManager.trackUserActivity(socket.userId!, {
          action: 'join_project_websocket',
          projectId,
        });

      } catch (error) {
        logger.error('Error joining project:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle leaving a project room
    socket.on('leave_project', async (data: { projectId: string }) => {
      try {
        const { projectId } = data;
        
        socket.leave(`project:${projectId}`);
        socket.currentProject = undefined;

        // Notify others
        socket.to(`project:${projectId}`).emit('user_left_project', {
          userId: socket.userId,
          user: socket.user,
          timestamp: new Date(),
        });

        socket.emit('project_left', {
          projectId,
          timestamp: new Date(),
        });

      } catch (error) {
        logger.error('Error leaving project:', error);
        socket.emit('error', { message: 'Failed to leave project' });
      }
    });

    // Handle joining a collaboration session
    socket.on('join_session', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        
        // Verify session access
        const session = await Session.findById(sessionId)
          .populate('project', 'owner collaborators visibility');
        
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const project = session.project as any;
        const hasAccess = project.owner.toString() === socket.userId ||
          project.collaborators.some((c: any) => c.user.toString() === socket.userId) ||
          session.participants.some(p => p.user.toString() === socket.userId);

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to session' });
          return;
        }

        // Join session room
        socket.join(`session:${sessionId}`);
        socket.currentSession = sessionId;

        // Add user to session participants if not already present
        await session.addParticipant(socket.userId!, 'participant');

        // Notify others in the session
        socket.to(`session:${sessionId}`).emit('user_joined_session', {
          userId: socket.userId,
          user: socket.user,
          timestamp: new Date(),
        });

        // Send session status
        const activeUsers = await getActiveUsersInSession(io, sessionId);
        socket.emit('session_joined', {
          sessionId,
          activeUsers,
          session: session.toJSON(),
          timestamp: new Date(),
        });

      } catch (error) {
        logger.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Handle real-time document editing
    socket.on('claim_edit_start', async (data: { claimId: string, projectId: string }) => {
      try {
        const { claimId, projectId } = data;
        
        // Check if claim is already being edited
        const lockKey = `claim_edit:${claimId}`;
        const currentEditor = await redisManager.checkLock(lockKey);
        
        if (currentEditor && currentEditor !== socket.userId) {
          socket.emit('claim_edit_conflict', {
            claimId,
            currentEditor,
            message: 'This claim is currently being edited by another user'
          });
          return;
        }
        
        // Acquire edit lock
        const lockAcquired = await redisManager.acquireLock(lockKey, socket.userId!, 300); // 5 minutes
        
        if (!lockAcquired) {
          socket.emit('claim_edit_conflict', {
            claimId,
            message: 'Unable to acquire edit lock'
          });
          return;
        }
        
        // Notify others in the project
        socket.to(`project:${projectId}`).emit('claim_edit_started', {
          claimId,
          userId: socket.userId,
          user: socket.user,
          timestamp: new Date(),
        });
        
        socket.emit('claim_edit_lock_acquired', {
          claimId,
          timestamp: new Date(),
        });
        
      } catch (error) {
        logger.error('Error starting claim edit:', error);
        socket.emit('error', { message: 'Failed to start editing claim' });
      }
    });

    // Handle claim edit updates
    socket.on('claim_edit_update', async (data: { 
      claimId: string, 
      projectId: string, 
      changes: any,
      cursorPosition?: number 
    }) => {
      try {
        const { claimId, projectId, changes, cursorPosition } = data;
        
        // Verify edit lock
        const lockOwner = await redisManager.checkLock(`claim_edit:${claimId}`);
        if (lockOwner !== socket.userId) {
          socket.emit('claim_edit_conflict', {
            claimId,
            message: 'Edit lock lost'
          });
          return;
        }
        
        // Broadcast changes to others in the project
        socket.to(`project:${projectId}`).emit('claim_edit_update', {
          claimId,
          userId: socket.userId,
          user: socket.user,
          changes,
          cursorPosition,
          timestamp: new Date(),
        });
        
        // Store changes in Redis for conflict resolution
        await redisManager.set(
          `claim_changes:${claimId}`,
          { changes, userId: socket.userId, timestamp: new Date() },
          300 // 5 minutes
        );
        
      } catch (error) {
        logger.error('Error updating claim edit:', error);
        socket.emit('error', { message: 'Failed to update claim' });
      }
    });

    // Handle claim edit end
    socket.on('claim_edit_end', async (data: { claimId: string, projectId: string, save?: boolean }) => {
      try {
        const { claimId, projectId, save = true } = data;
        
        // Release edit lock
        await redisManager.releaseLock(`claim_edit:${claimId}`, socket.userId!);
        
        // Clean up change cache if saving
        if (save) {
          await redisManager.del(`claim_changes:${claimId}`);
        }
        
        // Notify others in the project
        socket.to(`project:${projectId}`).emit('claim_edit_ended', {
          claimId,
          userId: socket.userId,
          user: socket.user,
          saved: save,
          timestamp: new Date(),
        });
        
        socket.emit('claim_edit_lock_released', {
          claimId,
          timestamp: new Date(),
        });
        
      } catch (error) {
        logger.error('Error ending claim edit:', error);
        socket.emit('error', { message: 'Failed to end claim editing' });
      }
    });

    // Handle cursor position updates
    socket.on('cursor_update', (data: { 
      projectId: string,
      elementId: string,
      position: { x: number, y: number },
      selection?: { start: number, end: number }
    }) => {
      const { projectId, elementId, position, selection } = data;
      
      // Broadcast cursor position to others in the project
      socket.to(`project:${projectId}`).emit('cursor_update', {
        userId: socket.userId,
        user: socket.user,
        elementId,
        position,
        selection,
        timestamp: new Date(),
      });
    });

    // Handle chat messages in sessions
    socket.on('session_chat', async (data: { sessionId: string, message: string }) => {
      try {
        const { sessionId, message } = data;
        
        if (!message || message.trim().length === 0) {
          return;
        }
        
        // Add message to session
        const session = await Session.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }
        
        await session.addChatMessage(socket.userId!, message.trim());
        
        // Broadcast to all session participants
        io.to(`session:${sessionId}`).emit('session_chat', {
          userId: socket.userId,
          user: socket.user,
          message: message.trim(),
          timestamp: new Date(),
        });
        
      } catch (error) {
        logger.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle voice call signaling
    socket.on('voice_call_offer', (data: { sessionId: string, offer: any }) => {
      socket.to(`session:${data.sessionId}`).emit('voice_call_offer', {
        from: socket.userId,
        offer: data.offer,
      });
    });

    socket.on('voice_call_answer', (data: { sessionId: string, answer: any, to: string }) => {
      socket.to(`session:${data.sessionId}`).emit('voice_call_answer', {
        from: socket.userId,
        answer: data.answer,
        to: data.to,
      });
    });

    socket.on('voice_call_ice_candidate', (data: { sessionId: string, candidate: any, to: string }) => {
      socket.to(`session:${data.sessionId}`).emit('voice_call_ice_candidate', {
        from: socket.userId,
        candidate: data.candidate,
        to: data.to,
      });
    });

    // Handle screen sharing
    socket.on('screen_share_start', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        
        // Update session with screen share info
        const session = await Session.findById(sessionId);
        if (session) {
          session.communication.screenShare.active = true;
          session.communication.screenShare.presenter = socket.userId!;
          session.communication.screenShare.startedAt = new Date();
          await session.save();
        }
        
        // Notify all session participants
        socket.to(`session:${sessionId}`).emit('screen_share_started', {
          presenter: socket.userId,
          user: socket.user,
          timestamp: new Date(),
        });
        
      } catch (error) {
        logger.error('Error starting screen share:', error);
        socket.emit('error', { message: 'Failed to start screen share' });
      }
    });

    socket.on('screen_share_end', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        
        // Update session
        const session = await Session.findById(sessionId);
        if (session) {
          session.communication.screenShare.active = false;
          session.communication.screenShare.presenter = undefined;
          await session.save();
        }
        
        // Notify all session participants
        socket.to(`session:${sessionId}`).emit('screen_share_ended', {
          presenter: socket.userId,
          timestamp: new Date(),
        });
        
      } catch (error) {
        logger.error('Error ending screen share:', error);
      }
    });

    // Handle user activity updates
    socket.on('activity_update', async (data: { type: string, details: any }) => {
      try {
        await redisManager.trackUserActivity(socket.userId!, {
          action: data.type,
          ...data.details,
          websocket: true,
        });
      } catch (error) {
        logger.error('Error tracking activity:', error);
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      logger.info(`WebSocket disconnected: ${socket.userId} - ${reason}`);
      
      try {
        // Release any edit locks held by this user
        const lockKeys = await redisManager.keys(`*:${socket.userId}`);
        for (const key of lockKeys) {
          if (key.includes('claim_edit:')) {
            const claimId = key.split(':')[1];
            await redisManager.releaseLock(`claim_edit:${claimId}`, socket.userId!);
            
            // Notify project members
            if (socket.currentProject) {
              socket.to(`project:${socket.currentProject}`).emit('claim_edit_ended', {
                claimId,
                userId: socket.userId,
                forced: true,
                reason: 'User disconnected',
                timestamp: new Date(),
              });
            }
          }
        }
        
        // Update session if user was in one
        if (socket.currentSession) {
          const session = await Session.findById(socket.currentSession);
          if (session) {
            await session.removeParticipant(socket.userId!);
            
            // Notify other session participants
            socket.to(`session:${socket.currentSession}`).emit('user_left_session', {
              userId: socket.userId,
              user: socket.user,
              reason: 'disconnected',
              timestamp: new Date(),
            });
          }
        }
        
        // Notify project members if user was in a project
        if (socket.currentProject) {
          socket.to(`project:${socket.currentProject}`).emit('user_left_project', {
            userId: socket.userId,
            user: socket.user,
            reason: 'disconnected',
            timestamp: new Date(),
          });
        }
        
        // Track disconnection
        await redisManager.trackUserActivity(socket.userId!, {
          action: 'websocket_disconnect',
          reason,
        });
        
      } catch (error) {
        logger.error('Error handling disconnection cleanup:', error);
      }
    });
  });
}

// Helper functions
async function getActiveUsersInProject(io: SocketIOServer, projectId: string) {
  try {
    const sockets = await io.in(`project:${projectId}`).fetchSockets();
    return sockets.map((socket: any) => ({
      userId: socket.userId,
      user: socket.user,
      connectedAt: socket.handshake.time,
    }));
  } catch (error) {
    logger.error('Error getting active users in project:', error);
    return [];
  }
}

async function getActiveUsersInSession(io: SocketIOServer, sessionId: string) {
  try {
    const sockets = await io.in(`session:${sessionId}`).fetchSockets();
    return sockets.map((socket: any) => ({
      userId: socket.userId,
      user: socket.user,
      connectedAt: socket.handshake.time,
    }));
  } catch (error) {
    logger.error('Error getting active users in session:', error);
    return [];
  }
}