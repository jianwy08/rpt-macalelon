import { useEffect, useRef } from "react";
// Import your Supabase instance here (adjust the path if necessary)
import { db } from "../utils/db"; 

export default function AutoLogout({ timeoutMinutes = 15 }) {
    const timeoutRef = useRef(null);

    useEffect(() => {
        // 🌟 Moved inside the useEffect to satisfy ESLint
        const logoutUser = async () => {
            alert("Your session has expired due to inactivity. You have been automatically logged out for security.");
            await db.auth.signOut(); 
            localStorage.clear();
            window.location.href = "/login"; 
        };

        // 🌟 Moved inside the useEffect to satisfy ESLint
        const resetTimer = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(logoutUser, timeoutMinutes * 60 * 1000);
        };

        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        // Attach the event listeners
        events.forEach((event) => window.addEventListener(event, resetTimer));
        
        // Start the initial countdown
        resetTimer();

        // Cleanup function when the component unmounts
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, [timeoutMinutes]); // 🌟 ESLint is now perfectly happy!

    return null; 
}