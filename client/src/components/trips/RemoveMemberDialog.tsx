import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { UserMinus, Loader2 } from 'lucide-react';
import Avatar from '@/components/ui/avatar';

interface TripMember {
  id: number;
  tripId: number;
  userId: number;
  joinedAt: string;
  user?: {
    id: number;
    username: string;
    displayName: string;
    email?: string;
    avatar?: string;
  };
}

interface RemoveMemberDialogProps {
  tripId: number;
  tripMembers: TripMember[];
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: number;
}

const RemoveMemberDialog: React.FC<RemoveMemberDialogProps> = ({
  tripId,
  tripMembers,
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter out the current user (trip owner) from removable members
  const removableMembers = tripMembers.filter(
    member => member.user && member.userId !== currentUserId
  );

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberUserId: number) => {
      const res = await apiRequest("DELETE", `/api/trips/${tripId}/members/${memberUserId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Member Removed",
        description: "The member has been successfully removed from the trip.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'members'] });
      onClose();
      setSelectedMemberId('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveMember = () => {
    if (!selectedMemberId) return;
    removeMemberMutation.mutate(parseInt(selectedMemberId));
  };

  const handleClose = () => {
    onClose();
    setSelectedMemberId('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Remove Member
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a member to remove from this trip. This action cannot be undone.
          </p>

          {removableMembers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No members to remove. You are the only member of this trip.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Member</label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member to remove" />
                  </SelectTrigger>
                  <SelectContent>
                    {removableMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={member.user?.avatar ?? undefined}
                            fallback={member.user?.displayName ?? undefined}
                            size="sm"
                            className="w-5 h-5"
                          />
                          <span>{member.user?.displayName || `User ${member.userId}`}</span>
                          {member.user?.email && (
                            <span className="text-xs text-muted-foreground">
                              ({member.user.email})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemoveMember}
                  disabled={!selectedMemberId || removeMemberMutation.isPending}
                >
                  {removeMemberMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Member
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveMemberDialog;