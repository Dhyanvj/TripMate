import { useState, useContext, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppContext } from "@/context/AppContext";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PackingItem, TripMember } from "@shared/schema";
import PackingItemComponent from "./PackingItem";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Plus, 
  PackageCheck, 
  Users, 
  User, 
  Briefcase, 
  Sparkles, 
  ScanSearch, 
  Check,
  PencilLine,
  Trash2,
  Loader2,
  Package,
  Filter,
  UserIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface PackingListProps {
  tripId: number;
}

const PackingList = ({ tripId }: PackingListProps) => {
  const { currentUser } = useContext(AppContext);
  const { toast } = useToast();
  const [newItemText, setNewItemText] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [isAddingGroupItem, setIsAddingGroupItem] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [itemToDelete, setItemToDelete] = useState<PackingItem | null>(null);
  const [filterOption, setFilterOption] = useState<"all" | "assigned" | "unassigned">("all");
  
  // Fetch packing items with optimized performance
  const { data: packingItems, isLoading } = useQuery<PackingItem[]>({
    queryKey: [`/api/trips/${tripId}/packing`],
    enabled: !!tripId,
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });

  // Fetch trip members with their user details
  const { data: tripMembersWithUsers, isLoading: isMembersLoading } = useQuery<any[]>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId,
  });

  // Create users map for quick lookup
  const usersMap = useMemo(() => {
    if (!tripMembersWithUsers) return {};
    const map: Record<number, any> = {};
    tripMembersWithUsers.forEach(member => {
      if (member.user) {
        map[member.user.id] = member.user;
      }
    });
    return map;
  }, [tripMembersWithUsers]);
  
  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ 
      name, 
      quantity, 
      isGroupItem = false 
    }: { 
      name: string; 
      quantity: string; 
      isGroupItem?: boolean;
    }) => {
      // If it's not a group item, it's a personal item
      const isPersonal = !isGroupItem;
      
      const res = await apiRequest("POST", `/api/trips/${tripId}/packing`, {
        name,
        quantity: quantity.trim() || null,
        addedBy: currentUser?.id,
        isGroupItem,
        isPersonal,
        isPacked: false
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/packing`] });
      setNewItemText("");
      setNewItemQuantity("");
      toast({
        title: "Item added",
        description: variables.isGroupItem 
          ? "Item has been added to the group packing list" 
          : "Item has been added to your personal packing list",
      });
    },
    onError: () => {
      toast({
        title: "Error adding item",
        description: "There was an error adding your item. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Toggle item packed status mutation
  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, isPacked }: { id: number; isPacked: boolean }) => {
      const res = await apiRequest("PATCH", `/api/packing/${id}`, {
        isPacked
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Update the item in cache
      const queryKey = [`/api/trips/${tripId}/packing`];
      queryClient.setQueryData(queryKey, (oldData: PackingItem[] | undefined) => {
        if (!oldData) return undefined;
        return oldData.map(item => item.id === data.id ? data : item);
      });
    }
  });
  
  const handleAddItem = () => {
    if (!newItemText.trim() || !currentUser) return;
    addItemMutation.mutate({ 
      name: newItemText, 
      quantity: newItemQuantity,
      isGroupItem: isAddingGroupItem
    });
  };
  
  const toggleItemType = () => {
    setIsAddingGroupItem(!isAddingGroupItem);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };
  
  const handleToggleItem = (id: number, currentPacked: boolean) => {
    toggleItemMutation.mutate({ id, isPacked: !currentPacked });
  };
  
  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<PackingItem> }) => {
      const res = await apiRequest("PATCH", `/api/packing/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: (data) => {
      // Update the item in cache
      const queryKey = [`/api/trips/${tripId}/packing`];
      queryClient.setQueryData(queryKey, (oldData: PackingItem[] | undefined) => {
        if (!oldData) return undefined;
        return oldData.map(item => item.id === data.id ? data : item);
      });
      
      // Reset edit state
      setEditingItem(null);
      setEditName("");
      setEditQuantity("");
      
      toast({
        title: "Item updated",
        description: "Item has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error updating item",
        description: "There was an error updating your item. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Assign member mutation
  const assignMemberMutation = useMutation({
    mutationFn: async ({ id, assignedTo }: { id: number; assignedTo: number | null }) => {
      const res = await apiRequest("PATCH", `/api/packing/${id}`, {
        assignedTo
      });
      return res.json();
    },
    onSuccess: (data, { assignedTo }) => {
      // Update the item in cache
      const queryKey = [`/api/trips/${tripId}/packing`];
      queryClient.setQueryData(queryKey, (oldData: PackingItem[] | undefined) => {
        if (!oldData) return undefined;
        // Ensure the cached item has the same types
        const updatedItem = {
          ...data,
          assignedTo: data.assignedTo === null ? null : Number(data.assignedTo)
        };
        return oldData.map(item => item.id === data.id ? updatedItem : item);
      });
      
      // Force refresh the query to ensure data is up-to-date
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/packing`] });
      
      let assigneeName = "no one";
      if (assignedTo !== null) {
        const assignedUser = usersMap?.[assignedTo];
        assigneeName = assignedUser?.displayName || `User ${assignedTo}`;
        if (assignedTo === currentUser?.id) {
          assigneeName = "you";
        }
      }
      
      toast({
        title: "Assignment updated",
        description: assignedTo === null ? 
          "Item is no longer assigned to anyone" : 
          `Item is now assigned to ${assigneeName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to assign the item: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/packing/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove the item from cache
      const queryKey = [`/api/trips/${tripId}/packing`];
      queryClient.setQueryData(queryKey, (oldData: PackingItem[] | undefined) => {
        if (!oldData) return undefined;
        return oldData.filter(item => item.id !== deletedId);
      });
      
      toast({
        title: "Item deleted",
        description: "The item has been removed from your packing list",
      });
    },
    onError: () => {
      toast({
        title: "Error deleting item",
        description: "There was an error deleting your item. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleEditItem = (item: PackingItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity || "");
  };
  
  const handleUpdateItem = () => {
    if (!editingItem || !editName.trim()) return;
    
    updateItemMutation.mutate({
      id: editingItem.id,
      updates: {
        name: editName,
        quantity: editQuantity.trim() || null
      }
    });
  };
  
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditName("");
    setEditQuantity("");
  };
  
  const handleDeleteItem = (item: PackingItem) => {
    setItemToDelete(item);
  };
  
  const confirmDelete = () => {
    if (itemToDelete !== null) {
      deleteItemMutation.mutate(itemToDelete.id);
      setItemToDelete(null);
    }
  };
  
  const cancelDelete = () => {
    setItemToDelete(null);
  };

  const handleAssignMember = (itemId: number, userId: number | null) => {
    assignMemberMutation.mutate({ id: itemId, assignedTo: userId });
  };

  const handleGetSuggestions = () => {
    toast({
      title: "Coming Soon",
      description: "AI packing suggestions will be available in a future update.",
    });
  };
  
  // Filter items based on filter option and then split by type
  const getFilteredItems = () => {
    if (!packingItems || packingItems.length === 0) return { personal: [], group: [] };
    
    let filteredItems = [...packingItems];
    
    if (filterOption === "assigned" && currentUser) {
      // Filter to only show items assigned to current user
      filteredItems = packingItems.filter(item => {
        const itemAssignedToId = Number(item.assignedTo);
        const currentUserId = Number(currentUser.id);
        return itemAssignedToId === currentUserId;
      });
    }
    
    return {
      personal: filteredItems.filter(item => !item.isGroupItem),
      group: filteredItems.filter(item => item.isGroupItem)
    };
  };
  
  const { personal: personalItems, group: groupItems } = getFilteredItems();
  
  return (
    <div id="packing-tab" className="p-4 pb-20 bg-background min-h-0 h-full overflow-y-auto">
      {/* Main Header */}
      <div className="flex items-center mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center" style={{ color: 'var(--foreground)' }}>
            <Briefcase className="h-6 w-6 mr-2 text-primary" />
            Packing List
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
            Keep track of what to bring on your trip
          </p>
        </div>
      </div>
      
      {/* Add Item Form */}
      <div className="mb-5 bg-card rounded-xl p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Briefcase className="h-5 w-5 text-primary mr-2" />
            <h3 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>Add {isAddingGroupItem ? "Group" : "Personal"} Packing Item</h3>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${!isAddingGroupItem ? "font-medium text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}>
                    <User className="h-4 w-4 inline mr-1" />
                    Personal
                  </span>
                  <Switch 
                    checked={isAddingGroupItem}
                    onCheckedChange={toggleItemType}
                  />
                  <span className={`text-sm ${isAddingGroupItem ? "font-medium text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}>
                    <Users className="h-4 w-4 inline mr-1" />
                    Group
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Toggle between personal and group items</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex-grow relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Package className="h-5 w-5" />
            </div>
            <input 
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add an item to pack..."
              className="w-full pl-12 pr-4 py-4 text-base border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="sm:w-40">
            <input 
              type="text"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Quantity"
              className="w-full px-4 py-4 text-base border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddItem}
                disabled={addItemMutation.isPending}
                aria-label="Add item"
              >
                {addItemMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Add</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add item to your packing list</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-sm mt-2" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
          {isAddingGroupItem 
            ? "Group items are visible to all trip members" 
            : "Personal items are only visible to you"}
        </p>
      </div>
      
      {/* AI Suggestion Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="w-full py-6 mb-6 flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-950/40 dark:hover:to-purple-950/40 group transition-all duration-200"
              onClick={handleGetSuggestions}
            >
              <Sparkles className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400 group-hover:animate-pulse" />
              <span className="font-medium text-gray-800 dark:text-gray-100">Get AI Packing Suggestions</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Get smart suggestions for what to pack based on your destination and trip type</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Filter Options */}
      <div className="mb-5">
        <div className="flex items-center mb-2">
          <Filter className="h-4 w-4 text-muted-foreground mr-2" />
          <h4 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Filter Items</h4>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide pb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setFilterOption("all")}
                  className={cn(
                    "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mr-3 whitespace-nowrap transition-colors shadow-sm",
                    filterOption === "all" 
                      ? "bg-primary/10 text-primary border-2 border-primary/30" 
                      : "bg-card border border-border hover:bg-accent"
                  )}
                  style={filterOption !== "all" ? { color: 'var(--foreground)' } : {}}
                >
                  <Package className="h-4 w-4 mr-2" />
                  All Items
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Show all packing items</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setFilterOption("assigned")}
                  className={cn(
                    "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mr-3 whitespace-nowrap transition-colors shadow-sm",
                    filterOption === "assigned" 
                      ? "bg-secondary/10 text-secondary border-2 border-secondary/30" 
                      : "bg-card border border-border hover:bg-accent"
                  )}
                  style={filterOption !== "assigned" ? { color: 'var(--foreground)' } : {}}
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Assigned to Me
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Show only items assigned to you</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setFilterOption("unassigned")}
                  className={cn(
                    "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mr-3 whitespace-nowrap transition-colors shadow-sm",
                    filterOption === "unassigned" 
                      ? "bg-orange-50 text-orange-600 border-2 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800" 
                      : "bg-card border border-border hover:bg-accent"
                  )}
                  style={filterOption !== "unassigned" ? { color: 'var(--foreground)' } : {}}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Unassigned
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Show items that haven't been assigned to anyone</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Packing Items List */}
      <div className="space-y-3 mb-16">
        {isLoading ? (
          // Loading skeletons
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
                Your Items
              </h3>
            </div>
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 mr-3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg flex items-center" style={{ color: 'var(--foreground)' }}>
                <User className="h-5 w-5 mr-2 text-primary" />
                Personal Items ({personalItems.length})
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full">
                        ?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Personal items are only visible to you</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                      <ScanSearch className="h-3.5 w-3.5 inline mr-1" />
                      {personalItems.filter(item => item.isPacked).length}/{personalItems.length} packed
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of items you've packed</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {personalItems.length > 0 ? (
              <div className="space-y-2">
                {personalItems.map(item => (
                  <PackingItemComponent 
                    key={item.id} 
                    item={item}
                    onToggle={handleToggleItem}
                    onEdit={handleEditItem}
                    onDelete={() => handleDeleteItem(item)}
                    onAssign={handleAssignMember}
                    usersMap={usersMap}
                    tripMembers={tripMembersWithUsers}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-border bg-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>No personal items added yet</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
                    Add items above to keep track of your packing
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="flex items-center justify-between mt-8 mb-3">
              <h3 className="font-semibold text-lg flex items-center" style={{ color: 'var(--foreground)' }}>
                <Users className="h-5 w-5 mr-2 text-primary" />
                Group Items ({groupItems.length})
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full">
                        ?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Group items are visible to all trip members</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                      <PackageCheck className="h-3.5 w-3.5 inline mr-1" />
                      {groupItems.filter(item => item.isPacked).length}/{groupItems.length} packed
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of group items packed</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {groupItems.length > 0 ? (
              <div className="space-y-2">
                {groupItems.map(item => (
                  <PackingItemComponent 
                    key={item.id} 
                    item={item}
                    onToggle={handleToggleItem}
                    onEdit={handleEditItem}
                    onDelete={() => handleDeleteItem(item)}
                    onAssign={handleAssignMember}
                    usersMap={usersMap}
                    tripMembers={tripMembersWithUsers}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-border bg-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>No group items added yet</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: '0.7' }}>
                    Switch to "Group" using the toggle above to add items visible to everyone
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      
      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <PencilLine className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Edit Packing Item
            </DialogTitle>
            <DialogDescription>
              Update the details of your packing item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-gray-700 dark:text-gray-300">
                Item Name
              </Label>
              <Input
                id="editName"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editQuantity" className="text-gray-700 dark:text-gray-300">
                Quantity
              </Label>
              <Input
                id="editQuantity"
                type="text"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                placeholder="e.g., 2 pairs, 1 set, etc."
                className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                Optional - specify the amount needed
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCancelEdit} className="border-gray-300 dark:border-gray-600">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateItem}
              disabled={updateItemMutation.isPending}
              className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
            >
              {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={itemToDelete !== null} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              Delete Packing Item
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this item?
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Removing this item will permanently delete it from your packing list.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={cancelDelete} 
              className="border-gray-300 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete}
              disabled={deleteItemMutation.isPending}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {deleteItemMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : "Delete Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackingList;
