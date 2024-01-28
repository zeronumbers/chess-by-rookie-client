import {
  useEffect,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from 'react';

export type PCRef = MutableRefObject<RTCPeerConnection>;
export type DCRef = MutableRefObject<RTCDataChannel>;
export type DCErrors = RTCError[];
export type SetDCErrors = Dispatch<SetStateAction<DCErrors>>;
export type PCErrors = RTCPeerConnectionIceErrorEvent[];
export type SetPCErrors = Dispatch<SetStateAction<PCErrors>>;
export type PCState = null | 'connected' | 'disconnected' | 'failed' | 'closed';
export type SetPCState = Dispatch<SetStateAction<PCState>>;
export type DCState = null | 'open' | 'closed';
export type SetDCState = Dispatch<SetStateAction<DCState>>;

// FIXME: is it not an error to use type before it is defined?
export type Mutate = (webrtc: UseWebRTCReturn) => void;

export const useWebRTC = (conf: RTCConfiguration, mutate: Mutate) => {
  const [dcErrors, setDCErrors] = useState<DCErrors>([]);
  const [pcErrors, setPCErrors] = useState<PCErrors>([]);
  const [pcState, setPCState] = useState<PCState>(null);
  const [dcState, setDCState] = useState<DCState>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    if (pcRef.current === null || pcRef.current?.connectionState === 'closed') {
      const pc = new RTCPeerConnection(conf);

      pc.onicecandidateerror = (error: RTCPeerConnectionIceErrorEvent) => {
        console.log('RTCPeerConnection icecandidateerror:, error');
        setPCErrors((prev) => [...prev, error]);
      };

      pc.onconnectionstatechange = (event) => {
        console.log(
          'RTCPeerConnection connectionstatechange:',
          pc.connectionState,
          event,
        );
        switch (pc.connectionState) {
          case 'connected': {
            setPCState('connected');
            break;
          }
          case 'disconnected': {
            setPCState('disconnected');
            break;
          }
          case 'closed': {
            setPCState('closed');
            break;
          }
          case 'failed': {
            setPCState('failed');
            break;
          }
          default:
        }
      };

      pcRef.current = pc;

      // FIXME: is this a bad design? how to improve it?
      mutate({
        pcRef,
        dcRef,
        dcErrors,
        setDCErrors,
        pcErrors,
        setPCErrors,
        pcState,
        setPCState,
        dcState,
        setDCState,
      });
    }

    return () => {
      if (pcRef.current && pcRef.current.connectionState === 'connected') {
        if (dcRef.current) {
          /* FIXME: should i close the actual dc instead of ref?
             I can make mutate return a cleanup function,
             which i can call here to close actual dc. */
          dcRef.current.close();
          dcRef.current = null;
        }

        pcRef.current.close();
        pcRef.current = null;

        setDCErrors([]);
        setPCErrors([]);
        setPCState(null);
        setDCState(null);
      }
    };

    // FIXME: how to deal with this? I need this hook to run only once
    // error is because of mutate using those values,
    /* if mutate is moved outside, then i still need useeffect,
       and mutate in it, with all the values as here. */
  }, []);

  return {
    pcRef,
    dcRef,
    dcErrors,
    setDCErrors,
    pcErrors,
    setPCErrors,
    pcState,
    setPCState,
    dcState,
    setDCState,
  };
};

export type UseWebRTCReturn = ReturnType<typeof useWebRTC>;
