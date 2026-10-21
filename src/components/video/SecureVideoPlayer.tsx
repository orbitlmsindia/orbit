import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck,
  Video,
  AlertTriangle,
  EyeOff,
  Maximize,
  Minimize,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Gauge,
  Lock,
  RotateCcw,
  RotateCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGoogleDriveEmbedUrl, isGoogleDriveUrl } from "@/lib/googleDriveUtils";

interface SecureVideoPlayerProps {
  videoUrl: string;
  title?: string;
  userEmail?: string;
  className?: string;
  initialProgress?: number;
  onProgressUpdate?: (percentage: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

// Extract YouTube Video ID from any YouTube URL format
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export function SecureVideoPlayer({
  videoUrl,
  title = "Recorded Lecture",
  userEmail = "student@orbitlms.com",
  className = "",
  initialProgress = 0,
  onProgressUpdate,
}: SecureVideoPlayerProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

  // Security & Blackout States
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [blackoutReason, setBlackoutReason] = useState<string>("Screen capture or tab switching detected");
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [securityViolationCount, setSecurityViolationCount] = useState(0);
  // Google Drive manual watch timer — since Drive doesn't expose play state
  const [driveTimerActive, setDriveTimerActive] = useState(false);
  const longPressTimerRef = useRef<any>(null);

  // Custom Controls & Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Floating Watermark Position
  const [watermarkPos, setWatermarkPos] = useState({ top: '30%', left: '40%' });

  // Play/Pause visual feedback animation
  const [showPlayFeedback, setShowPlayFeedback] = useState(false);
  const feedbackTimeoutRef = useRef<any>(null);

  // Real-Time Watch Telemetry
  const maxWatchedPercentRef = useRef<number>(initialProgress);
  const [watchedPercent, setWatchedPercent] = useState<number>(initialProgress);

  const youtubeVideoId = getYouTubeVideoId(videoUrl);
  const isDrive = isGoogleDriveUrl(videoUrl);
  const isYouTube = !!youtubeVideoId || videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isDirectVideo = !isYouTube && !isDrive && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm") || videoUrl.endsWith(".m3u8"));

  const onProgressUpdateRef = useRef(onProgressUpdate);
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  // Update progress helper (stable reference)
  const updateProgress = useCallback((percent: number) => {
    const validPct = Math.min(100, Math.max(0, Math.round(percent)));
    if (validPct > maxWatchedPercentRef.current) {
      maxWatchedPercentRef.current = validPct;
      setWatchedPercent(validPct);
      onProgressUpdateRef.current?.(validPct);
    }
  }, []);

  // Floating watermark position randomizer
  useEffect(() => {
    const interval = setInterval(() => {
      const top = Math.floor(Math.random() * 60 + 20) + '%';
      const left = Math.floor(Math.random() * 60 + 20) + '%';
      setWatermarkPos({ top, left });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Continuous watch time ticker
  // For native/YouTube: runs when isPlaying is true (synced with actual video)
  // For Google Drive: runs only when user has manually started the watch timer
  const shouldTickerRun = isDrive ? driveTimerActive : isPlaying;

  useEffect(() => {
    if (!shouldTickerRun) return;
    const ticker = setInterval(() => {
      setCurrentTime(prev => {
        const nextTime = prev + 1;
        // Target duration fallback (e.g. 600s / 10 mins if unexposed)
        const targetDuration = duration > 0 ? duration : 600;
        const pct = Math.min(100, Math.max(0, Math.round((nextTime / targetDuration) * 100)));
        updateProgress(pct);
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [shouldTickerRun, duration, updateProgress]);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (isYouTube && typeof window !== "undefined" && !window.YT) {
      const existing = document.getElementById("youtube-iframe-api-script");
      if (!existing) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScript = document.getElementsByTagName("script")[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(tag, firstScript);
        } else {
          document.head.appendChild(tag);
        }
      }
    }
  }, [isYouTube]);

  // YouTube postMessage event listener
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'infoDelivery' && parsed.info) {
            if (parsed.info.playerState === 1) {
              setIsPlaying(true);
            } else if (parsed.info.playerState === 2 || parsed.info.playerState === 0) {
              setIsPlaying(false);
            }

            const cur = typeof parsed.info.currentTime === 'number' ? parsed.info.currentTime : null;
            const dur = typeof parsed.info.duration === 'number' ? parsed.info.duration : null;

            if (cur !== null && cur > 0) setCurrentTime(cur);
            if (dur !== null && dur > 0) setDuration(dur);

            if (cur !== null && dur !== null && dur > 0) {
              const pct = Math.min(100, Math.max(0, Math.round((cur / dur) * 100)));
              updateProgress(pct);
            }
          }
        } catch (_) {}
      }
    };

    window.addEventListener('message', handlePostMessage);

    const pingInterval = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'listening', id: 1 }),
            '*'
          );
        } catch (_) {}
      }
    }, 500);

    return () => {
      window.removeEventListener('message', handlePostMessage);
      clearInterval(pingInterval);
    };
  }, [updateProgress]);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Toggle Google Drive watch timer manually
  const toggleDriveTimer = () => {
    const next = !driveTimerActive;
    setDriveTimerActive(next);
    setIsPlaying(next);
    toast({
      title: next ? "⏱️ Watch Timer Started" : "⏸️ Watch Timer Paused",
      description: next
        ? "Timer is now tracking your watch progress. Make sure the video is playing."
        : "Watch timer paused. Resume when you continue watching.",
    });
  };

  // Container Fullscreen Toggle (Cross-Browser Supported)
  const toggleContainerFullscreen = async () => {
    if (!containerRef.current) return;
    const elem = containerRef.current as any;
    const doc = document as any;

    try {
      const isFull = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
      if (!isFull) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen toggle error:", err);
    }
  };

  const triggerPlayPauseAnimation = () => {
    setShowPlayFeedback(true);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowPlayFeedback(false);
    }, 600);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ██  COMPREHENSIVE SECURITY GUARDS (PC + Mobile, Normal + Fullscreen)  ██
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // ── 1. Universal Context Menu Blocker (right-click + mobile long-press) ──
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // ── 2. Comprehensive Keyboard Security ──
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen & Screenshot / Snipping Tool Interception
      const isScreenshot =
        e.key === "PrintScreen" ||
        e.code === "PrintScreen" ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5' || e.key.toLowerCase() === 's' || e.code === 'KeyS')) ||
        (e.altKey && (e.key === 'PrintScreen' || e.code === 'PrintScreen'));

      if (isScreenshot) {
        e.preventDefault();
        try { navigator.clipboard.writeText(""); } catch (_) {}
        setIsBlackedOut(true);
        setBlackoutReason("Screenshot capture prohibited — content protected by Orbit LMS DRM.");
        setSecurityViolationCount(prev => prev + 1);
        setTimeout(() => setIsBlackedOut(false), 4000);
        return;
      }

      // DevTools & Source Code Blocking
      // F12 — DevTools
      if (e.key === 'F12' || e.code === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        setShowSecurityWarning(true);
        setSecurityViolationCount(prev => prev + 1);
        setTimeout(() => setShowSecurityWarning(false), 3000);
        return;
      }

      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Picker)
      if (e.ctrlKey && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        setShowSecurityWarning(true);
        setSecurityViolationCount(prev => prev + 1);
        setTimeout(() => setShowSecurityWarning(false), 3000);
        return;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.code === 'KeyU') {
        e.preventDefault();
        e.stopPropagation();
        setShowSecurityWarning(true);
        setTimeout(() => setShowSecurityWarning(false), 3000);
        return;
      }

      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        e.stopPropagation();
        setShowSecurityWarning(true);
        setTimeout(() => setShowSecurityWarning(false), 3000);
        return;
      }

      // Ctrl+P (Print)
      if (e.ctrlKey && e.code === 'KeyP') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+A (Select All)
      if (e.ctrlKey && e.code === 'KeyA') {
        e.preventDefault();
        return;
      }

      // Ctrl+C / Ctrl+X (Copy / Cut)
      if (e.ctrlKey && (e.code === 'KeyC' || e.code === 'KeyX')) {
        // Allow in input fields, block elsewhere
        const active = document.activeElement;
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        if (!isInput) {
          e.preventDefault();
          return;
        }
      }

      // ── Player Keyboard Shortcuts ──
      const activeElement = document.activeElement;
      const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.getAttribute('contenteditable') === 'true');

      if (!isTyping) {
        if (e.code === 'KeyF') {
          e.preventDefault();
          toggleContainerFullscreen();
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          toggleMute();
        } else if (e.code === 'Space' || e.code === 'KeyK') {
          e.preventDefault();
          togglePlay();
          triggerPlayPauseAnimation();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          skipTime(10);
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          skipTime(-10);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        e.code === "PrintScreen" ||
        ((e.key.toLowerCase() === "s" || e.code === "KeyS") && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        try { navigator.clipboard.writeText(""); } catch (_) {}
        setIsBlackedOut(true);
        setTimeout(() => setIsBlackedOut(false), 3000);
      }
    };

    // ── 3. Fullscreen Change Detection ──
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);
    };


    // ── 6. Drag & Drop Prevention ──
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // ── 7. Selection Prevention ──
    const handleSelectStart = (e: Event) => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!isInput) {
        e.preventDefault();
        return false;
      }
    };

    // ── 8. Copy/Cut/Paste Prevention ──
    const handleCopy = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!isInput) {
        e.preventDefault();
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', 'Content protected by Orbit LMS DRM');
        }
      }
    };

    // ── 9. Mobile Touch Context Menu Blocker (long-press) ──
    const handleTouchStart = (e: TouchEvent) => {
      // Clear any existing long-press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      // If multi-touch (pinch/screenshot gesture), block it
      if (e.touches.length >= 3) {
        e.preventDefault();
        setIsBlackedOut(true);
        setBlackoutReason("Multi-touch gesture blocked — screenshot protection active.");
        setTimeout(() => setIsBlackedOut(false), 3000);
      }
    };

    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    // ── 10. Picture-in-Picture Prevention ──
    const handlePiP = (e: Event) => {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Picture-in-Picture Disabled 🔒",
        description: "PiP mode is disabled for secure lecture content.",
      });
    };

    // ── Attach All Listeners ──
    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("keyup", handleKeyUp, { capture: true });
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    document.addEventListener("dragstart", handleDragStart, { capture: true });
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("copy", handleCopy, { capture: true });
    document.addEventListener("cut", handleCopy, { capture: true });
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    // PiP on native video
    if (videoRef.current) {
      videoRef.current.addEventListener("enterpictureinpicture", handlePiP);
      videoRef.current.disablePictureInPicture = true;
    }

    // ── Cleanup ──
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true } as any);
      document.removeEventListener("keydown", handleKeyDown, { capture: true } as any);
      document.removeEventListener("keyup", handleKeyUp, { capture: true } as any);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      document.removeEventListener("dragstart", handleDragStart, { capture: true } as any);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("copy", handleCopy, { capture: true } as any);
      document.removeEventListener("cut", handleCopy, { capture: true } as any);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (videoRef.current) {
        videoRef.current.removeEventListener("enterpictureinpicture", handlePiP);
      }
    };
  }, [toast]);

  // Sync initial watched percentage when videoUrl or initialProgress prop changes
  useEffect(() => {
    const init = initialProgress || 0;
    maxWatchedPercentRef.current = init;
    setWatchedPercent(init);
  }, [videoUrl, initialProgress]);

  // Controls Play / Pause
  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (isDirectVideo && videoRef.current) {
      if (nextState) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    } else if (isYouTube && iframeRef.current?.contentWindow) {
      const command = nextState ? "playVideo" : "pauseVideo";
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: command, args: [] }),
          "*"
        );
      } catch (_) {}
      if (ytPlayerRef.current && typeof ytPlayerRef.current[command] === "function") {
        try { ytPlayerRef.current[command](); } catch (_) {}
      }
    }
  };

  // Skip time forward / backward (10s)
  const skipTime = (seconds: number) => {
    setCurrentTime(prev => {
      const nextTime = Math.max(0, prev + seconds);
      if (isDirectVideo && videoRef.current) {
        videoRef.current.currentTime = nextTime;
      } else if (isYouTube && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [nextTime, true] }),
            "*"
          );
        } catch (_) {}
      }
      return nextTime;
    });
  };

  // Change Speed Mode (0.5x, 1x, 1.25x, 1.5x, 2x)
  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);

    if (isDirectVideo && videoRef.current) {
      videoRef.current.playbackRate = rate;
    }

    if (isYouTube && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "setPlaybackRate",
            args: [rate]
          }),
          "*"
        );
      } catch (e) {
        console.warn("YouTube postMessage speed set error:", e);
      }
    }

    toast({
      title: `Playback Speed: ${rate}x`,
      description: rate === 2 ? "2x Fast Mode Active" : `Set to ${rate}x speed.`,
    });
  };

  // Scrubber Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);

    if (isDirectVideo && videoRef.current) {
      videoRef.current.currentTime = targetTime;
    } else if (isYouTube && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [targetTime, true] }),
          "*"
        );
      } catch (_) {}
    }
  };

  // Mute Toggle
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (isDirectVideo && videoRef.current) {
      videoRef.current.muted = newMuted;
    } else if (isYouTube && iframeRef.current?.contentWindow) {
      const command = newMuted ? "mute" : "unMute";
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: command, args: [] }),
          "*"
        );
      } catch (_) {}
    }
  };

  // Format Time (MM:SS)
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!videoUrl) {
    return (
      <div className="aspect-video bg-muted rounded-xl flex items-center justify-center text-muted-foreground border">
        <Video className="h-10 w-10 mr-2 opacity-50" />
        <span>No video source provided</span>
      </div>
    );
  }

  // Construct Protected Embed URL
  const pageOrigin = typeof window !== "undefined" ? window.location.origin : "";
  let embedSrc = videoUrl;
  if (isDrive) {
    embedSrc = getGoogleDriveEmbedUrl(videoUrl);
  } else if (isYouTube && youtubeVideoId) {
    embedSrc = `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&origin=${encodeURIComponent(pageOrigin)}&rel=0&modestbranding=1&controls=1&showinfo=0`;
  } else if (isYouTube) {
    const cleanUrl = videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/");
    const hasQuery = cleanUrl.includes("?");
    embedSrc = `${cleanUrl}${hasQuery ? "&" : "?"}enablejsapi=1&origin=${encodeURIComponent(pageOrigin)}&rel=0&modestbranding=1&controls=1&showinfo=0`;
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group border border-border/40 select-none ${className}`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragStart={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onTouchStart={(e) => {
        // Block long-press context menu on mobile
        if (e.touches.length >= 2) {
          e.preventDefault();
        }
      }}
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none" as any,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* ── 1. ANTI-RECORDING BLACKOUT PROTECTION OVERLAY ── */}
      {isBlackedOut && (
        <div className="absolute inset-0 z-[1000] bg-black flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
          <EyeOff className="h-16 w-16 text-red-500 mb-4 animate-bounce" />
          <h3 className="text-2xl font-bold text-red-500 mb-2">Content Protection Active</h3>
          <p className="text-sm max-w-md text-gray-300 mb-4">{blackoutReason}</p>
          <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/40 text-red-400 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Lock className="h-3.5 w-3.5" /> DRM Cyber Security Guard Active
          </div>
        </div>
      )}

      {/* ── 2. SECURITY WARNING OVERLAY ── */}
      {showSecurityWarning && (
        <div className="absolute inset-0 z-[950] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
          <AlertTriangle className="h-14 w-14 text-amber-500 mb-3" />
          <h4 className="text-xl font-bold mb-1">Developer Tools / Save Blocked</h4>
          <p className="text-xs text-gray-300">Inspect mode & direct URL extraction are disabled for secure lectures.</p>
        </div>
      )}

      {/* ── 3. STATIC BACKGROUND WATERMARK GRID ── */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden opacity-15 flex flex-wrap content-start justify-center text-white/20 select-none mix-blend-overlay">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="transform -rotate-45 p-6 text-xs md:text-sm font-bold whitespace-nowrap tracking-widest text-slate-300"
          >
            {userEmail} • ORBIT LMS DRM
          </div>
        ))}
      </div>

      {/* ── 4. DYNAMIC FLOATING WATERMARK ── */}
      <div
        className="absolute pointer-events-none z-30 transition-all duration-1000 ease-in-out px-3 py-1 bg-black/40 backdrop-blur-xs border border-white/10 rounded-full text-[10px] font-mono text-purple-300/80 shadow"
        style={{ top: watermarkPos.top, left: watermarkPos.left }}
      >
        🔒 {userEmail} • SECURE LECTURE
      </div>

      {/* ── 5. PLAYER HEADER BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-xs font-medium shadow pointer-events-auto">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="truncate">{isDrive ? "Google Drive Protected Stream" : isYouTube ? "YouTube Protected Stream" : "LMS DRM Secure Stream"}</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 text-white text-xs font-mono shadow">
            Watched: <span className="font-bold text-emerald-400">{watchedPercent}%</span>
          </div>

          {/* Fullscreen Button in Header */}
          <button
            type="button"
            onClick={toggleContainerFullscreen}
            className="p-1.5 rounded-full bg-black/80 hover:bg-purple-600 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── 6. VIDEO ENGINE (NATIVE MP4 vs IFRAME STREAM) ── */}
      <div className="w-full h-full relative">

        {isDirectVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            controlsList="nodownload noremoteplayback nofullscreen"
            disablePictureInPicture={true}
            playsInline={true}
            onContextMenu={(e) => e.preventDefault()}
            onTimeUpdate={() => {
              if (videoRef.current) {
                const cur = videoRef.current.currentTime;
                const dur = videoRef.current.duration;
                setCurrentTime(cur);
                setDuration(dur);
                if (dur > 0) {
                  updateProgress((cur / dur) * 100);
                }
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              updateProgress(100);
            }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={embedSrc}
            className="w-full h-full border-0 pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen={true}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            title={title}
          />
        )}

        {/* ── 7. PROMINENT BIG PLAY OVERLAY WHEN PAUSED (NON-DRIVE VIDEOS) ── */}
        {!isPlaying && !isDrive && (
          <div
            className="absolute inset-0 z-36 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer group/play transition-all duration-300"
            onClick={(e) => {
              e.preventDefault();
              togglePlay();
              triggerPlayPauseAnimation();
            }}
          >
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-purple-600/90 group-hover/play:bg-purple-500 text-white shadow-2xl flex items-center justify-center border-2 border-purple-300/50 group-hover/play:scale-110 transition-all duration-300">
              <Play className="h-8 w-8 sm:h-10 sm:w-10 ml-1 fill-white" />
            </div>
            <span className="mt-3 px-3 py-1 rounded-full bg-black/80 border border-white/20 text-xs font-semibold text-white tracking-wide shadow-lg group-hover/play:bg-purple-950/80 transition-colors">
              Click to Start Lecture
            </span>
          </div>
        )}

        {/* ── 8. CENTER TRANSPARENT SHIELD & CONTEXT MENU BLOCKER ── */}
        {/* For Google Drive: pointer-events-none so all clicks pass to Drive's native player */}
        {/* For non-Drive: interactive overlay for play/pause/fullscreen */}
        <div
          ref={overlayRef}
          className={`absolute inset-x-0 top-10 bottom-14 z-35 select-none ${
            isDrive
              ? "pointer-events-none"
              : "pointer-events-auto cursor-pointer flex items-center justify-center"
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toast({
              variant: "destructive",
              title: "Context Menu Restricted 🔒",
              description: "Right-clicking and developer options are disabled for secure video lectures.",
            });
          }}
          onClick={(e) => {
            if (!isDrive) {
              e.preventDefault();
              togglePlay();
              triggerPlayPauseAnimation();
            }
          }}
          onDoubleClick={(e) => {
            if (!isDrive) {
              e.preventDefault();
              toggleContainerFullscreen();
            }
          }}
          title={isDrive ? "" : "Click to Play/Pause • Double click for Fullscreen"}
        >
          {/* Transient Play/Pause Feedback Icon Animation (non-Drive only) */}
          {showPlayFeedback && !isDrive && (
            <div className="p-5 rounded-full bg-black/80 backdrop-blur-md text-purple-400 border border-purple-500/40 shadow-2xl pointer-events-none animate-in fade-in zoom-in-75 duration-200">
              {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1 fill-purple-400" />}
            </div>
          )}
        </div>

        {/* ── 8b. GOOGLE DRIVE RIGHT-CLICK BLOCKER (covers iframe, transparent) ── */}
        {isDrive && (
          <div
            className="absolute inset-0 z-34"
            style={{ pointerEvents: 'none' }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        )}

        {/* ── 9. ANTI-EXTRACTION CORNER MASKS & DRIVE SHIELDS ── */}
        {/* Google Drive Specific Anti-Download & Anti-Popout Shield Masks */}
        {isDrive ? (
          <>
            {/* Top-Right Google Drive Popout & Download Button Mask */}
            <div
              className="absolute top-0 right-0 w-48 h-16 z-[45] pointer-events-auto cursor-pointer bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                toast({
                  variant: "destructive",
                  title: "Download & External Pop-out Restricted 🔒",
                  description: "Direct Google Drive video downloads and pop-outs are strictly disabled for course lectures.",
                });
              }}
              title="Protected Google Drive Stream"
            />
            {/* Top-Left Drive Title Link Mask */}
            <div
              className="absolute top-0 left-0 w-48 h-16 z-[45] pointer-events-auto cursor-pointer bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                toast({
                  variant: "destructive",
                  title: "Protected Lecture Stream 🔒",
                  description: "Direct file URL extraction is prohibited by Cyber Security Guard.",
                });
              }}
              title="Protected Stream"
            />
          </>
        ) : (
          /* General Top Right Extraction Protection */
          <div
            className="absolute top-0 right-0 w-24 h-12 z-[40] pointer-events-auto cursor-pointer bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              toast({
                variant: "destructive",
                title: "External Links Restricted",
                description: "Direct lecture URLs are protected by Cyber Security Guard.",
              });
            }}
            title="Protected Stream"
          />
        )}

        {/* Bottom Right YouTube Link Guard Overlay */}
        {isYouTube && (
          <div
            className="absolute bottom-2 right-2 w-36 h-10 z-[45] pointer-events-auto cursor-pointer bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              toast({
                variant: "destructive",
                title: "External YouTube Access Restricted",
                description: "Direct YouTube navigation is disabled to preserve course watch progress tracking.",
              });
            }}
            title="Protected Stream"
          />
        )}
      </div>

      {/* ── 10. GLASSMOPHIC CUSTOM PLAYER CONTROLS BAR ── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 flex flex-col gap-2 transition-opacity duration-300 opacity-95 hover:opacity-100">
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-[10px] font-mono text-gray-300 shrink-0">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 600}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-700/80 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
          />
          <span className="text-[10px] font-mono text-gray-300 shrink-0">
            {duration > 0 ? formatTime(duration) : `${formatTime(currentTime)} watched`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Left Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Play / Pause Toggle Button (or Drive Timer Toggle) */}
            {isDrive ? (
              <button
                type="button"
                onClick={toggleDriveTimer}
                className={`h-8 px-3 rounded-full ${
                  driveTimerActive
                    ? "bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/50"
                    : "bg-purple-600 hover:bg-purple-500"
                } active:scale-95 text-white font-bold text-[11px] flex items-center gap-1.5 justify-center transition-all shrink-0 shadow`}
                title={driveTimerActive ? "Stop Watch Timer" : "Start Watch Timer — click after playing the video"}
              >
                {driveTimerActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5 fill-white" />}
                <span className="hidden sm:inline">{driveTimerActive ? "Timer On" : "Start Timer"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={togglePlay}
                className="h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold flex items-center justify-center transition-all shrink-0 shadow"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5 fill-white" />}
              </button>
            )}

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => skipTime(-10)}
              className="p-1.5 text-gray-300 hover:text-white transition-colors shrink-0"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-gray-300 hover:text-white transition-colors shrink-0"
              title={isMuted ? "Unmute (m)" : "Mute (m)"}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Live Time Counter Display */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-gray-300 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 shrink-0">
              <span className="text-purple-400 font-bold">{formatTime(currentTime)}</span>
              <span className="text-gray-500">/</span>
              <span>{duration > 0 ? formatTime(duration) : "Live Stream"}</span>
            </div>

            <span className="text-xs text-gray-300 font-medium truncate hidden md:inline-block ml-1">{title}</span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Speed Selector Menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-all border border-white/10"
                title="Playback Speed"
              >
                <Gauge className="h-3.5 w-3.5 text-purple-400" />
                <span>{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 min-w-[110px] animate-scale-in">
                  <span className="text-[10px] text-gray-400 px-2 py-1 uppercase font-bold tracking-wider">Speed</span>
                  {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeed(rate)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono text-left transition-colors flex items-center justify-between ${
                        playbackRate === rate ? "bg-purple-600 text-white font-bold" : "text-gray-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>{rate === 1 ? "1.0x (Normal)" : `${rate}x`}</span>
                      {rate === 2 && <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-bold">FAST</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleContainerFullscreen}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 border border-white/10 cursor-pointer shadow-sm"
              title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="hidden sm:inline text-[11px]">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
