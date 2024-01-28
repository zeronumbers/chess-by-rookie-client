/* About this file:
   I think the way I did hooks for websocket/webrtc is not great,
   this is an attempt to make it better.

   webrtc with socket signaling works, manual is unfinished.

   not all components work with such design, for example errors of:
   websocket, peerconnection and datachannel aren't showed to user here.

   websocket server also has to be different.

   This file begins with hooks and ends with components.

   There are a few functions that are copied here from other files. */

import { Link, useParams } from 'react-router-dom';
import {
  MutableRefObject,
  useEffect,
  useRef,
  useReducer,
  useState,
} from 'react';
import { SubmitButton } from './components/SubmitButton';

import {
  makeJSONObjectValidator,
  TextArea,
  Validate,
} from './components/TextArea';
import { Copy } from './components/Copy';

import Chess from './components/Chess';
import { Details } from './components/Details';
import { reducerForGameStateForWebRTC } from './core/handlers';

type WebSocketState = {
  status: 'initial' | 'open' | 'closed';
};

type ActionWebSocketState = {
  type: 'set WebSocket status';
} & WebSocketState;

/* Why is it useReducer instead of useState?

   Previous version of this hook also had errors array and
   object with props from 'close event': code reason timeStamp and wasClean.

   I am not sure now if this is useful. */
export const useWebSocketSignaling = (url: string) => {
  const signalingRef = useRef<WebSocket | null>(null);

  const [signalingState, dispatch] = useReducer(
    (state: WebSocketState, action: ActionWebSocketState) => {
      switch (action.type) {
        case 'set WebSocket status': {
          return { status: action.status };
        }
        default: {
          throw new Error(`Unknown action type: ${action.type}`);
        }
      }
    },
    {
      status: 'initial',
    },
  );

  useEffect(() => {
    let ignore = false;
    console.log(new Date(), 'ws effect', {
      ignore,
      signalingRef,
    });
    if (
      signalingRef.current === null // ||
      // webSocketRef.current?.readyState === WebSocket.CLOSED ||
      // webSocketRef.current?.readyState === WebSocket.CLOSING
    ) {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        if (!ignore) {
          // console.log(new Date(), 'WebSocket opened:', event);
          dispatch({ type: 'set WebSocket status', status: 'open' });
        }
      };

      ws.onclose = () => {
        if (!ignore) {
          // console.log(new Date(), 'WebSocket closed:', event);

          dispatch({ type: 'set WebSocket status', status: 'closed' });
          // setWSClosedWhy(
          //   pick(['code', 'reason', 'wasClean', 'timeStamp'], event),
          // );
        }
      };

      ws.onerror = (error) => {
        if (!ignore) {
          console.error('WebSocket error:', error);
        }
      };

      signalingRef.current = ws;
    }

    return () => {
      console.log(new Date(), 'ws cleanup', {
        ignore,
        signalingRef,
      });
      ignore = true;
      // if (
      //   webSocketRef.current &&
      //   //        webSocketRef.current.readyState === WebSocket.OPEN
      //   (webSocketRef.current.readyState === WebSocket.CONNECTING ||
      //     webSocketRef.current.readyState === WebSocket.OPEN)
      // )

      //      dispatch({ type: 'set WebSocket status', status: '' });

      // this can cause error of closing before connected, ignore it.
      signalingRef.current?.close();
      signalingRef.current = null;
    };
    // never change url
  }, [url]);

  return {
    signalingState,
    signalingRef,
  };
};

type ManualSignalingObj = {
  onopen: () => void;
  onclose: () => void;
  onerror: () => void;
  close: () => void;
  send: (msg: string) => void;
  onmessage: () => void;
};

/*
  objective of this hook is to emulate behaviour of WebSocket,
  but instead of sending/recieving data it would show it on page.

 */

const reducerForManualSignalingState = (state, action) => {
  console.log('msreducer', state, action);
  switch (action.type) {
    case 'localDescription': {
      return { ...state, localDescription: action.data };
    }
    case 'remoteDescription': {
      return { ...state, remoteDescription: action.data };
    }
    case 'iceCandidate': {
      return { ...state, iceCandidates: [...state.iceCandidates, action.data] };
    }

    case 'remoteIceCandidates': {
      return {
        ...state,
        remoteIceCandidates: action.data,
      };
    }

    default: {
      throw new Error(`Unknown action type: ${action.type}`);
    }
  }
};

/* this doesn't work, and is in early stages.
   mixed feelings about state, dispatch being created here as opposed to passing it with props. */
export const useManualSignaling = (role: 'answerer' | 'offerer') => {
  const signalingRef = useRef<ManualSignalingObj | null>(null);

  const [state, dispatch] = useReducer(reducerForManualSignalingState, {
    localDescription: null,
    remoteDescription: null,
    iceCandidates: [],
    remoteIceCandidates: [],
  });

  console.log('begin', state);

  const [signalingState, signalingDispatch] = useReducer(
    (state: WebSocketState, action: ActionWebSocketState) => {
      switch (action.type) {
        case 'set WebSocket status': {
          return { status: action.status };
        }
        default: {
          throw new Error(`Unknown action type: ${action.type}`);
        }
      }
    },
    {
      status: 'initial',
    },
  );

  useEffect(() => {
    let ignore = false;
    console.log(new Date(), 'ms effect', {
      ignore,
      signalingRef,
    });
    // use prototype? create class?
    if (signalingRef.current === null) {
      const obj = {};
      obj.onopen = (event) => {
        if (!ignore) {
          signalingDispatch({ type: 'set WebSocket status', status: 'open' });
        }
      };

      obj.onclose = (event) => {
        if (!ignore) {
          signalingDispatch({ type: 'set WebSocket status', status: 'closed' });
        }
      };

      obj.close = () => {
        if (!ignore) {
          obj.onclose();
        }
      };

      obj.onerror = (error) => {
        if (!ignore) {
          console.error('ms error:', error);
        }
      };
      obj.send = (msg: string) => {
        console.log('send', msg);
        if (!ignore) {
          const message = JSON.parse(msg);
          switch (message.type) {
            case 'ready': {
              break;
            }
            case 'offerer ready': {
              signalingRef.current.onmessage({
                data: JSON.stringify({
                  type: 'ready',
                }),
              });
              break;
            }

            case 'answerer ready': {
              // signalingRef.current.onmessage({
              //   data: JSON.stringify({
              //     type: 'ready',
              //   }),
              // });
              break;
            }
            case 'offer': {
              if (role === 'answerer') {
                dispatch({
                  type: 'remoteDescription',
                  data: message.data,
                });
              } else if (role === 'offerer') {
                dispatch({
                  type: 'localDescription',
                  data: message.data,
                });
              }
              break;
            }

            case 'answer': {
              if (role === 'offerer') {
                dispatch({
                  type: 'remoteDescription',
                  data: message.data,
                });
              } else if (role === 'answerer') {
                dispatch({
                  type: 'localDescription',
                  data: message.data,
                });
              }
              break;
            }

            case 'candidate': {
              dispatch({
                type: 'iceCandidate',
                data: message.data,
              });

              break;
            }
            default:
              throw new Error(`wrong message type: ${message.type}`);
          }
        }
      };

      // obj.onmessage = (event) => {
      //   // if (!ignore) {
      //   //   stateDispatch({ type: 'message', data: msg });
      //   // }
      // };

      signalingRef.current = obj;
    }

    signalingRef.current.onopen();

    return () => {
      console.log(new Date(), 'ms cleanup', {
        ignore,
        signalingRef,
      });
      ignore = true;
      signalingRef.current?.close();
      signalingRef.current = null;
    };
  }, [role]);

  return {
    state,
    dispatch,
    signalingState,
    signalingRef,
  };
};

type PeerConnectionStatus =
  | 'initial'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'closed'
  | 'failed';

type DataChannelStatus = 'initial' | 'open' | 'closed';

type WebRTCState = {
  peerConnectionStatus: PeerConnectionStatus;
  dataChannelStatus: DataChannelStatus;
};

type WebRTCStateAction =
  | {
      type: 'set peerConnectionStatus';
      status: PeerConnectionStatus;
    }
  | {
      type: 'set dataChannelStatus';
      status: DataChannelStatus;
    };

export const useWebRTC = (
  signalingState,
  signalingRef: MutableRefObject<WebSocket | null>,
  conf,
  role: 'answerer' | 'offerer',
) => {
  // debatable decision to have both in one ref. But I like it more than having two refs.
  const webRTCRef = useRef<
    | {
        peerConnection: null;
        dataChannel: null;
      }
    | {
        peerConnection: RTCPeerConnection;
        dataChannel: null;
      }
    | {
        peerConnection: RTCPeerConnection;
        dataChannel: RTCDataChannel;
      }
  >({
    peerConnection: null,
    dataChannel: null,
  });

  const [webRTCState, dispatch] = useReducer(
    (state: WebRTCState, action: WebRTCStateAction) => {
      console.log('rtcreducer:', { state, action });
      switch (action.type) {
        case 'set peerConnectionStatus': {
          return { ...state, peerConnectionStatus: action.status };
        }

        case 'set dataChannelStatus': {
          return { ...state, dataChannelStatus: action.status };
        }
        default: {
          throw new Error(`Unknown action type: ${action.type}`);
        }
      }
    },

    {
      peerConnectionStatus: 'initial',
      dataChannelStatus: 'initial',
    },
  );

  useEffect(() => {
    let ignore = false;
    console.log('webrtc effect', { ignore, webRTCRef, signalingRef });
    const pc = new RTCPeerConnection(conf);

    pc.onconnectionstatechange = (event) => {
      if (!ignore) {
        console.log(
          'RTCPeerConnection connectionstatechange:',
          pc.connectionState,
          event,
        );
        switch (pc.connectionState) {
          // I guess it is always created as 'new'
          // case 'new': {
          //   dispatch({
          //     type: 'set peerConnectionStatus',
          //     status: 'new',
          //   });
          //   break;
          // }

          case 'connecting': {
            dispatch({
              type: 'set peerConnectionStatus',
              status: 'connecting',
            });
            break;
          }

          case 'connected': {
            dispatch({
              type: 'set peerConnectionStatus',
              status: 'connected',
            });
            break;
          }
          case 'disconnected': {
            dispatch({
              type: 'set peerConnectionStatus',
              status: 'disconnected',
            });
            break;
          }
          case 'closed': {
            dispatch({ type: 'set peerConnectionStatus', status: 'closed' });
            break;
          }
          case 'failed': {
            dispatch({ type: 'set peerConnectionStatus', status: 'failed' });
            break;
          }
          default: // FIXME: what to do here?
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (!ignore) {
        console.log('RTCPeerConnection icecandidate:', event);
        if (event.candidate !== null) {
          signalingRef.current.send(
            JSON.stringify({ type: 'candidate', data: event.candidate }),
          );
        }
      }
    };

    webRTCRef.current.peerConnection = pc;

    // begin dataChannel

    const addDataChannelHandlers = (ref) => {
      ref.current.dataChannel.onopen = () => {
        if (!ignore) {
          console.log('RTCDataChannel: open', ref);
          dispatch({ type: 'set dataChannelStatus', status: 'open' });
          signalingRef.current.close(1000);
        }
      };

      ref.current.dataChannel.onclose = () => {
        if (!ignore) {
          console.log('RTCDataChannel: closed', ref);
          dispatch({ type: 'set dataChannelStatus', status: 'closed' });
        }
        //  signalingRef.current.close(1000);
      };
      // dc.onerror
    };

    // creating dataChannel;
    if (role === 'offerer') {
      console.log(new Date(), 'creating datachannel');
      webRTCRef.current.dataChannel =
        webRTCRef.current.peerConnection.createDataChannel('sendChannel');
      addDataChannelHandlers(webRTCRef);
    } else {
      // role must be 'answerer'

      webRTCRef.current.peerConnection.ondatachannel = (event) => {
        console.log(new Date(), 'recieved datachannel');
        if (!ignore) {
          webRTCRef.current.dataChannel = event.channel;
          addDataChannelHandlers(webRTCRef);
        }
      };
    }

    signalingRef.current.onmessage = (event) => {
      console.log('message:', event.data, { ignore });
      if (!ignore) {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'ready': {
            if (role === 'offerer') {
              webRTCRef.current.peerConnection
                .createOffer()
                .then((offer) => {
                  if (!ignore) {
                    webRTCRef.current.peerConnection.setLocalDescription(offer);
                  }
                  return offer;
                })
                .then((offer) => {
                  if (!ignore) {
                    signalingRef.current.send(
                      JSON.stringify({ type: 'offer', data: offer }),
                    );
                  }
                })
                .catch((reason) => {
                  console.log('webrtc: error', reason);
                });
            }
            break;
          }
          case 'offer': {
            if (role === 'answerer') {
              // this case is for answerer recieving offer
              webRTCRef.current.peerConnection
                .setRemoteDescription(message.data)
                .then(() => {
                  if (!ignore) {
                    return webRTCRef.current.peerConnection.createAnswer();
                  }
                })
                .then((answer) => {
                  if (!ignore) {
                    webRTCRef.current.peerConnection.setLocalDescription(
                      answer,
                    );
                  }
                  return answer;
                })
                .then((answer) => {
                  if (!ignore) {
                    signalingRef.current.send(
                      JSON.stringify({ type: 'answer', data: answer }),
                    );
                  }
                })
                .catch((error) => console.error(error));
            }
            break;
          }

          case 'answer': {
            if (role === 'offerer') {
              webRTCRef.current.peerConnection.setRemoteDescription(
                message.data,
              );
            }
            break;
          }

          case 'candidate': {
            webRTCRef.current.peerConnection.addIceCandidate(message.data);
            break;
          }
          default:
            throw new Error(`wrong message type: ${message.type}`);
        }
      }
    };

    return () => {
      ignore = true;
      console.log('webrtc cleanup', { ignore, webRTCRef });

      // FIXME: maybe use pc variable here?
      webRTCRef.current?.peerConnection?.close();
      webRTCRef.current?.dataChannel?.close();
      webRTCRef.current = {
        peerConnection: null,
        dataChannel: null,
      };
    };
  }, [conf, role]);

  useEffect(() => {
    if (signalingState.status === 'open') {
      console.log('sending ready', role);
      signalingRef.current?.send(JSON.stringify({ type: `${role} ready` }));
    }
  }, [signalingState.status]);

  return {
    webRTCState,
    webRTCRef,
  };
};

const conf = JSON.parse(import.meta.env.VITE_RTC_PEER_CONNECTION_CONFIGURATION);

function SaveOfGame({ gameState }: { gameState: GameStateForWebRTC }) {
  const gameStateAsString = JSON.stringify(gameState);
  if (!gameState) {
    return null;
  }

  return (
    <Details
      className="save-of-game"
      summaryText="save of game"
      contentJSX={(
        <div className="save-of-game__content">
          <textarea
            readOnly
            value={gameStateAsString}
            className="TextArea block"
          />
          <Copy
            value={gameStateAsString}
            description="game state"
            className="save-of-game__copy-button"
          />
        </div>
      )}
    />
  );
}

// FIXME: how to know why pc closed/failed/disconnected?
function Connection(props) {
  const { signaling, webRTC, HowToConnect } = props;
  const { webRTCRef, webRTCState } = webRTC;
  const { peerConnectionStatus, dataChannelStatus } = webRTCState;
  const { dataChannel, peerConnection } = webRTCRef.current;
  const { status } = signaling.signalingState;

  const [gameState, dispatch] = useReducer(
    reducerForGameStateForWebRTC,
    props.gameState,
  );

  if (peerConnectionStatus === 'connected' && dataChannelStatus === 'open') {
    return (
      <Chess
        dataChannel={dataChannel}
        gameState={gameState}
        dispatch={dispatch}
      />
    );
  }

  if (
    peerConnectionStatus === 'closed' ||
    peerConnectionStatus === 'failed' ||
    dataChannelStatus === 'closed' ||
    (status === 'closed' &&
      peerConnectionStatus !== 'connected' &&
      dataChannelStatus !== 'open')
  ) {
    // gameState save game component
    return (
      <>
        <h2>Connection ended cannot continue</h2>
        <SaveOfGame gameState={gameState} />

        <h3>WebRTC information:</h3>
        <ul>
          <li>
            RTCPeerConnection:
            {peerConnectionStatus ?? 'null'}
            {' '}
            (should be: open)
          </li>
          <li>
            RTCDataChannel:
            {dataChannelStatus ?? 'null'}
            {' '}
            (should be: open)
          </li>
        </ul>
        {status === 'closed' ? <h3>WebSocket closed</h3> : null}
      </>
    );
  }

  if (peerConnectionStatus === 'disconnected') {
    // if gameState save game component
    return (
      <>
        <p>
          Connection experiencing some issues, temporary unable to continue
          game. It is possible that connection would recover by itself but it is
          not guaranteed.
        </p>
        <SaveOfGame gameState={gameState} />
      </>
    );
  }

  // must be establishing pc and dc
  return <HowToConnect />;
}

function HowToConnectAnswerer() {
  return <p>awaiting webrtc connection</p>;
}

export function AnswerWithSocketSignaling() {
  const { id } = useParams();
  const signaling = useWebSocketSignaling(
    `${
      import.meta.env.VITE_SIGNALING_WEBSOCKET_ADDRESS
    }?role=answerer&id=${id}`,
  );
  const { signalingState, signalingRef } = signaling;

  const webRTC = useWebRTC(signalingState, signalingRef, conf, 'answerer');
  const { webRTCState, webRTCRef } = webRTC;

  return (
    <>
      <button
        onClick={() => {
          console.log(
            'webrtc:',
            webRTCRef.current.peerConnection.connectionState,
            'ws:',
            signalingRef.current.readyState,
            signalingRef,
            { webRTCRef, signalingRef },
          );
        }}
      >
        show refs
      </button>
      <p>
        ws:
        {signalingState.status}
      </p>
      <p>
        pc:
        {webRTCState.peerConnectionStatus}
      </p>
      <p>
        dc:
        {webRTCState.dataChannelStatus}
      </p>

      <Connection
        webRTC={webRTC}
        signaling={signaling}
        gameState={null}
        HowToConnect={HowToConnectAnswerer}
      />
    </>
  );
}

const HowToConnectOfferer = (id) =>
  function () {
    const link = `/answerer/${id}`;

    return (
      <p>
        Link to invite opponent:
        {' '}
        <Link to={link}>join game</Link>
        <button
          onClick={() => {
            navigator.clipboard.writeText(link);
          }}
        >
          copy invite link
        </button>
      </p>
    );
  };

export function OfferWithSocketSignaling({ gameState }) {
  const { id } = useParams();

  const signaling = useWebSocketSignaling(
    `${import.meta.env.VITE_SIGNALING_WEBSOCKET_ADDRESS}?role=offerer&id=${id}`,
  );
  const { signalingState, signalingRef } = signaling;

  const webRTC = useWebRTC(signalingState, signalingRef, conf, 'offerer');
  const { webRTCState, webRTCRef } = webRTC;

  return (
    <>
      <Link to={`/answerer/${id}`}>join game</Link>

      <button
        onClick={() => {
          console.log(
            'webrtc:',
            webRTCRef.current.peerConnection.connectionState,
            'ws:',
            signalingRef.current.readyState,
            signalingRef,
            { webRTCRef, signalingRef },
          );
        }}
      >
        show refs
      </button>
      <p>
        ws:
        {signalingState.status}
      </p>
      <p>
        pc:
        {webRTCState.peerConnectionStatus}
      </p>
      <p>
        dc:
        {webRTCState.dataChannelStatus}
      </p>

      <Connection
        webRTC={webRTC}
        signaling={signaling}
        gameState={gameState}
        HowToConnect={HowToConnectOfferer(id)}
      />
    </>
  );
}

const remoteIceCandidatesValidation: Validate = (value, ref) => {
  try {
    const array = JSON.parse(value);

    const elements =
      array[array.length - 1] === null ? array.slice(0, -1) : array;

    const wrongElements = elements.filter(
      (elem) => elem.candidate !== '' && !elem.candidate,
    );

    if (!wrongElements.length) {
      ref.current?.setCustomValidity('');
    } else {
      ref.current?.setCustomValidity(`
Wrong element${wrongElements.length > 1 ? 's' : ''}: ${wrongElements
        .map((e) => JSON.stringify(e))
        .join(', ')}.`);
    }
  } catch (err) {
    ref.current?.setCustomValidity(err);
  }
};

/*
   WARNING: this is unfinished and doesn't work correctly
   I think remoteDescription and remoteIceCandidates should be designed same as in
   file before rewrite.
   the text of remote stuff can change, and is set only on submit.
   so there is no actual need to store it in reducer, useState would work better with
   TextArea component.

 */
export function OfferWithManualSignaling({ gameState }) {
  const signaling = useManualSignaling('offerer');
  const {
 signalingState, signalingRef, state, dispatch,
} = signaling;
  const {
    localDescription,
    remoteDescription,
    iceCandidates,
    remoteIceCandidates,
  } = state;

  const webRTC = useWebRTC(signalingState, signalingRef, conf, 'offerer');
  const { webRTCState, webRTCRef } = webRTC;

  return (
    <>
      <Link to="/answerer">join game</Link>

      <button
        onClick={() => {
          console.log(
            'webrtc:',
            webRTCRef.current.peerConnection.connectionState,
            'ws:',
            signalingRef.current.readyState,
            signalingRef,
            { webRTCRef, signalingRef },
          );
        }}
      >
        show refs
      </button>
      <p>
        ws:
        {signalingState.status}
      </p>
      <p>
        pc:
        {webRTCState.peerConnectionStatus}
      </p>
      <p>
        dc:
        {webRTCState.dataChannelStatus}
      </p>

      <h2>localDescription: </h2>
      <textarea readOnly value={JSON.stringify(localDescription)} />

      <h2>iceCandidates:</h2>
      <textarea readOnly value={JSON.stringify(iceCandidates)} />
      <h2>remoteDescription: </h2>
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();

          try {
            const answer = JSON.parse(new FormData(e.target).get('answer'));

            pcRef.current?.setRemoteDescription(answer).then(() => {
              setHasRemoteDescription(true);
            });
          } catch (err) {}
        }}
      >
        <TextArea
          labelText="answer"
          text={remoteDescription}
          setText={(text) => {
            dispatch({ type: 'remoteDescription', data: text });
          }}
          name="answer"
          validate={makeJSONObjectValidator(['type', 'sdp'], {
            type: 'answer',
          })}
        />
        <SubmitButton />
      </form>
      <h2>remoteIceCandidates: </h2>
      {JSON.stringify(remoteIceCandidates)}
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();

          try {
            const remoteIceCandidates = JSON.parse(
              new FormData(e.target).get('remoteIceCandidates'),
            );
            remoteIceCandidates.forEach((iceCandidate: RTCIceCandidate) => {
              console.log('recieved remote ice candidate:', iceCandidate);
              pcRef.current.addIceCandidate(iceCandidate);
            });
          } catch (err) {
            console.error(err);
          }
        }}
      >
        <TextArea
          labelText="opponent's ice candidates"
          text={remoteIceCandidates}
          setText={(text) => {
            dispatch({ type: 'remoteIceCandidates', data: text });
          }}
          name="remoteIceCandidates"
          validate={remoteIceCandidatesValidation}
        />
        <SubmitButton />
      </form>
      {/*
      <Connection
        webRTC={webRTC}
        signaling={signaling}
        gameState={gameState}
        HowToConnect={HowToConnectOfferer(id)}
      /> */}
    </>
  );
}

export function AnswerWithManualSignaling() {
  const [state, dispatch] = useReducer(reducerForManualSignalingState, {
    localDescription: null,
    remoteDescription: null,
    iceCandidates: [],
    remoteIceCandidates: [],
  });

  const {
    localDescription,
    remoteDescription,
    iceCandidates,
    remoteIceCandidates,
  } = state;

  const signaling = useManualSignaling('answerer', dispatch);
  const { signalingState, signalingRef } = signaling;

  const webRTC = useWebRTC(signalingState, signalingRef, conf, 'answerer');
  const { webRTCState, webRTCRef } = webRTC;

  return (
    <>
      <button
        onClick={() => {
          console.log(
            'webrtc:',
            webRTCRef.current.peerConnection.connectionState,
            'ws:',
            signalingRef.current.readyState,
            signalingRef,
            { webRTCRef, signalingRef },
          );
        }}
      >
        show refs
      </button>
      <p>
        ws:
        {signalingState.status}
      </p>
      <p>
        pc:
        {webRTCState.peerConnectionStatus}
      </p>
      <p>
        dc:
        {webRTCState.dataChannelStatus}
      </p>

      <h2>localDescription: </h2>
      <textarea readOnly value={JSON.stringify(localDescription)} />

      <h2>iceCandidates:</h2>
      <textarea readOnly value={JSON.stringify(iceCandidates)} />
      <h2>remoteDescription: </h2>
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();

          try {
            const offer = JSON.parse(new FormData(e.target).get('offer'));

            pcRef.current
              ?.setRemoteDescription(offer)
              .then(() => pcRef.current.createAnswer())
              .then((answer) => ({
                type: 'answer',
                sdp: answer.sdp.replace(/a=ice-options:trickle\s\n/g, ''),
              }))
              .then((answer) => {
                pcRef.current.setLocalDescription(answer);
                return answer;
              });
          } catch (err) {}
        }}
      >
        <TextArea
          labelText="offer"
          text={remoteDescription}
          setText={(text) => {
            dispatch({ type: 'remoteDescription', data: text });
          }}
          name="offer"
          validate={makeJSONObjectValidator(['type', 'sdp'], {
            type: 'offer',
          })}
        />
        <SubmitButton />
      </form>

      <h2>remoteIceCandidates: </h2>
      {JSON.stringify(remoteIceCandidates)}
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();

          try {
            const remoteIceCandidates = JSON.parse(
              new FormData(e.target).get('remoteIceCandidates'),
            );
            remoteIceCandidates.forEach((iceCandidate: RTCIceCandidate) => {
              console.log('recieved remote ice candidate:', iceCandidate);
              pcRef.current.addIceCandidate(iceCandidate);
            });
          } catch (err) {
            console.error(err);
          }
        }}
      >
        <TextArea
          labelText="opponent's ice candidates"
          text={remoteIceCandidates}
          setText={(text) => {
            dispatch({ type: 'remoteIceCandidates', data: text });
          }}
          name="remoteIceCandidates"
          validate={remoteIceCandidatesValidation}
        />
        <SubmitButton />
      </form>

      {/*
      <Connection
        webRTC={webRTC}
        signaling={signaling}
        gameState={gameState}
        HowToConnect={HowToConnectOfferer(id)}
      /> */}
    </>
  );
}
