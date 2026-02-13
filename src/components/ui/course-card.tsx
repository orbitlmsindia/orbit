import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { Progress } from "./progress";

interface CourseCardProps {
  title: string;
  instructor: string;
  thumbnail?: string;
  progress?: number;
  duration?: string;
  lessonsCount?: number;
  category?: string;
  status?: "in-progress" | "completed" | "not-started";
  className?: string;
  onClick?: () => void;
}

export function CourseCard({
  title,
  instructor,
  thumbnail,
  progress = 0,
  duration,
  lessonsCount,
  category,
  status = "not-started",
  className,
  onClick,
}: CourseCardProps) {
  const statusConfig = {
    "in-progress": { label: "In Progress", variant: "accent" as const },
    "completed": { label: "Completed", variant: "success" as const },
    "not-started": { label: "Not Started", variant: "secondary" as const },
  };

  return (
    <div
      className={cn(
        "group bg-card rounded-xl border border-border shadow-card overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <span className="text-4xl">📚</span>
          </div>
        )}
        {category && (
          <Badge className="absolute top-3 left-3" variant="secondary">
            {category}
          </Badge>
        )}
        <Badge
          className="absolute top-3 right-3"
          variant={statusConfig[status].variant}
        >
          {statusConfig[status].label}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{instructor}</p>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {lessonsCount !== undefined && (
            <span>{lessonsCount} lessons</span>
          )}
          {duration && <span>{duration}</span>}
        </div>

        {/* Progress */}
        {status === "in-progress" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} variant="accent" size="sm" />
          </div>
        )}
        
        {status === "completed" && (
          <div className="flex items-center gap-2 text-success">
            <span className="text-lg">✓</span>
            <span className="text-sm font-medium">Course Completed</span>
          </div>
        )}
      </div>
    </div>
  );
}
