import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RoomMember, User } from "@shared/schema";
import { Crown, UserCog, Ban } from "lucide-react";

interface UsersListProps {
  roomId?: string;
  className?: string;
}

export function UsersList({ roomId, className }: UsersListProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: members = [], isLoading } = useQuery<(RoomMember & { user: User })[]>({
    queryKey: ["/api/rooms", roomId, "members"],
    enabled: !!roomId,
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
        description: "Failed to load room members",
        variant: "destructive",
      });
    },
  });

  if (!roomId) {
    return (
      <div className={`w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div className="p-4">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">No Room Selected</h3>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Sort members: admins first, then online users, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.user.isAdmin && !b.user.isAdmin) return -1;
    if (!a.user.isAdmin && b.user.isAdmin) return 1;
    
    if (a.user.status === 'online' && b.user.status !== 'online') return -1;
    if (a.user.status !== 'online' && b.user.status === 'online') return 1;
    
    const nameA = a.user.firstName || a.user.email || '';
    const nameB = b.user.firstName || b.user.email || '';
    return nameA.localeCompare(nameB);
  });

  const onlineCount = members.filter(m => m.user.status === 'online').length;

  return (
    <div className={`w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
          Online Users ({onlineCount})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {sortedMembers.map((member) => {
            const isCurrentUser = member.user.id === user?.id;
            const displayName = member.user.firstName || member.user.email || 'Unknown User';
            
            return (
              <div key={member.id} className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={member.user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`}
                    alt={`${displayName} avatar`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  {/* Status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                    member.user.status === 'online' ? 'bg-green-500' :
                    member.user.status === 'away' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium text-sm truncate ${
                      isCurrentUser ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {isCurrentUser ? 'You' : displayName}
                    </span>
                    {member.user.isAdmin && (
                      <Crown className="h-3 w-3 text-yellow-500" title="Admin" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {member.user.status}
                    </span>
                    {member.isTyping && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        typing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Controls */}
      {user?.isAdmin && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Admin Controls
          </h4>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <UserCog className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Ban className="h-4 w-4 mr-2" />
              Moderation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
