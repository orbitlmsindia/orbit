import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: "default" | "success" | "warning" | "accent";
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

const progressVariants = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  accent: "bg-accent",
};

const progressSizes = {
  sm: "h-1.5",
  default: "h-2.5",
  lg: "h-4",
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = "default", size = "default", showLabel = false, ...props }, ref) => (
  <div className="flex items-center gap-3 w-full">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-secondary",
        progressSizes[size],
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out rounded-full",
          progressVariants[variant]
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
    {showLabel && (
      <span className="text-sm font-medium text-muted-foreground min-w-[3ch]">
        {value}%
      </span>
    )}
  </div>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
