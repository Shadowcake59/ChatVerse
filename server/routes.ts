import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertRoomSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

interface SocketUser {
  userId: string;
  roomId?: string;
  socket: WebSocket;
}

const connectedUsers = new Map<WebSocket, SocketUser>();
const roomSockets = new Map<string, Set<WebSocket>>();

// Broadcast to all connected users
function broadcastToAll(message: any, excludeSocket?: WebSocket) {
  connectedUsers.forEach((user, socket) => {
    if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
}

// Get all online users
function getOnlineUsers(): string[] {
  return Array.from(new Set(Array.from(connectedUsers.values()).map(user => user.userId)));
}

// Profanity filter - simple implementation
const inappropriateWords = ["badword1", "badword2", "spam", "hate"];

function containsInappropriateContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return inappropriateWords.some(word => lowerText.includes(word));
}

function broadcastToRoom(roomId: string, message: any, excludeSocket?: WebSocket) {
  const sockets = roomSockets.get(roomId);
  if (sockets) {
    sockets.forEach(socket => {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Room routes
  app.get('/api/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRooms = await storage.getUserRooms(userId);
      res.json(userRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get('/api/rooms/public', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const publicRooms = await storage.getAvailablePublicRooms(userId);
      res.json(publicRooms);
    } catch (error) {
      console.error("Error fetching public rooms:", error);
      res.status(500).json({ message: "Failed to fetch public rooms" });
    }
  });

  app.get('/api/rooms/public', isAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getPublicRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching public rooms:", error);
      res.status(500).json({ message: "Failed to fetch public rooms" });
    }
  });

  app.post('/api/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const roomData = insertRoomSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const room = await storage.createRoom(roomData);
      
      // Auto-join creator to room
      await storage.joinRoom({
        roomId: room.id,
        userId: userId,
      });
      
      res.json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid room data", errors: error.errors });
      }
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.post('/api/rooms/:roomId/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      await storage.joinRoom({
        roomId,
        userId,
      });
      
      // Broadcast join message
      const user = await storage.getUser(userId);
      if (user) {
        broadcastToRoom(roomId, {
          type: 'user_joined',
          data: {
            user,
            message: `${user.firstName || user.username} joined the room`,
          }
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ message: "Failed to join room" });
    }
  });

  app.post('/api/rooms/:roomId/leave', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;
      
      await storage.leaveRoom(roomId, userId);
      
      // Broadcast leave message
      const user = await storage.getUser(userId);
      if (user) {
        broadcastToRoom(roomId, {
          type: 'user_left',
          data: {
            user,
            message: `${user.firstName || user.username} left the room`,
          }
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving room:", error);
      res.status(500).json({ message: "Failed to leave room" });
    }
  });

  app.get('/api/rooms/:roomId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const messages = await storage.getRoomMessages(roomId, parseInt(limit), parseInt(offset));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get('/api/rooms/:roomId/members', isAuthenticated, async (req, res) => {
    try {
      const { roomId } = req.params;
      const members = await storage.getRoomMembers(roomId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching room members:", error);
      res.status(500).json({ message: "Failed to fetch room members" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/api/ws' });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established from:', req.socket.remoteAddress);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;
        
        switch (type) {
          case 'authenticate': {
            const { userId } = payload;
            if (userId) {
              connectedUsers.set(ws, { userId, socket: ws });
              await storage.updateUserStatus(userId, 'online');
              
              // Send authentication confirmation
              ws.send(JSON.stringify({
                type: 'authenticated',
                data: { success: true }
              }));
              
              // Get user data and broadcast status change
              const user = await storage.getUser(userId);
              if (user) {
                broadcastToAll({
                  type: 'user_status_changed',
                  data: { user, status: 'online' }
                }, ws);
              }
              
              // Send current online users to the newly connected user
              const onlineUserIds = getOnlineUsers();
              const onlineUsersData = await Promise.all(
                onlineUserIds.map(id => storage.getUser(id))
              );
              
              ws.send(JSON.stringify({
                type: 'online_users',
                data: { users: onlineUsersData.filter(Boolean) }
              }));
            }
            break;
          }
          
          case 'join_room': {
            const user = connectedUsers.get(ws);
            if (!user) return;
            
            const { roomId } = payload;
            
            // Leave previous room
            if (user.roomId) {
              const prevSockets = roomSockets.get(user.roomId);
              if (prevSockets) {
                prevSockets.delete(ws);
              }
            }
            
            // Join new room
            user.roomId = roomId;
            if (!roomSockets.has(roomId)) {
              roomSockets.set(roomId, new Set());
            }
            roomSockets.get(roomId)!.add(ws);
            
            // Mark messages as read
            await storage.updateLastRead(roomId, user.userId);
            
            ws.send(JSON.stringify({
              type: 'room_joined',
              data: { roomId }
            }));
            break;
          }
          
          case 'send_message': {
            const user = connectedUsers.get(ws);
            if (!user || !user.roomId) return;
            
            const { content, type: messageType = 'text', imageUrl } = payload;
            
            // Content validation
            if (!content && !imageUrl) return;
            if (content && containsInappropriateContent(content)) {
              ws.send(JSON.stringify({
                type: 'message_blocked',
                data: { reason: 'Inappropriate content detected' }
              }));
              return;
            }
            
            // Create message
            const messageData = await storage.createMessage({
              content: content || '',
              type: messageType,
              roomId: user.roomId,
              userId: user.userId,
              imageUrl,
            });
            
            // Broadcast to room
            broadcastToRoom(user.roomId, {
              type: 'new_message',
              data: messageData
            });
            break;
          }
          
          case 'typing_start': {
            const user = connectedUsers.get(ws);
            if (!user || !user.roomId) return;
            
            await storage.updateTypingStatus(user.roomId, user.userId, true);
            
            broadcastToRoom(user.roomId, {
              type: 'user_typing',
              data: { userId: user.userId, isTyping: true }
            }, ws);
            break;
          }
          
          case 'typing_stop': {
            const user = connectedUsers.get(ws);
            if (!user || !user.roomId) return;
            
            await storage.updateTypingStatus(user.roomId, user.userId, false);
            
            broadcastToRoom(user.roomId, {
              type: 'user_typing',
              data: { userId: user.userId, isTyping: false }
            }, ws);
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });
    
    ws.on('close', async () => {
      const user = connectedUsers.get(ws);
      if (user) {
        await storage.updateUserStatus(user.userId, 'offline');
        
        if (user.roomId) {
          const sockets = roomSockets.get(user.roomId);
          if (sockets) {
            sockets.delete(ws);
            
            // Stop typing when disconnected
            await storage.updateTypingStatus(user.roomId, user.userId, false);
            broadcastToRoom(user.roomId, {
              type: 'user_typing',
              data: { userId: user.userId, isTyping: false }
            });
          }
        }
        
        // Get user data and broadcast status change
        const userData = await storage.getUser(user.userId);
        if (userData) {
          broadcastToAll({
            type: 'user_status_changed',
            data: { user: userData, status: 'offline' }
          });
        }
        
        connectedUsers.delete(ws);
      }
    });
  });

  return httpServer;
}
