import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Clock, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteCodeManagerProps {
  trip: {
    id: number;
    inviteCode: string;
    inviteCodeExpiresAt?: string | null;
    name: string;
  };
}

export function InviteCodeManager({ trip }: InviteCodeManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [isSettingExpiration, setIsSettingExpiration] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Predefined duration options
  const durationOptions = [
    { value: "5", label: "5 minutes", minutes: 5 },
    { value: "30", label: "30 minutes", minutes: 30 },
    { value: "60", label: "1 hour", minutes: 60 },
    { value: "180", label: "3 hours", minutes: 180 },
    { value: "720", label: "12 hours", minutes: 720 },
    { value: "1440", label: "24 hours", minutes: 1440 },
    { value: "custom", label: "Custom duration", minutes: 0 },
    { value: "never", label: "Never expires", minutes: 0 }
  ];

  const updateExpirationMutation = useMutation({
    mutationFn: async (expirationMinutes: number | null) => {
      const response = await apiRequest(`/api/trips/${trip.id}/invite-expiration`, {
        method: "POST",
        body: JSON.stringify({ expirationMinutes }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Expiration Updated",
        description: data.expiresAt 
          ? `Invite code will expire on ${new Date(data.expiresAt).toLocaleString()}`
          : "Invite code will never expire",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${trip.id}`] });
      setShowDialog(false);
      setIsSettingExpiration(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update invite code expiration",
        variant: "destructive",
      });
    },
  });

  const regenerateInviteMutation = useMutation({
    mutationFn: async (expirationMinutes: number | null) => {
      const response = await apiRequest(`/api/trips/${trip.id}/regenerate-invite`, {
        method: "POST",
        body: JSON.stringify({ expirationMinutes }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invite Code Regenerated",
        description: `New invite code: ${data.newInviteCode}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${trip.id}`] });
      setShowDialog(false);
      setIsSettingExpiration(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to regenerate invite code",
        variant: "destructive",
      });
    },
  });

  const copyInviteCode = () => {
    navigator.clipboard.writeText(trip.inviteCode);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
  };

  const handleSetExpiration = () => {
    let minutes: number | null = null;

    if (selectedDuration === "never") {
      minutes = null;
    } else if (selectedDuration === "custom") {
      const customNum = parseInt(customMinutes);
      if (isNaN(customNum) || customNum <= 0) {
        toast({
          title: "Invalid Duration",
          description: "Please enter a valid number of minutes",
          variant: "destructive",
        });
        return;
      }
      minutes = customNum;
    } else {
      const option = durationOptions.find(opt => opt.value === selectedDuration);
      minutes = option ? option.minutes : null;
    }

    updateExpirationMutation.mutate(minutes);
  };

  const handleRegenerateWithExpiration = () => {
    let minutes: number | null = null;

    if (selectedDuration === "never") {
      minutes = null;
    } else if (selectedDuration === "custom") {
      const customNum = parseInt(customMinutes);
      if (isNaN(customNum) || customNum <= 0) {
        toast({
          title: "Invalid Duration",
          description: "Please enter a valid number of minutes",
          variant: "destructive",
        });
        return;
      }
      minutes = customNum;
    } else {
      const option = durationOptions.find(opt => opt.value === selectedDuration);
      minutes = option ? option.minutes : null;
    }

    regenerateInviteMutation.mutate(minutes);
  };

  const isExpired = trip.inviteCodeExpiresAt && new Date(trip.inviteCodeExpiresAt) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Invite Code</Label>
          <div className="flex items-center space-x-2">
            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
              {trip.inviteCode}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyInviteCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {trip.inviteCodeExpiresAt && (
            <p className={`text-xs ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isExpired ? 'Expired' : 'Expires'} on {new Date(trip.inviteCodeExpiresAt).toLocaleString()}
            </p>
          )}
          {!trip.inviteCodeExpiresAt && (
            <p className="text-xs text-muted-foreground">
              Never expires
            </p>
          )}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Invite Code</DialogTitle>
              <DialogDescription>
                Set expiration time for your invite code or generate a new one.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Expiration Duration</Label>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDuration === "custom" && (
                <div className="space-y-2">
                  <Label>Custom Duration (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="Enter minutes"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    min="1"
                  />
                </div>
              )}

              {selectedDuration && (
                <div className="space-y-2">
                  <Button
                    onClick={handleSetExpiration}
                    disabled={updateExpirationMutation.isPending}
                    className="w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {updateExpirationMutation.isPending ? "Updating..." : "Update Expiration"}
                  </Button>

                  <Button
                    onClick={handleRegenerateWithExpiration}
                    disabled={regenerateInviteMutation.isPending}
                    variant="secondary"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {regenerateInviteMutation.isPending ? "Generating..." : "Generate New Code"}
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}