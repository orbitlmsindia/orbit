import React, { useEffect, useState } from "react";

interface DynamicWatermarkProps {
  userEmail?: string;
  userName?: string;
  studentId?: string;
  className?: string;
  tiled?: boolean;
  floating?: boolean;
  opacity?: number;
}

export function DynamicWatermark({
  userEmail = "student@orbitlms.com",
  userName = "Orbit Student",
  studentId = "",
  className = "",
  tiled = true,
  floating = true,
  opacity = 0.08,
}: DynamicWatermarkProps) {
  const [timestamp, setTimestamp] = useState<string>("");
  const [floatingPos, setFloatingPos] = useState({ top: "25%", left: "35%" });

  // Update dynamic timestamp every second to guarantee forensic traceability
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimestamp(
        `${now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} ${now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })}`
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Floating watermark position randomizer every 7 seconds to prevent cropped screenshots
  useEffect(() => {
    if (!floating) return;
    const interval = setInterval(() => {
      const top = Math.floor(Math.random() * 65 + 15) + "%";
      const left = Math.floor(Math.random() * 65 + 15) + "%";
      setFloatingPos({ top, left });
    }, 7000);
    return () => clearInterval(interval);
  }, [floating]);

  const identifierText = `${userName ? `${userName} • ` : ""}${userEmail}${studentId ? ` • ID:${studentId.slice(0, 8)}` : ""} • ${timestamp}`;

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-40 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Tiled Diagonal Grid Watermark */}
      {tiled && (
        <div
          className="absolute inset-[-40%] w-[180%] h-[180%] flex flex-col justify-around rotate-[-22deg] pointer-events-none select-none"
          style={{ opacity }}
        >
          {Array.from({ length: 9 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex justify-around items-center whitespace-nowrap gap-12 font-mono font-bold tracking-wider text-[11px] sm:text-xs text-foreground/80"
              style={{
                transform: `translateX(${rowIdx % 2 === 0 ? "0px" : "-80px"})`,
              }}
            >
              {Array.from({ length: 5 }).map((_, colIdx) => (
                <span key={colIdx} className="px-4">
                  🔒 {identifierText}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 2. Floating High-Contrast Anti-Crop Badge */}
      {floating && (
        <div
          className="absolute transition-all duration-1000 ease-in-out pointer-events-none select-none"
          style={{ top: floatingPos.top, left: floatingPos.left }}
        >
          <div
            className="px-3 py-1.5 rounded-md border border-foreground/15 bg-background/30 backdrop-blur-[2px] shadow-xs font-mono font-bold text-[10px] sm:text-[11px] text-foreground tracking-wider flex items-center gap-1.5 whitespace-nowrap"
            style={{ opacity: Math.max(opacity * 1.8, 0.16) }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>PROTECTED • {userEmail}</span>
            <span className="text-muted-foreground">• {timestamp}</span>
          </div>
        </div>
      )}
    </div>
  );
}
