import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, AlertTriangle } from "lucide-react";

const spendingMarginSchema = z.object({
  budgetLimit: z.number().min(1, "Budget limit must be at least $1"),
  warningThreshold: z.number().min(0.1).max(1.0),
});

type SpendingMarginForm = z.infer<typeof spendingMarginSchema>;

interface SpendingMarginDialogProps {
  tripId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function SpendingMarginDialog({ tripId, isOpen, onClose }: SpendingMarginDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEdit, setIsEdit] = useState(false);

  const form = useForm<SpendingMarginForm>({
    resolver: zodResolver(spendingMarginSchema),
    defaultValues: {
      budgetLimit: 100,
      warningThreshold: 0.8,
    },
  });

  // Fetch existing spending margin
  const { data: existingMargin, isLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/spending-margin`, user?.id],
    enabled: isOpen && !!user,
  });

  // Set form values when existing margin is loaded
  useEffect(() => {
    if (existingMargin) {
      setIsEdit(true);
      form.reset({
        budgetLimit: existingMargin.budgetLimit,
        warningThreshold: existingMargin.warningThreshold,
      });
    } else {
      setIsEdit(false);
      form.reset({
        budgetLimit: 100,
        warningThreshold: 0.8,
      });
    }
  }, [existingMargin, form]);

  // Create or update spending margin
  const saveMarginMutation = useMutation({
    mutationFn: async (data: SpendingMarginForm) => {
      const endpoint = `/api/trips/${tripId}/spending-margin`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/spending-margin`, user?.id] });
      toast({
        title: isEdit ? "Budget Updated" : "Budget Set",
        description: isEdit 
          ? "Your spending limit has been updated successfully."
          : "Your personal spending limit has been set successfully.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was an error saving your spending limit. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete spending margin
  const deleteMarginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/trips/${tripId}/spending-margin`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/spending-margin`] });
      toast({
        title: "Budget Removed",
        description: "Your spending limit has been removed successfully.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was an error removing your spending limit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SpendingMarginForm) => {
    saveMarginMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to remove your spending limit?")) {
      deleteMarginMutation.mutate();
    }
  };

  const warningThreshold = form.watch("warningThreshold");
  const budgetLimit = form.watch("budgetLimit");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            {isEdit ? "Update Spending Limit" : "Set Spending Limit"}
          </DialogTitle>
          <DialogDescription>
            Set a personal spending limit for this trip. You'll receive notifications when you approach or exceed your budget.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-500">
            Loading current settings...
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="budgetLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Limit ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warningThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warning Threshold ({Math.round(warningThreshold * 100)}%)</FormLabel>
                    <FormControl>
                      <div className="px-3">
                        <Slider
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          max={1}
                          min={0.1}
                          step={0.05}
                          className="py-4"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>10%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </FormControl>
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        You'll get notified when you spend ${Math.round(budgetLimit * warningThreshold)} or more
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex justify-between">
                <div>
                  {isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleteMarginMutation.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      {deleteMarginMutation.isPending ? "Removing..." : "Remove Limit"}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMarginMutation.isPending}>
                    {saveMarginMutation.isPending 
                      ? (isEdit ? "Updating..." : "Setting...") 
                      : (isEdit ? "Update" : "Set Limit")
                    }
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}