import {
  useWebSocket,
  sendMsg,
  UseWebSocketReturn,
  WSRef,
  SetWSErrors,
} from './useWebSocket';

import {
  Mutate,
  PCRef,
  DCRef,
  SetDCErrors,
  SetDCState,
  useWebRTC,
  UseWebRTCReturn,
} from './useWebRTC';

type MutateWithServer = (ws: UseWebSocketReturn) => Mutate;

export const useWebRTCWithServer = (
  conf: RTCConfiguration,
  urlStr: string,
  mutate: MutateWithServer,
) => {
  const ws = useWebSocket(urlStr);
  const webrtc = useWebRTC(conf, mutate(ws));

  return { ...ws, ...webrtc };
};

const addOnicecandidateToPCRef = (
  pcRef: PCRef,
  wsRef: WSRef,
  setWSErrors: SetWSErrors,
) => {
  pcRef.current.onicecandidate = (event) => {
    console.log('RTCPeerConnection icecandidate:', event);
    if (event.candidate !== null) {
      sendMsg(wsRef, setWSErrors, { type: 'candidate', data: event.candidate });
    }
  };
};

const addDCHandlers = (
  dcRef: DCRef,
  setDCState: SetDCState,
  setDCErrors: SetDCErrors,
  wsRef: WSRef,
) => {
  dcRef.current.onopen = () => {
    setDCState('open');
    console.log('RTCDataChannel: open');

    if (wsRef.current) {
      // FIXME: i guess i can close websocket right after peerconnection becomes connected.
      wsRef.current.close(1000); // 1000 means its ok
    }
  };

  dcRef.current.onclose = () => {
    setDCState('closed');
  };

  dcRef.current.onerror = (error: RTCErrorEvent) => {
    console.log('RTCDataChannel error:', error);
    setDCErrors((prev) => [...prev, error.error]);
  };
};

export const mutateForOfferer: MutateWithServer =
  (ws: UseWebSocketReturn) => (webrtc: UseWebRTCReturn) => {
    const { wsRef, setWSErrors } = ws;
    const {
 pcRef, dcRef, setDCState, setDCErrors,
} = webrtc;

    addOnicecandidateToPCRef(pcRef, wsRef, setWSErrors);

    if (dcRef.current === null) {
      dcRef.current = pcRef.current.createDataChannel('sendChannel');
      addDCHandlers(dcRef, setDCState, setDCErrors, wsRef);
    }

    if (!wsRef.current.onmessage) {
      wsRef.current.onmessage = (event) => {
        const d = JSON.parse(event.data);
        console.log('webSocket onmessage:', d);

        if (d.type === 'ready') {
          pcRef.current
            .createOffer()
            .then((offer) => {
              pcRef.current.setLocalDescription(offer);
              return offer;
            })
            .then((offer) => {
              // FIXME:
              sendMsg(wsRef, setWSErrors, { type: 'offer', data: offer });
            })
            .catch((reason) => {
              console.log('webrtc: error', reason);
            });
        }
        if (d.type === 'candidate') {
          pcRef.current.addIceCandidate(d.data);
        }
        if (d.type === 'answer') {
          pcRef.current.setRemoteDescription(d.data);
        }
      };
    }
  };

export const mutateForAnswerer: MutateWithServer =
  (ws: UseWebSocketReturn) => (webrtc: UseWebRTCReturn) => {
    const { wsRef, setWSErrors } = ws;
    const {
 pcRef, dcRef, setDCState, setDCErrors,
} = webrtc;
    addOnicecandidateToPCRef(pcRef, wsRef, setWSErrors);
    if (dcRef.current === null) {
      pcRef.current.ondatachannel = (event) => {
        dcRef.current = event.channel;
        addDCHandlers(dcRef, setDCState, setDCErrors, wsRef);
      };
    }

    if (!wsRef.current.onmessage) {
      wsRef.current.onmessage = (event) => {
        const d = JSON.parse(event.data);
        console.log('websocket: onmessage:', d);

        if (d.type === 'offer') {
          pcRef.current
            .setRemoteDescription(d.data)
            .then(() => pcRef.current.createAnswer())
            .then((answer) => {
              pcRef.current.setLocalDescription(answer);
              return answer;
            })
            .then((answer) => {
              sendMsg(wsRef, setWSErrors, { type: 'answer', data: answer });
            })
            .catch((error) => console.error(error));
        }
        if (d.type === 'candidate') {
          if (!pcRef.current) {
            console.error(
              'webrtc: onmessage: recieved candidate but there is no remoteConnection',
            );
            return;
          }

          pcRef.current.addIceCandidate(d.data);
        }
      };
    }
  };
