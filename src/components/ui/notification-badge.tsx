import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const notificationBadgeVariants = cva(
  "inline-flex items-center justify-center font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        accent: "bg-accent text-accent-foreground",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "h-4 min-w-4 text-[10px] px-1",
        default: "h-5 min-w-5 text-xs px-1.5",
        lg: "h-6 min-w-6 text-sm px-2",
      },
      shape: {
        circle: "rounded-full",
        pill: "rounded-full",
        square: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "circle",
    },
  }
);

interface NotificationBadgeProps extends VariantProps<typeof notificationBadgeVariants> {
  count: number;
  maxCount?: number;
  showZero?: boolean;
  pulse?: boolean;
  className?: string;
}

export function NotificationBadge({
  count,
  maxCount = 99,
  showZero = false,
  pulse = false,
  variant,
  size,
  shape,
  className,
}: NotificationBadgeProps) {
  if (count === 0 && !showZero) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  return (
    <span
      className={cn(
        notificationBadgeVariants({ variant, size, shape }),
        pulse && "animate-pulse-soft",
        className
      )}
    >
      {displayCount}
    </span>
  );
}

interface NotificationDotProps {
  variant?: "default" | "destructive" | "success" | "warning" | "accent";
  size?: "sm" | "default" | "lg";
  pulse?: boolean;
  className?: string;
}

export function NotificationDot({
  variant = "default",
  size = "default",
  pulse = false,
  className,
}: NotificationDotProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    default: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  const variantClasses = {
    default: "bg-primary",
    destructive: "bg-destructive",
    success: "bg-success",
    warning: "bg-warning",
    accent: "bg-accent",
  };

  return (
    <span
      className={cn(
        "rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        pulse && "animate-pulse-soft",
        className
      )}
    />
  );
}
