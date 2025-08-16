import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Avatar from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Users } from "lucide-react";

interface ViewMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Array<{
    id: number;
    tripId: number;
    userId: number;
    joinedAt: Date;
    isHidden: boolean;
    isAdmin: boolean;
    user: {
      id: number;
      username: string;
      displayName: string;
      email: string | null;
      avatar: string | null;
    };
  }>;
  tripOwnerId: number;
}

export function ViewMembersDialog({ 
  open, 
  onOpenChange, 
  members, 
  tripOwnerId 
}: ViewMembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trip Members</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {members?.map((member) => (
            <div key={member.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card/50">
              <Avatar 
                src={member.user.avatar || undefined}
                fallback={member.user.displayName}
                size="md"
                className="h-10 w-10"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.user.displayName}
                  </p>
                  
                  {member.userId === tripOwnerId && (
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Owner
                    </Badge>
                  )}
                  
                  {member.isAdmin && member.userId !== tripOwnerId && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground truncate">
                  @{member.user.username}
                </p>
                
                {member.user.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {(!members || members.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No members found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}