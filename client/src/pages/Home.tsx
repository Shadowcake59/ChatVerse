import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/chat/Sidebar";
import { MainChat } from "@/components/chat/MainChat";
import { UsersList } from "@/components/chat/UsersList";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RoomWithMembers } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUsersList, setShowUsersList] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  // Fetch user's rooms and auto-select first room
  const { data: rooms = [] } = useQuery<RoomWithMembers[]>({
    queryKey: ["/api/rooms"],
    enabled: !!user,
    onSuccess: (rooms) => {
      // Auto-select first room if none selected
      if (rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rooms[0].id);
      }
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
        description: "Failed to load rooms",
        variant: "destructive",
      });
    },
  });

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowSidebar(false); // Hide sidebar on mobile when room is selected
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const toggleUsersList = () => {
    setShowUsersList(!showUsersList);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading ChatApp...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        selectedRoomId={selectedRoomId}
        onRoomSelect={handleRoomSelect}
        className={`${
          showSidebar ? "flex" : "hidden"
        } md:flex fixed md:relative z-30 h-full`}
      />

      {/* Sidebar overlay for mobile */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat */}
      <MainChat
        roomId={selectedRoomId}
        onToggleSidebar={toggleSidebar}
        onToggleUsersList={toggleUsersList}
      />

      {/* Users List */}
      <UsersList
        roomId={selectedRoomId}
        className={`${
          showUsersList ? "flex" : "hidden"
        } lg:flex`}
      />
    </div>
  );
}
