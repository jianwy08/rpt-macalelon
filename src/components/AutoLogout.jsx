import { useEffect, useRef } from "react";
// Uses your app's actual database instance
import { db } from "../utils/db"; 

export default function AutoLogout({ timeoutMinutes = 15 }) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    const logoutUser = async () => {
      try {
        // Attempt backend logout first
        await db.auth.signOut();
      } catch (error) {
        console.error("Backend logout error (safe to ignore):", error);
      } finally {
        // Clear all stored credentials
        localStorage.clear();
        sessionStorage.clear();

        alert("Your session has expired due to inactivity. You have been automatically logged out for security.");
        window.location.href = "/login";
      }
    };

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(logoutUser, timeoutMinutes * 60 * 1000);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

    // Attach activity listeners
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Start initial timer
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [timeoutMinutes]);

  return null;
}