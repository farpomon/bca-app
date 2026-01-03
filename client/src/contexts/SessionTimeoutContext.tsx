import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionTimeoutContextType {
  resetTimer: () => void;
  remainingTime: number;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout

interface Props {
  children: ReactNode;
}

export function SessionTimeoutProvider({ children }: Props) {
  const { user, loading } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(TIMEOUT_DURATION);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Reset state
    setShowWarning(false);
    setRemainingTime(TIMEOUT_DURATION);
    lastActivityRef.current = Date.now();

    // Only set timers if user is logged in
    if (!user || loading) return;

    // Set warning timer (28 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = Math.max(0, TIMEOUT_DURATION - elapsed);
        setRemainingTime(remaining);

        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, TIMEOUT_DURATION - WARNING_TIME);

    // Set logout timer (30 minutes)
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, TIMEOUT_DURATION);
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      // Force reload to clear state
      window.location.href = "/";
    }
  };

  const handleContinue = () => {
    setShowWarning(false);
    resetTimer();
  };

  // Track user activity
  useEffect(() => {
    if (!user || loading) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    
    const activityHandler = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, activityHandler);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user, loading]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <SessionTimeoutContext.Provider value={{ resetTimer, remainingTime }}>
      {children}
      
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Timeout Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Your session will expire in <strong>{formatTime(remainingTime)}</strong> due to inactivity.
              <br />
              <br />
              Click "Continue Working" to stay logged in, or you will be automatically logged out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLogout}>Log Out Now</AlertDialogCancel>
            <AlertDialogAction onClick={handleContinue}>Continue Working</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SessionTimeoutContext.Provider>
  );
}

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error("useSessionTimeout must be used within a SessionTimeoutProvider");
  }
  return context;
}
