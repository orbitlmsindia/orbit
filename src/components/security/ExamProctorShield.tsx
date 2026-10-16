import React, { useState, useEffect, useRef } from "react";
import { Shield, ShieldAlert, AlertTriangle, Maximize2, Lock, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ExamProctorShieldProps {
  examTitle: string;
  isStarted: boolean;
  isSubmitted: boolean;
  maxViolations?: number;
  userEmail?: string;
  studentName?: string;
  studentId?: string;
  onStartExam: () => void;
  onViolationLimitReached: (totalViolations: number) => void;
  onViolationLogged?: (type: string, count: number) => void;
}

export function ExamProctorShield({
  examTitle,
  isStarted,
  isSubmitted,
  maxViolations = 3,
  userEmail = "student@orbitlms.com",
  studentName = "Orbit Student",
  studentId = "",
  onStartExam,
  onViolationLimitReached,
  onViolationLogged,
}: ExamProctorShieldProps) {
  const { toast } = useToast();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWarningOpen, setFullscreenWarningOpen] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(15);
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [blackoutReason, setBlackoutReason] = useState("");
  const [violations, setViolations] = useState(0);
  const [agreementOpen, setAgreementOpen] = useState(!isStarted && !isSubmitted);

  const countdownTimerRef = useRef<any>(null);

  // Request Fullscreen helper
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setFullscreenWarningOpen(false);
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      // Even if fullscreen is rejected by browser permissions, allow continuation with tracking
      setIsFullscreen(true);
      setFullscreenWarningOpen(false);
    }
  };

  const handleStartExamAgreement = async () => {
    setAgreementOpen(false);
    await enterFullscreen();
    onStartExam();
  };

  // 1. Fullscreen Change Listener
  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      setIsFullscreen(isFull);

      if (!isFull && isStarted && !isSubmitted) {
        setFullscreenWarningOpen(true);
        setFullscreenCountdown(15);
        recordViolation("fullscreen_exit");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isStarted, isSubmitted]);

  // Fullscreen Countdown Timer
  useEffect(() => {
    if (fullscreenWarningOpen && !isSubmitted) {
      countdownTimerRef.current = setInterval(() => {
        setFullscreenCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            setFullscreenWarningOpen(false);
            onViolationLimitReached(violations + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownTimerRef.current);
    }
  }, [fullscreenWarningOpen, isSubmitted, violations, onViolationLimitReached]);

  // Record Violation Helper
  const recordViolation = (type: string) => {
    if (isSubmitted) return;
    setViolations((prev) => {
      const next = prev + 1;
      onViolationLogged?.(type, next);

      if (next >= maxViolations) {
        toast({
          variant: "destructive",
          title: "🚨 Exam Security Breach Terminated",
          description: `Exceeded the maximum permitted security violations (${next}/${maxViolations}). Your exam is being automatically submitted.`,
        });
        onViolationLimitReached(next);
      } else {
        toast({
          variant: "destructive",
          title: `⚠️ Proctoring Warning (${next}/${maxViolations})`,
          description:
            type === "tab_switch"
              ? "Tab switching or window unfocus detected! Keep your exam window active."
              : type === "screenshot"
              ? "Screen capture prohibited! Confidential exam content is protected."
              : "Exited fullscreen mode! Please return to fullscreen immediately.",
        });
      }
      return next;
    });
  };

  // 2. Tab Switching & Focus Loss Detection
  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlackedOut(true);
        setBlackoutReason("Tab switch or backgrounding detected. Exam questions hidden.");
        recordViolation("tab_switch");
      } else {
        setTimeout(() => setIsBlackedOut(false), 2000);
      }
    };

    const handleWindowBlur = () => {
      // Don't trigger if user is interacting with normal form elements
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      setIsBlackedOut(true);
      setBlackoutReason("Window focus lost. Exam questions shielded.");
      recordViolation("tab_switch");
      setTimeout(() => setIsBlackedOut(false), 2500);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isStarted, isSubmitted]);

  // 3. Strict Keyboard, DevTools & Screen Capture Blocking
  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Right-Click Disabled",
        description: "Context menu is disabled for examination integrity.",
      });
      return false;
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Copying Blocked",
        description: "Copying exam questions or options is strictly prohibited.",
      });
      return false;
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        variant: "destructive",
        title: "Pasting Blocked",
        description: "Pasting external text is prohibited during proctored exams.",
      });
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. PrintScreen Interception
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        try {
          navigator.clipboard.writeText(
            "LEAK PREVENTION: OrbitLMS confidential examination paper. Screenshots strictly prohibited and tracked."
          );
        } catch (_) {}
        setIsBlackedOut(true);
        setBlackoutReason("Screenshot capture prohibited. Violation logged.");
        recordViolation("screenshot");
        setTimeout(() => setIsBlackedOut(false), 3500);
        return;
      }

      // Mac screenshot shortcuts: Cmd + Shift + 3, 4, 5
      if (e.metaKey && e.shiftKey && ["3", "4", "5", "s", "S"].includes(e.key)) {
        e.preventDefault();
        try {
          navigator.clipboard.writeText("");
        } catch (_) {}
        setIsBlackedOut(true);
        setBlackoutReason("Screen capture shortcut prohibited.");
        recordViolation("screenshot");
        setTimeout(() => setIsBlackedOut(false), 3500);
        return;
      }

      // 2. DevTools Blocking (F12, Ctrl+Shift+I/J/C)
      if (
        e.key === "F12" ||
        e.code === "F12" ||
        (e.ctrlKey && e.shiftKey && ["KeyI", "KeyJ", "KeyC", "i", "I", "j", "J", "c", "C"].includes(e.code || e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        toast({
          variant: "destructive",
          title: "Developer Tools Disabled",
          description: "Developer tools and code inspect are strictly blocked.",
        });
        return;
      }

      // 3. View Source (Ctrl+U) & Save (Ctrl+S) & Print (Ctrl+P)
      if (
        e.ctrlKey &&
        ["u", "U", "s", "S", "p", "P"].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        toast({
          variant: "destructive",
          title: "Action Prohibited",
          description: "Printing, saving, or inspecting exam source is blocked.",
        });
        return;
      }

      // 4. Select All (Ctrl+A)
      if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
        const isInput =
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA";
        if (!isInput) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStarted, isSubmitted]);

  return (
    <>
      {/* 1. Pre-Exam Proctoring & Integrity Agreement Modal */}
      <Dialog open={agreementOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-2 border-primary/30 shadow-2xl">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display">
                Proctored Examination Integrity Check
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {examTitle} • OrbitLMS Secure Assessment Protocol
              </DialogDescription>
            </div>
          </div>

          <div className="p-6 space-y-4 text-sm max-h-[60vh] overflow-y-auto">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Examinee:</span>
              <span className="font-bold text-foreground truncate max-w-[240px]">
                {studentName} ({userEmail})
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This examination is administered under OrbitLMS automated proctoring protocols to ensure fair academic competition:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background border border-border/60">
                <Maximize2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Mandatory Fullscreen Lock</p>
                  <p className="text-muted-foreground">Exiting fullscreen will trigger an automatic violation warning and countdown timer.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background border border-border/60">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Tab-Switch & Multi-Window Limit</p>
                  <p className="text-muted-foreground">Switching browser tabs or applications is strictly tracked. Exceeding {maxViolations} warnings will auto-submit the exam.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background border border-border/60">
                <Lock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Copy / Paste & Leak Prevention</p>
                  <p className="text-muted-foreground">Copying questions, pasting external answers, and taking screenshots are blocked. Dynamic forensic watermarks are embedded.</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground italic text-center pt-1">
              By clicking "Enter Fullscreen & Begin", you acknowledge and agree to abide by institutional honor code standards.
            </p>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t flex items-center justify-end">
            <Button
              className="gap-2 font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={handleStartExamAgreement}
            >
              <Shield className="h-4 w-4" /> Enter Fullscreen & Begin Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Fullscreen Breach Warning Modal */}
      <Dialog open={fullscreenWarningOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md p-6 border-2 border-destructive/50 bg-background shadow-2xl text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold text-destructive">
              Fullscreen Mode Exited!
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground">
              Proctored examinations require continuous fullscreen mode to prevent unauthorized aids.
            </DialogDescription>
          </div>

          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Return to Fullscreen In
            </p>
            <p className="text-3xl font-mono font-bold text-destructive mt-1">
              {fullscreenCountdown}s
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Exam will be automatically submitted if not returned in time.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              className="w-full gap-2 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
              onClick={enterFullscreen}
            >
              <Maximize2 className="h-4 w-4" /> Return to Fullscreen Immediately
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Screen Capture / Focus Loss Blackout Curtain */}
      {isBlackedOut && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-6 text-center select-none animate-fade-in">
          <div className="h-20 w-20 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 mb-4 animate-bounce">
            <EyeOff className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight font-display mb-2 text-red-400">
            PROTECTION SHIELD ACTIVE
          </h2>
          <p className="text-sm text-slate-300 max-w-md leading-relaxed mb-4">
            {blackoutReason || "Exam content hidden due to window inactivity or recording attempt."}
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-400">
            Student: {userEmail} • Session Protected by OrbitLMS DRM
          </div>
        </div>
      )}
    </>
  );
}
