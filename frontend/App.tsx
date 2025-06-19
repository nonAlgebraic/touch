import {
  FC,
  PointerEventHandler,
  useCallback,
  useState,
  useEffect,
} from "react";
import { useMachine } from "@xstate/react";

import { machine } from "./machine";
import { useVibration } from "./useVibration";

export const App: FC = () => {
  const [snapshot, send] = useMachine(machine);
  const [copied, setCopied] = useState(false);
  const [backgroundPulse, setBackgroundPulse] = useState(0);

  const isBeingTouched = snapshot.matches({
    connected: { readyToReceive: "touched" },
  });

  const isTouching = snapshot.matches({
    connected: { readyToSend: "touching" },
  });

  useVibration({
    enabled: isBeingTouched,
  });

  // Background pulse effect synchronized with touch states
  useEffect(() => {
    if (isBeingTouched || isTouching) {
      const interval = setInterval(() => {
        setBackgroundPulse((prev) => prev + 1);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isBeingTouched, isTouching]);

  const handleCopyId = useCallback(async () => {
    if (snapshot.context.peer.id) {
      try {
        await navigator.clipboard.writeText(snapshot.context.peer.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  }, [snapshot.context.peer.id]);

  const handleSubmit = useCallback(
    (formData: FormData) => {
      send({
        type: "CONNECT_TO_PEER_BY_ID",
        peerId: formData.get("peerId") as string,
      });
    },
    [send],
  );

  const handleTouch = useCallback<PointerEventHandler<HTMLButtonElement>>(
    (event) => {
      console.log({ event });
      if (event.type === "pointerdown") {
        send({
          type: "OUTGOING_TOUCH_START",
        });
      } else if (event.type === "pointerup") {
        send({
          type: "OUTGOING_TOUCH_END",
        });
      }
    },
    [],
  );

  if (
    snapshot.matches("openingPeer") ||
    snapshot.matches({ connecting: "waitingForConnectionFromPeer" })
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8 text-white">
        <div className="text-center space-y-8 max-w-md w-full">
          <div className="text-6xl font-thin tracking-wider">TOUCH</div>
          <div className="text-sm opacity-70 font-light tracking-wide">
            {snapshot.context.peer.id && (
              <div className="mb-4 flex items-center justify-center gap-3">
                <span>ID: {snapshot.context.peer.id}</span>
                <button
                  onClick={handleCopyId}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded text-xs hover:bg-white/20 transition-colors"
                >
                  {copied ? "copied!" : "copy"}
                </button>
              </div>
            )}
            waiting for connection...
          </div>
          <form action={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="peerId"
              placeholder="enter peer ID"
              className="w-full bg-white/10 border border-white/20 rounded-none px-6 py-4 text-center text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:border-white/40 font-light tracking-wide"
            />
            <button
              type="submit"
              className="w-full py-4 bg-purple-600/80 border border-purple-500/50 rounded-none text-white font-medium tracking-wide hover:bg-purple-500/80 transition-colors shadow-lg"
            >
              connect
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (snapshot.matches({ connecting: "initiatingConnectionToPeer" })) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl font-thin tracking-wider mb-8">TOUCH</div>
          <div className="text-sm opacity-70 font-light tracking-wide">
            connecting...
          </div>
        </div>
      </div>
    );
  }

  // Connected state - full screen touch button
  const touchIntensity =
    isBeingTouched || isTouching
      ? Math.sin(backgroundPulse * 0.3) * 0.5 + 0.5
      : 0;
  const glowIntensity = touchIntensity * 100;

  return (
    <button
      type="button"
      onPointerDown={handleTouch}
      onPointerUp={handleTouch}
      className="w-screen h-screen border-0 outline-0 cursor-none select-none overflow-hidden relative"
      style={{
        background: `radial-gradient(circle at center,
          hsl(${280 + touchIntensity * 40}, ${70 + touchIntensity * 30}%, ${10 + touchIntensity * 30}%) 0%,
          hsl(${250 + touchIntensity * 20}, ${50 + touchIntensity * 40}%, ${5 + touchIntensity * 20}%) 100%)`,
        boxShadow: `inset 0 0 ${glowIntensity}px hsl(${300 + touchIntensity * 60}, 80%, 60%)`,
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center text-white transition-all duration-300"
        style={{
          opacity: 0.3 + touchIntensity * 0.7,
          transform: `scale(${1 + touchIntensity * 0.1})`,
          filter: `blur(${touchIntensity * 2}px)`,
        }}
      >
        <div className="text-4xl md:text-8xl font-thin tracking-[0.2em] md:tracking-[0.5em] animate-pulse px-4">
          {isTouching ? "TOUCHING" : isBeingTouched ? "FEELING" : "TOUCH"}
        </div>
      </div>

      {/* Ripple effects */}
      {(isBeingTouched || isTouching) && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 rounded-full border border-white/20 animate-ping"
            style={{
              transform: `scale(${0.5 + touchIntensity * 2})`,
              opacity: 1 - touchIntensity,
            }}
          />
          <div
            className="absolute inset-0 rounded-full border border-white/10 animate-ping"
            style={{
              transform: `scale(${1 + touchIntensity * 3})`,
              opacity: 0.5 - touchIntensity * 0.5,
              animationDelay: "0.2s",
            }}
          />
        </div>
      )}
    </button>
  );
};
