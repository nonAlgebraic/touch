import { useEffect, useRef } from "react";

interface UseVibrationOptions {
  pattern?: number[];
  interval?: number;
  enabled?: boolean;
}

export const useVibration = ({
  pattern = [120, 80, 200, 60, 150, 100, 180, 70, 160, 90],
  interval = 1000,
  enabled = false,
}: UseVibrationOptions) => {
  const vibrationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!("vibrate" in navigator)) {
      return;
    }

    if (enabled) {
      // Clear any existing timeout first
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
      }

      // Start vibration pattern
      const vibratePattern = () => {
        navigator.vibrate(pattern);
        vibrationTimeoutRef.current = setTimeout(vibratePattern, interval);
      };
      console.log("touched!");
      vibratePattern();
    } else {
      console.log("untouched.");
      // Stop vibration AND clear the timeout
      navigator.vibrate(0);
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
        vibrationTimeoutRef.current = null;
      }
    }

    // Cleanup function to clear timeout when component unmounts or deps change
    return () => {
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
      }
      navigator.vibrate(0);
    };
  }, [enabled, pattern, interval]);
};
