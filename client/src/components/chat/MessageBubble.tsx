import { format } from "date-fns";
import type { MessageWithUser } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithUser;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const displayName = message.user?.firstName || message.user?.email || 'Unknown User';
  const timestamp = format(new Date(message.createdAt), 'h:mm a');

  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300 ${
      isOwn ? 'flex-row-reverse space-x-reverse' : ''
    }`}>
      <img
        src={message.user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`}
        alt={`${displayName} avatar`}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className={`flex-1 max-w-xs lg:max-w-md ${isOwn ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-center space-x-2 mb-1 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <span className={`font-semibold text-sm ${
            isOwn ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
          }`}>
            {isOwn ? 'You' : displayName}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">{timestamp}</span>
        </div>
        
        <div className={`rounded-lg p-3 shadow-sm break-words ${
          isOwn 
            ? 'bg-blue-600 text-white' 
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
        }`}>
          {message.type === 'image' && message.imageUrl ? (
            <div>
              {message.content && (
                <p className="mb-2">{message.content}</p>
              )}
              <img
                src={message.imageUrl}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto object-cover"
                style={{ maxHeight: '300px' }}
                loading="lazy"
              />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
