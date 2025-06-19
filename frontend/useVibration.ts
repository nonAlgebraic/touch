import { useEffect, useRef } from "react";

interface UseVibrationOptions {
  enabled?: boolean;
}

export const useVibration = ({ enabled = false }: UseVibrationOptions) => {
  const vibrationTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!("vibrate" in navigator)) {
      return;
    }

    if (enabled) {
      startTimeRef.current = Date.now();

      // Clear any existing timeout first
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
      }

      // Start vibration pattern with randomness and sine wave modulation
      const vibratePattern = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTimeRef.current;

        // Calculate sine wave modulation (creates breathing/wave-like effect)
        const sineWave = Math.sin(elapsed * 0.002); // Slow wave
        const sineModulation = 1 + sineWave * 0.4; // 40% modulation

        // Base pattern with random variations
        const basePattern = [120, 80, 200, 60, 150, 100, 180, 70, 160, 90];
        const randomizedPattern = basePattern.map((duration) => {
          const randomFactor = 0.7 + Math.random() * 0.6; // 70%-130% of original
          const sineModulated = duration * sineModulation;
          return Math.round(sineModulated * randomFactor);
        });

        navigator.vibrate(randomizedPattern);

        // Randomize next interval (800-1400ms with sine wave influence)
        const baseInterval = 1000;
        const randomInterval = baseInterval + (Math.random() * 400 - 200); // ±200ms
        const sineInterval = randomInterval * (1 + sineWave * 0.2); // Sine affects timing

        vibrationTimeoutRef.current = setTimeout(
          vibratePattern,
          Math.max(500, sineInterval),
        );
      };

      vibratePattern();
    } else {
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
  }, [enabled]);
};
