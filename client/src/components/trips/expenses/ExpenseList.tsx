import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, MoreVertical, Edit, Trash2, BarChart, PieChart, DollarSign, Users, CheckCircle2, RotateCcw, AlertCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AddExpenseModal from "./AddExpenseModal";
import EditExpenseModal from "./EditExpenseModal";
import AddPersonalExpenseModal from "./AddPersonalExpenseModal";

interface Expense {
  id: number;
  tripId: number;
  description: string;
  amount: number;
  paidBy: number;
  paidAt: string;
  addedBy: number;
  category?: string;
  isPersonal?: boolean;
  participants: Array<{
    id: number;
    expenseId: number;
    userId: number;
  }>;
}

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

interface DebtSettlement {
  id: number;
  tripId: number;
  owedById: number;    // Person who owed money
  owedToId: number;    // Person who was owed money
  amount: number;
  settledAt: string;
  settledById: number; // User who reported the settlement
  notes?: string;
}

interface ExpenseListProps {
  tripId: number;
  currentUserId: number;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ tripId, currentUserId }) => {
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddPersonalExpenseModalOpen, setIsAddPersonalExpenseModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [isTotalSpentModalOpen, setIsTotalSpentModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [userToSettle, setUserToSettle] = useState<{
    id: number, 
    displayName: string, 
    amount: number,
    isPayment?: boolean // true: I'm paying them, false: They're paying me
  } | null>(null);
  const [settlementNote, setSettlementNote] = useState("");
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch expenses for the trip
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: [`/api/trips/${tripId}/expenses`],
    enabled: !!tripId,
  });
  
  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "The expense has been successfully deleted.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/trips/${tripId}/expenses`],
      });
      setExpenseToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete expense: ${error.message}`,
        variant: "destructive",
      });
      setExpenseToDelete(null);
    },
  });
  
  // Fetch debt settlements
  const { data: debtSettlements = [] } = useQuery<DebtSettlement[]>({
    queryKey: [`/api/trips/${tripId}/debt-settlements`],
    enabled: !!tripId,
  });
  
  // Create debt settlement mutation
  const createDebtSettlementMutation = useMutation({
    mutationFn: async (data: { owedById: number; owedToId: number; amount: number; notes?: string }) => {
      return apiRequest("POST", `/api/trips/${tripId}/debt-settlements`, data);
    },
    onSuccess: () => {
      toast({
        title: "Debt marked as settled",
        description: "The debt settlement has been recorded.",
      });
      // Invalidate settlements and expenses to update the UI
      queryClient.invalidateQueries({
        queryKey: [`/api/trips/${tripId}/debt-settlements`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/trips/${tripId}/expenses`],
      });
      setIsSettleModalOpen(false);
      setUserToSettle(null);
      setSettlementNote("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to record settlement: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete debt settlement mutation (for undoing a settlement)
  const deleteSettlementMutation = useMutation({
    mutationFn: async (settlementId: number) => {
      return apiRequest("DELETE", `/api/debt-settlements/${settlementId}`);
    },
    onSuccess: () => {
      toast({
        title: "Settlement undone",
        description: "The debt settlement has been removed.",
      });
      // Invalidate settlements and expenses to update the UI
      queryClient.invalidateQueries({
        queryKey: [`/api/trips/${tripId}/debt-settlements`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/trips/${tripId}/expenses`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to undo settlement: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fetch trip members for the trip
  const { data: tripMembers, isLoading: isLoadingMembers } = useQuery<TripMember[]>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId,
  });

  // Get user display name by user ID
  const getUserDisplayName = (userId: number): string => {
    if (userId === currentUserId) return "Me";
    const member = tripMembers?.find(m => m.user?.id === userId);
    return member?.user?.displayName || "Unknown";
  };

  // Get category display name
  const getCategoryDisplayName = (category?: string): string => {
    if (!category) return "Other";
    const categories: Record<string, string> = {
      "food": "Food & Drinks",
      "accommodation": "Accommodation",
      "transportation": "Transportation",
      "activities": "Activities & Entertainment",
      "shopping": "Shopping",
      "other": "Other"
    };
    return categories[category] || "Other";
  };

  // Get badge color based on category
  const getCategoryBadgeColor = (category?: string): string => {
    if (!category) return "bg-gray-100 text-gray-800";
    const colors: Record<string, string> = {
      "food": "bg-green-100 text-green-800",
      "accommodation": "bg-blue-100 text-blue-800",
      "transportation": "bg-purple-100 text-purple-800",
      "activities": "bg-amber-100 text-amber-800",
      "shopping": "bg-pink-100 text-pink-800",
      "other": "bg-gray-100 text-gray-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  // Filter expenses based on active tab
  const getFilteredExpenses = (): Expense[] => {
    if (!expenses) return [];
    
    // Debug logging
    console.log('ExpenseList - Raw expenses data:', expenses);
    console.log('ExpenseList - Active tab:', activeTab);
    console.log('ExpenseList - Current user ID:', currentUserId);
    
    switch (activeTab) {
      case "paid-by-me":
        return expenses.filter(expense => expense.paidBy === currentUserId && !expense.isPersonal);
      case "i-owe":
        return expenses.filter(expense => 
          expense.paidBy !== currentUserId && 
          expense.participants.some(p => p.userId === currentUserId) &&
          !expense.isPersonal
        );
      case "personal-expenses":
        return expenses.filter(expense => 
          expense.isPersonal === true && 
          expense.paidBy === currentUserId
        );
      default:
        return expenses.filter(expense => !expense.isPersonal); // All group expenses (not personal)
    }
  };

  // Calculate net balances with each user
  const calculateNetBalances = (): Map<number, { owed: number; owes: number; net: number; displayName: string }> => {
    if (!expenses) return new Map();
    
    const balances = new Map<number, { owed: number; owes: number; net: number; displayName: string }>();
    
    // Initialize balances for all trip members
    tripMembers?.forEach(member => {
      if (member.user && member.user.id !== currentUserId) {
        balances.set(member.user.id, {
          owed: 0, // What they owe me
          owes: 0, // What I owe them
          net: 0,  // Net balance (positive means they owe me, negative means I owe them)
          displayName: member.user.displayName || "Unknown"
        });
      }
    });
    
    // Calculate all balances
    expenses.forEach(expense => {
      if (expense.isPersonal) return; // Skip personal expenses
      
      const participantsCount = expense.participants.length;
      if (participantsCount <= 1) return; // Skip single-person expenses
      
      const amountPerPerson = expense.amount / participantsCount;
      
      if (expense.paidBy === currentUserId) {
        // Current user paid, others owe the user
        expense.participants.forEach(participant => {
          if (participant.userId !== currentUserId) {
            const balance = balances.get(participant.userId);
            if (balance) {
              balance.owed += amountPerPerson;
              balance.net += amountPerPerson;
              balances.set(participant.userId, balance);
            }
          }
        });
      } else if (expense.participants.some(p => p.userId === currentUserId)) {
        // Someone else paid, current user owes them
        const balance = balances.get(expense.paidBy);
        if (balance) {
          balance.owes += amountPerPerson;
          balance.net -= amountPerPerson;
          balances.set(expense.paidBy, balance);
        }
      }
    });
    
    return balances;
  };

  // Calculate amount owed to the current user
  const calculateTotalOwedToMe = (): number => {
    if (!expenses) return 0;
    
    return expenses.reduce((total, expense) => {
      if (expense.paidBy === currentUserId) {
        const participantsCount = expense.participants.length;
        if (participantsCount > 1) {
          // Calculate what others owe me (excluding my share)
          const myShare = expense.amount / participantsCount;
          const othersOwe = expense.amount - myShare;
          return total + othersOwe;
        }
      }
      return total;
    }, 0);
  };

  // Calculate amount the current user owes to others
  const calculateTotalIowe = (): number => {
    if (!expenses) return 0;
    
    return expenses.reduce((total, expense) => {
      if (expense.paidBy !== currentUserId && expense.participants.some(p => p.userId === currentUserId)) {
        const participantsCount = expense.participants.length;
        const myShare = expense.amount / participantsCount;
        return total + myShare;
      }
      return total;
    }, 0);
  };
  
  // Calculate total amount spent by the group on this trip
  const calculateTotalGroupSpent = (): number => {
    if (!expenses) return 0;
    
    return expenses.reduce((total, expense) => {
      if (!expense.isPersonal) {
        return total + expense.amount;
      }
      return total;
    }, 0);
  };
  
  // Calculate total amount spent by the current user on this trip
  const calculateTotalUserSpent = (): number => {
    if (!expenses) return 0;
    
    return expenses.reduce((total, expense) => {
      if (expense.paidBy === currentUserId) {
        return total + expense.amount;
      }
      return total;
    }, 0);
  };

  // Format a date string to a more readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Calculate amount per person in an expense
  const calculateAmountPerPerson = (expense: Expense): number => {
    return expense.amount / expense.participants.length;
  };

  // Calculate amount current user owes/is owed in a specific expense
  const calculateUserBalance = (expense: Expense): { amount: number; isOwed: boolean } => {
    const amountPerPerson = calculateAmountPerPerson(expense);
    const isUserParticipant = expense.participants.some(p => p.userId === currentUserId);
    
    if (!isUserParticipant) {
      return { amount: 0, isOwed: false };
    }
    
    if (expense.paidBy === currentUserId) {
      // User paid, so they are owed by others (if more than one participant)
      if (expense.participants.length > 1) {
        const totalOwed = expense.amount - amountPerPerson;
        return { amount: totalOwed, isOwed: true };
      }
      return { amount: 0, isOwed: false }; // User paid just for themselves
    } else {
      // User didn't pay, so they owe to the person who paid
      return { amount: amountPerPerson, isOwed: false };
    }
  };
  
  // Check if a debt is already settled between two users
  const isDebtSettled = (owedById: number, owedToId: number, amount: number): boolean => {
    if (!debtSettlements || debtSettlements.length === 0) return false;
    
    // Find all settlements between these users (in both directions)
    const settlements = debtSettlements.filter(s => 
      (s.owedById === owedById && s.owedToId === owedToId) || 
      (s.owedById === owedToId && s.owedToId === owedById)
    );
    
    if (settlements.length === 0) return false;
    
    // Check if the total settlement amount covers the debt
    const totalSettledAmount = settlements.reduce((total, s) => total + s.amount, 0);
    return totalSettledAmount >= Math.abs(amount);
  };
  
  // Find settlement IDs between two users (for the "Undo" feature)
  const findSettlementsBetweenUsers = (user1Id: number, user2Id: number): DebtSettlement[] => {
    if (!debtSettlements || debtSettlements.length === 0) return [];
    
    // Find all settlements between these users (in both directions)
    return debtSettlements.filter(s => 
      (s.owedById === user1Id && s.owedToId === user2Id) || 
      (s.owedById === user2Id && s.owedToId === user1Id)
    );
  };

  if (isLoadingExpenses || isLoadingMembers) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredExpenses = getFilteredExpenses();
  const netBalances = calculateNetBalances();
  const totalOwedToMe = calculateTotalOwedToMe();
  const totalIOwe = calculateTotalIowe();
  const netBalance = totalOwedToMe - totalIOwe;
  const totalGroupSpent = calculateTotalGroupSpent();
  const totalUserSpent = calculateTotalUserSpent();

  return (
    <div className="p-4 pb-20 min-h-0 h-full overflow-y-auto">
      {/* Balance summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border border-green-100 dark:border-green-900 overflow-hidden">
          <div className="absolute w-24 h-24 -right-8 -top-8 rounded-full bg-green-100 dark:bg-green-900/30 opacity-50"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
              <span>Total you're owed</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-1 cursor-help">
                      <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Money others owe you for group expenses you paid for</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalOwedToMe.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="border border-red-100 dark:border-red-900 overflow-hidden">
          <div className="absolute w-24 h-24 -right-8 -top-8 rounded-full bg-red-100 dark:bg-red-900/30 opacity-50"></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
              <span>Total you owe</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-1 cursor-help">
                      <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Money you owe others for your share of group expenses they paid for</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">${totalIOwe.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className={`border ${netBalance >= 0 ? "border-green-100 dark:border-green-900" : "border-red-100 dark:border-red-900"} overflow-hidden`}>
          <div className={`absolute w-24 h-24 -right-8 -top-8 rounded-full ${netBalance >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"} opacity-50`}></div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-base flex items-center">
              <DollarSign className={`h-4 w-4 ${netBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} mr-2`} />
              <span>Net balance</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-1 cursor-help">
                      <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The difference between what others owe you and what you owe others</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              ${Math.abs(netBalance).toFixed(2)}
              <span className="ml-1 text-base">
                {netBalance >= 0 ? "credit" : "debt"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Add expense buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center">
          <DollarSign className="h-6 w-6 mr-2 text-primary" />
          Expenses
        </h2>
        <div className="flex flex-wrap gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setIsAddPersonalExpenseModalOpen(true)}
                  variant="outline"
                  className="flex items-center border-primary/30 dark:border-primary/20 shadow-sm"
                >
                  <DollarSign className="h-4 w-4 mr-2 text-primary" />
                  <span>Add Personal Expense</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Track expenses that are just for you (not split with the group)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-medium flex items-center shadow-md"
                >
                  <Users className="h-4 w-4 mr-2" />
                  <span>Add Group Expense</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add an expense to be split among group members</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Expense filter tabs and statistics button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="w-full md:w-auto overflow-x-auto pb-2">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-3 md:mb-0">
            <TabsList className="grid grid-cols-4 bg-muted/60 dark:bg-muted/30 p-1 shadow-sm">
              <TabsTrigger value="all" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 relative overflow-hidden p-2 sm:p-3">
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">All Group</span>
                <span className="xs:hidden">All</span>
                {expenses && expenses.filter(e => !e.isPersonal).length > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid-by-me" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 relative overflow-hidden p-2 sm:p-3">
                <DollarSign className="h-4 w-4" />
                <span className="hidden xs:inline">Paid by me</span>
                <span className="xs:hidden">My paid</span>
                {expenses && expenses.filter(e => e.paidBy === currentUserId && !e.isPersonal).length > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="personal-expenses" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 relative overflow-hidden p-2 sm:p-3">
                <div className="relative">
                  <DollarSign className="h-4 w-4" />
                  <div className="absolute -right-1 -bottom-1">
                    <div className="h-2.5 w-2.5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-[8px] font-bold">1</span>
                    </div>
                  </div>
                </div>
                <span className="hidden xs:inline">Personal</span>
                <span className="xs:hidden">Mine</span>
                {expenses && expenses.filter(e => e.isPersonal && e.paidBy === currentUserId).length > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="i-owe" className="flex items-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 relative overflow-hidden p-2 sm:p-3">
                <DollarSign className="h-4 w-4" />
                <span>I owe</span>
                {totalIOwe > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border-primary/20 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                onClick={() => setIsTotalSpentModalOpen(true)}
              >
                <BarChart className="h-4 w-4 text-primary" />
                <span>Trip Statistics</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View detailed spending statistics for this trip</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Net Settlement Summary for "I Owe" tab */}
      {activeTab === "i-owe" && (
        <>
          {/* Debts I Owe to Others */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">I Owe Others</h3>
            <div className="space-y-3">
              {Array.from(netBalances.entries())
                .filter(([_, balance]) => balance.net < 0) // Only show people you owe money to (negative net balance)
                .sort((a, b) => a[1].net - b[1].net) // Sort by amount owed (most owed first)
                .map(([userId, balance]) => {
                  const netAmount = Math.abs(balance.net);
                  const isSettledAlready = isDebtSettled(currentUserId, userId, netAmount);
                  
                  return (
                    <Card key={userId} className={`${isSettledAlready ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-lg" style={{ color: 'var(--foreground)' }}>You owe {balance.displayName}</p>
                              {isSettledAlready && (
                                <Badge className="bg-green-100 text-green-800">
                                  Settled
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
                              ${netAmount.toFixed(2)} 
                              {balance.owed > 0 && (
                                <span> (after subtracting the ${balance.owed.toFixed(2)} {balance.displayName} owes you)</span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className={`text-xl font-bold ${isSettledAlready ? 'text-green-600' : 'text-red-600'}`}>
                              ${netAmount.toFixed(2)}
                            </p>
                            {!isSettledAlready ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                onClick={() => {
                                  setUserToSettle({
                                    id: userId, 
                                    displayName: balance.displayName, 
                                    amount: netAmount,
                                    isPayment: true // I'm paying them
                                  });
                                  setIsSettleModalOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as Paid
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                                onClick={() => {
                                  // Find the settlements between these users
                                  const settlements = findSettlementsBetweenUsers(currentUserId, userId);
                                  if (settlements.length > 0) {
                                    // Delete the most recent settlement
                                    const mostRecentSettlement = settlements.sort((a, b) => 
                                      new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
                                    )[0];
                                    
                                    deleteSettlementMutation.mutate(mostRecentSettlement.id);
                                  }
                                }}
                                disabled={deleteSettlementMutation.isPending}
                              >
                                {deleteSettlementMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                )}
                                Undo Settlement
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              }
              
              {/* Show message when you don't owe anyone */}
              {Array.from(netBalances.entries()).filter(([_, balance]) => balance.net < 0).length === 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="py-6 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
                      <p className="text-green-800 font-medium text-lg">You're all settled up!</p>
                      <p className="text-green-700 text-sm mt-1">You don't owe anyone at the moment.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          {/* Debts Others Owe Me */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Others Owe Me</h3>
            <div className="space-y-3">
              {Array.from(netBalances.entries())
                .filter(([_, balance]) => balance.net > 0) // Only show people who owe you money (positive net balance)
                .sort((a, b) => b[1].net - a[1].net) // Sort by amount owed (most owed first)
                .map(([userId, balance]) => {
                  const netAmount = balance.net;
                  const isSettledAlready = isDebtSettled(userId, currentUserId, netAmount);
                  
                  return (
                    <Card key={userId} className={`${isSettledAlready ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-lg" style={{ color: 'var(--foreground)' }}>{balance.displayName} owes you</p>
                              {isSettledAlready && (
                                <Badge className="bg-green-100 text-green-800">
                                  Settled
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
                              ${netAmount.toFixed(2)} 
                              {balance.owes > 0 && (
                                <span> (after subtracting the ${balance.owes.toFixed(2)} you owe {balance.displayName})</span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className={`text-xl font-bold ${isSettledAlready ? 'text-green-600' : 'text-blue-600'}`}>
                              ${netAmount.toFixed(2)}
                            </p>
                            {!isSettledAlready ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                onClick={() => {
                                  setUserToSettle({
                                    id: userId, 
                                    displayName: balance.displayName, 
                                    amount: netAmount,
                                    isPayment: false // They're paying me
                                  });
                                  setIsSettleModalOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as Received
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                                onClick={() => {
                                  // Find the settlements between these users
                                  const settlements = findSettlementsBetweenUsers(currentUserId, userId);
                                  if (settlements.length > 0) {
                                    // Delete the most recent settlement
                                    const mostRecentSettlement = settlements.sort((a, b) => 
                                      new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
                                    )[0];
                                    
                                    deleteSettlementMutation.mutate(mostRecentSettlement.id);
                                  }
                                }}
                                disabled={deleteSettlementMutation.isPending}
                              >
                                {deleteSettlementMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                )}
                                Undo Settlement
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              }
              
              {/* No debts owed to me message */}
              {Array.from(netBalances.entries()).filter(([_, balance]) => balance.net > 0).length === 0 && (
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="py-4 text-center">
                    <p className="text-gray-500">No one owes you any money</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* Expense list - only show for tabs other than "i-owe" */}
      {activeTab !== "i-owe" && (
        filteredExpenses.length === 0 ? (
          <Card className="border border-gray-200 dark:border-gray-700 overflow-hidden">
            <CardContent className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--foreground)' }}>No expenses found</h3>
              <p className="mb-6 max-w-sm mx-auto" style={{ color: 'var(--foreground)', opacity: '0.8' }}>
                {activeTab === "all" && "You haven't added any group expenses yet."}
                {activeTab === "paid-by-me" && "You haven't paid for any group expenses yet."}
                {activeTab === "personal-expenses" && "You haven't added any personal expenses yet."}
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={() => activeTab === "personal-expenses" ? setIsAddPersonalExpenseModalOpen(true) : setIsAddExpenseModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-medium flex items-center shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>
                    {activeTab === "personal-expenses" ? "Add Personal Expense" : "Add Group Expense"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map(expense => {
              const paidByName = getUserDisplayName(expense.paidBy);
              const category = getCategoryDisplayName(expense.category);
              const badgeColor = getCategoryBadgeColor(expense.category);
              const { amount: balanceAmount, isOwed } = calculateUserBalance(expense);
              const amountPerPerson = calculateAmountPerPerson(expense);
              const isPersonalExpense = expense.isPersonal === true;
              
              return (
                <Card 
                  key={expense.id} 
                  className={`overflow-hidden hover:shadow-md transition-all ${
                    isPersonalExpense 
                      ? 'border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10' 
                      : expense.paidBy === currentUserId
                        ? 'border-green-100 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/5'
                        : ''
                  }`}
                >
                  <CardHeader className="pb-2 relative">
                    {/* Category/expense type indicator */}
                    <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full opacity-10 bg-gradient-to-br from-transparent to-gray-200 dark:to-gray-800"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg flex items-center">
                            {isPersonalExpense ? (
                              <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mr-2">
                                <DollarSign className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mr-2">
                                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </div>
                            )}
                            <span style={{ color: 'var(--foreground)' }}>{expense.description}</span>
                          </CardTitle>
                          {isPersonalExpense && (
                            <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Personal
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center mt-1.5" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
                          <span className="font-medium" style={{ color: 'var(--foreground)', opacity: '0.8' }}>{paidByName}</span>
                          <span className="inline-block mx-1.5">•</span>
                          <span>{formatDate(expense.paidAt)}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={badgeColor + " border dark:border-opacity-30"}>
                                {category}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Expense category</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {/* Show edit/delete options for all expenses (any user can edit/delete any expense) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
                              <MoreVertical className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => {
                                setExpenseToEdit(expense);
                                setIsEditExpenseModalOpen(true);
                              }}
                              className="cursor-pointer flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-2 text-blue-500" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setExpenseToDelete(expense.id)}
                              className="cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 py-2 border-t border-gray-100 dark:border-gray-800 gap-2">
                      <div className="w-full sm:w-auto">
                        {!isPersonalExpense ? (
                          <>
                            <div className="flex items-center text-sm mb-1 flex-wrap" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
                              <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                              <span className="break-words">
                                {expense.participants.length} {expense.participants.length === 1 ? 'person' : 'people'} • ${amountPerPerson.toFixed(2)} per person
                              </span>
                            </div>
                            
                            {balanceAmount > 0 && (
                              <div className={`flex items-center text-sm mt-1 font-medium ${isOwed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isOwed ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                    <span>You are owed ${balanceAmount.toFixed(2)}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                                    <span>You owe ${balanceAmount.toFixed(2)} to {paidByName}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center text-sm text-purple-800 dark:text-purple-400">
                            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                            <span>Personal expense (not split with the group)</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
                        <span className="text-sm sm:hidden text-foreground font-medium">Total:</span>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                          ${expense.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
      
      {/* Add group expense modal */}
      <AddExpenseModal 
        isOpen={isAddExpenseModalOpen} 
        onClose={() => setIsAddExpenseModalOpen(false)} 
        tripId={tripId}
        currentUserId={currentUserId}
      />
      
      {/* Add personal expense modal */}
      <AddPersonalExpenseModal
        isOpen={isAddPersonalExpenseModalOpen}
        onClose={() => setIsAddPersonalExpenseModalOpen(false)}
        tripId={tripId}
        currentUserId={currentUserId}
      />
      
      {/* Edit expense modal */}
      <EditExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        tripId={tripId}
        expense={expenseToEdit}
        currentUserId={currentUserId}
      />
      
      {/* Spending statistics dialog */}
      <Dialog open={isTotalSpentModalOpen} onOpenChange={setIsTotalSpentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Trip Spending Statistics
            </DialogTitle>
            <DialogDescription>
              Overview of all spending on this trip.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Group Spending</p>
                  <p className="text-2xl font-bold text-blue-700">${totalGroupSpent.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Your Total Spending</p>
                  <p className="text-2xl font-bold text-amber-700">${totalUserSpent.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((totalUserSpent / (totalGroupSpent || 1)) * 100)}% of group total
                  </p>
                </div>
              </div>
              
              {(totalOwedToMe > 0 || totalIOwe > 0) && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-3 mt-3">
                    <div className={`p-3 rounded-full ${netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <DollarSign className={`h-6 w-6 ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Your Balance</p>
                      <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ${Math.abs(netBalance).toFixed(2)} {netBalance >= 0 ? 'credit' : 'debt'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsTotalSpentModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete expense confirmation dialog */}
      <AlertDialog 
        open={expenseToDelete !== null} 
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense
              and all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => expenseToDelete && deleteExpenseMutation.mutate(expenseToDelete)}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Mark as settled dialog */}
      <Dialog open={isSettleModalOpen} onOpenChange={setIsSettleModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {userToSettle?.isPayment 
                ? "Mark Payment as Sent" 
                : "Mark Payment as Received"}
            </DialogTitle>
            <DialogDescription>
              {userToSettle?.isPayment 
                ? `Record that you've paid ${userToSettle?.displayName || "this user"} the amount owed.`
                : `Record that ${userToSettle?.displayName || "this user"} has paid you the amount owed.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className={`mb-4 p-3 ${userToSettle?.isPayment ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} rounded-md border`}>
              <h4 className={`text-sm font-medium ${userToSettle?.isPayment ? 'text-red-800' : 'text-blue-800'} mb-1`}>
                Debt Details
              </h4>
              <p className={userToSettle?.isPayment ? 'text-red-800' : 'text-blue-800'}>
                Amount: <span className="font-bold">${userToSettle?.amount.toFixed(2) || "0.00"}</span>
              </p>
              <p className={`text-sm mt-1 ${userToSettle?.isPayment ? 'text-red-600' : 'text-blue-600'}`}>
                {userToSettle?.isPayment 
                  ? `You paid: ${userToSettle?.displayName}` 
                  : `${userToSettle?.displayName} paid you`}
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes (optional)
                </label>
                <Textarea
                  id="notes"
                  placeholder={userToSettle?.isPayment 
                    ? "e.g., Paid via Venmo on May 2nd" 
                    : "e.g., Received via PayPal on May 2nd"}
                  rows={3}
                  className="mt-1"
                  value={settlementNote}
                  onChange={(e) => setSettlementNote(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsSettleModalOpen(false);
              setUserToSettle(null);
              setSettlementNote("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (userToSettle) {
                  // If I'm paying them: I'm the debtor (owedById), they're the creditor (owedToId)
                  // If they're paying me: They're the debtor (owedById), I'm the creditor (owedToId)
                  createDebtSettlementMutation.mutate({
                    owedById: userToSettle.isPayment ? currentUserId : userToSettle.id,
                    owedToId: userToSettle.isPayment ? userToSettle.id : currentUserId,
                    amount: userToSettle.amount,
                    notes: settlementNote || undefined
                  });
                }
              }}
              disabled={createDebtSettlementMutation.isPending || !userToSettle}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createDebtSettlementMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {userToSettle?.isPayment ? "Mark as Paid" : "Mark as Received"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseList;