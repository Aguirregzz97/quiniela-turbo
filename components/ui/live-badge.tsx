import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function LiveBadge({ className, size = "md" }: LiveBadgeProps) {
  const sizeClasses = {
    sm: {
      icon: "h-3 w-3",
      text: "text-[10px]",
      gap: "ml-0.5",
    },
    md: {
      icon: "h-4 w-4",
      text: "text-xs",
      gap: "ml-1",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={cn("flex items-center", className)}>
      <Play className={cn("animate-pulse text-red-600", classes.icon)} />
      <span className={cn("font-medium text-red-600", classes.text, classes.gap)}>
        EN VIVO
      </span>
    </div>
  );
}

