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
        const lockKey = `claim_edit:${claimId}`;\n        const currentEditor = await redisManager.checkLock(lockKey);
        
        if (currentEditor && currentEditor !== socket.userId) {\n          socket.emit('claim_edit_conflict', {\n            claimId,\n            currentEditor,\n            message: 'This claim is currently being edited by another user'\n          });\n          return;\n        }\n        \n        // Acquire edit lock\n        const lockAcquired = await redisManager.acquireLock(lockKey, socket.userId!, 300); // 5 minutes\n        \n        if (!lockAcquired) {\n          socket.emit('claim_edit_conflict', {\n            claimId,\n            message: 'Unable to acquire edit lock'\n          });\n          return;\n        }\n        \n        // Notify others in the project\n        socket.to(`project:${projectId}`).emit('claim_edit_started', {\n          claimId,\n          userId: socket.userId,\n          user: socket.user,\n          timestamp: new Date(),\n        });\n        \n        socket.emit('claim_edit_lock_acquired', {\n          claimId,\n          timestamp: new Date(),\n        });\n        \n      } catch (error) {\n        logger.error('Error starting claim edit:', error);\n        socket.emit('error', { message: 'Failed to start editing claim' });\n      }\n    });\n\n    // Handle claim edit updates\n    socket.on('claim_edit_update', async (data: { \n      claimId: string, \n      projectId: string, \n      changes: any,\n      cursorPosition?: number \n    }) => {\n      try {\n        const { claimId, projectId, changes, cursorPosition } = data;\n        \n        // Verify edit lock\n        const lockOwner = await redisManager.checkLock(`claim_edit:${claimId}`);\n        if (lockOwner !== socket.userId) {\n          socket.emit('claim_edit_conflict', {\n            claimId,\n            message: 'Edit lock lost'\n          });\n          return;\n        }\n        \n        // Broadcast changes to others in the project\n        socket.to(`project:${projectId}`).emit('claim_edit_update', {\n          claimId,\n          userId: socket.userId,\n          user: socket.user,\n          changes,\n          cursorPosition,\n          timestamp: new Date(),\n        });\n        \n        // Store changes in Redis for conflict resolution\n        await redisManager.set(\n          `claim_changes:${claimId}`,\n          { changes, userId: socket.userId, timestamp: new Date() },\n          300 // 5 minutes\n        );\n        \n      } catch (error) {\n        logger.error('Error updating claim edit:', error);\n        socket.emit('error', { message: 'Failed to update claim' });\n      }\n    });\n\n    // Handle claim edit end\n    socket.on('claim_edit_end', async (data: { claimId: string, projectId: string, save?: boolean }) => {\n      try {\n        const { claimId, projectId, save = true } = data;\n        \n        // Release edit lock\n        await redisManager.releaseLock(`claim_edit:${claimId}`, socket.userId!);\n        \n        // Clean up change cache if saving\n        if (save) {\n          await redisManager.del(`claim_changes:${claimId}`);\n        }\n        \n        // Notify others in the project\n        socket.to(`project:${projectId}`).emit('claim_edit_ended', {\n          claimId,\n          userId: socket.userId,\n          user: socket.user,\n          saved: save,\n          timestamp: new Date(),\n        });\n        \n        socket.emit('claim_edit_lock_released', {\n          claimId,\n          timestamp: new Date(),\n        });\n        \n      } catch (error) {\n        logger.error('Error ending claim edit:', error);\n        socket.emit('error', { message: 'Failed to end claim editing' });\n      }\n    });\n\n    // Handle cursor position updates\n    socket.on('cursor_update', (data: { \n      projectId: string,\n      elementId: string,\n      position: { x: number, y: number },\n      selection?: { start: number, end: number }\n    }) => {\n      const { projectId, elementId, position, selection } = data;\n      \n      // Broadcast cursor position to others in the project\n      socket.to(`project:${projectId}`).emit('cursor_update', {\n        userId: socket.userId,\n        user: socket.user,\n        elementId,\n        position,\n        selection,\n        timestamp: new Date(),\n      });\n    });\n\n    // Handle chat messages in sessions\n    socket.on('session_chat', async (data: { sessionId: string, message: string }) => {\n      try {\n        const { sessionId, message } = data;\n        \n        if (!message || message.trim().length === 0) {\n          return;\n        }\n        \n        // Add message to session\n        const session = await Session.findById(sessionId);\n        if (!session) {\n          socket.emit('error', { message: 'Session not found' });\n          return;\n        }\n        \n        await session.addChatMessage(socket.userId!, message.trim());\n        \n        // Broadcast to all session participants\n        io.to(`session:${sessionId}`).emit('session_chat', {\n          userId: socket.userId,\n          user: socket.user,\n          message: message.trim(),\n          timestamp: new Date(),\n        });\n        \n      } catch (error) {\n        logger.error('Error sending chat message:', error);\n        socket.emit('error', { message: 'Failed to send message' });\n      }\n    });\n\n    // Handle voice call signaling\n    socket.on('voice_call_offer', (data: { sessionId: string, offer: any }) => {\n      socket.to(`session:${data.sessionId}`).emit('voice_call_offer', {\n        from: socket.userId,\n        offer: data.offer,\n      });\n    });\n\n    socket.on('voice_call_answer', (data: { sessionId: string, answer: any, to: string }) => {\n      socket.to(`session:${data.sessionId}`).emit('voice_call_answer', {\n        from: socket.userId,\n        answer: data.answer,\n        to: data.to,\n      });\n    });\n\n    socket.on('voice_call_ice_candidate', (data: { sessionId: string, candidate: any, to: string }) => {\n      socket.to(`session:${data.sessionId}`).emit('voice_call_ice_candidate', {\n        from: socket.userId,\n        candidate: data.candidate,\n        to: data.to,\n      });\n    });\n\n    // Handle screen sharing\n    socket.on('screen_share_start', async (data: { sessionId: string }) => {\n      try {\n        const { sessionId } = data;\n        \n        // Update session with screen share info\n        const session = await Session.findById(sessionId);\n        if (session) {\n          session.communication.screenShare.active = true;\n          session.communication.screenShare.presenter = socket.userId!;\n          session.communication.screenShare.startedAt = new Date();\n          await session.save();\n        }\n        \n        // Notify all session participants\n        socket.to(`session:${sessionId}`).emit('screen_share_started', {\n          presenter: socket.userId,\n          user: socket.user,\n          timestamp: new Date(),\n        });\n        \n      } catch (error) {\n        logger.error('Error starting screen share:', error);\n        socket.emit('error', { message: 'Failed to start screen share' });\n      }\n    });\n\n    socket.on('screen_share_end', async (data: { sessionId: string }) => {\n      try {\n        const { sessionId } = data;\n        \n        // Update session\n        const session = await Session.findById(sessionId);\n        if (session) {\n          session.communication.screenShare.active = false;\n          session.communication.screenShare.presenter = undefined;\n          await session.save();\n        }\n        \n        // Notify all session participants\n        socket.to(`session:${sessionId}`).emit('screen_share_ended', {\n          presenter: socket.userId,\n          timestamp: new Date(),\n        });\n        \n      } catch (error) {\n        logger.error('Error ending screen share:', error);\n      }\n    });\n\n    // Handle user activity updates\n    socket.on('activity_update', async (data: { type: string, details: any }) => {\n      try {\n        await redisManager.trackUserActivity(socket.userId!, {\n          action: data.type,\n          ...data.details,\n          websocket: true,\n        });\n      } catch (error) {\n        logger.error('Error tracking activity:', error);\n      }\n    });\n\n    // Handle ping/pong for connection health\n    socket.on('ping', () => {\n      socket.emit('pong', { timestamp: new Date() });\n    });\n\n    // Handle disconnection\n    socket.on('disconnect', async (reason) => {\n      logger.info(`WebSocket disconnected: ${socket.userId} - ${reason}`);\n      \n      try {\n        // Release any edit locks held by this user\n        const lockKeys = await redisManager.keys(`*:${socket.userId}`);\n        for (const key of lockKeys) {\n          if (key.includes('claim_edit:')) {\n            const claimId = key.split(':')[1];\n            await redisManager.releaseLock(`claim_edit:${claimId}`, socket.userId!);\n            \n            // Notify project members\n            if (socket.currentProject) {\n              socket.to(`project:${socket.currentProject}`).emit('claim_edit_ended', {\n                claimId,\n                userId: socket.userId,\n                forced: true,\n                reason: 'User disconnected',\n                timestamp: new Date(),\n              });\n            }\n          }\n        }\n        \n        // Update session if user was in one\n        if (socket.currentSession) {\n          const session = await Session.findById(socket.currentSession);\n          if (session) {\n            await session.removeParticipant(socket.userId!);\n            \n            // Notify other session participants\n            socket.to(`session:${socket.currentSession}`).emit('user_left_session', {\n              userId: socket.userId,\n              user: socket.user,\n              reason: 'disconnected',\n              timestamp: new Date(),\n            });\n          }\n        }\n        \n        // Notify project members if user was in a project\n        if (socket.currentProject) {\n          socket.to(`project:${socket.currentProject}`).emit('user_left_project', {\n            userId: socket.userId,\n            user: socket.user,\n            reason: 'disconnected',\n            timestamp: new Date(),\n          });\n        }\n        \n        // Track disconnection\n        await redisManager.trackUserActivity(socket.userId!, {\n          action: 'websocket_disconnect',\n          reason,\n        });\n        \n      } catch (error) {\n        logger.error('Error handling disconnection cleanup:', error);\n      }\n    });\n  });\n}\n\n// Helper functions\nasync function getActiveUsersInProject(io: SocketIOServer, projectId: string) {\n  try {\n    const sockets = await io.in(`project:${projectId}`).fetchSockets();\n    return sockets.map((socket: any) => ({\n      userId: socket.userId,\n      user: socket.user,\n      connectedAt: socket.handshake.time,\n    }));\n  } catch (error) {\n    logger.error('Error getting active users in project:', error);\n    return [];\n  }\n}\n\nasync function getActiveUsersInSession(io: SocketIOServer, sessionId: string) {\n  try {\n    const sockets = await io.in(`session:${sessionId}`).fetchSockets();\n    return sockets.map((socket: any) => ({\n      userId: socket.userId,\n      user: socket.user,\n      connectedAt: socket.handshake.time,\n    }));\n  } catch (error) {\n    logger.error('Error getting active users in session:', error);\n    return [];\n  }\n}"