import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@shared/schema';
import ChatInterface from '@/components/chat/ChatInterface';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Avatar from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TripChatProps {
  tripId: number;
}

const TripChat: React.FC<TripChatProps> = ({ tripId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch trip data to check ownership
  const { data: trip } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId,
  });
  
  // Fetch trip members for the participant list
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['/api/trips', tripId, 'members'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trips/${tripId}/members`);
      return res.json();
    },
    enabled: !!tripId
  });

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
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check if current user is the trip owner
  const isOwner = trip && user && trip.createdById === user.id;

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p>You need to be logged in to access the chat.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 h-full">
      {/* Main Chat Area */}
      <div className="col-span-1 md:col-span-3 h-full">
        <ChatInterface />
      </div>
      
      {/* Sidebar with Trip Members */}
      <div className="hidden md:block border-l">
        <Card className="h-full rounded-none border-0 shadow-none">
          <div className="p-4 border-b">
            <h3 className="font-medium">Trip Members</h3>
          </div>
          
          <div className="p-4">
            {loadingMembers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !members || members.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                <p>No members found</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {members.map((member: any) => (
                  <li key={member.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        src={member.user?.avatar ?? undefined}
                        fallback={member.user?.displayName ?? undefined}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {member.user?.displayName || `User ${member.userId}`}
                          {trip?.createdById === member.userId && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Owner</span>
                          )}
                        </p>
                        {member.user?.email && (
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Remove button - only show for trip owner and not for themselves */}
                    {isOwner && member.userId !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.user?.displayName || `User ${member.userId}`} from this trip? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMemberMutation.mutate(member.userId)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TripChat;