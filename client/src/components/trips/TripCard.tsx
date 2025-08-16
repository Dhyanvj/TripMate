import { useLocation } from "wouter";
import { Trip } from "@shared/schema";
import { formatDateRange } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Share2, Users, ChevronRight } from "lucide-react";

interface TripCardProps {
  trip: Trip;
  isPast?: boolean;
}

const TripCard = ({ trip, isPast = false }: TripCardProps) => {
  const [_, navigate] = useLocation();
  
  const handleTripSelect = () => {
    navigate(`/trips/${trip.id}`);
  };
  
  // Generate gradients based on trip type
  const getGradient = (tripType: string | null | undefined) => {
    switch (tripType) {
      case 'beach':
        return 'from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400';
      case 'camping':
        return 'from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-500';
      case 'city':
        return 'from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500';
      case 'road':
        return 'from-red-700 to-red-900 dark:from-red-600 dark:to-red-800';
      default:
        return 'from-primary to-primary-600 dark:from-primary-400 dark:to-primary-500';
    }
  };
  
  // Icon based on trip type
  const getIcon = (tripType: string | null | undefined) => {
    switch (tripType) {
      case 'beach':
        return 'ri-sailboat-line';
      case 'camping':
        return 'ri-mountain-line';
      case 'city':
        return 'ri-building-line';
      case 'road':
        return 'ri-road-map-line';
      default:
        return 'ri-map-pin-line';
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent card click when clicking the invite code
    if ((e.target as HTMLElement).closest('.invite-code-section')) {
      e.stopPropagation();
      return;
    }
    handleTripSelect();
  };

  // Get trip dates display
  const tripDates = formatDateRange(trip.startDate, trip.endDate);

  // Determine card border color based on state
  const cardBorderClass = isPast 
    ? 'border-amber-300 dark:border-amber-400' 
    : 'border-primary/30 dark:border-primary-400/50';

  return (
    <Card 
      className={`rounded-xl overflow-hidden hover:shadow-md transition cursor-pointer ${cardBorderClass} 
        ${isPast ? 'hover:opacity-95' : ''} dark:bg-slate-800`}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTripSelect();
        }
      }}
      aria-label={`${trip.name} trip to ${trip.location || 'unspecified location'}${isPast ? ', past trip' : ''}`}
      role="button"
    >
      <div 
        className={`h-36 bg-gradient-to-r ${
          isPast 
            ? 'from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500' 
            : getGradient(trip.tripType)
        } relative`}
      >
        {/* Large background icon */}
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <i className={`${isPast ? 'ri-time-line' : getIcon(trip.tripType)} text-5xl opacity-50`}></i>
        </div>
        
        {/* Past trip badge */}
        {isPast && (
          <div className="absolute top-0 left-0 p-3">
            <Badge 
              variant="secondary" 
              className="bg-amber-100 text-amber-800 dark:bg-amber-300/90 dark:text-amber-900 border border-amber-200 dark:border-amber-400/50 shadow-sm font-medium gap-1.5 px-2.5 py-1"
            >
              <i className="ri-time-line"></i>
              <span>PAST TRIP</span>
            </Badge>
          </div>
        )}
        
        {/* Active trip badge */}
        {!isPast && (
          <div className="absolute top-0 left-0 p-3">
            <Badge 
              variant="secondary" 
              className="bg-green-100 text-green-800 dark:bg-green-300/90 dark:text-green-900 border border-green-200 dark:border-green-400/50 shadow-sm font-medium gap-1.5 px-2.5 py-1"
            >
              <i className="ri-checkbox-circle-line"></i>
              <span>ACTIVE</span>
            </Badge>
          </div>
        )}
        
        {/* Date badge */}
        <div className="absolute bottom-0 left-0 p-3">
          <Badge 
            variant="secondary" 
            className="bg-white/95 dark:bg-black/80 text-gray-800 dark:text-white shadow-lg gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-white/20"
          >
            <Calendar className="h-3.5 w-3.5 text-gray-600 dark:text-white" />
            <span className="font-medium">{tripDates || 'No dates set'}</span>
          </Badge>
        </div>
        
        {/* Invite code */}
        {trip.inviteCode && (
          <div className="absolute top-0 right-0 p-3">
            <Badge 
              variant="secondary" 
              className="bg-white/95 dark:bg-black/80 text-gray-800 dark:text-white border border-gray-200 dark:border-white/20 invite-code-section h-7 gap-1.5 px-3 py-1 font-medium shadow-lg"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{trip.inviteCode}</span>
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-xl mb-1 text-foreground dark:text-white">{trip.name}</h3>
        <p className="text-foreground/80 dark:text-white/90 text-sm mb-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
          <span>{trip.location || 'No location set'}</span>
        </p>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex -space-x-2" aria-label="Trip members">
            {/* Member avatars - using placeholders for now */}
            <div className="w-8 h-8 rounded-full border-2 border-card dark:border-slate-700 bg-primary/20 dark:bg-primary-400/30 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300">
              TU
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-card dark:border-slate-700 bg-secondary/20 dark:bg-secondary-400/30 flex items-center justify-center text-xs font-medium text-secondary-700 dark:text-secondary-300">
              +1
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors shadow-md text-white font-semibold border border-indigo-400 dark:border-indigo-600">
            <span>View Trip</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TripCard;
