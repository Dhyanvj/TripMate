import { useState, useRef } from "react";
import { Upload, User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AvatarSelectorProps {
  currentAvatar: string;
  onAvatarChange: (avatar: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Predefined avatar options
const AVATAR_OPTIONS = [
  "👤", "👨", "👩", "🧑", "👱", "👨‍💼", "👩‍💼", "🧑‍💼",
  "👨‍🎓", "👩‍🎓", "🧑‍🎓", "👨‍⚕️", "👩‍⚕️", "🧑‍⚕️", "👨‍🔬", "👩‍🔬",
  "🧑‍🔬", "👨‍💻", "👩‍💻", "🧑‍💻", "👨‍🎨", "👩‍🎨", "🧑‍🎨", "👨‍🍳",
  "👩‍🍳", "🧑‍🍳", "👨‍🌾", "👩‍🌾", "🧑‍🌾", "👨‍🏫", "👩‍🏫", "🧑‍🏫",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
  "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣",
  "🌟", "⭐", "🔥", "💎", "🎯", "🎨", "🎭", "🎪", "🎊", "🎉", "🏆", "🥇"
];

const AvatarSelector = ({ currentAvatar, onAvatarChange, open, onOpenChange }: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onAvatarChange(selectedAvatar);
    onOpenChange(false);
  };

  const isImageUrl = (avatar: string) => {
    return avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('/');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Choose Avatar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Selection Preview */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-20 h-20 rounded-full bg-card border-2 border-border flex items-center justify-center text-3xl overflow-hidden">
              {selectedAvatar ? (
                isImageUrl(selectedAvatar) ? (
                  <img 
                    src={selectedAvatar} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{selectedAvatar}</span>
                )
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">Preview</p>
          </div>
          
          {/* Upload Image Option */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Upload Image</h3>
                <p className="text-sm text-muted-foreground">Choose your own photo</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Browse
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </Card>
          
          {/* Predefined Avatars */}
          <div>
            <h3 className="font-medium mb-3">Choose from Collection</h3>
            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
              {AVATAR_OPTIONS.map((avatar, index) => (
                <button
                  key={index}
                  onClick={() => handleAvatarSelect(avatar)}
                  className={cn(
                    "w-10 h-10 rounded-full bg-card border-2 flex items-center justify-center text-lg hover:border-primary transition-colors",
                    selectedAvatar === avatar ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarSelector;