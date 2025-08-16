import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { formatDateRange, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { websocketService } from "@/lib/websocketService";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  FileText, 
  Share2, 
  Copy, 
  Edit, 
  Clock, 
  RefreshCw,
  ChevronRight,
  Trash2,
  ShoppingCart,
  DollarSign,
  Briefcase,
  MessageSquare,
  ArrowLeft,
  Eye,
  EyeOff,
  Target
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// UI Components
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import GroceryList from "@/components/trips/grocery/GroceryList";
import ExpenseList from "@/components/trips/expenses/ExpenseList";
import PackingList from "@/components/trips/packing/PackingList";
import TripChat from "@/components/trips/chat/TripChat";
import EditTripModal from "@/components/trips/EditTripModal";
import TripDetailsDialog from "@/components/trips/TripDetailsDialog";
import SpendingMarginDialog from "@/components/trips/SpendingMarginDialog";

type TabType = "grocery" | "expenses" | "packing" | "chat";

// Component to show truncated description with "Read More" option in a dialog
interface DescriptionWithReadMoreProps {
  description: string;
}

const DescriptionWithReadMore = ({ description }: DescriptionWithReadMoreProps) => {
  const [showDialog, setShowDialog] = useState(false);
  
  // Function to get the first two words of the description
  const getTruncatedDescription = (text: string) => {
    const words = text.split(/\s+/);
    return words.slice(0, 2).join(' ') + (words.length > 2 ? '...' : '');
  };
  
  return (
    <>
      <span className="text-xs sm:text-sm" style={{ color: 'var(--foreground)' }}>
        {getTruncatedDescription(description)}{' '}
        {description.split(/\s+/).length > 2 && (
          <Button 
            variant="link" 
            className="p-0 h-5 sm:h-6 text-xs sm:text-sm text-primary-600 dark:text-primary-400 font-medium"
            onClick={() => setShowDialog(true)}
          >
            Read More
            <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-0.5 inline" />
          </Button>
        )}
      </span>

      {/* Description Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md max-w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-400 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Trip Description
            </DialogTitle>
          </DialogHeader>
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-700 shadow-inner">
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{description}</p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowDialog(false)}
              className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
              size="sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Main TripDetail component
const TripDetail = () => {
  const [match, params] = useRoute<{ id: string }>("/trips/:id");
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("grocery");
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPastDialog, setShowPastDialog] = useState(false);
  const [showDatesDialog, setShowDatesDialog] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showTripDetailsDialog, setShowTripDetailsDialog] = useState(false);
  const [showSpendingMarginDialog, setShowSpendingMarginDialog] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  if (!match || !params?.id) {
    navigate("/");
    return null;
  }

  const tripId = parseInt(params.id);
  
  // Mutation for updating trip dates
  const updateDatesMutation = useMutation({
    mutationFn: async () => {
      // Use UTC noon to prevent timezone issues
      const formattedStartDate = startDate ? new Date(
        Date.UTC(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          12, 0, 0
        )
      ).toISOString() : null;
      
      const formattedEndDate = endDate ? new Date(
        Date.UTC(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          12, 0, 0
        )
      ).toISOString() : null;
      
      console.log('Sending trip update with dates:', {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
      
      const res = await apiRequest("PATCH", `/api/trips/${tripId}`, {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Dates Updated",
        description: "Trip dates have been updated successfully.",
        variant: "default",
      });
      setShowDatesDialog(false);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update trip dates. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating trip dates:", error);
    },
  });

  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    if (!tripId || !user?.id) return;

    // Register this component as using the WebSocket connection
    websocketService.registerConnection();
    
    // Authenticate with the WebSocket server
    websocketService.send('auth', { userId: user.id });
    
    // Join the trip's WebSocket room for notifications
    websocketService.send('join_trip', { tripId: parseInt(tripId.toString()) });
    
    console.log(`Joined WebSocket notification channel for trip ${tripId}`);
    
    return () => {
      // Clean up WebSocket connection when component unmounts
      websocketService.deregisterConnection();
    };
  }, [tripId, user?.id]);

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId,
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch trip details");
      }
      const tripData = await response.json();
      
      // Debug logs for trip date format and isPast status investigation
      console.log('Trip detail data:', tripData);
      console.log('Trip startDate:', tripData.startDate);
      console.log('Trip startDate type:', typeof tripData.startDate);
      console.log('Trip endDate:', tripData.endDate);
      console.log('Trip endDate type:', typeof tripData.endDate);
      console.log('Trip isPast:', tripData.isPast);
      console.log('Trip isPast type:', typeof tripData.isPast);
      
      return tripData;
    },
  });

  // Mutation for marking trip as past
  const markAsPastMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/trips/${tripId}/mark-past`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Marked as Past",
        description: "This trip has been saved to your past trips.",
        variant: "default",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      // Instead of navigating away, refresh the current trip data to show updated status
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark trip as past. Please try again.",
        variant: "destructive",
      });
      console.error("Error marking trip as past:", error);
    },
  });
  
  // Mutation for unmarking trip as past (restore to active)
  const unmarkPastMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/trips/${tripId}/unmark-past`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Restored to Active",
        description: "This trip has been moved back to your active trips.",
        variant: "default",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore trip to active. Please try again.",
        variant: "destructive",
      });
      console.error("Error unmarking trip as past:", error);
    },
  });

  // Mutation for deleting trip
  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/trips/${tripId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Deleted",
        description: "The trip has been permanently deleted.",
        variant: "default",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete trip. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting trip:", error);
    },
  });
  
  // Mutation for hiding a trip
  const hideTripMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trips/${tripId}/hide`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Hidden",
        description: "This trip has been hidden from your dashboard.",
        variant: "default",
      });
      
      // Update the cache immediately to remove this trip from visible trips
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/hidden"] });
      
      // Force redirect to dashboard to show the updated list
      navigate("/", { replace: true });
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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  // Use Effect to initialize date fields when trip data is loaded
  useEffect(() => {
    if (trip) {
      if (trip.startDate) {
        setStartDate(new Date(trip.startDate));
      }
      if (trip.endDate) {
        setEndDate(new Date(trip.endDate));
      }
    }
  }, [trip]);

  const handleShareTrip = () => {
    if (trip) {
      const shareText = `Join my trip "${trip.name}" with code: ${trip.inviteCode}`;
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          toast({
            title: "Invite Code Copied!",
            description: `Invite code: ${trip.inviteCode}`,
            variant: "default",
          });
        })
        .catch((err) => {
          toast({
            title: "Failed to copy invite code",
            description: "Please try again or copy it manually",
            variant: "destructive",
          });
          console.error("Failed to copy: ", err);
        });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
          <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
          <p className="text-gray-600 mb-4">
            The trip you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <button
            onClick={handleBackToDashboard}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
