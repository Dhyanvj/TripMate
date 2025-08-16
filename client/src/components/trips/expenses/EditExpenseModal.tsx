import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import Avatar from "@/components/ui/avatar";

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

// Using the same Expense interface as in ExpenseList
interface Expense {
  id: number;
  tripId: number;
  description: string;
  amount: number;
  paidBy: number;
  addedBy: number;
  category?: string;
  paidAt: string;
  participants: Array<{
    id: number;
    expenseId: number;
    userId: number;
  }>;
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: number;
  expense: Expense | null;
  currentUserId: number;
}

const EditExpenseModal = ({ isOpen, onClose, tripId, expense, currentUserId }: EditExpenseModalProps) => {
  const { toast } = useToast();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [participants, setParticipants] = useState<number[]>([]);
  const [category, setCategory] = useState<string>("food");
  const [paidBy, setPaidBy] = useState<number>(currentUserId);
  
  // Fetch trip members
  const { data: tripMembers, isLoading: isMembersLoading } = useQuery<TripMember[]>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: isOpen && !!tripId
  });
  
  // Initialize form with expense data when modal opens or expense changes
  useEffect(() => {
    if (isOpen && expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategory(expense.category || "other");
      setPaidBy(expense.paidBy);
      
      // Get participant user IDs from the expense
      if (expense.participants && expense.participants.length > 0) {
        setParticipants(expense.participants.map(p => p.userId));
      } else {
        // Fallback to at least include the current user
        setParticipants([currentUserId]);
      }
    }
  }, [isOpen, expense, currentUserId]);
  
  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const res = await apiRequest("PATCH", `/api/expenses/${expense?.id}`, expenseData);
      return res.json();
    },
    onSuccess: () => {
      // Refetch expenses
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      toast({
        title: "Expense updated",
        description: "The expense has been updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error updating expense",
        description: "There was an error updating your expense. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = () => {
    if (!description.trim() || !amount.trim() || participants.length === 0 || !paidBy) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const expenseData = {
      description,
      amount: parseFloat(amount),
      participants,
      category,
      paidBy
    };
    
    updateExpenseMutation.mutate(expenseData);
  };
  
  const handleParticipantToggle = (userId: number) => {
    if (participants.includes(userId)) {
      setParticipants(participants.filter(id => id !== userId));
    } else {
      setParticipants([...participants, userId]);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Update expense details and participants. Each participant will pay an equal share.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Dinner at seafood restaurant"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                step="0.01"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food & Drinks</SelectItem>
                <SelectItem value="accommodation">Accommodation</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="activities">Activities & Entertainment</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="paidBy">Paid By</Label>
            <Select value={paidBy.toString()} onValueChange={(value) => setPaidBy(parseInt(value))}>
              <SelectTrigger id="paidBy">
                <SelectValue>
                  {paidBy === currentUserId 
                    ? `Me (${tripMembers?.find(m => m.user?.id === currentUserId)?.user?.displayName || "You"})`
                    : tripMembers?.find(m => m.user?.id === paidBy)?.user?.displayName || "Select who paid"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* Current user (Me) */}
                <SelectItem value={currentUserId.toString()}>
                  Me ({tripMembers?.find(m => m.user?.id === currentUserId)?.user?.displayName || "You"})
                </SelectItem>
                
                {/* Other trip members */}
                {tripMembers && tripMembers
                  .filter(member => member.user && member.user.id !== currentUserId)
                  .map(member => {
                    const userId = member.user?.id || 0;
                    const userName = member.user?.displayName || 'Unknown';
                    
                    return (
                      <SelectItem key={`payer-${userId}`} value={userId.toString()}>
                        {userName}
                      </SelectItem>
                    );
                  })
                }
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              You can update expenses paid by any trip member.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label>Split Between</Label>
            
            {isMembersLoading ? (
              <div className="flex items-center space-x-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading trip members...</span>
              </div>
            ) : (
              <div className="space-y-2 mt-1">
                {/* Current user (Me) */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`split-user-${currentUserId}`}
                    checked={participants.includes(currentUserId)}
                    onCheckedChange={() => handleParticipantToggle(currentUserId)}
                  />
                  <Label htmlFor={`split-user-${currentUserId}`} className="flex items-center">
                    <Avatar 
                      src={tripMembers?.find(m => m.user?.id === currentUserId)?.user?.avatar ?? undefined}
                      fallback={tripMembers?.find(m => m.user?.id === currentUserId)?.user?.displayName ?? undefined}
                      size="sm"
                      className="mr-2 w-5 h-5"
                    />
                    Me ({tripMembers?.find(m => m.user?.id === currentUserId)?.user?.displayName || "You"})
                  </Label>
                </div>
                
                {/* Trip members excluding current user */}
                {tripMembers && tripMembers
                  .filter(member => member.user && member.user.id !== currentUserId)
                  .map((member, index) => {
                    const userId = member.user?.id || 0;
                    const userName = member.user?.displayName || 'Unknown';
                    const initial = userName.charAt(0);
                    // Alternate background colors for visual distinction
                    const bgColorClasses = [
                      'bg-blue-100 text-blue-600',
                      'bg-purple-100 text-purple-600',
                      'bg-green-100 text-green-600',
                      'bg-amber-100 text-amber-600'
                    ];
                    const colorClass = bgColorClasses[index % bgColorClasses.length];
                    
                    return (
                      <div key={`split-member-${userId}`} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`split-user-${userId}`}
                          checked={participants.includes(userId)}
                          onCheckedChange={() => handleParticipantToggle(userId)}
                        />
                        <Label htmlFor={`split-user-${userId}`} className="flex items-center">
                          <Avatar 
                            src={member.user?.avatar ?? undefined}
                            fallback={member.user?.displayName ?? undefined}
                            size="sm"
                            className="mr-2 w-5 h-5"
                          />
                          {userName}
                        </Label>
                      </div>
                    );
                  })
                }
                
                {/* Show a message if there are no other trip members */}
                {tripMembers && tripMembers.length <= 1 && (
                  <div className="text-sm text-muted-foreground italic">
                    No other trip members yet. Invite friends to join your trip!
                  </div>
                )}
              </div>
            )}
            
            {/* Show split calculation preview if amount and participants are specified */}
            {amount && parseFloat(amount) > 0 && participants.length > 0 && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-sm font-medium">Split preview:</p>
                <p className="text-sm">${(parseFloat(amount) / participants.length).toFixed(2)} per person</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateExpenseMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-medium shadow-md"
          >
            {updateExpenseMutation.isPending ? "Updating..." : "Update Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseModal;