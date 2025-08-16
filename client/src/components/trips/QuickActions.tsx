import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Plus, Link, Clock, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuickActionsProps {
  onNewTrip: () => void;
}

const QuickActions = ({ onNewTrip }: QuickActionsProps) => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  const handleJoinTrip = () => {
    // Navigate to join trip page
    navigate('/join-trip');
  };
  
  const handlePastTrips = () => {
    // Navigate to the dedicated Past Trips page
    navigate('/past-trips');
  };
  
  const handleTemplates = () => {
    toast({
      title: "Coming Soon",
      description: "Trip templates will be available in the next update.",
    });
  };
  
  return (
    <section className="mb-10" aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="text-xl font-bold mb-5">Quick Actions</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="bg-card dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 flex flex-col items-center justify-center
                  hover:bg-primary/5 hover:border-primary-400/30 dark:hover:border-primary-400/50 transition
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                onClick={onNewTrip}
                aria-label="Create a new trip"
              >
                <div className="w-14 h-14 bg-primary/15 dark:bg-primary-400/20 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 mb-3 shadow-sm">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground dark:text-white">New Trip</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a new trip from scratch</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="bg-card dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 flex flex-col items-center justify-center
                  hover:bg-secondary/5 hover:border-secondary-400/30 dark:hover:border-secondary-400/50 transition
                  focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background"
                onClick={handleJoinTrip}
                aria-label="Join an existing trip with an invite code"
              >
                <div className="w-14 h-14 bg-secondary/15 dark:bg-secondary-400/20 rounded-full flex items-center justify-center text-secondary-600 dark:text-secondary-400 mb-3 shadow-sm">
                  <Link className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground dark:text-white">Join Trip</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Join an existing trip with an invite code</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="bg-card dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 flex flex-col items-center justify-center
                  hover:bg-purple-500/5 hover:border-purple-400/30 dark:hover:border-purple-400/50 transition
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-background"
                onClick={handlePastTrips}
                aria-label="View past trips"
              >
                <div className="w-14 h-14 bg-purple-500/15 dark:bg-purple-400/20 rounded-full flex items-center justify-center text-purple-700 dark:text-purple-400 mb-3 shadow-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground dark:text-white">Past Trips</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View your past trips history</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="bg-card dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 flex flex-col items-center justify-center
                  hover:bg-amber-500/5 hover:border-amber-400/30 dark:hover:border-amber-400/50 transition
                  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background"
                onClick={handleTemplates}
                aria-label="Trip templates (coming soon)"
              >
                <div className="w-14 h-14 bg-amber-500/15 dark:bg-amber-400/20 rounded-full flex items-center justify-center text-amber-700 dark:text-amber-400 mb-3 shadow-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground dark:text-white">Templates</span>
                <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-500 dark:text-white rounded-full font-medium shadow-sm">Soon</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create trips from templates (coming soon)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </section>
  );
};

export default QuickActions;
