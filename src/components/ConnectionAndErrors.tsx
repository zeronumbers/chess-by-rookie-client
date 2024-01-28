import { useReducer } from 'react';
import { PCErrors, DCErrors } from '../hooks/useWebRTC';
import { WSClosedWhy } from '../hooks/useWebSocket';
import { GameStateForWebRTC } from '../core/globals';
import Chess from './Chess';
import { reducerForGameStateForWebRTC } from '../core/handlers';
import { Copy } from './Copy';
import { Details } from './Details';

function Errors({
  errors,
  ErrorComp,
  summary,
}: {
  errors: { [key: string]: any }[];
  // ErrorComp: FC<{ errorObj: { [key: string]: any } }>;
  summary: string;
}) {
  if (errors?.length) {
    return (
      <Details
        summaryText={`${summary} error${errors.length > 1 ? 's' : ''}`}
        contentJSX={(
          <ol>
            {errors.map((errorObj) => (
              <ErrorComp key={errorObj.toString()} errorObj={errorObj} />
            ))}
          </ol>
        )}
      />
    );
  }

  return null;
}

const makeRTCDataChannelErrorText = (errorObj: RTCError) => {
  const {
    errorDetail,
    recievedAlert,
    sctpCauseCode,
    sdpLineNumber,
    sentAlert,
    message,
  } = errorObj;

  switch (errorDetail) {
    case 'sdp-syntax-error':
      return `${errorDetail}${sdpLineNumber ? ` at line: ${sdpLineNumber}` : ''}
 ${message}`;
    case 'sctp-failure':
      return `${errorDetail}${sctpCauseCode ? ` code: ${sctpCauseCode}` : ''}
 ${message}`;
    case 'dtls-failure': {
      const recievedAlertText = recievedAlert
        ? ` recieved alert: \n${recievedAlert}`
        : '';
      const sentAlertText = sentAlert ? ` sent alert: \n${sentAlert}` : '';
      return `${errorDetail}${recievedAlertText}${sentAlertText}
 ${message}`;
    }
  }
};

function RTCDataChannelErrorComp({ errorObj }: { errorObj: RTCError }) {
  return <li>{makeRTCDataChannelErrorText(errorObj)}</li>;
}

function RTCDataChannelErrorsComp({ dcErrors }: { dcErrors: DCErrors }) {
  return (
    <Errors
      errors={dcErrors}
      ErrorComp={RTCDataChannelErrorComp}
      summary="RTCDataChannel"
    />
  );
}

function RTCPeerConnectionErrorComp({
  errorObj,
}: {
  errorObj: RTCPeerConnectionIceErrorEvent;
}) {
  const {
 address, port, url, errorCode, errorText, timeStamp,
} = errorObj;
  return (
    <li>
      {timeStamp}
      :
      {errorText}
      . error code:
      {errorCode}
      url:
      {' '}
      {url}
      {address
        ? `
 at address: ${address}`
        : ''}
      {Number.isFinite(port)
        ? `
 at port: ${port}`
        : ''}
    </li>
  );
}

function RTCPeerConnectionErrorsComp({ pcErrors }: { pcErrors: PCErrors }) {
  return (
    <Errors
      errors={pcErrors}
      ErrorComp={RTCPeerConnectionErrorComp}
      summary="RTCPeerConnection"
    />
  );
}

const webSocketCodeToEnglish = (code: CloseEvent['code']) => {
  console.log(code);
  switch (code) {
    case 1000:
      return 'Normal Closure';
    case 1001:
      return 'Going Away';
    case 1002:
      return 'Protocol Error';
    case 1003:
      return 'Unsupported Data';
    case 1005:
      return 'No Status Rcvd';
    case 1006:
      return 'Abnormal Closure';
    case 1007:
      return 'Invalid frame payload data';
    case 1008:
      return 'Policy Violation';
    case 1009:
      return 'Message Too Big';
    case 1010:
      return 'Mandatory Ext.';
    case 1011:
      return 'Internal Error';
    case 1012:
      return 'Service Restart';
    case 1013:
      return 'Try Again Later';
    case 1014:
      return 'Bad Gateway';
    case 1015:
      return 'TLS handshake';
    default:
      return '';
  }
};

function WSClosedWhyComp({ wsClosedWhy }: { wsClosedWhy: WSClosedWhy }) {
  if (!wsClosedWhy) {
    // serverless, no websocket is needed
    return null;
  }

  const { reason, code, wasClean } = wsClosedWhy;

  // assuming if it is 1000 then it's ok and this never renders
  if (code === 1000) {
    return null;
  }

  return (
    <p>
      WebSocket was closed
      {' '}
      {wasClean ? 'clean' : 'unclean'}
      {' '}
      with code
      {' '}
      {code}
      ,
      reason
      {' '}
      {reason !== '' ? reason : webSocketCodeToEnglish(code)}
    </p>
  );
}

type ConnectionSecondaryProps = {
  gameState: GameStateForWebRTC | null;
  HowToConnect; // react functional component
};

// FIXME: is this needed?
type WebRTCPropsWithoutSetErrors = {
  webRTCPropsWithoutSetErrors: Omit<
    UseWebRTCReturn,
    'setDCErrors' | 'setPCErrors'
  >;
};

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
// errors should be shown above this
function Connection(props: ConnectionSecondaryProps & WebRTCPropsWithoutSetErrors) {
  const { webRTCPropsWithoutSetErrors, HowToConnect } = props;
  const {
 dcRef, pcState, dcState, wsState, wsClosedWhy,
} =
    webRTCPropsWithoutSetErrors;

  const [gameState, dispatch] = useReducer(
    reducerForGameStateForWebRTC,
    props.gameState,
  );

  if (pcState === 'connected' && dcState === 'open') {
    return (
      <Chess
        dataChannel={dcRef.current}
        gameState={gameState}
        dispatch={dispatch}
      />
    );
  }

  if (
    pcState === 'closed' ||
    pcState === 'failed' ||
    dcState === 'closed' ||
    (wsState === 'closed' && pcState !== 'connected' && dcState !== 'open')
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
            {pcState ?? 'null'}
            {' '}
            (should be: open)
          </li>
          <li>
            RTCDataChannel:
            {dcState ?? 'null'}
            {' '}
            (should be: open)
          </li>
        </ul>
        {wsState === 'closed' ? (
          <>
            <h3>WebSocket information:</h3>
            <WSClosedWhyComp wsClosedWhy={wsClosedWhy} />
            {' '}
          </>
        ) : null}
      </>
    );
  }

  if (pcState === 'disconnected') {
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
  return (
    <HowToConnect webRTCPropsWithoutSetErrors={webRTCPropsWithoutSetErrors} />
  );
}

export type WebSocketErrorObj = Event | DOMException;
function WebSocketErrorComp({ errorObj }: { errorObj: WebSocketErrorObj }) {
  // TS: it's fine
  const {
 type, timeStamp, message, name,
} = errorObj;
  if (type && timeStamp) {
    return (
      <li>
        at
        {' '}
        {timeStamp}
        ms:
        {' '}
        {type}
      </li>
    );
  }

  if (name && message) {
    return (
      <li>
        {name}
        :
        {message}
      </li>
    );
  }

  return null;
}

function WebSocketErrorsComp({ errors }: { errors: WebSocketErrorObj[] }) {
  return (
    <Errors
      errors={errors}
      ErrorComp={WebSocketErrorComp}
      summary="WebSocket"
    />
  );
}

export function ConnectionAndErrors({
  webRTCProps,
  HowToConnect,
  gameState,
}: {
  webRTCProps: UseWebRTCReturn;
} & ConnectionSecondaryProps) {
  const { dcErrors, pcErrors, wsErrors } = webRTCProps;

  // FIXME: delete pc, dc states from below
  return (
    <>
      <Connection
        webRTCPropsWithoutSetErrors={webRTCProps}
        gameState={gameState}
        HowToConnect={HowToConnect}
      />
      {dcErrors.length || pcErrors.length || wsErrors?.length ? (
        <div className="errors">
          <h3>Errors:</h3>
          <RTCDataChannelErrorsComp dcErrors={dcErrors} />
          <RTCPeerConnectionErrorsComp pcErrors={pcErrors} />
          <WebSocketErrorsComp errors={wsErrors} />
        </div>
      ) : null}
    </>
  );
}
