import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Crown, Shield, User } from "lucide-react";

interface SelectAdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: number;
  currentUserId: number;
  tripOwnerId: number;
}

interface TripMember {
  id: number;
  userId: number;
  tripId: number;
  joinedAt: Date;
  isHidden: boolean;
  isAdmin: boolean;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatar: string | null;
  } | null;
}

export function SelectAdminDialog({ 
  isOpen, 
  onClose, 
  tripId, 
  currentUserId, 
  tripOwnerId 
}: SelectAdminDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);

  // Fetch trip members
  const { data: members = [], isLoading } = useQuery<TripMember[]>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: isOpen
  });

  // Mutation to update admin status
  const setAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      const response = await fetch(`/api/trips/${tripId}/members/${userId}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAdmin }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update admin status');
      }
      
      return response.json();
    },
    onMutate: ({ userId }) => {
      setProcessingUserId(userId);
    },
    onSuccess: (data, { userId, isAdmin }) => {
      toast({
        title: "Success",
        description: `Member ${isAdmin ? 'promoted to admin' : 'removed from admin role'}`
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/admins`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setProcessingUserId(null);
    }
  });

  const handleToggleAdmin = (member: TripMember) => {
    if (!member.user) return;
    
    // Cannot change admin status of trip owner
    if (member.userId === tripOwnerId) {
      toast({
        title: "Cannot change owner status",
        description: "Trip owner automatically has admin privileges",
        variant: "destructive"
      });
      return;
    }

    setAdminMutation.mutate({
      userId: member.userId,
      isAdmin: !member.isAdmin
    });
  };

  const getRoleIcon = (member: TripMember) => {
    if (member.userId === tripOwnerId) {
      return <Crown className="h-4 w-4 text-yellow-500" />;
    } else if (member.isAdmin) {
      return <Shield className="h-4 w-4 text-blue-500" />;
    } else {
      return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleText = (member: TripMember) => {
    if (member.userId === tripOwnerId) {
      return "Owner";
    } else if (member.isAdmin) {
      return "Admin";
    } else {
      return "Member";
    }
  };

  const getRoleBadgeVariant = (member: TripMember) => {
    if (member.userId === tripOwnerId) {
      return "default" as const;
    } else if (member.isAdmin) {
      return "secondary" as const;
    } else {
      return "outline" as const;
    }
  };

  const canManageAdmin = (member: TripMember) => {
    // Only trip owner can manage admin roles
    // Admin cannot be changed for trip owner
    return currentUserId === tripOwnerId && member.userId !== tripOwnerId;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Admins</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Admins</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Avatar 
                  src={member.user?.avatar || undefined}
                  fallback={member.user?.displayName?.charAt(0) || '?'}
                  size="md"
                />
                
                <div>
                  <p className="font-medium">{member.user?.displayName}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getRoleIcon(member)}
                    <Badge variant={getRoleBadgeVariant(member)}>
                      {getRoleText(member)}
                    </Badge>
                  </div>
                </div>
              </div>

              {canManageAdmin(member) && (
                <Button
                  variant={member.isAdmin ? "destructive" : "default"}
                  size="sm"
                  onClick={() => handleToggleAdmin(member)}
                  disabled={processingUserId === member.userId}
                >
                  {processingUserId === member.userId ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : member.isAdmin ? (
                    "Remove Admin"
                  ) : (
                    "Make Admin"
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}