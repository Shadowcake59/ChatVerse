import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { MessageWithUser, Room } from "@shared/schema";
import { Menu, Search, Users, Settings, Hash, Lock } from "lucide-react";

interface MainChatProps {
  roomId?: string;
  onToggleSidebar: () => void;
  onToggleUsersList: () => void;
}

export function MainChat({ roomId, onToggleSidebar, onToggleUsersList }: MainChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected");

  const { socket, isConnected, sendMessage, messages, typingUsers } = useSocket(roomId);

  // Fetch room details
  const { data: room } = useQuery<Room>({
    queryKey: ["/api/rooms", roomId],
    enabled: !!roomId && roomId !== "",
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load room details",
        variant: "destructive",
      });
    },
  });

  // Fetch room messages
  const { data: historyMessages = [] } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/rooms", roomId, "messages"],
    enabled: !!roomId && roomId !== "",
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus(socket ? "connecting" : "disconnected");
    }
  }, [isConnected, socket]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, historyMessages]);

  // Mark messages as read when room changes
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!roomId) return;
      await apiRequest("POST", `/api/rooms/${roomId}/read`, {});
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  useEffect(() => {
    if (roomId && isConnected) {
      markAsReadMutation.mutate();
    }
  }, [roomId, isConnected]);

  const handleSendMessage = (content: string, type: "text" | "image" = "text", imageUrl?: string) => {
    if (!isConnected || !roomId) {
      toast({
        title: "Not Connected",
        description: "Cannot send message. Please check your connection.",
        variant: "destructive",
      });
      return;
    }

    sendMessage('send_message', {
      content,
      type,
      imageUrl,
    });
  };

  const handleTypingStart = () => {
    if (isConnected && roomId) {
      sendMessage('typing_start', {});
    }
  };

  const handleTypingStop = () => {
    if (isConnected && roomId) {
      sendMessage('typing_stop', {});
    }
  };

  // Combine history messages and real-time messages
  const allMessages = [...historyMessages, ...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Remove duplicate messages
  const uniqueMessages = allMessages.filter(
    (message, index, arr) => arr.findIndex(m => m.id === message.id) === index
  );

  if (!roomId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Hash className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Select a room to start chatting
          </h2>
          <p className="text-gray-500 dark:text-gray-500">
            Choose a room from the sidebar or create a new one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                {room?.isPrivate ? (
                  <Lock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {room?.name || "Loading..."}
                </h2>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected" ? "bg-green-500" :
                    connectionStatus === "connecting" ? "bg-yellow-500" :
                    "bg-red-500"
                  }`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {connectionStatus}
                  </span>
                </div>
              </div>
              {room?.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{room.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Search className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleUsersList}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {/* Welcome Message */}
        <div className="flex justify-center">
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-medium">
            Welcome to #{room?.name}! {room?.description}
          </div>
        </div>

        {/* Messages */}
        {uniqueMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.userId === user?.id}
          />
        ))}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"></div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 max-w-20">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={!isConnected}
        connectionStatus={connectionStatus}
      />
    </div>
  );
}