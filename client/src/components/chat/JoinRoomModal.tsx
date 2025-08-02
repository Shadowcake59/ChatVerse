import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Room } from "@shared/schema";

interface JoinRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomJoined: (roomId: string) => void;
}

export function JoinRoomModal({ open, onOpenChange, onRoomJoined }: JoinRoomModalProps) {
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: { name: string; description?: string; isPrivate: boolean }) => {
      const response = await apiRequest("POST", "/api/rooms", roomData);
      return response.json();
    },
    onSuccess: (room: Room) => {
      toast({
        title: "Room Created",
        description: `Successfully created room "${room.name}"`,
      });
      
      // Invalidate rooms query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      
      // Join the room
      onRoomJoined(room.id);
      
      // Reset form and close modal
      setRoomName("");
      setDescription("");
      setIsPrivate(false);
      onOpenChange(false);
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
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      toast({
        title: "Validation Error",
        description: "Room name is required",
        variant: "destructive",
      });
      return;
    }

    createRoomMutation.mutate({
      name: roomName.trim(),
      description: description.trim() || undefined,
      isPrivate,
    });
  };

  const handleClose = () => {
    setRoomName("");
    setDescription("");
    setIsPrivate(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              required
              maxLength={50}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter room description"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPrivate"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
            <Label htmlFor="isPrivate">Private Room</Label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleClose}
              disabled={createRoomMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createRoomMutation.isPending || !roomName.trim()}
            >
              {createRoomMutation.isPending ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
