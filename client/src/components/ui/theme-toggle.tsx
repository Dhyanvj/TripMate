import { Moon, Sun, Palette, Monitor, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";

export function ThemeToggle() {
  const { config, setMode, setPreset, presets } = useTheme();
  const [open, setOpen] = useState(false);

  const getPresetColors = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return [];
    return [preset.light.colors.primary, preset.light.colors.secondary, preset.light.colors.accent];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-medium text-purple-700">Theme Mode</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Theme Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={config.mode === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("light")}
              className="flex-1"
            >
              <Sun className="mr-2 h-4 w-4" />
              Light
            </Button>
            <Button
              variant={config.mode === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("dark")}
              className="flex-1"
            >
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </Button>
            <Button
              variant={config.mode === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("system")}
              className="flex-1"
            >
              <Monitor className="mr-2 h-4 w-4" />
              System
            </Button>
          </div>

          {/* Color Scheme Selection */}
          <div>
            <h3 className="text-base font-medium text-purple-700 mb-4">Color Scheme</h3>
            <div className="grid grid-cols-2 gap-4">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                    config.presetId === preset.id
                      ? "border-purple-500 bg-purple-50" 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setPreset(preset.id)}
                >
                  <div className="flex gap-1 mb-2">
                    {getPresetColors(preset.id).map((color, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{preset.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}