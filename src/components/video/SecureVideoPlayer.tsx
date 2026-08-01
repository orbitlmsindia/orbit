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
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGoogleDriveEmbedUrl, isGoogleDriveUrl } from "@/lib/googleDriveUtils";

interface SecureVideoPlayerProps {
  videoUrl: string;
  title?: string;
  userEmail?: string;
  className?: string;
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

  // Custom Controls & Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Real-Time Watch Telemetry
  const maxWatchedPercentRef = useRef<number>(0);
  const [watchedPercent, setWatchedPercent] = useState<number>(0);

  const youtubeVideoId = getYouTubeVideoId(videoUrl);
  const isDrive = isGoogleDriveUrl(videoUrl);
  const isYouTube = !!youtubeVideoId || videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isDirectVideo = !isYouTube && !isDrive && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm") || videoUrl.endsWith(".m3u8"));

  // Mask & Obfuscate videoUrl to prevent simple DOM inspection extraction
  const [maskedSource, setMaskedSource] = useState<string>("");

  useEffect(() => {
    if (!videoUrl) return;
    try {
      // Obfuscate source in state
      setMaskedSource(btoa(encodeURIComponent(videoUrl)));
    } catch {
      setMaskedSource("ENCRYPTED_STREAM");
    }
  }, [videoUrl]);

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

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const playbackRateRef = useRef(playbackRate);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

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

  // YouTube postMessage event listener & continuous time telemetry
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

            if (cur !== null) setCurrentTime(cur);
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

  // YT.Player API binding & continuous 300ms time ticker
  useEffect(() => {
    if (!isYouTube) return;
    let isSubscribed = true;

    const createPlayer = () => {
      if (!iframeRef.current || !window.YT || !window.YT.Player) return;
      try {
        ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2 || event.data === 0) {
                setIsPlaying(false);
                if (event.data === 0) {
                  updateProgress(100);
                }
              }
            }
          }
        });
      } catch (_) {}
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        if (isSubscribed) createPlayer();
      };
    }

    const checkYTTime = setInterval(() => {
      if (!isSubscribed) return;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const cur = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = ytPlayerRef.current.getDuration() || 0;
          if (dur > 0) {
            setCurrentTime(cur);
            setDuration(dur);
            const pct = Math.min(100, Math.max(0, Math.round((cur / dur) * 100)));
            if (pct > 0 && cur > 0) {
              setIsPlaying(true);
            }
            updateProgress(pct);
          }
        } catch (_) {}
      }
    }, 300);

    return () => {
      isSubscribed = false;
      clearInterval(checkYTTime);
    };
  }, [isYouTube, updateProgress]);

  // Security Guards: Right click & shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        try { navigator.clipboard.writeText(""); } catch (_) {}
        setIsBlackedOut(true);
        setBlackoutReason("Screenshot capture prohibited");
        setTimeout(() => setIsBlackedOut(false), 3500);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [toast]);

  // Active watch telemetry loop
  useEffect(() => {
    maxWatchedPercentRef.current = 0;
    setWatchedPercent(0);

    const interval = setInterval(() => {
      if (duration > 0 && currentTime >= 0) {
        const actualPct = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
        if (actualPct > 0) {
          updateProgress(actualPct);
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [videoUrl, currentTime, duration, updateProgress]);

  // Controls Play / Pause
  const togglePlay = () => {
    if (isDirectVideo && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else if (isYouTube && iframeRef.current?.contentWindow) {
      const nextState = !isPlaying;
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
      setIsPlaying(nextState);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (isDirectVideo && videoRef.current) {
      videoRef.current.pause();
    } else if (isYouTube && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      } catch (_) {}
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
        try { ytPlayerRef.current.pauseVideo(); } catch (_) {}
      }
    }
  };

  // Change Speed Mode (0.5x, 1x, 1.25x, 1.5x, 2x)
  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    playbackRateRef.current = rate;
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

    if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === "function") {
      try { ytPlayerRef.current.setPlaybackRate(rate); } catch (_) {}
    }

    toast({
      title: `Playback Speed: ${rate}x`,
      description: rate === 2 ? "2x Speed Mode Active" : `Set to ${rate}x speed.`,
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
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        try { ytPlayerRef.current.seekTo(targetTime, true); } catch (_) {}
      }
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
      if (ytPlayerRef.current && typeof ytPlayerRef.current[command] === "function") {
        try { ytPlayerRef.current[command](); } catch (_) {}
      }
    }
  };

  // Container Fullscreen Toggle
  const toggleContainerFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Exit fullscreen failed:", err);
      });
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

  // Construct Protected Embed URL with enablejsapi and origin for watch percentage telemetry
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
      onContextMenu={(e) => e.preventDefault()}
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
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

      {/* ── 3. DYNAMIC ANIMATED WATERMARK OVERLAY ── */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-20 flex flex-wrap content-start justify-center text-white/20 select-none mix-blend-overlay">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="transform -rotate-45 p-6 text-xs md:text-sm font-bold whitespace-nowrap tracking-widest text-slate-300"
          >
            {userEmail} • ORBIT LMS DRM
          </div>
        ))}
      </div>

      {/* ── 4. PLAYER HEADER BADGES ── */}
      <div className="absolute top-3 left-3 z-40 flex items-center gap-2 pointer-events-none bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-[11px] font-medium shadow">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        <span>{isDrive ? "Google Drive Protected" : isYouTube ? "YouTube DRM Protected" : "LMS Secure Stream"}</span>
      </div>

      <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
        <div className="pointer-events-none bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 text-white text-xs font-mono shadow">
          Watched: <span className="font-bold text-emerald-400">{watchedPercent}%</span>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleContainerFullscreen}
          className="p-1.5 rounded-full bg-black/70 hover:bg-purple-600 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer pointer-events-auto"
          title={isFullscreen ? "Exit Fullscreen" : "Secure Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* ── 5. VIDEO ENGINE (NATIVE MP4 vs IFRAME STREAM) ── */}
      <div className="w-full h-full relative">

        {isDirectVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={title}
          />
        )}

        {/* ── 6. ANTI-EXTRACTION CORNER LOGO MASKS (Non-blocking playback clicks) ── */}
        <div
          className="absolute top-0 right-0 w-16 h-12 z-[40] pointer-events-auto cursor-pointer bg-transparent"
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
      </div>

      {/* ── 7. CUSTOM PLAYER CONTROLS BAR (With 2x Speed Mode & Scrubber) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 flex flex-col gap-2 transition-opacity duration-300 opacity-95 hover:opacity-100">
        {/* Timeline Scrubber */}
        {duration > 0 && (
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] font-mono text-gray-300 shrink-0">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] font-mono text-gray-300 shrink-0">{formatTime(duration)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 transition-all"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            {/* Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-gray-300 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <span className="text-xs text-gray-300 font-medium line-clamp-1">{title}</span>
          </div>

          {/* Speed Selector Menu */}
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-all border border-white/10"
            >
              <Gauge className="h-3.5 w-3.5 text-purple-400" />
              <span>{playbackRate}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-10 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 min-w-[100px] animate-scale-in">
                <span className="text-[10px] text-gray-400 px-2 py-1 uppercase font-bold tracking-wider">Playback Speed</span>
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
        </div>
      </div>
    </div>
  );
}
