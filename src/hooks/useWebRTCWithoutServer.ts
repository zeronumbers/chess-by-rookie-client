import {
 useEffect, useState, Dispatch, SetStateAction,
} from 'react';

import {
  Mutate,
  PCRef,
  DCRef,
  SetDCErrors,
  SetDCState,
  useWebRTC,
  UseWebRTCReturn,
} from './useWebRTC';

export type LocalDescription = RTCSessionDescriptionInit | null;
export type SetLocalDescription = Dispatch<SetStateAction<LocalDescription>>;
export type HasRemoteDescription = boolean;
export type SetHasRemoteDescription = Dispatch<
  SetStateAction<HasRemoteDescription>
>;
export type IceCandidates = (RTCIceCandidate | null)[];
export type SetIceCandidates = Dispatch<SetStateAction<IceCandidates>>;
export type WithoutServer = {
  localDescription: LocalDescription;
  setLocalDescription: SetLocalDescription;
  hasRemoteDescription: HasRemoteDescription;
  setHasRemoteDescription: SetHasRemoteDescription;
  iceCandidates: IceCandidates;
  setIceCandidates: SetIceCandidates;
};

export type MutateWithoutServer = (obj: WithoutServer) => Mutate<WithoutServer>;

export const useWebRTCWithoutServer = (
  conf: RTCConfiguration,
  mutate: MutateWithoutServer,
) => {
  const [localDescription, setLocalDescription] =
    useState<RTCSessionDescriptionInit | null>(null);
  const [hasRemoteDescription, setHasRemoteDescription] =
    useState<HasRemoteDescription>(false);
  const [iceCandidates, setIceCandidates] = useState<IceCandidates>([]);

  const webrtc = useWebRTC(
    conf,
    mutate({
      localDescription,
      setLocalDescription,
      hasRemoteDescription,
      setHasRemoteDescription,
      iceCandidates,
      setIceCandidates,
    }),
  );

  useEffect(() => () => {
      setLocalDescription(null);
      setHasRemoteDescription(false);
      setIceCandidates([]);
    }, []);

  return {
    localDescription,
    setLocalDescription,
    hasRemoteDescription,
    setHasRemoteDescription,
    iceCandidates,
    setIceCandidates,
    ...webrtc,
  };
};

export type UseWebRTCWithoutServerReturn = ReturnType<
  typeof useWebRTCWithoutServer
>;

const addPCOnicecandidate = (
  pcRef: PCRef,
  setIceCandidates: SetIceCandidates,
) => {
  pcRef.current.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
    const { candidate } = e; // can be null, means last candidate was found
    console.log(
      'ice candidate:',
      candidate,
      pcRef.current.localDescription,
      pcRef.current.canTrickleIceCandidates,
    );
    setIceCandidates((prev) => [...prev, candidate]);
  };
};

const addDcHandlers = (
  dcRef: DCRef,
  setDCState: SetDCState,
  setDCErrors: SetDCErrors,
) => {
  dcRef.current.onopen = () => {
    console.log('datachannel open');
    setDCState('open');
  };

  dcRef.current.onclose = () => {
    console.log('closing datachannel', dcRef);
    setDCState('closed');
  };

  dcRef.current.onerror = (error: RTCErrorEvent) => {
    console.log('RTCDataChannel error:', error);
    setDCErrors((prev) => [...prev, error.error]);
  };
};

export const mutateSetupAnswerer: MutateWithoutServer =
  (obj: WithoutServer) => (webrtc: UseWebRTCReturn) => {
    const {
 pcRef, dcRef, setDCState, setDCErrors,
} = webrtc;
    const { setIceCandidates } = obj;
    console.log('mutateanswerer');
    addPCOnicecandidate(pcRef, setIceCandidates);

    pcRef.current.ondatachannel = (e) => {
      dcRef.current = e.channel;

      addDcHandlers(dcRef, setDCState, setDCErrors);
    };
  };

export const mutateSetupOfferer: MutateWithoutServer =
  ({ setIceCandidates, setLocalDescription }: WithoutServer) =>
  ({
 pcRef, dcRef, setDCState, setDCErrors,
}: UseWebRTCReturn) => {
    console.log('mutateofferer');
    addPCOnicecandidate(pcRef, setIceCandidates);

    dcRef.current = pcRef.current.createDataChannel('channel');

    addDcHandlers(dcRef, setDCState, setDCErrors);

    pcRef.current
      .createOffer()
      .then((offer: RTCSessionDescriptionInit) =>
        /*
          sdp munging to delete ice trickle, since it is not used.
        */
         ({
          type: 'offer',
          sdp: offer.sdp.replace(/a=ice-options:trickle\s\n/g, ''),
        }))
      .then((offer: RTCSessionDescriptionInit) => {
        pcRef.current.setLocalDescription(offer);
        return offer;
      })
      .then((offer: RTCSessionDescriptionInit) => setLocalDescription(offer));
  };
