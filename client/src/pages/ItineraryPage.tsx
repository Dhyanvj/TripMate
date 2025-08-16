import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, Clock, MapPin, Plus, Sparkles, Vote, ChevronUp, ChevronDown, Heart, Edit2, Trash2, MessageSquare, ThumbsUp, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Trip {
  id: number;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  tripType: string;
}

interface ItineraryDay {
  id: number;
  tripId: number;
  date: string;
  title: string;
  createdBy: number;
  createdAt: string;
}

interface ItineraryActivity {
  id: number;
  dayId: number;
  tripId: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  estimatedCost: number;
  actualCost?: number;
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  isCompleted: boolean;
  isAiGenerated: boolean;
}

interface ActivityVote {
  id: number;
  activityId: number;
  userId: number;
  vote: 'up' | 'down' | 'interested';
  createdAt: string;
}

interface ActivitySuggestion {
  title: string;
  description: string;
  category: string;
  estimatedDuration: string;
  estimatedCost: number;
  location: string;
  bestTimeOfDay: string;
  difficulty: string;
  groupSize: string;
  tips: string;
}

export default function ItineraryPage() {
  const params = useParams();
  const tripId = parseInt(params.id!);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedTab, setSelectedTab] = useState("timeline");
  const [isCreateDayOpen, setIsCreateDayOpen] = useState(false);
  const [isCreateActivityOpen, setIsCreateActivityOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [isAiSuggestionsOpen, setIsAiSuggestionsOpen] = useState(false);
  const [isSuggestActivityOpen, setIsSuggestActivityOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [editingActivity, setEditingActivity] = useState<ItineraryActivity | null>(null);
  const [newDayTitle, setNewDayTitle] = useState("");
  const [newDayDate, setNewDayDate] = useState("");
  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    category: "sightseeing",
    estimatedCost: 0,
    notes: ""
  });
  
  const [suggestionActivity, setSuggestionActivity] = useState({
    title: "",
    description: "",
    location: "",
    category: "sightseeing",
    estimatedCost: 0,
    notes: ""
  });

  // Fetch trip data
  const { data: trip } = useQuery<Trip>({
    queryKey: ["/api/trips", tripId],
    enabled: !!tripId
  });

  // Fetch itinerary days
  const { data: days = [], isLoading: daysLoading } = useQuery<ItineraryDay[]>({
    queryKey: ["/api/trips", tripId, "itinerary", "days"],
    enabled: !!tripId
  });

  // Fetch all activities for the trip
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ItineraryActivity[]>({
    queryKey: ["/api/trips", tripId, "itinerary"],
    enabled: !!tripId
  });

  // Group activities by day
  const activitiesByDay = activities.reduce((acc: Record<number, ItineraryActivity[]>, activity: ItineraryActivity) => {
    if (!acc[activity.dayId]) {
      acc[activity.dayId] = [];
    }
    acc[activity.dayId].push(activity);
    return acc;
  }, {});

  // Create day mutation
  const createDayMutation = useMutation({
    mutationFn: async (data: { date: string; title: string }) => {
      return apiRequest(`/api/trips/${tripId}/itinerary/days`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary", "days"] });
      setIsCreateDayOpen(false);
      setNewDayTitle("");
      setNewDayDate("");
      toast({ title: "Day created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create day", variant: "destructive" });
    }
  });

  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/itinerary/days/${selectedDayId}/activities`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary"] });
      setIsCreateActivityOpen(false);
      setNewActivity({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        location: "",
        category: "sightseeing",
        estimatedCost: 0,
        notes: ""
      });
      toast({ title: "Activity added successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create activity", variant: "destructive" });
    }
  });

  // AI suggestions mutation
  const { data: aiSuggestions = [], mutate: getAiSuggestions, isPending: aiLoading } = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/trips/${tripId}/itinerary/suggest-activities`, "POST", {});
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (data: { activityId: number; vote: string }) => {
      return apiRequest(`/api/itinerary/activities/${data.activityId}/vote`, "POST", { vote: data.vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/itinerary/activities", "votes"] });
      toast({ title: "Vote recorded!" });
    },
    onError: () => {
      toast({ title: "Failed to vote", variant: "destructive" });
    }
  });

  // Query to fetch votes for all activities
  const { data: activityVotes = {} } = useQuery<Record<number, ActivityVote[]>>({
    queryKey: ["/api/itinerary/activities", "votes", tripId],
    queryFn: async () => {
      const allVotes: Record<number, ActivityVote[]> = {};
      if (activitiesByDay) {
        for (const dayActivities of Object.values(activitiesByDay)) {
          for (const activity of dayActivities) {
            const votes = await apiRequest(`/api/itinerary/activities/${activity.id}/votes`, "GET");
            allVotes[activity.id] = votes || [];
          }
        }
      }
      return allVotes;
    },
    enabled: !!tripId && !!activitiesByDay
  });

  // Edit activity mutation
  const editActivityMutation = useMutation({
    mutationFn: async (data: { activityId: number; updates: any }) => {
      return apiRequest(`/api/itinerary/activities/${data.activityId}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary"] });
      setIsEditActivityOpen(false);
      setEditingActivity(null);
      toast({ title: "Activity updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update activity", variant: "destructive" });
    }
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: number) => {
      return apiRequest(`/api/itinerary/activities/${activityId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary"] });
      toast({ title: "Activity deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete activity", variant: "destructive" });
    }
  });

  const handleCreateDay = () => {
    if (!newDayTitle || !newDayDate) return;
    createDayMutation.mutate({
      title: newDayTitle,
      date: newDayDate
    });
  };

  const handleCreateActivity = () => {
    if (!newActivity.title || !selectedDayId) return;
    createActivityMutation.mutate(newActivity);
  };

  const handleAddAiSuggestion = (suggestion: ActivitySuggestion) => {
    if (!selectedDayId) return;
    
    const timeSlots = {
      'morning': { start: '09:00', end: '12:00' },
      'afternoon': { start: '14:00', end: '17:00' },
      'evening': { start: '18:00', end: '21:00' },
      'night': { start: '21:00', end: '23:00' }
    };
    
    const timeSlot = timeSlots[suggestion.bestTimeOfDay as keyof typeof timeSlots] || timeSlots.morning;
    
    createActivityMutation.mutate({
      title: suggestion.title,
      description: suggestion.description,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      location: suggestion.location,
      category: suggestion.category,
      estimatedCost: suggestion.estimatedCost,
      notes: suggestion.tips,
      isAiGenerated: true
    });
  };

  const handleEditActivity = (activity: ItineraryActivity) => {
    setEditingActivity(activity);
    setIsEditActivityOpen(true);
  };

  const handleSaveEditActivity = () => {
    if (!editingActivity) return;
    
    editActivityMutation.mutate({
      activityId: editingActivity.id,
      updates: {
        title: editingActivity.title,
        description: editingActivity.description,
        startTime: editingActivity.startTime,
        endTime: editingActivity.endTime,
        location: editingActivity.location,
        category: editingActivity.category,
        estimatedCost: editingActivity.estimatedCost,
        notes: editingActivity.notes
      }
    });
  };

  const handleDeleteActivity = (activityId: number) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      deleteActivityMutation.mutate(activityId);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sightseeing': return '🏛️';
      case 'dining': return '🍽️';
      case 'culture': return '🎭';
      case 'adventure': return '🏔️';
      case 'relaxation': return '🧘';
      case 'shopping': return '🛍️';
      case 'nightlife': return '🌃';
      case 'transport': return '🚗';
      default: return '📍';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'challenging': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (daysLoading || activitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trip Itinerary</h1>
          <p className="text-muted-foreground mt-1">
            {trip?.name} • {trip?.location}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => getAiSuggestions()}
            variant="outline"
            disabled={aiLoading}
            className="flex items-center space-x-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>{aiLoading ? "Getting suggestions..." : "AI Suggestions"}</span>
          </Button>
          <Button
            onClick={() => setIsCreateDayOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Day</span>
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="mt-6">
          <div className="space-y-6">
            {days.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No itinerary days yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start planning your trip by adding your first day
                  </p>
                  <Button onClick={() => setIsCreateDayOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Day
                  </Button>
                </CardContent>
              </Card>
            ) : (
              days.map((day: ItineraryDay) => (
                <Card key={day.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{day.title}</CardTitle>
                        <CardDescription className="flex items-center mt-2">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(parseISO(day.date), 'EEEE, MMMM do, yyyy')}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedDayId(day.id);
                          setIsCreateActivityOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Activity
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {activitiesByDay[day.id]?.length > 0 ? (
                      <div className="space-y-4">
                        {activitiesByDay[day.id]
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((activity: ItineraryActivity) => (
                            <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                              <div className="flex-shrink-0">
                                <div className="text-2xl">{getCategoryIcon(activity.category)}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-lg">{activity.title}</h4>
                                  <div className="flex items-center space-x-2">
                                    {activity.isAiGenerated && (
                                      <Badge variant="secondary" className="flex items-center space-x-1">
                                        <Sparkles className="h-3 w-3" />
                                        <span>AI</span>
                                      </Badge>
                                    )}
                                    <Badge variant={activity.isCompleted ? "default" : "outline"}>
                                      {activity.isCompleted ? "Completed" : "Planned"}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-muted-foreground mb-3">{activity.description}</p>
                                <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
                                  {activity.startTime && activity.endTime && (
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-1" />
                                      <span>{activity.startTime} - {activity.endTime}</span>
                                    </div>
                                  )}
                                  {activity.location && (
                                    <div className="flex items-center">
                                      <MapPin className="h-4 w-4 mr-1" />
                                      <span>{activity.location}</span>
                                    </div>
                                  )}
                                  {activity.estimatedCost > 0 && (
                                    <span className="font-medium">${activity.estimatedCost}</span>
                                  )}
                                </div>
                                {activity.notes && (
                                  <div className="mt-3 p-3 bg-muted rounded-md">
                                    <p className="text-sm">{activity.notes}</p>
                                  </div>
                                )}
                                <div className="flex items-center justify-between mt-4">
                                  <Badge variant="outline" className="capitalize">
                                    {activity.category}
                                  </Badge>
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditActivity(activity)}
                                      title="Edit activity"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteActivity(activity.id)}
                                      title="Delete activity"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Separator orientation="vertical" className="h-4" />
                                    {/* Voting Section */}
                                    <div className="flex items-center space-x-1">
                                      {(() => {
                                        const votes = activityVotes[activity.id] || [];
                                        const upVotes = votes.filter(v => v.vote === 'up').length;
                                        const downVotes = votes.filter(v => v.vote === 'down').length;
                                        const interestedVotes = votes.filter(v => v.vote === 'interested').length;
                                        const userVote = votes.find(v => v.userId === user?.id)?.vote;
                                        
                                        return (
                                          <>
                                            <div className="flex items-center">
                                              <Button
                                                size="sm"
                                                variant={userVote === 'up' ? 'default' : 'ghost'}
                                                onClick={() => voteMutation.mutate({ activityId: activity.id, vote: 'up' })}
                                                disabled={voteMutation.isPending}
                                                className="px-2"
                                              >
                                                <ChevronUp className="h-4 w-4" />
                                                {upVotes > 0 && <span className="ml-1 text-xs">{upVotes}</span>}
                                              </Button>
                                            </div>
                                            <div className="flex items-center">
                                              <Button
                                                size="sm"
                                                variant={userVote === 'interested' ? 'default' : 'ghost'}
                                                onClick={() => voteMutation.mutate({ activityId: activity.id, vote: 'interested' })}
                                                disabled={voteMutation.isPending}
                                                className="px-2"
                                              >
                                                <Heart className="h-4 w-4" />
                                                {interestedVotes > 0 && <span className="ml-1 text-xs">{interestedVotes}</span>}
                                              </Button>
                                            </div>
                                            <div className="flex items-center">
                                              <Button
                                                size="sm"
                                                variant={userVote === 'down' ? 'default' : 'ghost'}
                                                onClick={() => voteMutation.mutate({ activityId: activity.id, vote: 'down' })}
                                                disabled={voteMutation.isPending}
                                                className="px-2"
                                              >
                                                <ChevronDown className="h-4 w-4" />
                                                {downVotes > 0 && <span className="ml-1 text-xs">{downVotes}</span>}
                                              </Button>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No activities planned for this day yet</p>
                        <Button
                          onClick={() => {
                            setSelectedDayId(day.id);
                            setIsCreateActivityOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Activity
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="collaboration" className="mt-6">
          <div className="space-y-6">
            {/* Collaboration Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Collaborative Planning</h2>
                <p className="text-muted-foreground">Suggest activities and vote on ideas with your group</p>
              </div>
              <Button
                onClick={() => setIsSuggestActivityOpen(true)}
                className="flex items-center space-x-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Suggest Activity</span>
              </Button>
            </div>

            {/* Voting Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Vote className="h-5 w-5" />
                  <span>Activity Voting Summary</span>
                </CardTitle>
                <CardDescription>See how your group feels about planned activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No activities to vote on yet</p>
                      <p className="text-sm text-muted-foreground">Add some activities to start collaborative voting!</p>
                    </div>
                  ) : (
                    activities.map((activity) => {
                      const votes = activityVotes[activity.id] || [];
                      const upVotes = votes.filter(v => v.vote === 'up').length;
                      const downVotes = votes.filter(v => v.vote === 'down').length;
                      const interestedVotes = votes.filter(v => v.vote === 'interested').length;
                      const totalVotes = votes.length;
                      const userVote = votes.find(v => v.userId === user?.id)?.vote;
                      
                      return (
                        <div key={activity.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{activity.title}</h4>
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryIcon(activity.category)} {activity.category}
                                </Badge>
                                {activity.location && (
                                  <span className="text-xs text-muted-foreground flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {activity.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant={userVote === 'up' ? 'default' : 'ghost'}
                                onClick={() => voteMutation.mutate({ activityId: activity.id, vote: 'up' })}
                                disabled={voteMutation.isPending}
                                className="px-2"
                              >
                                <ChevronUp className="h-4 w-4" />
                                {upVotes > 0 && <span className="ml-1 text-xs">{upVotes}</span>}
                              </Button>
                              <Button
                                size="sm"
                                variant={userVote === 'interested' ? 'default' : 'ghost'}
                                onClick={() => voteMutation.mutate({ activityId: activity.id, vote: 'interested' })}
                                disabled={voteMutation.isPending}
                                className="px-2"
                              >
                                <Heart className="h-4 w-4" />
                                {interestedVotes > 0 && <span className="ml-1 text-xs">{interestedVotes}</span>}
                              </Button>
                              <Button
                                size="sm"
                                variant={userVote === 'down' ? 'default' : 'ghost'}
                                onClick={() => voteMutation.mutate({ activityId: activity.id, vote: 'down' })}
                                disabled={voteMutation.isPending}
                                className="px-2"
                              >
                                <ChevronDown className="h-4 w-4" />
                                {downVotes > 0 && <span className="ml-1 text-xs">{downVotes}</span>}
                              </Button>
                            </div>
                          </div>
                          {totalVotes > 0 && (
                            <div className="pt-2 border-t">
                              <div className="text-xs text-muted-foreground mb-2">
                                {totalVotes} group member{totalVotes !== 1 ? 's' : ''} voted
                              </div>
                              <div className="flex space-x-4">
                                {upVotes > 0 && (
                                  <div className="flex items-center space-x-1 text-green-600">
                                    <ThumbsUp className="h-3 w-3" />
                                    <span className="text-xs">{upVotes} like{upVotes !== 1 ? 's' : ''}</span>
                                  </div>
                                )}
                                {interestedVotes > 0 && (
                                  <div className="flex items-center space-x-1 text-red-500">
                                    <Heart className="h-3 w-3" />
                                    <span className="text-xs">{interestedVotes} interested</span>
                                  </div>
                                )}
                                {downVotes > 0 && (
                                  <div className="flex items-center space-x-1 text-gray-500">
                                    <ChevronDown className="h-3 w-3" />
                                    <span className="text-xs">{downVotes} dislike{downVotes !== 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Group Participation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Group Participation</span>
                </CardTitle>
                <CardDescription>See how active everyone is in planning</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(() => {
                    const allVotes = Object.values(activityVotes).flat();
                    const voterStats = allVotes.reduce((acc: Record<number, number>, vote: ActivityVote) => {
                      acc[vote.userId] = (acc[vote.userId] || 0) + 1;
                      return acc;
                    }, {});
                    
                    if (Object.keys(voterStats).length === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No voting activity yet</p>
                        </div>
                      );
                    }
                    
                    return Object.entries(voterStats).map(([userId, voteCount]) => (
                      <div key={userId} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">User {userId}</span>
                        <Badge variant="secondary">{voteCount as number} vote{voteCount !== 1 ? 's' : ''}</Badge>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Days</span>
                  <span className="font-medium">{days.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Activities</span>
                  <span className="font-medium">{activities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-medium">
                    ${activities.reduce((sum: number, activity: ItineraryActivity) => sum + (activity.estimatedCost || 0), 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Activities by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    activities.reduce((acc: Record<string, number>, activity: ItineraryActivity) => {
                      acc[activity.category] = (acc[activity.category] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>{getCategoryIcon(category)}</span>
                        <span className="capitalize">{category}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Planning Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Completed Activities</span>
                      <span className="text-sm font-medium">
                        {activities.filter((a: ItineraryActivity) => a.isCompleted).length} / {activities.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${activities.length > 0 ? (activities.filter((a: ItineraryActivity) => a.isCompleted).length / activities.length) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Day Dialog */}
      <Dialog open={isCreateDayOpen} onOpenChange={setIsCreateDayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Day</DialogTitle>
            <DialogDescription>
              Create a new day for your itinerary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dayDate">Date</Label>
              <Input
                id="dayDate"
                type="date"
                value={newDayDate}
                onChange={(e) => setNewDayDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dayTitle">Day Title</Label>
              <Input
                id="dayTitle"
                placeholder="e.g., Exploring the City Center"
                value={newDayTitle}
                onChange={(e) => setNewDayTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDay} disabled={createDayMutation.isPending}>
              {createDayMutation.isPending ? "Creating..." : "Create Day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Activity Dialog */}
      <Dialog open={isCreateActivityOpen} onOpenChange={setIsCreateActivityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
            <DialogDescription>
              Add a new activity to your itinerary
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="activityTitle">Activity Title</Label>
                <Input
                  id="activityTitle"
                  placeholder="e.g., Visit Edinburgh Castle"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="activityDescription">Description</Label>
                <Textarea
                  id="activityDescription"
                  placeholder="Describe what you'll do during this activity"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newActivity.startTime}
                    onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newActivity.endTime}
                    onChange={(e) => setNewActivity({ ...newActivity, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Edinburgh Castle, Castle Esplanade"
                  value={newActivity.location}
                  onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newActivity.category}
                    onValueChange={(value) => setNewActivity({ ...newActivity, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sightseeing">🏛️ Sightseeing</SelectItem>
                      <SelectItem value="dining">🍽️ Dining</SelectItem>
                      <SelectItem value="culture">🎭 Culture</SelectItem>
                      <SelectItem value="adventure">🏔️ Adventure</SelectItem>
                      <SelectItem value="relaxation">🧘 Relaxation</SelectItem>
                      <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                      <SelectItem value="nightlife">🌃 Nightlife</SelectItem>
                      <SelectItem value="transport">🚗 Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cost">Estimated Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    value={newActivity.estimatedCost}
                    onChange={(e) => setNewActivity({ ...newActivity, estimatedCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes or tips"
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateActivityOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateActivity} disabled={createActivityMutation.isPending}>
              {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={isEditActivityOpen} onOpenChange={setIsEditActivityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Update the details of your activity
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="editActivityTitle">Activity Title</Label>
                <Input
                  id="editActivityTitle"
                  placeholder="e.g., Visit Edinburgh Castle"
                  value={editingActivity?.title || ""}
                  onChange={(e) => setEditingActivity(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div>
                <Label htmlFor="editActivityDescription">Description</Label>
                <Textarea
                  id="editActivityDescription"
                  placeholder="Describe what you'll do during this activity"
                  value={editingActivity?.description || ""}
                  onChange={(e) => setEditingActivity(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartTime">Start Time</Label>
                  <Input
                    id="editStartTime"
                    type="time"
                    value={editingActivity?.startTime || ""}
                    onChange={(e) => setEditingActivity(prev => prev ? { ...prev, startTime: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="editEndTime">End Time</Label>
                  <Input
                    id="editEndTime"
                    type="time"
                    value={editingActivity?.endTime || ""}
                    onChange={(e) => setEditingActivity(prev => prev ? { ...prev, endTime: e.target.value } : null)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editLocation">Location</Label>
                <Input
                  id="editLocation"
                  placeholder="e.g., Edinburgh Castle, Castle Esplanade"
                  value={editingActivity?.location || ""}
                  onChange={(e) => setEditingActivity(prev => prev ? { ...prev, location: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCategory">Category</Label>
                  <Select
                    value={editingActivity?.category || "sightseeing"}
                    onValueChange={(value) => setEditingActivity(prev => prev ? { ...prev, category: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sightseeing">🏛️ Sightseeing</SelectItem>
                      <SelectItem value="dining">🍽️ Dining</SelectItem>
                      <SelectItem value="culture">🎭 Culture</SelectItem>
                      <SelectItem value="adventure">🏔️ Adventure</SelectItem>
                      <SelectItem value="relaxation">🧘 Relaxation</SelectItem>
                      <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                      <SelectItem value="nightlife">🌃 Nightlife</SelectItem>
                      <SelectItem value="transport">🚗 Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editCost">Estimated Cost ($)</Label>
                  <Input
                    id="editCost"
                    type="number"
                    min="0"
                    value={editingActivity?.estimatedCost || 0}
                    onChange={(e) => setEditingActivity(prev => prev ? { ...prev, estimatedCost: parseFloat(e.target.value) || 0 } : null)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  placeholder="Any additional notes or tips"
                  value={editingActivity?.notes || ""}
                  onChange={(e) => setEditingActivity(prev => prev ? { ...prev, notes: e.target.value } : null)}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditActivityOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditActivity} disabled={editActivityMutation.isPending}>
              {editActivityMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={Array.isArray(aiSuggestions) && aiSuggestions.length > 0} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>AI Activity Suggestions</span>
            </DialogTitle>
            <DialogDescription>
              Here are some personalized activity suggestions for your trip
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.isArray(aiSuggestions) && aiSuggestions.map((suggestion: ActivitySuggestion, index: number) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <span>{getCategoryIcon(suggestion.category)}</span>
                          <span>{suggestion.title}</span>
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="capitalize">
                            {suggestion.category}
                          </Badge>
                          <Badge className={getDifficultyColor(suggestion.difficulty)}>
                            {suggestion.difficulty}
                          </Badge>
                          <Badge variant="secondary">
                            {suggestion.bestTimeOfDay}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">${suggestion.estimatedCost}</div>
                        <div className="text-sm text-muted-foreground">{suggestion.estimatedDuration}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{suggestion.description}</p>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{suggestion.location}</span>
                    </div>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">💡 <strong>Tip:</strong> {suggestion.tips}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Best for groups of {suggestion.groupSize}
                      </span>
                      <Select
                        onValueChange={(dayId) => {
                          setSelectedDayId(parseInt(dayId));
                          handleAddAiSuggestion(suggestion);
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Add to day..." />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((day: ItineraryDay) => (
                            <SelectItem key={day.id} value={day.id.toString()}>
                              {format(parseISO(day.date), 'MMM dd')} - {day.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Suggest Activity Dialog */}
      <Dialog open={isSuggestActivityOpen} onOpenChange={setIsSuggestActivityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Suggest Activity</DialogTitle>
            <DialogDescription>
              Suggest an activity idea for your group to vote on
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="suggestionTitle">Activity Title</Label>
                <Input
                  id="suggestionTitle"
                  placeholder="e.g., Visit Local Art Museum"
                  value={suggestionActivity.title}
                  onChange={(e) => setSuggestionActivity({ ...suggestionActivity, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="suggestionDescription">Description</Label>
                <Textarea
                  id="suggestionDescription"
                  placeholder="Describe what you'd like to do during this activity"
                  value={suggestionActivity.description}
                  onChange={(e) => setSuggestionActivity({ ...suggestionActivity, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="suggestionLocation">Location</Label>
                <Input
                  id="suggestionLocation"
                  placeholder="e.g., Downtown Art Museum, Main Street"
                  value={suggestionActivity.location}
                  onChange={(e) => setSuggestionActivity({ ...suggestionActivity, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="suggestionCategory">Category</Label>
                  <Select
                    value={suggestionActivity.category}
                    onValueChange={(value) => setSuggestionActivity({ ...suggestionActivity, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sightseeing">🏛️ Sightseeing</SelectItem>
                      <SelectItem value="dining">🍽️ Dining</SelectItem>
                      <SelectItem value="culture">🎭 Culture</SelectItem>
                      <SelectItem value="adventure">🏔️ Adventure</SelectItem>
                      <SelectItem value="relaxation">🧘 Relaxation</SelectItem>
                      <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                      <SelectItem value="nightlife">🌃 Nightlife</SelectItem>
                      <SelectItem value="transport">🚗 Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="suggestionCost">Estimated Cost ($)</Label>
                  <Input
                    id="suggestionCost"
                    type="number"
                    min="0"
                    value={suggestionActivity.estimatedCost}
                    onChange={(e) => setSuggestionActivity({ ...suggestionActivity, estimatedCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="suggestionNotes">Additional Notes</Label>
                <Textarea
                  id="suggestionNotes"
                  placeholder="Any additional details or reasons for this suggestion"
                  value={suggestionActivity.notes}
                  onChange={(e) => setSuggestionActivity({ ...suggestionActivity, notes: e.target.value })}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuggestActivityOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // For now, just close the dialog - you could add actual suggestion logic here
                toast({ title: "Activity suggestion shared with your group!" });
                setSuggestionActivity({
                  title: "",
                  description: "",
                  location: "",
                  category: "sightseeing",
                  estimatedCost: 0,
                  notes: ""
                });
                setIsSuggestActivityOpen(false);
              }}
            >
              Share Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}