import {
  setup,
  fromPromise,
  EventObject,
  assertEvent,
  assign,
  fromCallback,
} from "xstate";
import { DataConnection, Peer } from "peerjs";

type ConnectToPeerByIdEvent = EventObject & {
  type: "CONNECT_TO_PEER_BY_ID";
  peerId: string;
};

type IncomingTouchStart = EventObject & {
  type: "INCOMING_TOUCH_START";
};

type IncomingTouchEnd = EventObject & {
  type: "INCOMING_TOUCH_END";
};

type OutgoingTouchStart = EventObject & {
  type: "OUTGOING_TOUCH_START";
};

type OutgoingTouchEnd = EventObject & {
  type: "OUTGOING_TOUCH_END";
};

type ConnectionClosed = EventObject & {
  type: "CONNECTION_CLOSED";
};

const TOUCH_START_MESSAGE = "touchstart";
const TOUCH_END_MESSAGE = "touchend";

export const machine = setup({
  types: {
    context: {} as {
      peer: Peer;
      connection?: DataConnection;
    },
    events: {} as
      | ConnectToPeerByIdEvent
      | IncomingTouchStart
      | IncomingTouchEnd
      | OutgoingTouchStart
      | OutgoingTouchEnd
      | ConnectionClosed,
  },
  actions: {
    storePeerId: (_, params: { peerId: string }) => {
      localStorage.setItem("peerId", params.peerId);
    },
    outgoingTouchStart: ({ context: { connection } }) => {
      connection!.send(TOUCH_START_MESSAGE);
    },
    outgoingTouchEnd: ({ context: { connection } }) => {
      connection!.send(TOUCH_END_MESSAGE);
    },
  },
  actors: {
    openPeer: fromPromise<string, Peer>(
      ({ input: peer }) =>
        new Promise((resolve) => {
          peer.on("open", (peerId) => {
            resolve(peerId);
          });
        }),
    ),
    waitForConnectionFromPeer: fromPromise<DataConnection, Peer>(
      ({ input: peer, signal }) =>
        new Promise((resolve) => {
          peer.on("connection", (connection) => {
            resolve(connection);
          });
          signal.onabort = () => {
            peer.removeAllListeners("connection");
          };
        }),
    ),
    initiateConnectionToPeer: fromPromise<
      DataConnection,
      { peer: Peer; destinationPeerId: string }
    >(
      ({ input: { peer, destinationPeerId }, signal }) =>
        new Promise((resolve) => {
          const connection = peer.connect(destinationPeerId);
          connection.on("open", () => {
            resolve(connection);
          });
          signal.onabort = () => {
            connection.removeAllListeners("open");
          };
        }),
    ),
    listenToIncomingTouches: fromCallback<EventObject, DataConnection>(
      ({ input: connection, sendBack }) => {
        connection.on("data", (data) => {
          console.log(data);
          if (data === TOUCH_START_MESSAGE) {
            sendBack({
              type: "INCOMING_TOUCH_START",
            } satisfies IncomingTouchStart);
          } else if (data === TOUCH_END_MESSAGE) {
            sendBack({
              type: "INCOMING_TOUCH_END",
            } satisfies IncomingTouchEnd);
          } else {
            throw new Error(`Unexpected data: ${data}`);
          }
        });
      },
    ),
    listenToConnectionClose: fromCallback<EventObject, DataConnection>(
      ({ input: connection, sendBack }) => {
        connection.on("close", () => {
          sendBack({
            type: "CONNECTION_CLOSED",
          } satisfies ConnectionClosed);
        });
      },
    ),
  },
}).createMachine({
  initial: "openingPeer",
  context: () => {
    const storedPeerId = localStorage.getItem("peerId");

    return {
      peer: storedPeerId ? new Peer(storedPeerId) : new Peer(),
    };
  },
  states: {
    openingPeer: {
      invoke: {
        src: "openPeer",
        input: ({ context }) => context.peer,
        onDone: {
          target: "connecting",
          actions: {
            type: "storePeerId",
            params: ({ event }) => ({ peerId: event.output }),
          },
        },
      },
    },
    connecting: {
      initial: "waitingForConnectionFromPeer",
      invoke: {
        src: "waitForConnectionFromPeer",
        input: ({ context: { peer } }) => peer,
        onDone: {
          target: "#connected",
          actions: assign(({ event }) => ({ connection: event.output })),
        },
      },
      states: {
        waitingForConnectionFromPeer: {
          on: {
            CONNECT_TO_PEER_BY_ID: "initiatingConnectionToPeer",
          },
        },
        initiatingConnectionToPeer: {
          invoke: {
            src: "initiateConnectionToPeer",
            input: ({ context: { peer }, event }) => {
              assertEvent(event, "CONNECT_TO_PEER_BY_ID");

              return {
                peer,
                destinationPeerId: event.peerId,
              };
            },
            onDone: {
              target: "#connected",
              actions: assign(({ event }) => ({ connection: event.output })),
            },
          },
        },
      },
    },
    connected: {
      id: "connected",
      type: "parallel",
      on: {
        CONNECTION_CLOSED: {
          target: "connecting",
          actions: assign(() => ({ connection: undefined })),
        },
      },
      states: {
        readyToReceive: {
          invoke: {
            src: "listenToIncomingTouches",
            input: ({ context: { connection } }) => connection!,
          },
          on: {
            INCOMING_TOUCH_START: ".touched",
            INCOMING_TOUCH_END: ".untouched",
          },
          initial: "untouched",
          states: {
            untouched: {},
            touched: {},
          },
        },
        readyToSend: {
          initial: "notTouching",
          on: {
            OUTGOING_TOUCH_START: ".touching",
            OUTGOING_TOUCH_END: ".notTouching",
          },
          states: {
            notTouching: {
              entry: "outgoingTouchEnd",
            },
            touching: {
              entry: "outgoingTouchStart",
            },
          },
        },
      },
    },
  },
});
