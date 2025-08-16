import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import websocketService, { WebSocketEventType } from "@/lib/websocketService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Send, 
  MessageSquare, 
  Users, 
  User, 
  Clock, 
  RefreshCw, 
  StickyNote, 
  Info,
  Pencil,
  Trash2,
  FileText,
  Music,
  Archive,
  Download,
  Check,
  CheckCheck,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Smile,
  Save,
  Paperclip,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { ChatMessage } from "@shared/schema";
import Avatar from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatMessageWithUser extends ChatMessage {
  user?: {
    displayName: string;
    id: number;
    avatar?: string;
  };
}

export default function ChatInterface() {
  const { id: tripIdParam } = useParams<{ id: string }>();
  const tripId = parseInt(tripIdParam || "0");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [longPressTimeoutRef, setLongPressTimeoutRef] = useState<Record<number, NodeJS.Timeout>>({});
  const [pressStartTime, setPressStartTime] = useState<Record<number, number>>({});
  const typingTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Query to get trip members - we'll use this to get user info
  const { data: tripMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId,
  });
  
  // Create a map of user data for quick lookup
  const userMap = tripMembers.reduce((acc, member) => {
    if (member.user) {
      acc[member.userId] = member.user;
    }
    return acc;
  }, {} as Record<number, any>);

  // Query to get all messages
  const { data: messages = [], isLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ['/api/trips', tripId, 'chat'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trips/${tripId}/chat`);
      const data = await res.json();
      
      // Enhance messages with user data from our trip members
      return data.map((msg: ChatMessage) => {
        // Find user data from our trip members map
        const userData = userMap[msg.userId];
        return { ...msg, user: userData || { displayName: `User ${msg.userId}`, id: msg.userId } };
      });
    },
    enabled: !!tripId && tripMembers.length > 0
  });
  
  // Mutation to send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("Not authenticated");
      
      const messageData = {
        userId: user.id,
        message: text,
        tripId
      };
      
      const res = await apiRequest('POST', `/api/trips/${tripId}/chat`, messageData);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate query to refetch messages
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'chat'] });
      setMessage("");
    }
  });

  // Mutation to upload files
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, message: fileMessage }: { file: File; message?: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      const formData = new FormData();
      formData.append('file', file);
      if (fileMessage) {
        formData.append('message', fileMessage);
      }
      
      const res = await fetch(`/api/trips/${tripId}/chat/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'chat'] });
      setUploadingFile(false);
    },
    onError: (error) => {
      console.error('File upload error:', error);
      setUploadingFile(false);
    }
  });
  
  // Handle typing indicator functionality
  const handleTypingChange = useCallback((isTyping: boolean) => {
    if (!user?.id || !tripId) return;
    
    websocketService.send('typing_indicator', {
      userId: user.id,
      tripId,
      isTyping
    });
  }, [user?.id, tripId]);
  
  // Send typing indicator when message input changes
  useEffect(() => {
    if (!user?.id || !tripId || !message) return;
    
    // Clear previous timeout for this user
    if (typingTimeoutRef.current[user.id]) {
      clearTimeout(typingTimeoutRef.current[user.id]);
    }
    
    // Send typing indicator
    handleTypingChange(true);
    
    // Set timeout to clear typing indicator after 3 seconds
    typingTimeoutRef.current[user.id] = setTimeout(() => {
      handleTypingChange(false);
    }, 3000);
    
    return () => {
      if (typingTimeoutRef.current[user.id]) {
        clearTimeout(typingTimeoutRef.current[user.id]);
      }
    };
  }, [message, user?.id, tripId, handleTypingChange]);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.id || !tripId) return;
    
    // Register this component as using the WebSocket connection
    websocketService.registerConnection();
    
    // Connect to the WebSocket server (if not already connected)
    websocketService.connect();
    
    // Authenticate with the WebSocket server
    websocketService.send('auth', { userId: user.id });
    
    // Join the trip's WebSocket room
    websocketService.send('join_trip', { tripId });
    
    // Listen for new chat messages
    const handleChatMessage = (data: any) => {
      // Update query cache with the new message
      queryClient.setQueryData(['/api/trips', tripId, 'chat'], (oldData: ChatMessageWithUser[] = []) => {
        // Check if the message is already in the cache
        if (oldData.some(msg => msg.id === data.payload.id)) {
          return oldData;
        }
        
        // Add the new message and sort by timestamp
        return [...oldData, data.payload].sort((a, b) => 
          new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
      });
      
      // Mark message as read by current user
      if (user?.id && data.payload.id) {
        websocketService.send('message_read', {
          messageId: data.payload.id,
          userId: user.id,
          tripId
        });
      }
    };
    
    // Handle typing indicators
    const handleTypingIndicator = (data: any) => {
      const { userId, isTyping } = data.payload;
      // Skip if it's the current user
      if (userId === user.id) return;
      
      // Get user display name
      const typingUser = messages.find(msg => msg.userId === userId)?.user?.displayName || `User ${userId}`;
      
      setTypingUsers(prev => {
        if (isTyping) {
          return { ...prev, [userId]: typingUser };
        } else {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        }
      });
    };
    
    // Handle message reactions
    const handleMessageReaction = (data: any) => {
      const { messageId, reactions } = data.payload;
      
      queryClient.setQueryData(['/api/trips', tripId, 'chat'], (oldData: ChatMessageWithUser[] = []) => {
        return oldData.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, reactions };
          }
          return msg;
        });
      });
    };
    
    // Handle message edits
    const handleMessageEdit = (data: any) => {
      const updatedMessage = data.payload;
      
      queryClient.setQueryData(['/api/trips', tripId, 'chat'], (oldData: ChatMessageWithUser[] = []) => {
        return oldData.map(msg => {
          if (msg.id === updatedMessage.id) {
            // Preserve user data when updating
            return { ...updatedMessage, user: msg.user };
          }
          return msg;
        });
      });
    };
    
    // Handle message deletions
    const handleMessageDelete = (data: any) => {
      const { messageId } = data.payload;
      
      queryClient.setQueryData(['/api/trips', tripId, 'chat'], (oldData: ChatMessageWithUser[] = []) => {
        return oldData.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, isDeleted: true };
          }
          return msg;
        });
      });
    };
    
    // Handle read receipts
    const handleMessageRead = (data: any) => {
      const { messageId, readBy } = data.payload;
      
      queryClient.setQueryData(['/api/trips', tripId, 'chat'], (oldData: ChatMessageWithUser[] = []) => {
        return oldData.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, readBy };
          }
          return msg;
        });
      });
    };
    
    websocketService.on('chat_message', handleChatMessage);
    websocketService.on('typing_indicator', handleTypingIndicator);
    websocketService.on('message_reaction', handleMessageReaction);
    websocketService.on('message_edit', handleMessageEdit);
    websocketService.on('message_delete', handleMessageDelete);
    websocketService.on('message_read', handleMessageRead);
    
    // Cleanup on unmount
    return () => {
      // Unregister event handlers
      websocketService.off('chat_message', handleChatMessage);
      websocketService.off('typing_indicator', handleTypingIndicator);
      websocketService.off('message_reaction', handleMessageReaction);
      websocketService.off('message_edit', handleMessageEdit);
      websocketService.off('message_delete', handleMessageDelete);
      websocketService.off('message_read', handleMessageRead);
      
      // Clear typing indicator when unmounting
      handleTypingChange(false);
      
      // Deregister this component from using the WebSocket connection
      // This will only disconnect when no other components are using it
      websocketService.deregisterConnection();
    };
  }, [user?.id, tripId, queryClient, handleTypingChange, messages]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);
  
  // Handle file selection and upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingFile(true);
    uploadFileMutation.mutate({ file });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle attachment button click
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Send the message via WebSocket for real-time updates
    const success = websocketService.send('chat_message', {
      userId: user?.id,
      tripId,
      message: message
    });
    
    // Clear message input field immediately after sending
    setMessage("");
    
    // If WebSocket fails, use the fallback HTTP method
    if (!success && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message);
    }
  };
  
  // Render messages with user info
  // Handle search
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = messages
      .filter(msg => 
        !msg.isDeleted && 
        msg.message.toLowerCase().includes(query)
      )
      .map(msg => msg.id);
    
    setSearchResults(results);
    setCurrentSearchIndex(0);
    setIsSearchActive(true);
    
    // Scroll to first result if any
    if (results.length > 0) {
      const messageElement = document.getElementById(`message-${results[0]}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchQuery, messages]);
  
  // Handle message edit
  const handleStartEdit = (msg: ChatMessageWithUser) => {
    setEditingMessageId(msg.id);
    setEditMessage(msg.message);
  };
  
  const handleSaveEdit = () => {
    if (!editingMessageId || !editMessage.trim() || !user?.id) return;
    
    websocketService.send('message_edit', {
      messageId: editingMessageId,
      userId: user.id,
      tripId,
      message: editMessage
    });
    
    setEditingMessageId(null);
    setEditMessage("");
  };
  
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditMessage("");
  };
  
  // Handle long press on message timestamp
  const handleLongPress = (messageId: number) => {
    // Start multi-select mode
    setIsMultiSelectActive(true);
    
    // Select the long-pressed message
    setSelectedMessages(prev => [...prev, messageId]);
  };
  
  // Toggle message selection
  const handleMessageSelection = (messageId: number) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        // Deselect if already selected
        return prev.filter(id => id !== messageId);
      } else {
        // Select if not already selected
        return [...prev, messageId];
      }
    });
  };
  
  // Exit multi-select mode
  const handleCancelMultiSelect = () => {
    setIsMultiSelectActive(false);
    setSelectedMessages([]);
  };
  
  // Delete selected messages
  const handleDeleteSelectedMessages = () => {
    if (!user?.id || selectedMessages.length === 0) return;
    
    // Delete each selected message
    selectedMessages.forEach(messageId => {
      websocketService.send('message_delete', {
        messageId,
        userId: user.id,
        tripId
      });
    });
    
    // Exit multi-select mode
    setIsMultiSelectActive(false);
    setSelectedMessages([]);
  };
  
  // Handle single message delete
  const handleDeleteMessage = (id: number) => {
    if (!user?.id) return;
    
    websocketService.send('message_delete', {
      messageId: id,
      userId: user.id,
      tripId
    });
  };
  
  // Handle message reaction
  const handleReaction = (id: number, reaction: string) => {
    if (!user?.id) return;
    
    websocketService.send('message_reaction', {
      messageId: id,
      userId: user.id,
      tripId,
      reaction,
      toggle: true
    });
  };
  
  // Navigate through search results
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    
    const messageElement = document.getElementById(`message-${searchResults[newIndex]}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Render read receipts
  const renderReadReceipts = (msg: ChatMessageWithUser) => {
    if (!msg.readBy || !Array.isArray(msg.readBy) || msg.readBy.length <= 1) return null;
    
    // Don't count the sender as a reader for UI purposes
    const readers = msg.readBy.filter(id => id !== msg.userId);
    if (readers.length === 0) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded-full shadow-sm">
              <CheckCheck className="h-3 w-3 mr-0.5 text-green-600 dark:text-green-500" />
              <span>
                <span className="hidden sm:inline">Read by </span>
                <span>{readers.length}</span>
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
            <p>Read by {readers.length} member{readers.length !== 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  // Render message reactions
  const renderReactions = (msg: ChatMessageWithUser) => {
    if (!msg.reactions || Object.keys(msg.reactions).length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(msg.reactions).map(([reaction, users]) => (
          <Badge 
            key={reaction} 
            variant="outline" 
            className="cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            onClick={() => handleReaction(msg.id, reaction)}
          >
            <span aria-label="Reaction">{reaction}</span>
            <span className="ml-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-1.5 py-0.5 leading-none">
              {users.length}
            </span>
          </Badge>
        ))}
      </div>
    );
  };
  
  // Render typing indicators
  const renderTypingIndicators = () => {
    const typingCount = Object.keys(typingUsers).length;
    if (typingCount === 0) return null;
    
    let message = '';
    const names = Object.values(typingUsers);
    
    if (typingCount === 1) {
      message = `${names[0]} is typing...`;
    } else if (typingCount === 2) {
      message = `${names[0]} and ${names[1]} are typing...`;
    } else {
      message = `${names[0]}, ${names[1]} and ${typingCount - 2} more are typing...`;
    }
    
    return (
      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic animate-pulse">
        {message}
      </div>
    );
  };

  // Render messages with user info
  const renderMessage = (msg: ChatMessageWithUser) => {
    // Handle deleted messages
    if (msg.isDeleted) {
      return (
        <div 
          key={msg.id}
          id={`message-${msg.id}`}
          className="flex justify-center my-2 px-2"
        >
          <div className="px-4 py-1 text-sm italic text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
            This message was deleted
          </div>
        </div>
      );
    }
    
    const isCurrentUser = msg.userId === user?.id;
    const displayName = msg.user?.displayName || `User ${msg.userId}`;
    const initial = displayName[0]?.toUpperCase() || 'U';
    const sentDate = new Date(msg.sentAt);
    const formattedTime = format(sentDate, 'h:mm a');
    const formattedDate = format(sentDate, 'MMM d');
    
    // Highlight search results
    const isHighlighted = searchResults.includes(msg.id) && 
                          searchResults[currentSearchIndex] === msg.id;
    
    return (
      <div 
        key={msg.id}
        id={`message-${msg.id}`}
        className={`flex items-start gap-3 mb-6 ${isCurrentUser ? 'flex-row-reverse' : ''}
                  ${isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-800/20 rounded-lg px-2 py-1' : ''}
                  ${selectedMessages.includes(msg.id) ? 'bg-primary-50/70 dark:bg-primary-900/30 rounded-lg px-2 py-1 border border-primary-200 dark:border-primary-800' : ''}`}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar 
                src={msg.user?.avatar ?? undefined}
                fallback={msg.user?.displayName ?? undefined}
                size="sm"
                className="mt-1 flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-sm"
              />
            </TooltipTrigger>
            <TooltipContent side={isCurrentUser ? "right" : "left"}>
              <div className="text-center">
                <p className="font-medium">{displayName}</p>
                <p className="text-xs text-gray-500">{isCurrentUser ? 'You' : 'Trip member'}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[60%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-1 sm:gap-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-center flex-wrap">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{isCurrentUser ? 'You' : displayName}</span>
              <div className="flex items-center ml-1.5">
                <Clock className="h-3 w-3 text-gray-400 dark:text-gray-500 mr-0.5" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className={`text-xs text-gray-500 dark:text-gray-400 cursor-pointer ${
                          selectedMessages.includes(msg.id) ? 'font-bold text-primary-600 dark:text-primary-400' : ''
                        }`}
                        onTouchStart={(e) => {
                          // Store touch start time
                          const updatedPressStart = { ...pressStartTime };
                          updatedPressStart[msg.id] = Date.now();
                          setPressStartTime(updatedPressStart);
                          
                          // Set timeout for long press
                          const timeoutId = setTimeout(() => {
                            if (isCurrentUser) {
                              handleLongPress(msg.id);
                            }
                          }, 500); // 500ms for long press
                          
                          const updatedTimeouts = { ...longPressTimeoutRef };
                          updatedTimeouts[msg.id] = timeoutId;
                          setLongPressTimeoutRef(updatedTimeouts);
                        }}
                        onTouchEnd={() => {
                          // Clear timeout if touch ends before long press is detected
                          if (longPressTimeoutRef[msg.id]) {
                            clearTimeout(longPressTimeoutRef[msg.id]);
                            const updatedTimeouts = { ...longPressTimeoutRef };
                            delete updatedTimeouts[msg.id];
                            setLongPressTimeoutRef(updatedTimeouts);
                          }
                          
                          // If in multi-select mode, toggle selection on regular tap
                          if (isMultiSelectActive && isCurrentUser) {
                            handleMessageSelection(msg.id);
                          }
                        }}
                        onMouseDown={(e) => {
                          // Same for mouse events
                          const updatedPressStart = { ...pressStartTime };
                          updatedPressStart[msg.id] = Date.now();
                          setPressStartTime(updatedPressStart);
                          
                          // Set timeout for long press
                          const timeoutId = setTimeout(() => {
                            if (isCurrentUser) {
                              handleLongPress(msg.id);
                            }
                          }, 500); // 500ms for long press
                          
                          const updatedTimeouts = { ...longPressTimeoutRef };
                          updatedTimeouts[msg.id] = timeoutId;
                          setLongPressTimeoutRef(updatedTimeouts);
                        }}
                        onMouseUp={() => {
                          // Clear timeout if mouse up happens before long press is detected
                          if (longPressTimeoutRef[msg.id]) {
                            clearTimeout(longPressTimeoutRef[msg.id]);
                            const updatedTimeouts = { ...longPressTimeoutRef };
                            delete updatedTimeouts[msg.id];
                            setLongPressTimeoutRef(updatedTimeouts);
                          }
                          
                          // If in multi-select mode, toggle selection on regular click
                          if (isMultiSelectActive && isCurrentUser) {
                            handleMessageSelection(msg.id);
                          }
                        }}
                        onMouseLeave={() => {
                          // Clear timeout if mouse leaves the element
                          if (longPressTimeoutRef[msg.id]) {
                            clearTimeout(longPressTimeoutRef[msg.id]);
                            const updatedTimeouts = { ...longPressTimeoutRef };
                            delete updatedTimeouts[msg.id];
                            setLongPressTimeoutRef(updatedTimeouts);
                          }
                        }}
                      >
                        {formattedTime}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                      <p>{formattedDate} at {formattedTime}</p>
                      {isCurrentUser && !isMultiSelectActive && (
                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Long press to select</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {msg.isEdited && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5 italic">(edited)</span>
              )}
            </div>
          </div>
          
          {editingMessageId === msg.id ? (
            <div className="flex flex-col gap-2 w-full mb-2">
              <Input 
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="min-w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancelEdit}
                  className="h-8 text-gray-600 dark:text-gray-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSaveEdit}
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <div 
                className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg shadow-md ${
                  isCurrentUser 
                    ? 'bg-blue-600 text-white dark:bg-blue-700 dark:text-white border border-blue-500 dark:border-blue-600' 
                    : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="space-y-2">
                  {/* Render file attachment if present */}
                  {msg.hasAttachment && msg.attachmentUrl && (
                    <div className="mb-2">
                      {msg.attachmentType?.startsWith('image/') ? (
                        // High-quality image display with full resolution
                        <div className="relative max-w-sm">
                          <img
                            src={msg.attachmentUrl}
                            alt={msg.attachmentName || 'Shared image'}
                            className="rounded-lg border border-gray-200 dark:border-gray-600 max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ imageRendering: 'auto' }}
                            loading="lazy"
                            onClick={() => msg.attachmentUrl && window.open(msg.attachmentUrl, '_blank')}
                          />
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {msg.attachmentName}
                          </div>
                        </div>
                      ) : msg.attachmentType?.startsWith('video/') ? (
                        // High-quality video display
                        <div className="relative max-w-sm">
                          <video
                            controls
                            className="rounded-lg border border-gray-200 dark:border-gray-600 max-w-full h-auto"
                            preload="metadata"
                          >
                            <source src={msg.attachmentUrl} type={msg.attachmentType} />
                            Your browser does not support the video tag.
                          </video>
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {msg.attachmentName}
                          </div>
                        </div>
                      ) : (
                        // Generic file attachment
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                             onClick={() => msg.attachmentUrl && window.open(msg.attachmentUrl, '_blank')}>
                          <div className="flex-shrink-0">
                            {msg.attachmentType?.includes('pdf') ? (
                              <FileText className="h-8 w-8 text-red-500" />
                            ) : msg.attachmentType?.includes('audio') ? (
                              <Music className="h-8 w-8 text-green-500" />
                            ) : msg.attachmentType?.includes('zip') || msg.attachmentType?.includes('rar') ? (
                              <Archive className="h-8 w-8 text-yellow-500" />
                            ) : (
                              <Paperclip className="h-8 w-8 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {msg.attachmentName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {msg.attachmentSize ? `${(msg.attachmentSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <Download className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Render message text */}
                  <div className="break-words text-[14px] sm:text-base whitespace-normal leading-tight sm:leading-normal">
                    {msg.message}
                  </div>
                </div>
              </div>
              
              {/* Message actions for current user's messages */}
              {isCurrentUser && (
                <div className="absolute -top-3 -right-2 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 sm:h-6 sm:w-6 p-0 bg-blue-700 hover:bg-blue-800 text-white rounded-full shadow-md border border-white dark:border-gray-800"
                      >
                        <Info className="h-3 w-3 sm:h-3 sm:w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isCurrentUser ? "end" : "start"} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <DropdownMenuItem 
                        onClick={() => handleStartEdit(msg)}
                        className="text-gray-700 dark:text-gray-200 focus:text-primary-600 dark:focus:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              {/* Render reactions */}
              <div className={`mt-2 ${isCurrentUser ? 'flex justify-end' : ''}`}>
                {renderReactions(msg)}
              </div>
              
              {/* Reaction button */}
              <div className={`mt-1 ${isCurrentUser ? 'flex justify-end' : ''}`}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md" 
                    align={isCurrentUser ? "end" : "start"}
                  >
                    <div className="flex gap-2">
                      {['👍', '❤️', '😂', '😮', '😢', '🎉'].map(emoji => (
                        <button
                          key={emoji}
                          className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded-md transition-colors"
                          onClick={() => handleReaction(msg.id, emoji)}
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Read receipts */}
              {isCurrentUser && (
                <div className="mt-1 flex justify-end">
                  {renderReadReceipts(msg)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative">
      {/* Fixed Header */}
      <div className="p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col gap-2 sticky top-0 z-10 shadow-md flex-shrink-0">
        {/* Multi-select action bar */}
        {isMultiSelectActive && (
          <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-900/30 p-2 rounded-lg mb-2 border border-primary-200 dark:border-primary-800">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700">
                {selectedMessages.length} selected
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelMultiSelect}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteSelectedMessages}
              className="bg-red-600 hover:bg-red-700 text-white h-8"
              disabled={selectedMessages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete {selectedMessages.length > 1 ? `(${selectedMessages.length})` : ''}
            </Button>
          </div>
        )}
        
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">Trip Chat</h2>
            {messages && messages.length > 0 && (
              <Badge variant="outline" className="ml-1 sm:ml-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800">
                {messages.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Create button - hidden on mobile */}
            <div className="hidden sm:block">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-9 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-1 text-primary-600 dark:text-primary-400" />
                      Create
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Create new content</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Search toggle button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400
                      ${isSearchActive ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    onClick={() => setIsSearchActive(!isSearchActive)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Search messages</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Refresh button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'chat'] })}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Refresh messages</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Search bar */}
        {isSearchActive && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="pl-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              {searchResults.length > 0 && (
                <Badge variant="outline" className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  {currentSearchIndex + 1}/{searchResults.length}
                </Badge>
              )}
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchActive(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 h-9"
            >
              Search
            </Button>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-0">
                <Badge variant="outline" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 mr-1">
                  {currentSearchIndex + 1}/{searchResults.length}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateSearch('prev')}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 h-9"
                    aria-label="Previous result"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateSearch('next')}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 h-9"
                    aria-label="Next result"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-2 sm:p-4 pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-2" />
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center h-full p-6 sm:p-8 border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 mx-2 sm:mx-0">
            <MessageSquare className="w-12 h-12 sm:w-14 sm:h-14 text-gray-400 dark:text-gray-500 mb-4 sm:mb-5" />
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">No messages yet</h3>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-5 sm:mb-6 max-w-xs sm:max-w-sm">
              Start a conversation with your trip members. Share ideas, plans, or just say hello!
            </p>
            <div className="inline-flex items-center gap-2 p-3 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-gray-600">
              <StickyNote className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <span className="text-sm sm:text-base font-medium">Type a message below to get started</span>
            </div>
          </Card>
        ) : (
          <div className="space-y-5 sm:space-y-6 px-1 sm:px-0">
            {messages.map(renderMessage)}
            {Object.keys(typingUsers).length > 0 && (
              <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="mt-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-center">
                    <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  </div>
                </div>
                <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[60%]">
                  <div className="px-3 sm:px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-sm w-auto inline-flex items-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '600ms' }}></div>
                    </div>
                    <span className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      {renderTypingIndicators()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      
      <Separator className="bg-gray-200 dark:bg-gray-700" />
      
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-10 md:left-64">
        {/* Connection status indicator */}
        {!websocketService.connected && (
          <div className="mb-3 p-2 rounded-md bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0"></div>
              <p>Connection Error. Changes may not be synchronized.</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs whitespace-nowrap border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800 ml-2 flex-shrink-0"
              onClick={() => websocketService.reconnect()}
            >
              <RefreshCw className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Reconnect</span>
            </Button>
          </div>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mb-2 flex items-center gap-1 sm:gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Info className="h-3 w-3 flex-shrink-0" />
                <p className="truncate">Messages are visible to all trip members</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Everyone on this trip can see these messages</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-white dark:bg-gray-700 p-2 sm:p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          {/* Add attachment button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleAttachmentClick}
                  disabled={uploadingFile || uploadFileMutation.isPending}
                  className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 h-12 w-12 sm:h-10 sm:w-10 rounded-full shadow-sm flex-shrink-0"
                >
                  {uploadingFile || uploadFileMutation.isPending ? (
                    <Loader2 className="h-5 w-5 text-gray-600 dark:text-gray-300 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Add high-quality file or image</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            multiple={false}
          />
          
          <div className="relative flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 min-h-[48px] sm:min-h-[42px] text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400"
              disabled={!user || sendMessageMutation.isPending}
            />
            {!message.trim() && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <MessageSquare className="h-5 w-5" />
              </div>
            )}
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="submit" 
                  disabled={!message.trim() || !user || sendMessageMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white px-3 sm:px-4 h-12 sm:h-10 rounded-full shadow-lg border border-blue-500 dark:border-blue-700"
                >
                  {sendMessageMutation.isPending ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="sr-only">Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Send className="w-5 h-5 text-white" />
                      <span className="hidden sm:inline font-medium">Send</span>
                    </div>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Send message to all trip members</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </div>
    </div>
  );
}