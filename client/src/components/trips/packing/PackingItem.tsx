import { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { PackingItem } from "@shared/schema";
import { AppContext } from "@/context/AppContext";
import { 
  Check, 
  PencilLine, 
  Users, 
  User,
  Clock,
  Package,
  Trash2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import Avatar from "@/components/ui/avatar";

interface PackingItemProps {
  item: PackingItem;
  onToggle: (id: number, isPacked: boolean) => void;
  onEdit?: (item: PackingItem) => void;
  onDelete?: () => void;
  onAssign?: (id: number, userId: number | null) => void;
  usersMap?: Record<number, any>; // User data with displayName
  tripMembers?: any[]; // Trip members data
}

const PackingItemComponent = ({ 
  item, 
  onToggle, 
  onEdit, 
  onDelete, 
  onAssign,
  usersMap = {},
  tripMembers = []
}: PackingItemProps) => {
  const { currentUser } = useContext(AppContext);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  
  const isOwnedByCurrentUser = item.addedBy === currentUser?.id;
  const isAssignedToCurrentUser = item.assignedTo === currentUser?.id;

  // Calculate dropdown position and update on scroll
  useEffect(() => {
    const updatePosition = () => {
      if (showAssignMenu && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          right: window.innerWidth - rect.right + window.scrollX
        });
      }
    };

    if (showAssignMenu) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showAssignMenu]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAssignMenu(false);
      }
    };

    if (showAssignMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssignMenu]);
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
  };

  const handleAssignClick = () => {
    setShowAssignMenu(!showAssignMenu);
  };

  const handleAssignToUser = (userId: number | null) => {
    if (onAssign) {
      onAssign(item.id, userId);
    }
    setShowAssignMenu(false);
  };
  
  return (
    <>
    <Card className={cn(
      "bg-card border-border hover:shadow-md transition-all duration-200",
      item.isPacked && "opacity-75",
      showAssignMenu && "z-[9998]"
    )}>
      <CardContent className="p-3 flex items-center">
        <div className="mr-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "w-7 h-7 p-0 rounded-full border-2",
                    item.isPacked 
                      ? "bg-primary border-primary hover:bg-primary/90 hover:border-primary/90" 
                      : "border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/10"
                  )}
                  onClick={() => onToggle(item.id, item.isPacked)}
                >
                  <Check className={cn(
                    "h-4 w-4",
                    item.isPacked ? "text-white" : "text-transparent"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{item.isPacked ? "Mark as not packed" : "Mark as packed"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <p className={cn(
              "font-medium",
              item.isPacked ? "line-through" : "",
            )} style={{ 
              color: item.isPacked ? 'var(--muted-foreground)' : 'var(--foreground)'
            }}>
              {item.name}
            </p>
            
            {item.quantity && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-2">
                <Package className="h-3 w-3 mr-1" />
                {item.quantity}
              </Badge>
            )}
            
            {item.isGroupItem && (
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                <Users className="h-3 w-3 mr-1" />
                Group
              </Badge>
            )}
            
            {isOwnedByCurrentUser && !item.isGroupItem && (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                <User className="h-3 w-3 mr-1" />
                Your item
              </Badge>
            )}
          </div>
          
          {item.isGroupItem && item.assignedTo && (
            <p className="text-xs mt-1 flex items-center" style={{ color: 'var(--muted-foreground)' }}>
              <User className="h-3 w-3 mr-1" />
              Assigned to {isAssignedToCurrentUser ? 'You' : 'Someone else'}
            </p>
          )}
          
          {/* Added timestamp indication */}
          {item.addedAt && (
            <p className="text-xs mt-1 flex items-center" style={{ color: 'var(--muted-foreground)' }}>
              <Clock className="h-3 w-3 mr-1" />
              Added {new Date(item.addedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Assignment indicator/button */}
          <div className="relative" ref={dropdownRef} style={{ zIndex: showAssignMenu ? 9999 : 'auto' }}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={buttonRef}
                    size="sm"
                    variant="ghost"
                    onClick={handleAssignClick}
                    className="h-8 w-8 p-0 flex items-center justify-center rounded-full"
                  >
                    {item.assignedTo ? (
                      <Avatar 
                        src={usersMap[item.assignedTo]?.avatar}
                        fallback={usersMap[item.assignedTo]?.displayName}
                        size="sm"
                        className="w-7 h-7 border border-white dark:border-gray-700"
                      />
                    ) : (
                      <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {item.assignedTo ? (
                    <p>
                      Assigned to {item.assignedTo === currentUser?.id 
                        ? 'you' 
                        : (usersMap[item.assignedTo]?.displayName || 'Member')}
                    </p>
                  ) : (
                    <p>Assign to a trip member</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEdit}
                    className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Edit item</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {onDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onDelete}
                      className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Delete item</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
      
      {/* Portal-based dropdown for proper z-index stacking */}
      {showAssignMenu && onAssign && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999]"
          style={{ 
            top: dropdownPosition.top,
            right: dropdownPosition.right
          }}
        >
          <Card className="w-52 shadow-2xl bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="py-1">
                <button
                  onClick={() => handleAssignToUser(null)}
                  className="w-full px-3 py-2 text-sm text-left text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Not assigned
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                {tripMembers?.map(member => {
                  const user = member.user;
                  if (!user) return null;
                  const isCurrentlyAssigned = Number(item.assignedTo) === Number(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleAssignToUser(user.id)}
                      className={`w-full px-3 py-2 text-sm text-left flex items-center transition-colors ${
                        isCurrentlyAssigned 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' 
                          : 'text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                    >
                      <Avatar 
                        src={user.avatar}
                        fallback={user.displayName}
                        size="sm"
                        className="mr-2 w-5 h-5"
                      />
                      <span>
                        {user.id === currentUser?.id 
                          ? 'You' 
                          : (user.displayName || `User ${user.id}`)}
                        {isCurrentlyAssigned && ' (Current)'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
    </>
  );
};

export default PackingItemComponent;
