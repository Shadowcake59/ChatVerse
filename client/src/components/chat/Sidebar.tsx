import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { JoinRoomModal } from "./JoinRoomModal";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RoomWithMembers } from "@shared/schema";
import { Sun, Moon, Settings, Plus, Hash, Lock, Users, LogOut } from "lucide-react";

interface SidebarProps {
  selectedRoomId?: string;
  onRoomSelect: (roomId: string) => void;
  className?: string;
}

export function Sidebar({ selectedRoomId, onRoomSelect, className }: SidebarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [showJoinModal, setShowJoinModal] = useState(false);

  const { data: rooms = [], isLoading } = useQuery<RoomWithMembers[]>({
    queryKey: ["/api/rooms"],
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
        description: "Failed to load rooms",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading) {
    return (
      <div className={`w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div className="p-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ChatApp</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 text-blue-500" />
                ) : (
                  <Sun className="h-4 w-4 text-yellow-500" />
                )}
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

        {/* Rooms Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Rooms
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowJoinModal(true)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
            
            <div className="space-y-1">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => onRoomSelect(room.id)}
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedRoomId === room.id
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {room.isPrivate ? (
                    <Lock className="h-4 w-4 mr-2" />
                  ) : (
                    <Hash className="h-4 w-4 mr-2" />
                  )}
                  <span className="font-medium text-sm truncate flex-1">{room.name}</span>
                  {room.unreadCount && room.unreadCount > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedRoomId === room.id
                        ? "bg-white bg-opacity-20"
                        : "bg-red-500 text-white"
                    }`}>
                      {room.unreadCount > 99 ? "99+" : room.unreadCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <img
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || user?.email || 'User')}&background=3b82f6&color=fff`}
              alt="Your avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {user?.firstName || user?.email || 'User'}
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Online</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      <JoinRoomModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onRoomJoined={onRoomSelect}
      />
    </>
  );
}
