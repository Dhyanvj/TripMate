import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import TripCard from "@/components/trips/TripCard";
import QuickActions from "@/components/trips/QuickActions";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  PlusIcon, 
  Loader2, 
  Info, 
  Calendar,
  Map,
  ArrowRight as ArrowRightIcon,
  Eye,
  EyeOff
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const Dashboard = () => {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewUser, setIsNewUser] = useState(false);
  const [showHiddenTrips, setShowHiddenTrips] = useState(false);
  const queryClient = useQueryClient();
  
  // Function to dismiss welcome banner
  const dismissWelcome = () => {
    setIsNewUser(false);
  };
  
  // Fetch user's trips
  const { data: trips, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      const response = await fetch(`/api/trips?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      return response.json();
    }
  });
  
  // Fetch hidden trips
  const { data: hiddenTrips, isLoading: hiddenTripsLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips/hidden', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      const response = await fetch('/api/trips/hidden');
      if (!response.ok) {
        throw new Error('Failed to fetch hidden trips');
      }
      return response.json();
    }
  });
  
  // Mutation to unhide a trip
  const unhideTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const res = await apiRequest("POST", `/api/trips/${tripId}/unhide`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Unhidden",
        description: "The trip has been restored to your dashboard.",
        variant: "default",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips/hidden', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unhide trip. Please try again.",
        variant: "destructive",
      });
      console.error("Error unhiding trip:", error);
    },
  });
  
  const handleNewTrip = () => {
    navigate('/create-trip');
  };
  
  // Get list of hidden trip IDs
  const hiddenTripIds = hiddenTrips?.map(trip => trip.id) || [];
  
  // Filter trips to separate active and past trips
  // If showHiddenTrips is true, include hidden trips, otherwise exclude them
  const activeTrips = trips?.filter(trip => {
    if (!trip.isPast) {
      return showHiddenTrips ? true : !hiddenTripIds.includes(trip.id);
    }
    return false;
  }) || [];
  
  const pastTrips = trips?.filter(trip => {
    if (trip.isPast) {
      return showHiddenTrips ? true : !hiddenTripIds.includes(trip.id);
    }
    return false;
  }) || [];
  
  // Check if user is new (no trips yet)
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    // Show welcome banner for new users or if no trips exist
    if (!hasSeenWelcome || (trips && trips.length === 0)) {
      setIsNewUser(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, [trips]);
  
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      {/* Mobile Dashboard Header */}
      <div className="md:hidden mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.displayName || 'Traveler'}</p>
      </div>
      
      {/* Desktop Header with Actions */}
      <div className="hidden md:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Trips</h1>
          <p className="text-muted-foreground mt-1">Plan, organize, and enjoy your travels</p>
        </div>
        <div className="flex space-x-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => navigate('/join-trip')} 
                  variant="outline"
                  size="lg"
                  className="inline-flex items-center gap-2"
                  aria-label="Join an existing trip using an invite code"
                >
                  <i className="ri-link-m text-base"></i>
                  <span>Join Trip</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Join an existing trip using an invite code</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleNewTrip} 
                  size="lg"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90"
                  aria-label="Create a new trip"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>New Trip</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create a new trip from scratch</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Welcome Banner for New Users */}
      {isNewUser && (
        <Card className="mb-8 border-primary-300 dark:border-primary-400 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 shadow-md relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 p-1.5">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 rounded-full p-0 hover:bg-primary-100 dark:hover:bg-primary-800/50 text-gray-700 dark:text-gray-200" 
              onClick={dismissWelcome}
              aria-label="Dismiss welcome message"
            >
              ×
            </Button>
          </div>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <span className="text-gradient font-bold dark:text-primary-300">Welcome to TripMate!</span>
            </CardTitle>
            <CardDescription className="text-base md:text-lg text-gray-700 dark:text-gray-200">
              Your all-in-one solution for stress-free group travel planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary-400/20 flex items-center justify-center text-primary-600 dark:text-primary-300 shrink-0 shadow-sm">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Create a Trip</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Start by creating your first trip or joining one</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary-400/20 flex items-center justify-center text-primary-600 dark:text-primary-300 shrink-0 shadow-sm">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Plan Together</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Manage grocery lists, expenses and packing items</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary-400/20 flex items-center justify-center text-primary-600 dark:text-primary-300 shrink-0 shadow-sm">
                  <i className="ri-group-line text-lg"></i>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Travel Stress-Free</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Enjoy your journey with everything organized</p>
                </div>
              </div>
            </div>
            
            {/* Information footer */}
            <div className="mt-6 border-t border-primary-100 dark:border-primary-800 pt-5 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Use the buttons at the top of the page to create or join your first trip
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Trips Section */}
      <section className="mb-10" aria-labelledby="active-trips-heading">
        <div className="flex items-center justify-between mb-5">
          <h2 id="active-trips-heading" className="text-xl font-bold flex items-center gap-2">
            <Badge variant="default" className="bg-green-600 hover:bg-green-500 text-white shadow-sm">Active</Badge>
            <span className="text-foreground dark:text-white">Trips</span>
          </h2>
          
          <div className="flex items-center gap-3">
            {/* More subtle toggle for hidden trips */}
            {hiddenTrips && hiddenTrips.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                    {hiddenTrips.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[0.6rem] text-white">{hiddenTrips.length}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    className="flex justify-between cursor-pointer"
                    onClick={() => setShowHiddenTrips(!showHiddenTrips)}
                  >
                    <span>{showHiddenTrips ? "Hide Hidden Trips" : "Show Hidden Trips"}</span>
                    {showHiddenTrips ? <EyeOff className="h-4 w-4 ml-2" /> : <Eye className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Mobile Create Trip Button */}
            <div className="md:hidden">
              <Button 
                onClick={handleNewTrip} 
                size="sm"
                className="inline-flex items-center gap-1 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 shadow-md border border-blue-500 dark:border-blue-500 font-medium px-3"
                aria-label="Create new trip"
              >
                <PlusIcon className="h-4 w-4" />
                <span>New</span>
              </Button>
            </div>
          </div>
        </div>
        
        {tripsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-card dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 animate-pulse" role="status" aria-label="Loading trip data">
                <div className="h-32 bg-muted dark:bg-slate-700 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-muted dark:bg-slate-700 rounded w-2/3"></div>
                  <div className="h-4 bg-muted dark:bg-slate-700 rounded w-1/2"></div>
                  <div className="flex justify-between mt-4">
                    <div className="flex space-x-1">
                      <div className="w-7 h-7 rounded-full bg-muted dark:bg-slate-700"></div>
                      <div className="w-7 h-7 rounded-full bg-muted dark:bg-slate-700"></div>
                    </div>
                    <div className="h-4 bg-muted dark:bg-slate-700 rounded w-1/4"></div>
                  </div>
                </div>
                <span className="sr-only">Loading trips...</span>
              </div>
            ))}
          </div>
        ) : activeTrips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <Card className="shadow-sm border-gray-200 dark:border-slate-700 dark:bg-slate-800">
            <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-primary/15 dark:bg-primary-400/20 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 shadow-sm">
                <i className="ri-map-pin-line text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground dark:text-white">No Active Trips</h3>
              <p className="text-center max-w-md font-medium" style={{ color: 'var(--foreground)' }}>
                Use the buttons at the top of the page to create a new trip or join an existing one with an invite code
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Past Trips Section - Only show if there are past trips */}
      {pastTrips.length > 0 && (
        <section className="mb-10 past-trips-section" aria-labelledby="past-trips-heading">
          <div className="flex justify-between items-center mb-5">
            <h2 id="past-trips-heading" className="text-xl font-bold flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500 text-amber-600 dark:border-amber-300 dark:text-amber-300 font-medium shadow-sm">Past</Badge>
              <span className="text-foreground dark:text-white">Trips</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500 dark:text-gray-300 ml-1 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Trips that have ended or were marked as past</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h2>
            
            {pastTrips.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => navigate("/past-trips")}
                className="text-sm flex items-center gap-1.5 border-amber-200 hover:border-amber-300 dark:border-amber-900 dark:hover:border-amber-800 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 shadow-sm"
              >
                <span className="text-amber-800 dark:text-amber-300 font-medium">View All</span>
                <ArrowRightIcon className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Only show up to 2 most recent past trips on dashboard */}
            {pastTrips
              .slice(0, 2)
              .map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  isPast={true}
                />
              ))
            }
          </div>
        </section>
      )}
      
      {/* Hidden Trips Section - Only show if toggle is on */}
      {showHiddenTrips && (
        <section className="mb-10 hidden-trips-section" aria-labelledby="hidden-trips-heading">
          <div className="flex justify-between items-center mb-5">
            <h2 id="hidden-trips-heading" className="text-xl font-bold flex items-center gap-2">
              <Badge variant="outline" className="border-gray-500 text-gray-600 dark:border-gray-300 dark:text-gray-300 font-medium shadow-sm">Hidden</Badge>
              <span className="text-foreground dark:text-white">Trips</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500 dark:text-gray-300 ml-1 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Trips you've chosen to hide from your main view</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h2>
          </div>
          
          {hiddenTripsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="h-64 bg-card dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 animate-pulse" role="status" aria-label="Loading trip data">
                  <div className="h-32 bg-muted dark:bg-slate-700 rounded-t-xl"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-muted dark:bg-slate-700 rounded w-2/3"></div>
                    <div className="h-4 bg-muted dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="flex justify-between mt-4">
                      <div className="flex space-x-1">
                        <div className="w-7 h-7 rounded-full bg-muted dark:bg-slate-700"></div>
                        <div className="w-7 h-7 rounded-full bg-muted dark:bg-slate-700"></div>
                      </div>
                      <div className="h-4 bg-muted dark:bg-slate-700 rounded w-1/4"></div>
                    </div>
                  </div>
                  <span className="sr-only">Loading trips...</span>
                </div>
              ))}
            </div>
          ) : (hiddenTrips && hiddenTrips.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hiddenTrips.map((trip) => (
                <div key={trip.id} className="relative group">
                  <TripCard trip={trip} isPast={trip.isPast} />
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-gray-900 dark:text-white border border-gray-200 dark:border-slate-500"
                      onClick={() => unhideTripMutation.mutate(trip.id)}
                      disabled={unhideTripMutation.isPending}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span>Unhide</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="shadow-sm border-gray-200 dark:border-slate-700 dark:bg-slate-800">
              <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 mb-4 shadow-sm">
                  <EyeOff className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground dark:text-white">No Hidden Trips</h3>
                <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">
                  You haven't hidden any trips yet. To hide a trip, open a trip and select "Hide Trip" from the menu.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
      
      {/* Quick Actions Section */}
      <QuickActions onNewTrip={handleNewTrip} />
    </main>
  );
};

export default Dashboard;
