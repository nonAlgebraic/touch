import { FC, PointerEventHandler, useCallback } from "react";
import { useMachine } from "@xstate/react";
import { createBrowserInspector } from "@statelyai/inspect";
import { machine } from "./machine";
import { useVibration } from "./useVibration";

const { inspect } = createBrowserInspector();

export const App: FC = () => {
  const [snapshot, send] = useMachine(machine, { inspect });

  const isBeingTouched = snapshot.matches({
    connected: { readyToReceive: "touched" },
  });

  useVibration({
    enabled: isBeingTouched,
    pattern: [120, 80, 200, 60, 150, 100, 180, 70, 160, 90],
    interval: 1000,
  });

  const action = useCallback((formData: FormData) => {
    send({
      type: "CONNECT_TO_PEER_BY_ID",
      peerId: formData.get("peerId") as string,
    });
  }, []);

  const handleSubmit = useCallback(
    (formData: FormData) => {
      send({
        type: "CONNECT_TO_PEER_BY_ID",
        peerId: formData.get("peerId") as string,
      });
    },
    [action],
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

  return snapshot.matches("openingPeer") ||
    snapshot.matches({ connecting: "waitingForConnectionFromPeer" }) ? (
    <label>
      <p>My ID: {snapshot.context.peer.id}</p>
      waiting for peer to conect... or, enter peer ID to initiate connection:
      <form action={handleSubmit}>
        <input type="text" name="peerId" />
      </form>
    </label>
  ) : snapshot.matches({ connecting: "initiatingConnectionToPeer" }) ? (
    <label>initiating connection to peer...</label>
  ) : (
    <div>
      <p>connection established! go ahead and touch.</p>
      <button
        type="button"
        onPointerDown={handleTouch}
        onPointerUp={handleTouch}
      >
        touch
      </button>
    </div>
  );
};
