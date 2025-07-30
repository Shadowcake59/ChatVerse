import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import type { MessageWithUser, User } from "@shared/schema";

interface SocketMessage {
  type: string;
  data: any;
}

interface UseSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (type: string, payload: any) => void;
  messages: MessageWithUser[];
  typingUsers: Set<string>;
  onlineUsers: User[];
}

export function useSocket(roomId?: string): UseSocketReturn {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  const sendMessage = (type: string, payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      // Authenticate with user ID
      sendMessage('authenticate', { userId: user.id });
      
      toast({
        title: "Connected",
        description: "Connected to chat server",
      });
    };

    socket.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'authenticated':
            console.log('Authenticated successfully');
            break;
            
          case 'new_message':
            setMessages(prev => [message.data, ...prev]);
            
            // Play notification sound for other users' messages
            if (message.data.userId !== user.id) {
              try {
                const audio = new Audio('/sounds/message-notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {}); // Ignore audio errors
              } catch (error) {
                // Ignore audio errors
              }
            }
            break;
            
          case 'user_joined':
            toast({
              title: "User Joined",
              description: message.data.message,
            });
            break;
            
          case 'user_left':
            toast({
              title: "User Left",
              description: message.data.message,
            });
            break;
            
          case 'user_typing':
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              if (message.data.isTyping) {
                newSet.add(message.data.userId);
              } else {
                newSet.delete(message.data.userId);
              }
              return newSet;
            });
            break;
            
          case 'message_blocked':
            toast({
              title: "Message Blocked",
              description: message.data.reason,
              variant: "destructive",
            });
            break;
            
          case 'error':
            toast({
              title: "Error",
              description: message.data.message,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing socket message:', error);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "Disconnected from chat server",
        variant: "destructive",
      });
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server",
        variant: "destructive",
      });
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [isAuthenticated, user, toast]);

  // Join room when roomId changes
  useEffect(() => {
    if (isConnected && roomId) {
      sendMessage('join_room', { roomId });
      
      // Clear messages when switching rooms
      setMessages([]);
      setTypingUsers(new Set());
    }
  }, [isConnected, roomId]);

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    messages,
    typingUsers,
    onlineUsers,
  };
}
