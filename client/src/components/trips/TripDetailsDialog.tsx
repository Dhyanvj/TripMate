import { Trip } from "@shared/schema";
import { formatDateRange } from "@/lib/utils";
import { Copy, CalendarIcon, MapPin, FileText, Ticket, EyeOff } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TripDetailsDialogProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TripDetailsDialog = ({ trip, open, onOpenChange }: TripDetailsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mutation to hide a trip
  const hideTripMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trips/${trip.id}/hide`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Hidden",
        description: "This trip has been hidden from your main view.",
        variant: "default",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      onOpenChange(false); // Close the dialog
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to hide trip. Please try again.",
        variant: "destructive",
      });
      console.error("Error hiding trip:", error);
    },
  });
  
  const handleHideTrip = () => {
    hideTripMutation.mutate();
  };
  
  const copyInviteCode = () => {
    if (trip.inviteCode) {
      navigator.clipboard.writeText(trip.inviteCode);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{trip.name}</DialogTitle>
          <DialogDescription>
            {trip.isPast ? (
              <span className="inline-block mt-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full">
                Past Trip
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
          {/* Date Range */}
          <div className="flex">
            <CalendarIcon className="h-5 w-5 mr-3 text-primary-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDateRange(trip.startDate, trip.endDate) || "No dates set"}
              </p>
            </div>
          </div>
          
          {/* Location */}
          <div className="flex">
            <MapPin className="h-5 w-5 mr-3 text-primary-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Location</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {trip.location || "No location set"}
              </p>
            </div>
          </div>
          
          {/* Description */}
          {trip.description && (
            <div className="flex">
              <FileText className="h-5 w-5 mr-3 text-primary-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {trip.description}
                </p>
              </div>
            </div>
          )}
          
          {/* Invite Code */}
          <Separator className="my-2" />
          <div className="flex">
            <Ticket className="h-5 w-5 mr-3 text-primary-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Invite Code</p>
              <div className="flex mt-1">
                <div className="flex-1 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded px-3 py-1.5 font-mono text-sm">
                  {trip.inviteCode}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="ml-2 h-9"
                  onClick={copyInviteCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleHideTrip}
            className="flex items-center gap-1 md:flex hidden" 
            disabled={hideTripMutation.isPending}
          >
            <EyeOff className="h-4 w-4" />
            <span>Hide Trip</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TripDetailsDialog;