import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trip } from "@shared/schema";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

// UI Components
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

const EditTripModal = ({ isOpen, onClose, trip }: EditTripModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Reset form when modal opens with trip data
  useEffect(() => {
    if (trip) {
      setName(trip.name || "");
      setDescription(trip.description || "");
      setLocation(trip.location || "");
      
      if (trip.startDate) {
        setStartDate(new Date(trip.startDate));
      } else {
        setStartDate(undefined);
      }
      
      if (trip.endDate) {
        setEndDate(new Date(trip.endDate));
      } else {
        setEndDate(undefined);
      }
    }
  }, [trip, isOpen]);
  
  // Trip update mutation
  const updateTripMutation = useMutation({
    mutationFn: async () => {
      if (!trip) return null;
      
      // Format dates to avoid timezone issues
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
      
      const res = await apiRequest("PATCH", `/api/trips/${trip.id}`, {
        name,
        description,
        location,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Updated",
        description: "Your trip has been updated successfully.",
        variant: "default",
      });
      
      // Close modal and refresh data
      onClose();
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${trip?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update trip. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating trip:", error);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a trip name.",
        variant: "destructive",
      });
      return;
    }
    
    updateTripMutation.mutate();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <i className="ri-edit-line text-primary-600"></i> Edit Trip
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Trip Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Beach Vacation"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Destination</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Miami, Florida"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your trip"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    fromDate={startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={updateTripMutation.isPending}
            >
              {updateTripMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTripModal;