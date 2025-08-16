import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fallback?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-12 h-12 text-lg", 
  lg: "w-16 h-16 text-xl",
  xl: "w-20 h-20 text-2xl"
};

const Avatar = ({ src, alt = "Avatar", size = "md", className, fallback }: AvatarProps) => {
  const isImageUrl = (avatar: string) => {
    return avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('/');
  };

  const renderContent = () => {
    if (src) {
      if (isImageUrl(src)) {
        return (
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-cover"
            style={{ color: 'var(--foreground)' }}
          />
        );
      } else {
        // Emoji avatar
        return <span className="text-base" style={{ color: 'var(--foreground)' }}>{src}</span>;
      }
    }
    
    if (fallback) {
      return (
        <span 
          className="font-bold"
          style={{ color: 'var(--foreground)' }}
        >
          {fallback.charAt(0).toUpperCase()}
        </span>
      );
    }
    
    return <User className="h-1/2 w-1/2" style={{ color: 'var(--foreground)', opacity: '0.7' }} />;
  };

  return (
    <div 
      className={cn(
        "rounded-full bg-card border-2 border-border flex items-center justify-center overflow-hidden shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      {renderContent()}
    </div>
  );
};

export default Avatar;