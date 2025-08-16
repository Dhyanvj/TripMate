import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, 
  MapPinIcon, 
  PlaneLandingIcon, 
  PlaneTakeoffIcon, 
  SunIcon, 
  MountainIcon, 
  BuildingIcon, 
  LandmarkIcon, 
  CarIcon, 
  PalmtreeIcon, 
  InfoIcon,
  ArrowLeftIcon,
  Sailboat
} from "lucide-react";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

export default function CreateTrip() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tripForm, setTripForm] = useState({
    name: "",
    location: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    createdById: user?.id,
    tripType: "",
  });

  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  // Trip type options with icons
  const tripTypes = [
    { value: "beach", label: "Beach", icon: <PalmtreeIcon className="h-4 w-4" />, color: "text-blue-500" },
    { value: "city", label: "City", icon: <BuildingIcon className="h-4 w-4" />, color: "text-purple-500" },
    { value: "mountain", label: "Mountain", icon: <MountainIcon className="h-4 w-4" />, color: "text-emerald-500" },
    { value: "road", label: "Road Trip", icon: <CarIcon className="h-4 w-4" />, color: "text-amber-500" },
    { value: "cruise", label: "Cruise", icon: <Sailboat className="h-4 w-4" />, color: "text-cyan-500" },
  ];

  const createTripMutation = useMutation({
    mutationFn: async (tripData: typeof tripForm) => {
      // Format the dates with timezone adjustment to prevent off-by-one errors
      const formattedData = {
        ...tripData,
        // Set the time to noon UTC to avoid timezone offset issues
        startDate: tripData.startDate ? new Date(
          Date.UTC(
            tripData.startDate.getFullYear(),
            tripData.startDate.getMonth(),
            tripData.startDate.getDate(),
            12, 0, 0
          )
        ).toISOString() : null,
        endDate: tripData.endDate ? new Date(
          Date.UTC(
            tripData.endDate.getFullYear(),
            tripData.endDate.getMonth(),
            tripData.endDate.getDate(),
            12, 0, 0
          )
        ).toISOString() : null,
      };
      
      console.log("Creating trip with data:", formattedData);
      const res = await apiRequest("POST", "/api/trips", formattedData);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Trip created successfully:", data);
      
      // Invalidate all trip-related queries to ensure dashboard updates
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      
      // Also invalidate the specific user's trips - exact match with Dashboard query
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/trips', user.id] });
      }
      
      toast({
        title: "Trip created successfully!",
        description: `Your new trip "${data.name}" has been created.`,
      });
      navigate(`/trips/${data.id}`);
    },
    onError: (error: any) => {
      console.error("Trip creation error:", error);
      toast({
        title: "Failed to create trip",
        description: error.message || "Please check your input and try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!tripForm.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a name for your trip.",
        variant: "destructive",
      });
      return;
    }

    // Create trip
    createTripMutation.mutate(tripForm);
  };

  // Get the duration in days
  const getTripDurationInDays = () => {
    if (!tripForm.startDate || !tripForm.endDate) return 0;
    const diffTime = Math.abs(tripForm.endDate.getTime() - tripForm.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include the start day
  };

  return (
    <div className="container px-4 py-4 sm:py-8 mx-auto max-w-4xl overflow-y-auto pb-20">
      <div className="flex items-center mb-4 sm:mb-6 sticky top-0 z-10 bg-background dark:bg-background pt-1 pb-2">
        <Button 
          variant="ghost" 
          className="mr-2 hover:bg-gray-100 dark:hover:bg-slate-800" 
          onClick={() => navigate("/")}
          aria-label="Go back to dashboard"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-white" />
        </Button>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-800" style={{ color: 'var(--foreground)' }}>Create New Trip</h1>
      </div>

      <Card className="border-gray-200 dark:border-slate-700 shadow-md dark:bg-slate-800 overflow-visible">
        <CardHeader className="pb-2 sm:pb-3 border-b border-gray-200 dark:border-slate-700 px-3 sm:px-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-gray-800 text-lg sm:text-xl font-bold" style={{ color: 'var(--foreground)' }}>Trip Details</CardTitle>
              <CardDescription className="text-gray-500 mt-1 text-sm sm:text-base" style={{ color: 'var(--foreground)' }}>
                Create a new trip to start planning with your friends
              </CardDescription>
            </div>
            <div className="flex items-center">
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm text-xs sm:text-sm">New</Badge>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 px-3 sm:px-6">
            {/* Trip name field with tooltip */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="name" className="text-gray-900 font-medium" style={{ color: 'var(--foreground)' }}>
                  Trip Name <span className="text-red-500">*</span>
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0 ml-1.5">
                        <InfoIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-lg">
                      <p>Give your trip a memorable name</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input
                  id="name"
                  placeholder="Summer Beach Vacation"
                  value={tripForm.name}
                  onChange={(e) => setTripForm({ ...tripForm, name: e.target.value })}
                  required
                  className="pl-10 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base sm:text-sm"
                />
                <div className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                  <i className="ri-map-pin-line"></i>
                </div>
              </div>
            </div>

            {/* Trip type selector */}
            <div className="space-y-2">
              <Label htmlFor="tripType" className="text-gray-900 font-medium" style={{ color: 'var(--foreground)' }}>
                Trip Type
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {tripTypes.map((type) => (
                  <TooltipProvider key={type.value}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={tripForm.tripType === type.value ? "default" : "outline"}
                          className={`h-auto py-3 w-full flex flex-col items-center justify-center gap-2 shadow-sm ${
                            tripForm.tripType === type.value 
                              ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:border-blue-700" 
                              : "bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-700"
                          }`}
                          onClick={() => setTripForm({ ...tripForm, tripType: type.value })}
                        >
                          <div className={`text-xl ${tripForm.tripType === type.value ? "text-white" : type.color}`}>
                            {type.icon}
                          </div>
                          <span className={`text-sm ${tripForm.tripType === type.value ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
                            {type.label}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-lg">
                        <p>{type.label} trip</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Location field with tooltip */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="location" className="text-gray-900 font-medium" style={{ color: 'var(--foreground)' }}>
                  Location
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0 ml-1.5">
                        <InfoIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-lg">
                      <p>Where are you going?</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input
                  id="location"
                  placeholder="Miami, FL"
                  value={tripForm.location}
                  onChange={(e) => setTripForm({ ...tripForm, location: e.target.value })}
                  className="pl-10 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base sm:text-sm"
                />
                <div className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                  <MapPinIcon className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Trip dates with visual feedback */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-gray-900 font-medium" style={{ color: 'var(--foreground)' }}>Trip Dates</Label>
                {getTripDurationInDays() > 0 && (
                  <Badge variant="outline" className="border-green-500 text-green-600 dark:border-green-400 dark:text-green-400">
                    {getTripDurationInDays()} day{getTripDurationInDays() !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="startDate" className="text-gray-800 text-sm" style={{ color: 'var(--foreground)' }}>Start Date</Label>
                    <PlaneTakeoffIcon className="h-3.5 w-3.5 text-blue-500 ml-1.5" />
                  </div>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        {tripForm.startDate ? (
                          format(tripForm.startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-lg"
                      align="center"
                      side="bottom"
                      sideOffset={8}
                    >
                      <Calendar
                        mode="single"
                        selected={tripForm.startDate}
                        onSelect={(date) => {
                          if (date) {
                            setTripForm({ ...tripForm, startDate: date });
                            setStartDateOpen(false);
                          }
                        }}
                        initialFocus
                        className="border-t border-gray-200 dark:border-slate-700"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="endDate" className="text-gray-800 text-sm" style={{ color: 'var(--foreground)' }}>End Date</Label>
                    <PlaneLandingIcon className="h-3.5 w-3.5 text-blue-500 ml-1.5" />
                  </div>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        {tripForm.endDate ? (
                          format(tripForm.endDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-lg"
                      align="center"
                      side="bottom"
                      sideOffset={8}
                    >
                      <Calendar
                        mode="single"
                        selected={tripForm.endDate}
                        onSelect={(date) => {
                          if (date) {
                            setTripForm({ ...tripForm, endDate: date });
                            setEndDateOpen(false);
                          }
                        }}
                        initialFocus
                        className="border-t border-gray-200 dark:border-slate-700"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Description field with tooltip */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="description" className="text-gray-900 font-medium" style={{ color: 'var(--foreground)' }}>
                  Description
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0 ml-1.5">
                        <InfoIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-lg">
                      <p>Add important details about your trip</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                id="description"
                placeholder="Share some details about this trip..."
                value={tripForm.description}
                onChange={(e) => setTripForm({ ...tripForm, description: e.target.value })}
                className="min-h-[80px] sm:min-h-[100px] bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base sm:text-sm"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-gray-200 dark:border-slate-700 pt-4 sm:pt-6 px-3 sm:px-6">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => navigate("/")}
              className="border-gray-300 dark:border-slate-600 text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-900 text-sm sm:text-base"
              style={{ color: 'var(--foreground)' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 sm:px-10 shadow-md text-sm sm:text-base"
              disabled={createTripMutation.isPending}
            >
              {createTripMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">
                    <i className="ri-loader-4-line"></i>
                  </span>
                  Creating...
                </>
              ) : (
                "Create Trip"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}