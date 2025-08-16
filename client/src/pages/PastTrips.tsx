import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { 
  ChevronLeft, 
  Calendar, 
  FilterIcon, 
  Clock, 
  Search, 
  SortDesc, 
  SortAsc,
  ArrowLeftIcon,
  ListFilter,
  MapPin
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import TripCard from "@/components/trips/TripCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function PastTrips() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "az" | "za">("newest");
  
  // Fetch all trips for the user
  const { data: trips, isLoading, error } = useQuery<Trip[]>({
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
  
  // Filter past trips only
  const pastTrips = trips?.filter(trip => trip.isPast === true) || [];
  
  // Apply search filter
  const filteredTrips = pastTrips.filter(trip => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.name.toLowerCase().includes(query) ||
      (trip.location && trip.location.toLowerCase().includes(query)) ||
      (trip.description && trip.description.toLowerCase().includes(query))
    );
  });
  
  // Function to safely convert date string to timestamp
  const getDateTimestamp = (dateString: string | null | undefined): number => {
    if (!dateString) return Date.now();
    return new Date(dateString).getTime();
  };

  // Apply sorting
  const sortedTrips = [...filteredTrips].sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return getDateTimestamp(b.endDate) - getDateTimestamp(a.endDate);
      case "oldest":
        return getDateTimestamp(a.endDate) - getDateTimestamp(b.endDate);
      case "az":
        return a.name.localeCompare(b.name);
      case "za":
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Redirect to home if user is not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  return (
    <div className="container px-4 py-6 pb-36 mx-auto page-with-bottom-nav w-full h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Past Trips</h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>View all your completed trips</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-2 md:mt-0">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
            <Input
              type="search"
              placeholder="Search past trips..."
              className="pl-9 w-full sm:w-[200px] md:w-[250px] lg:w-[300px] bg-background border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as any)}
          >
            <SelectTrigger className="w-full sm:w-[140px] bg-background border-border">
              <div className="flex items-center">
                <ListFilter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <div className="flex items-center">
                  <SortDesc className="mr-2 h-4 w-4" />
                  <span>Newest first</span>
                </div>
              </SelectItem>
              <SelectItem value="oldest">
                <div className="flex items-center">
                  <SortAsc className="mr-2 h-4 w-4" />
                  <span>Oldest first</span>
                </div>
              </SelectItem>
              <SelectItem value="az">
                <div className="flex items-center">
                  <SortAsc className="mr-2 h-4 w-4" />
                  <span>A to Z</span>
                </div>
              </SelectItem>
              <SelectItem value="za">
                <div className="flex items-center">
                  <SortDesc className="mr-2 h-4 w-4" />
                  <span>Z to A</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="bg-primary/10 p-4 rounded-lg mb-6 border border-primary/20">
        <div className="flex items-start">
          <div className="mr-3 mt-1 flex-shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--foreground)', opacity: '0.8' }}>
              Past trips include all trips where the end date has passed or you've manually marked as completed. You can still access all data and memories from these trips.
            </p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        // Loading skeleton
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-60 sm:h-64 bg-card rounded-xl shadow-sm border border-border animate-pulse" role="status" aria-label="Loading trip data">
              <div className="h-28 sm:h-32 bg-muted rounded-t-xl"></div>
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="h-4 sm:h-5 bg-muted rounded w-2/3"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-1/2"></div>
                <div className="flex justify-between mt-2 sm:mt-4">
                  <div className="flex space-x-1">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-muted"></div>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-muted"></div>
                  </div>
                  <div className="h-3 sm:h-4 bg-muted rounded w-1/4"></div>
                </div>
              </div>
              <span className="sr-only">Loading trips...</span>
            </div>
          ))}
        </div>
      ) : sortedTrips.length > 0 ? (
        // Display past trips
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedTrips.map((trip) => (
            <TripCard 
              key={trip.id} 
              trip={trip} 
              isPast={true}
            />
          ))}
        </div>
      ) : (
        // No past trips found
        <Card className="shadow-md bg-card border-border">
          <CardContent className="pt-8 pb-8 sm:pt-10 sm:pb-10 flex flex-col items-center justify-center px-4 sm:px-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 shadow-sm">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center" style={{ color: 'var(--foreground)' }}>No Past Trips</h3>
            <p className="text-sm sm:text-base text-center max-w-md mb-5 sm:mb-6" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
              {searchQuery ? 
                `No past trips matching "${searchQuery}"` : 
                "You don't have any past trips yet. Your completed trips will appear here."
              }
            </p>
            <Button 
              onClick={() => navigate("/")} 
              variant="outline"
              className="shadow-sm bg-background border-border text-sm sm:text-base"
              style={{ color: 'var(--foreground)' }}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}