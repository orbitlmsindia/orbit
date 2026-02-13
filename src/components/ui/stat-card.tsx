import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statCardVariants = cva(
  "rounded-xl p-6 transition-all duration-200 hover:shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-card border border-border shadow-card",
        primary: "bg-primary text-primary-foreground",
        accent: "bg-accent text-accent-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        gradient: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface StatCardProps extends VariantProps<typeof statCardVariants> {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  variant,
  className,
}: StatCardProps) {
  return (
    <div className={cn(statCardVariants({ variant }), className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "opacity-80"
          )}>
            {title}
          </p>
          <p className="text-3xl font-bold font-display">{value}</p>
          {description && (
            <p className={cn(
              "text-sm",
              variant === "default" ? "text-muted-foreground" : "opacity-70"
            )}>
              {description}
            </p>
          )}
          {trend && (
            <p className={cn(
              "text-sm font-medium flex items-center gap-1",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
              <span className={cn(
                "font-normal",
                variant === "default" ? "text-muted-foreground" : "opacity-70"
              )}>
                vs last month
              </span>
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-3 rounded-lg",
            variant === "default" ? "bg-muted" : "bg-white/20"
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
