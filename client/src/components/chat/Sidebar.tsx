import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JoinRoomModal } from "./JoinRoomModal";
import { SettingsMenu } from "./SettingsMenu";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RoomWithMembers, Room } from "@shared/schema";
import { 
  Sun, 
  Moon, 
  Settings, 
  Plus, 
  Hash, 
  Lock, 
  Users, 
  LogOut, 
  Trash2,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SidebarProps {
  selectedRoomId?: string;
  onRoomSelect: (roomId: string | undefined) => void;
  className?: string;
}

export function Sidebar({ selectedRoomId, onRoomSelect, className }: SidebarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: userRooms = [], isLoading: isLoadingUserRooms } = useQuery<RoomWithMembers[]>({
    queryKey: ["/api/rooms"],
    enabled: !!user,
  });

  const { data: availableRooms = [], isLoading: isLoadingAvailableRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms/public"],
    enabled: !!user,
  });

  const isLoading = isLoadingUserRooms || isLoadingAvailableRooms;

  const joinRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      await apiRequest("POST", `/api/rooms/${roomId}/join`);
    },
    onSuccess: () => {
      // Invalidate both queries to refresh the room lists
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/public"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join room",
        description: error.message || "Could not join room",
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiRequest("DELETE", `/api/rooms/${roomId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/public"] });
      toast({
        title: "Room deleted",
        description: "Room has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete room",
        variant: "destructive",
      });
    },
  });

  const handleJoinRoom = async (roomId: string, roomName: string) => {
    try {
      await joinRoomMutation.mutateAsync(roomId);
      toast({
        title: "Joined room",
        description: `Successfully joined ${roomName}`,
      });
      // Select the room after joining
      onRoomSelect(roomId);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return;
    
    setIsDeleting(true);
    try {
      // If the deleted room was selected, clear selection first
      if (selectedRoomId === deleteRoomId) {
        onRoomSelect(undefined);
      }
      
      await deleteRoomMutation.mutateAsync(deleteRoomId);
      
      // After successful deletion, select another room if available
      if (selectedRoomId === deleteRoomId) {
        const remainingRooms = userRooms.filter(r => r.id !== deleteRoomId);
        if (remainingRooms.length > 0) {
          // Small delay to ensure queries have updated
          setTimeout(() => {
            onRoomSelect(remainingRooms[0].id);
          }, 100);
        }
      }
    } finally {
      setIsDeleting(false);
      setDeleteRoomId(null);
    }
  };

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
              <SettingsMenu user={user} />
            </div>
          </div>
        </div>

        {/* Rooms Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Your Rooms */}
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
            
            <div className="space-y-1 mb-6">
              {userRooms.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No rooms joined yet
                </p>
              ) : (
                userRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`flex items-center p-2 rounded-lg transition-colors group ${
                      selectedRoomId === room.id
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div 
                      onClick={() => onRoomSelect(room.id)}
                      className="flex items-center flex-1 cursor-pointer"
                    >
                      {room.isPrivate ? (
                        <Lock className="h-4 w-4 mr-2" />
                      ) : (
                        <Hash className="h-4 w-4 mr-2" />
                      )}
                      <span className="font-medium text-sm truncate flex-1">{room.name}</span>
                      {room.unreadCount && room.unreadCount > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full mr-2 ${
                          selectedRoomId === room.id
                            ? "bg-white bg-opacity-20"
                            : "bg-red-500 text-white"
                        }`}>
                          {room.unreadCount > 99 ? "99+" : room.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    {/* Show delete button for room creators */}
                    {room.createdBy === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity ${
                              selectedRoomId === room.id 
                                ? "hover:bg-white hover:bg-opacity-20 text-white" 
                                : "hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setDeleteRoomId(room.id)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Room
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Available Public Rooms */}
            {availableRooms.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Available to Join
                  </h3>
                </div>
                
                <div className="space-y-1">
                  {availableRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => handleJoinRoom(room.id, room.name)}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 ${
                        joinRoomMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      <span className="font-medium text-sm truncate flex-1">{room.name}</span>
                      {joinRoomMutation.isPending ? (
                        <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full" />
                      ) : (
                        <Plus className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
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

      <AlertDialog open={!!deleteRoomId} onOpenChange={() => setDeleteRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this room? This action cannot be undone.
              All messages in this room will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
