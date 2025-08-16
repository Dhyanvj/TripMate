import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Clock, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareTripDialogProps {
  trip: {
    id: number;
    inviteCode: string;
    inviteCodeExpiresAt?: string | null;
    name: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function ShareTripDialog({ trip, isOpen, onClose }: ShareTripDialogProps) {
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [currentInviteCode, setCurrentInviteCode] = useState(trip.inviteCode);
  const [currentExpiration, setCurrentExpiration] = useState(trip.inviteCodeExpiresAt);
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

  const regenerateInviteMutation = useMutation({
    mutationFn: async (expirationMinutes: number | null) => {
      const response = await fetch(`/api/trips/${trip.id}/regenerate-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expirationMinutes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to regenerate invite code');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentInviteCode(data.newInviteCode);
      setCurrentExpiration(data.expiresAt);
      toast({
        title: "New Invite Code Generated",
        description: data.expiresAt 
          ? `Code expires on ${new Date(data.expiresAt).toLocaleString()}`
          : "Code never expires",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${trip.id}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate invite code",
        variant: "destructive",
      });
    },
  });

  const copyInviteCode = () => {
    navigator.clipboard.writeText(currentInviteCode);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
  };

  const handleGenerateCode = () => {
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

  const shareMessage = `Join me on "${trip.name}" trip! Use invite code: ${currentInviteCode}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${trip.name}`,
          text: shareMessage,
        });
      } catch (error) {
        // User cancelled sharing, just copy to clipboard
        copyInviteCode();
      }
    } else {
      copyInviteCode();
    }
  };

  const isExpired = currentExpiration && new Date(currentExpiration) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Share this trip with others using an invite code. You can set a custom expiration time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Invite Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Invite Code</Label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                {currentInviteCode}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyInviteCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {currentExpiration && (
              <p className={`text-xs ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                {isExpired ? 'Expired' : 'Expires'} on {new Date(currentExpiration).toLocaleString()}
              </p>
            )}
            {!currentExpiration && (
              <p className="text-xs text-muted-foreground">
                Never expires
              </p>
            )}
          </div>

          {/* Expiration Settings */}
          <div className="space-y-3">
            <Label>Generate New Code with Expiration</Label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select expiration time" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
              <Button
                onClick={handleGenerateCode}
                disabled={regenerateInviteMutation.isPending}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {regenerateInviteMutation.isPending ? "Generating..." : "Generate New Code"}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleNativeShare}
            className="w-full sm:w-auto"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Code
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}