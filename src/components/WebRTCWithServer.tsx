import { Link, useParams } from 'react-router-dom';

import { useEffect } from 'react';
import { GameStateForWebRTC } from '../core/globals';

import {
  useWebRTCWithServer,
  mutateForAnswerer,
  mutateForOfferer,
} from '../hooks/useWebRTCWithServer';

import { WSState } from '../hooks/useWebSocket';

import { ConnectionAndErrors } from './ConnectionAndErrors';

import { useTimer } from '../hooks/useTimer';

const conf = JSON.parse(import.meta.env.VITE_RTC_PEER_CONNECTION_CONFIGURATION);

function TimeToInvite({ ms, wsStatus }: { ms: number; wsStatus: WSState }) {
  if (wsStatus === 'open') {
    if (ms > 0) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);

      return (
        <p>
          Opponent has approximately
          {' '}
          {minutes ? `${minutes} minute${minutes === 1 ? '' : 's'}` : ''}
          {' '}
          {`${seconds} second${seconds === 1 ? '' : 's'}`}
          {' '}
          to connect
        </p>
      );
    }

    if (ms === 0) {
      return (
        <p>Time ran out, websocket is still open but should terminate soon.</p>
      );
    }
  }
  return null;
}

const HowToConnectOfferer = (id: string) =>
  function HowToConnectOffererOfId({ webRTCPropsWithoutSetErrors }) {
    const { wsState } = webRTCPropsWithoutSetErrors;

    const { timeLeft, start, end } = useTimer(300000);
    useEffect(() => {
      if (wsState === 'open') {
        start();
      } else if (timeLeft !== 0) {
        end();
      }
    }, [wsState]);

    const link = `/answerer/${id}`;

    return (
      <>
        <TimeToInvite wsStatus={wsState} ms={timeLeft} />
        <p>
          Link to invite opponent:
          <Link to={link}>join game</Link>
          <button
            onClick={() => {
              navigator.clipboard.writeText(link);
            }}
          >
            copy invite link
          </button>
        </p>
      </>
    );
  };

export function WebRTCWithServerOfferer({
  gameState,
}: {
  gameState: GameStateForWebRTC;
}) {
  const { id } = useParams();
  const webRTCProps = useWebRTCWithServer(
    conf,
    `${import.meta.env.VITE_SIGNALING_WEBSOCKET_ADDRESS}?role=offerer&id=${id}`,
    mutateForOfferer,
  );

  return (
    <ConnectionAndErrors
      webRTCProps={webRTCProps}
      HowToConnect={HowToConnectOfferer(id)}
      gameState={gameState}
    />
  );
}

function HowToConnectAnswerer() {
  return <p>awaiting webrtc connection</p>;
}

export function WebRTCWithServerAnswerer() {
  const { id } = useParams();
  const webRTCProps = useWebRTCWithServer(
    conf,
    `${
      import.meta.env.VITE_SIGNALING_WEBSOCKET_ADDRESS
    }?role=answerer&id=${id}`,
    mutateForAnswerer,
  );

  return (
    <ConnectionAndErrors
      webRTCProps={webRTCProps}
      HowToConnect={HowToConnectAnswerer}
      gameState={null}
    />
  );
}
