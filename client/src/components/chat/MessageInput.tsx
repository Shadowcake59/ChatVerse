import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Smile, Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string, type?: "text" | "image", imageUrl?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled: boolean;
  connectionStatus: "connected" | "connecting" | "disconnected";
}

export function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled,
  connectionStatus,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const maxLength = 500;
  const characterCount = message.length;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 128) + 'px';
    }
  }, [message]);

  const handleInputChange = (value: string) => {
    if (value.length > maxLength) return;
    
    setMessage(value);

    // Typing indicator logic
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 1000);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage("");
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      onTypingStop();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = () => {
    toast({
      title: "Feature Coming Soon",
      description: "File upload functionality will be available soon!",
    });
  };

  const handleEmojiPicker = () => {
    toast({
      title: "Feature Coming Soon", 
      description: "Emoji picker will be available soon!",
    });
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Connecting..." : "Type a message..."}
              disabled={disabled}
              className="resize-none bg-gray-100 dark:bg-gray-700 border-0 rounded-lg py-3 px-4 pr-20 focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all min-h-[44px] max-h-32"
              rows={1}
            />
            <div className="absolute right-3 bottom-3 flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFileUpload}
                className="p-1 h-auto hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={disabled}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEmojiPicker}
                className="p-1 h-auto hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={disabled}
                title="Add emoji"
              >
                <Smile className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className={characterCount > maxLength * 0.9 ? 'text-red-500' : ''}>
                {characterCount}
              </span>
              /{maxLength} characters
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === "connected" ? "bg-green-500" :
                  connectionStatus === "connecting" ? "bg-yellow-500" :
                  "bg-red-500"
                }`}></div>
                <span className="capitalize">{connectionStatus}</span>
              </span>
            </div>
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim() || characterCount > maxLength}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
