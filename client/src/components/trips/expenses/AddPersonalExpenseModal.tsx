import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddPersonalExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: number;
  currentUserId: number;
}

const AddPersonalExpenseModal = ({ isOpen, onClose, tripId, currentUserId }: AddPersonalExpenseModalProps) => {
  const { toast } = useToast();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("other");
  
  // Add personal expense mutation
  const addPersonalExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const res = await apiRequest("POST", `/api/trips/${tripId}/expenses`, expenseData);
      return res.json();
    },
    onSuccess: () => {
      // Refetch expenses
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      toast({
        title: "Personal expense added",
        description: "Your personal expense has been added successfully",
      });
      onClose();
      clearForm();
    },
    onError: () => {
      toast({
        title: "Error adding expense",
        description: "There was an error adding your expense. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = () => {
    if (!description.trim() || !amount.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // For personal expenses: 
    // - paidBy is always the current user
    // - isPersonal is set to true (this signals it's a personal expense)
    // - participants is empty since it's not shared
    const expenseData = {
      description,
      amount: parseFloat(amount),
      paidBy: currentUserId,
      addedBy: currentUserId,
      category,
      isPersonal: true,
      participants: [] // No participants for personal expenses
    };
    
    addPersonalExpenseMutation.mutate(expenseData);
  };
  
  const clearForm = () => {
    setDescription("");
    setAmount("");
    setCategory("other");
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Personal Expense</DialogTitle>
          <DialogDescription>
            Add a personal expense that is just for you and won't be split with the group.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Personal shopping"
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
          
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Personal expenses are only for you and won't affect group expense calculations.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={addPersonalExpenseMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-medium shadow-md w-full sm:w-auto"
          >
            {addPersonalExpenseMutation.isPending ? "Adding..." : (
              <span className="flex items-center justify-center">
                <DollarSign className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Add Personal Expense</span>
                <span className="xs:hidden">Add Expense</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPersonalExpenseModal;