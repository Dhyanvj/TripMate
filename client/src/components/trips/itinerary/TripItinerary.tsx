import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, MapPin, Clock, Edit2, Trash2, ThumbsUp, ThumbsDown, Heart, CheckCircle, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TripItineraryProps {
  tripId: number;
  hasAdminPermissions: boolean;
}

interface ItineraryItem {
  id: number;
  tripId: number;
  day: number;
  time: string;
  title: string;
  description?: string;
  location?: string;
  createdAt: string;
}

interface SuggestionItem extends ItineraryItem {
  isSuggestion: boolean;
  isApproved: boolean;
  createdBy: number;
  votes: VoteItem[];
}

interface VoteItem {
  id: number;
  activityId: number;
  userId: number;
  vote: "up" | "down" | "interested";
  createdAt: string;
}

const TripItinerary = ({ tripId, hasAdminPermissions }: TripItineraryProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState<SuggestionItem | null>(null);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<{title: string, description: string} | null>(null);
  const [newItem, setNewItem] = useState({
    day: 1,
    time: "",
    title: "",
    description: "",
    location: "",
  });
  const [newSuggestion, setNewSuggestion] = useState({
    day: 1,
    time: "",
    title: "",
    description: "",
    location: "",
  });

  // Fetch itinerary items
  const { data: items, isLoading } = useQuery<ItineraryItem[]>({
    queryKey: [`/api/trips/${tripId}/itinerary`],
    enabled: !!tripId,
  });

  // Fetch activity suggestions
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery<SuggestionItem[]>({
    queryKey: [`/api/trips/${tripId}/itinerary/suggestions`],
    enabled: !!tripId,
  });
  
  // Debug logging
  console.log('TripItinerary - Items:', items);
  console.log('TripItinerary - Suggestions:', suggestions);
  console.log('TripItinerary - Suggestions loading:', suggestionsLoading);

  // Add itinerary item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<ItineraryItem, "id" | "createdAt">) => {
      console.log("Adding itinerary item:", item);
      return apiRequest("POST", `/api/trips/${tripId}/itinerary`, item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary`] });
      setShowAddDialog(false);
      setNewItem({
        day: 1,
        time: "",
        title: "",
        description: "",
        location: "",
      });
      toast({
        title: "Success",
        description: "Itinerary item added successfully",
      });
    },
    onError: (error) => {
      console.error("Error adding itinerary item:", error);
      toast({
        title: "Error",
        description: "Failed to add itinerary item",
        variant: "destructive",
      });
    },
  });

  // Update itinerary item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (item: ItineraryItem) => {
      return apiRequest("PATCH", `/api/itinerary/activities/${item.id}`, item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary`] });
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Itinerary item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update itinerary item",
        variant: "destructive",
      });
    },
  });

  // Delete itinerary item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/itinerary/activities/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary`] });
      toast({
        title: "Success",
        description: "Itinerary item deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete itinerary item",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (!newItem.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }

    addItemMutation.mutate({
      ...newItem,
      tripId,
    });
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    updateItemMutation.mutate(editingItem);
  };

  const handleDeleteItem = (itemId: number) => {
    if (deleteItemMutation.isPending) return;
    deleteItemMutation.mutate(itemId);
  };

  // Suggestion mutations
  const suggestActivityMutation = useMutation({
    mutationFn: async (suggestion: Omit<ItineraryItem, "id" | "createdAt">) => {
      return apiRequest("POST", `/api/trips/${tripId}/itinerary/suggestions`, suggestion);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary/suggestions`] });
      setShowSuggestDialog(false);
      setNewSuggestion({
        day: 1,
        time: "",
        title: "",
        description: "",
        location: "",
      });
      toast({
        title: "Success",
        description: "Activity suggestion submitted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit activity suggestion",
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ suggestionId, vote }: { suggestionId: number; vote: "up" | "down" | "interested" }) => {
      return apiRequest("POST", `/api/trips/${tripId}/itinerary/suggestions/${suggestionId}/vote`, { vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary/suggestions`] });
      toast({
        title: "Success",
        description: "Vote submitted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive",
      });
    },
  });

  const approveActivityMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      return apiRequest("POST", `/api/trips/${tripId}/itinerary/suggestions/${suggestionId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary/suggestions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary`] });
      toast({
        title: "Success",
        description: "Activity suggestion approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      });
    },
  });

  const rejectActivityMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      return apiRequest("POST", `/api/trips/${tripId}/itinerary/suggestions/${suggestionId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary/suggestions`] });
      toast({
        title: "Success",
        description: "Activity suggestion rejected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    },
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      return apiRequest("DELETE", `/api/trips/${tripId}/itinerary/suggestions/${suggestionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary/suggestions`] });
      toast({
        title: "Success",
        description: "Activity suggestion deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete suggestion",
        variant: "destructive",
      });
    },
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: async (suggestion: SuggestionItem) => {
      return apiRequest("PUT", `/api/trips/${tripId}/itinerary/suggestions/${suggestion.id}`, {
        day: suggestion.day,
        time: suggestion.time,
        title: suggestion.title,
        description: suggestion.description,
        location: suggestion.location,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary/suggestions`] });
      setEditingSuggestion(null);
      toast({
        title: "Success",
        description: "Suggestion updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update suggestion",
        variant: "destructive",
      });
    },
  });

  const handleSuggestActivity = () => {
    if (!newSuggestion.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }

    suggestActivityMutation.mutate({
      ...newSuggestion,
      tripId,
    });
  };

  const handleVote = (suggestionId: number, vote: "up" | "down" | "interested") => {
    voteMutation.mutate({ suggestionId, vote });
  };

  const handleApprove = (suggestionId: number) => {
    approveActivityMutation.mutate(suggestionId);
  };

  const handleReject = (suggestionId: number) => {
    rejectActivityMutation.mutate(suggestionId);
  };

  const handleDeleteSuggestion = (suggestionId: number) => {
    deleteSuggestionMutation.mutate(suggestionId);
  };

  const handleUpdateSuggestion = () => {
    if (!editingSuggestion) return;
    updateSuggestionMutation.mutate(editingSuggestion);
  };

  const handleShowDescription = (title: string, description: string) => {
    setSelectedDescription({ title, description });
    setShowDescriptionDialog(true);
  };

  const truncateDescription = (text: string, maxLength: number = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Helper functions for suggestions
  const getVoteCounts = (votes: VoteItem[]) => {
    return votes.reduce((acc, vote) => {
      acc[vote.vote] = (acc[vote.vote] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getTotalVotes = (votes: VoteItem[]) => {
    const counts = getVoteCounts(votes);
    return (counts.up || 0) + (counts.interested || 0) - (counts.down || 0);
  };

  // Sort suggestions by vote score (highest first)
  const sortedSuggestions = (suggestions || []).sort((a, b) => {
    return getTotalVotes(b.votes) - getTotalVotes(a.votes);
  });

  // Group items by day
  const groupedItems = items?.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<number, ItineraryItem[]>) || {};

  // Sort items within each day by time
  Object.keys(groupedItems).forEach(day => {
    groupedItems[parseInt(day)].sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trip Itinerary</h2>
          <p className="text-muted-foreground">Plan your daily activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowSuggestDialog(true)}>
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Activity Suggestions Section */}
      {sortedSuggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Activity Suggestions</h3>
            <Badge variant="secondary">{sortedSuggestions.length}</Badge>
          </div>
          <div className="grid gap-4">
            {sortedSuggestions.map((suggestion, index) => {
              const voteCounts = getVoteCounts(suggestion.votes);
              const totalVotes = getTotalVotes(suggestion.votes);
              const isHighestVoted = index === 0 && totalVotes > 0;
              
              return (
                <Card key={suggestion.id} className={`transition-all ${isHighestVoted ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        {suggestion.time && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {suggestion.time}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Day {suggestion.day}
                        </Badge>
                        {isHighestVoted && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            <Heart className="h-3 w-3 mr-1" />
                            Top Voted
                          </Badge>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-1 text-sm md:text-base">{suggestion.title}</h4>
                        {suggestion.description && (
                          <div className="mb-2">
                            <p className="text-muted-foreground text-xs md:text-sm">
                              {truncateDescription(suggestion.description, 80)}
                            </p>
                            {suggestion.description && suggestion.description.length > 80 && (
                              <button
                                onClick={() => handleShowDescription(suggestion.title, suggestion.description || "")}
                                className="text-primary text-xs hover:underline mt-1"
                              >
                                Show More
                              </button>
                            )}
                          </div>
                        )}
                        {suggestion.location && (
                          <div className="flex items-center text-xs md:text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3 mr-1" />
                            {suggestion.location}
                          </div>
                        )}
                      </div>
                        
                      {/* Voting Section */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVote(suggestion.id, "up")}
                            disabled={voteMutation.isPending}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span className="ml-1 text-xs">{voteCounts.up || 0}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVote(suggestion.id, "interested")}
                            disabled={voteMutation.isPending}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                          >
                            <Heart className="h-3 w-3" />
                            <span className="ml-1 text-xs">{voteCounts.interested || 0}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVote(suggestion.id, "down")}
                            disabled={voteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                          >
                            <ThumbsDown className="h-3 w-3" />
                            <span className="ml-1 text-xs">{voteCounts.down || 0}</span>
                          </Button>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Score: {totalVotes > 0 ? `+${totalVotes}` : totalVotes}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1">
                          {hasAdminPermissions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(suggestion.id)}
                              disabled={approveActivityMutation.isPending}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span className="ml-1 text-xs">Approve</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSuggestion(suggestion)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span className="ml-1 text-xs">Edit</span>
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSuggestion(suggestion.id)}
                          disabled={deleteSuggestionMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="ml-1 text-xs">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Itinerary Items */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No activities planned yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start planning your trip by adding activities to your itinerary
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedItems)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(day => (
              <div key={day}>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Day {day}
                </h3>
                <div className="space-y-3">
                  {groupedItems[parseInt(day)].map(item => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {item.time && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {item.time}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold mb-1">{item.title}</h4>
                            {item.description && (
                              <div className="mb-2">
                                <p className="text-muted-foreground text-sm">
                                  {truncateDescription(item.description, 100)}
                                </p>
                                {item.description && item.description.length > 100 && (
                                  <button
                                    onClick={() => handleShowDescription(item.title, item.description || "")}
                                    className="text-primary text-xs hover:underline mt-1"
                                  >
                                    Show More
                                  </button>
                                )}
                              </div>
                            )}
                            {item.location && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3 mr-1" />
                                {item.location}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingItem(item)}
                              disabled={updateItemMutation.isPending}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deleteItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Add a new activity to your trip itinerary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="day">Day</Label>
              <Input
                id="day"
                type="number"
                min="1"
                value={newItem.day}
                onChange={(e) => setNewItem({ ...newItem, day: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="time">Time (optional)</Label>
              <Input
                id="time"
                type="time"
                value={newItem.time}
                onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="title">Activity Title</Label>
              <Input
                id="title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="e.g., Visit the Eiffel Tower"
              />
            </div>
            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                placeholder="e.g., Paris, France"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Add any additional details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
              {addItemMutation.isPending ? "Adding..." : "Add Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggest Activity Dialog */}
      <Dialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest Activity</DialogTitle>
            <DialogDescription>
              Suggest a new activity for the group to vote on
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="suggest-day">Day</Label>
              <Input
                id="suggest-day"
                type="number"
                min="1"
                value={newSuggestion.day}
                onChange={(e) => setNewSuggestion({ ...newSuggestion, day: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="suggest-time">Time (optional)</Label>
              <Input
                id="suggest-time"
                type="time"
                value={newSuggestion.time}
                onChange={(e) => setNewSuggestion({ ...newSuggestion, time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="suggest-title">Activity Title</Label>
              <Input
                id="suggest-title"
                value={newSuggestion.title}
                onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                placeholder="e.g., Visit the Eiffel Tower"
              />
            </div>
            <div>
              <Label htmlFor="suggest-location">Location (optional)</Label>
              <Input
                id="suggest-location"
                value={newSuggestion.location}
                onChange={(e) => setNewSuggestion({ ...newSuggestion, location: e.target.value })}
                placeholder="e.g., Paris, France"
              />
            </div>
            <div>
              <Label htmlFor="suggest-description">Description (optional)</Label>
              <Textarea
                id="suggest-description"
                value={newSuggestion.description}
                onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                placeholder="Why should we do this activity? Add any details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSuggestActivity} disabled={suggestActivityMutation.isPending}>
              {suggestActivityMutation.isPending ? "Suggesting..." : "Suggest Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Update the activity details
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-day">Day</Label>
                <Input
                  id="edit-day"
                  type="number"
                  min="1"
                  value={editingItem.day}
                  onChange={(e) => setEditingItem({ ...editingItem, day: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-time">Time (optional)</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editingItem.time}
                  onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-title">Activity Title</Label>
                <Input
                  id="edit-title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Location (optional)</Label>
                <Input
                  id="edit-location"
                  value={editingItem.location || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updateItemMutation.isPending}>
              {updateItemMutation.isPending ? "Updating..." : "Update Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Suggestion Dialog */}
      <Dialog open={!!editingSuggestion} onOpenChange={() => setEditingSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Suggestion</DialogTitle>
            <DialogDescription>
              Update the suggestion details
            </DialogDescription>
          </DialogHeader>
          {editingSuggestion && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-suggestion-day">Day</Label>
                <Input
                  id="edit-suggestion-day"
                  type="number"
                  min="1"
                  value={editingSuggestion.day}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, day: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-suggestion-time">Time (optional)</Label>
                <Input
                  id="edit-suggestion-time"
                  type="time"
                  value={editingSuggestion.time}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-suggestion-title">Activity Title</Label>
                <Input
                  id="edit-suggestion-title"
                  value={editingSuggestion.title}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-suggestion-location">Location (optional)</Label>
                <Input
                  id="edit-suggestion-location"
                  value={editingSuggestion.location || ""}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-suggestion-description">Description (optional)</Label>
                <Textarea
                  id="edit-suggestion-description"
                  value={editingSuggestion.description || ""}
                  onChange={(e) => setEditingSuggestion({ ...editingSuggestion, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSuggestion(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSuggestion} disabled={updateSuggestionMutation.isPending}>
              {updateSuggestionMutation.isPending ? "Updating..." : "Update Suggestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Description Dialog */}
      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDescription?.title}</DialogTitle>
            <DialogDescription>
              Full description
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap">
              {selectedDescription?.description}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDescriptionDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripItinerary;